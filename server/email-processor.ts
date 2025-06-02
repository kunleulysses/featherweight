import { storage } from "./storage";
import { emailService } from "./email";
import { simpleParser } from "mailparser";
import { EmailQueueItem } from "@shared/schema";

// Process interval in milliseconds (check for new emails every 10 seconds)
const PROCESS_INTERVAL = 10000;

// Maximum number of attempts to process an email before giving up
const MAX_ATTEMPTS = 5;

// Exponential backoff base (in milliseconds)
const BACKOFF_BASE = 60000; // 1 minute

// Flag to prevent multiple email processing at the same time
let isProcessing = false;

// Track processed email IDs to avoid duplicates (in-memory cache)
const processedEmailIds = new Set<string>();

/**
 * Process a single email from the queue with enhanced error handling
 */
async function processQueuedEmail(queueItem: EmailQueueItem): Promise<boolean> {
  console.log(`🔄 Processing queued email ID: ${queueItem.id}`);
  console.log(`📊 EMAIL QUEUE ITEM DETAILS:`);
  console.log(`ID: ${queueItem.id}`);
  console.log(`Status: ${queueItem.status}`);
  console.log(`Created: ${queueItem.createdAt}`);
  console.log(`Attempts: ${queueItem.processAttempts}`);
  
  try {
    // Check for duplicates
    const emailKey = generateEmailKey(queueItem);
    if (processedEmailIds.has(emailKey)) {
      console.log(`⚠️ Duplicate email detected with key: ${emailKey}. Marking as completed.`);
      await storage.markEmailCompleted(queueItem.id);
      return true;
    }
    
    // Mark as processing
    await storage.markEmailProcessing(queueItem.id);
    console.log(`📝 Email ID ${queueItem.id} marked as processing`);
    
    // Extract data from the payload
    const payload = queueItem.payload as any;
    console.log(`📦 Raw payload type: ${typeof payload}`);
    console.log(`📦 Payload keys: ${Object.keys(payload).join(', ')}`);
    
    // Print first 500 characters of stringified payload for debugging
    const payloadPreview = JSON.stringify(payload).substring(0, 500);
    console.log(`📦 Payload preview: ${payloadPreview}${JSON.stringify(payload).length > 500 ? '...' : ''}`);
    
    // Handle different payload formats
    if (payload && payload.rawMimeBase64) {
      // Handle raw MIME base64 payload from SendGrid
      console.log(`🔍 Processing payload with rawMimeBase64`);
      const buffer = Buffer.from(payload.rawMimeBase64 as string, 'base64');
      console.log(`🔍 Buffer size: ${buffer.length} bytes`);
      const parsedEmail = await simpleParser(buffer);
      await emailService.processIncomingEmail(
        parsedEmail.from?.text || 'unknown@example.com',
        parsedEmail.subject || 'No Subject',
        parsedEmail.text || parsedEmail.html || '',
        parsedEmail.inReplyTo || undefined
      );
      
    } else if (payload && payload.buffer) {
      // If we have base64 encoded buffer data
      console.log(`🔍 Detected buffer payload format`);
      const buffer = Buffer.from(payload.buffer as string, 'base64');
      console.log(`🔍 Buffer size: ${buffer.length} bytes`);
      await processRawEmail(buffer);
      
    } else if (payload && payload.text && payload.from && payload.subject) {
      // Handle direct JSON payload (e.g., from manual testing or other sources)
      console.log(`🔍 Processing direct JSON payload`);
      await emailService.processIncomingEmail(
        payload.from,
        payload.subject,
        payload.text,
        payload.inReplyTo || undefined
      );
      
    } else if (payload && payload.text) {
      // If we have text data
      console.log(`🔍 Detected text payload format`);
      console.log(`🔍 Text length: ${payload.text.length} characters`);
      console.log(`🔍 Text preview: ${payload.text.substring(0, 200)}${payload.text.length > 200 ? '...' : ''}`);
      await processEmailFromText(payload.text as string);
      
    } else if (payload && payload.email) {
      // If we have a raw email
      console.log(`🔍 Detected raw email payload format`);
      console.log(`🔍 Raw email length: ${payload.email.length} characters`);
      const parsed = await simpleParser(payload.email as string);
      console.log(`🔍 Email parsed successfully`);
      await processEmailFromParsed(parsed);
      
    } else if (payload && typeof payload === 'object') {
      // If we have a SendGrid parsed object format
      console.log(`🔍 Detected SendGrid object payload format`);
      
      let from = extractField(payload, ['from', 'sender', 'From', 'Sender']);
      const to = extractField(payload, ['to', 'To', 'recipient', 'Recipient']);
      const subject = extractField(payload, ['subject', 'Subject']) || 'No Subject';
      const text = extractField(payload, ['text', 'Text', 'body', 'Body']);
      const html = extractField(payload, ['html', 'Html', 'htmlBody', 'HtmlBody']);
      
      console.log(`🔍 From (raw): ${from}`);
      console.log(`🔍 To: ${to}`);
      console.log(`🔍 Subject: ${subject}`);
      console.log(`🔍 Text length: ${text?.length || 0} characters`);
      console.log(`🔍 HTML length: ${html?.length || 0} characters`);
      
      // Log all headers for debugging
      const headers = extractHeaders(payload);
      console.log(`🔍 Headers available: ${headers ? 'Yes' : 'No'}`);
      if (headers) {
        console.log(`🔍 Header keys: ${Object.keys(headers).join(', ')}`);
      }
      
      const inReplyTo = extractInReplyTo(payload, headers);
      console.log(`🔍 In-Reply-To: ${inReplyTo || 'Not available'}`);
      
      // Extract the sender's email address
      let senderEmail = extractSenderEmail(from);
      
      // Check for envelope structure which sometimes contains the actual email
      if (payload.envelope) {
        console.log(`🔍 Envelope data available`);
        try {
          let envelope = typeof payload.envelope === 'string' 
            ? JSON.parse(payload.envelope) 
            : payload.envelope;
            
          console.log(`🔍 Envelope from: ${envelope.from}`);
          console.log(`🔍 Envelope to: ${Array.isArray(envelope.to) ? envelope.to.join(', ') : envelope.to}`);
          
          // Use envelope sender if available and main from is missing
          if (!senderEmail && envelope.from) {
            senderEmail = extractSenderEmail(envelope.from);
            console.log(`🔍 Using envelope sender: ${senderEmail}`);
          }
        } catch (error) {
          console.error(`⚠️ Error parsing envelope: ${error}`);
        }
      }
      
      if (!senderEmail) {
        console.warn('⚠️ Could not extract sender email. Using fallback address.');
        senderEmail = 'unknown@example.com';
      }
      
      const content = text || html || '';
      if (!content) {
        console.warn('⚠️ No content found in email. Using placeholder text.');
      }
      
      console.log(`📧 Calling processIncomingEmail with:`);
      console.log(`📧 Sender: ${senderEmail}`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`📧 Content: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
      console.log(`📧 InReplyTo: ${inReplyTo}`);
      
      await emailService.processIncomingEmail(
        senderEmail,
        subject,
        content,
        inReplyTo
      );
    } else {
      console.error(`⚠️ Unknown payload format. Cannot process email.`);
      throw new Error('Unknown payload format. Unable to process email.');
    }
    
    // Mark as completed
    await storage.markEmailCompleted(queueItem.id);
    console.log(`✅ Successfully processed email ID: ${queueItem.id}`);
    
    // Add to processed set to avoid duplicates
    processedEmailIds.add(emailKey);
    
    // Limit the size of the processed set to avoid memory leaks
    if (processedEmailIds.size > 1000) {
      const keysArray = Array.from(processedEmailIds);
      processedEmailIds.clear();
      keysArray.slice(-500).forEach(key => processedEmailIds.add(key));
    }
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing email ID: ${queueItem.id}:`, error);
    console.error(`❌ Error stack: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
    
    // Calculate retry delay with exponential backoff
    const retryDelay = Math.min(
      BACKOFF_BASE * Math.pow(2, queueItem.processAttempts),
      24 * 60 * 60 * 1000 // Max 24 hours
    );
    
    // Increment attempts
    await storage.incrementEmailAttempts(queueItem.id);
    console.log(`⚠️ Incremented attempt count for email ID: ${queueItem.id}`);
    console.log(`⚠️ Next retry in approximately ${Math.floor(retryDelay / 60000)} minutes`);
    
    // If we've exceeded max attempts, mark as failed
    if (queueItem.processAttempts >= MAX_ATTEMPTS - 1) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await storage.markEmailFailed(queueItem.id, errorMessage);
      console.log(`⚠️ Email ID ${queueItem.id} exceeded maximum processing attempts. Marked as failed.`);
      console.log(`⚠️ Failure reason: ${errorMessage}`);
    }
    
    return false;
  }
}

/**
 * Process a raw email buffer using mailparser
 */
async function processRawEmail(buffer: Buffer): Promise<void> {
  console.log('Processing raw email buffer...');
  try {
    const parsed = await simpleParser(buffer);
    await processEmailFromParsed(parsed);
  } catch (error) {
    console.error('Error parsing raw email:', error);
    // Fallback to treating as plain text if parsing fails
    const text = buffer.toString('utf-8');
    console.log('Falling back to plain text parsing');
    await processEmailFromText(text);
  }
}

/**
 * Process email from text content
 */
async function processEmailFromText(text: string): Promise<void> {
  console.log('Processing email from text content...');
  
  // Try to extract email parts from text (basic parsing)
  const fromMatch = text.match(/From:\s*([^\r\n]+)/i);
  const subjectMatch = text.match(/Subject:\s*([^\r\n]+)/i);
  const inReplyToMatch = text.match(/In-Reply-To:\s*([^\r\n]+)/i);
  
  // Extract body - everything after a double newline, or the whole text if no headers found
  const bodyMatch = text.match(/\r?\n\r?\n([\s\S]+)$/);
  const body = bodyMatch ? bodyMatch[1].trim() : text;
  
  let from = fromMatch ? fromMatch[1].trim() : 'unknown@example.com';
  from = extractSenderEmail(from) || 'unknown@example.com';
  
  const subject = subjectMatch ? subjectMatch[1].trim() : 'Email from text content';
  const inReplyTo = inReplyToMatch ? inReplyToMatch[1].trim() : '';
  
  console.log(`Extracted from: ${from}`);
  console.log(`Extracted subject: ${subject}`);
  console.log(`Extracted inReplyTo: ${inReplyTo}`);
  console.log(`Body length: ${body.length} characters`);
  
  await emailService.processIncomingEmail(
    from,
    subject,
    body,
    inReplyTo
  );
}

/**
 * Process an email from parsed email data
 */
async function processEmailFromParsed(parsed: any): Promise<void> {
  console.log('Processing parsed email...');
  
  // Extract sender's email from parsed result
  let senderEmail = '';
  if (parsed.from && parsed.from.value && parsed.from.value.length > 0) {
    senderEmail = parsed.from.value[0].address;
  } else if (parsed.from?.text) {
    const match = parsed.from.text.match(/<([^>]+)>/) || [null, parsed.from.text];
    senderEmail = match[1] || parsed.from.text;
  }
  
  if (!senderEmail) {
    senderEmail = 'unknown@example.com';
    console.warn('Could not extract sender email from parsed message, using fallback');
  }
  
  const subject = parsed.subject || 'No Subject';
  const text = parsed.text || parsed.html || '';
  const inReplyTo = parsed.inReplyTo || '';
  
  console.log(`Parsed sender: ${senderEmail}`);
  console.log(`Parsed subject: ${subject}`);
  console.log(`Parsed inReplyTo: ${inReplyTo}`);
  console.log(`Content length: ${text.length} characters`);
  
  await emailService.processIncomingEmail(
    senderEmail,
    subject,
    text,
    inReplyTo
  );
}

/**
 * Check for and process the next email in the queue
 */
async function processNextEmail(): Promise<void> {
  // If already processing, don't start another process
  if (isProcessing) {
    return;
  }
  
  try {
    isProcessing = true;
    
    // Get the next pending email
    const nextEmail = await storage.getNextPendingEmail();
    
    if (nextEmail) {
      console.log(`Found pending email ID: ${nextEmail.id} to process`);
      await processQueuedEmail(nextEmail);
    }
  } catch (error) {
    console.error('Error in email processor:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Start the email processor service
 */
export function startEmailProcessor(): void {
  console.log('🚀 Starting email processing service...');
  
  // Process immediately on startup
  processNextEmail();
  
  // Then set up interval processing
  setInterval(processNextEmail, PROCESS_INTERVAL);
}

/**
 * Helper function to extract a field from payload with multiple possible keys
 */
function extractField(payload: any, keys: string[]): string {
  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null) {
      return String(payload[key]);
    }
  }
  return '';
}

/**
 * Helper function to extract headers from various payload formats
 */
function extractHeaders(payload: any): Record<string, string> | null {
  if (payload.headers) {
    return typeof payload.headers === 'object' ? payload.headers : null;
  }
  
  if (payload.Headers) {
    return typeof payload.Headers === 'object' ? payload.Headers : null;
  }
  
  // Look for a string field named headers and try to parse it
  if (typeof payload.headers === 'string') {
    try {
      return JSON.parse(payload.headers);
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Helper function to extract In-Reply-To from payload or headers
 */
function extractInReplyTo(payload: any, headers: Record<string, string> | null): string {
  // Check direct fields
  if (payload['In-Reply-To'] || payload['in-reply-to'] || payload.inReplyTo) {
    return String(payload['In-Reply-To'] || payload['in-reply-to'] || payload.inReplyTo);
  }
  
  // Check headers
  if (headers) {
    const headerKey = Object.keys(headers).find(k => 
      k.toLowerCase() === 'in-reply-to' || 
      k.toLowerCase() === 'reference' ||
      k.toLowerCase() === 'references'
    );
    
    if (headerKey && headers[headerKey]) {
      return String(headers[headerKey]);
    }
  }
  
  return '';
}

/**
 * Helper function to extract a sender's email address from various formats
 */
function extractSenderEmail(from: string): string {
  if (!from) return '';
  
  // First, check if we have JSON data that was stringified
  if (from.startsWith('{') && from.endsWith('}')) {
    try {
      const parsed = JSON.parse(from);
      if (parsed.email) return parsed.email;
    } catch (e) {
      // Not valid JSON, continue with other methods
    }
  }
  
  // Format can be "John Doe <john@example.com>" or just "john@example.com"
  const emailMatch = from.match(/<([^>]+)>/) || from.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  if (emailMatch) return emailMatch[1];
  
  // If we have a SendGrid envelope format
  if (typeof from === 'string' && from.includes('envelope')) {
    try {
      const envelopeMatch = from.match(/from":"([^"]+)"/);
      if (envelopeMatch) return envelopeMatch[1];
    } catch (e) {
      // Not valid envelope format, continue
    }
  }
  
  // Last resort, just return what we have
  return from;
}

/**
 * Generate a unique key for an email to detect duplicates
 */
function generateEmailKey(queueItem: EmailQueueItem): string {
  const payload = queueItem.payload as any;
  
  // Try to use message ID if available
  if (payload.messageId || payload.MessageId || payload['message-id'] || payload['Message-ID']) {
    return String(payload.messageId || payload.MessageId || payload['message-id'] || payload['Message-ID']);
  }
  
  // Try to extract message ID from headers
  const headers = extractHeaders(payload);
  if (headers) {
    const messageIdKey = Object.keys(headers).find(k => 
      k.toLowerCase() === 'message-id' || 
      k.toLowerCase() === 'messageid'
    );
    
    if (messageIdKey && headers[messageIdKey]) {
      return String(headers[messageIdKey]);
    }
  }
  
  // Fallback to a composite key
  const from = extractField(payload, ['from', 'sender', 'From', 'Sender']);
  const subject = extractField(payload, ['subject', 'Subject']) || '';
  const timestamp = queueItem.createdAt ? queueItem.createdAt.toISOString() : new Date().toISOString();
  
  // Create a composite key
  return `${from}:${subject}:${timestamp}`;
}