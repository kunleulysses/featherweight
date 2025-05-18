import { storage } from "./storage";
import { emailService } from "./email";
import { simpleParser } from "mailparser";
import { EmailQueueItem } from "@shared/schema";

// Process interval in milliseconds (check for new emails every 10 seconds)
const PROCESS_INTERVAL = 10000;

// Maximum number of attempts to process an email before giving up
const MAX_ATTEMPTS = 3;

// Flag to prevent multiple email processing at the same time
let isProcessing = false;

/**
 * Process a single email from the queue
 */
async function processQueuedEmail(queueItem: EmailQueueItem): Promise<boolean> {
  console.log(`🔄 Processing queued email ID: ${queueItem.id}`);
  
  try {
    // Mark as processing
    await storage.markEmailProcessing(queueItem.id);
    
    // Extract data from the payload
    const payload = queueItem.payload as any;
    
    // Handle different payload formats
    if (payload && payload.buffer) {
      // If we have base64 encoded buffer data
      const buffer = Buffer.from(payload.buffer as string, 'base64');
      await processRawEmail(buffer);
      
    } else if (payload && payload.text) {
      // If we have text data
      await processEmailFromText(payload.text as string);
      
    } else if (payload && payload.email) {
      // If we have a raw email
      const parsed = await simpleParser(payload.email as string);
      await processEmailFromParsed(parsed);
      
    } else if (payload && typeof payload === 'object') {
      // If we have a SendGrid parsed object format
      let from = (payload.from as string) || (payload.sender as string) || '';
      const to = (payload.to as string) || '';
      const subject = (payload.subject as string) || 'No Subject';
      const text = (payload.text as string) || '';
      const html = (payload.html as string) || '';
      const inReplyTo = (payload.headers && (payload.headers['In-Reply-To'] as string)) || (payload['In-Reply-To'] as string) || '';
      
      // Extract the sender's email address
      let senderEmail = from;
      
      if (typeof from === 'string') {
        // Format can be "John Doe <john@example.com>" or just "john@example.com"
        const emailMatch = from.match(/<(.+@.+)>/) || from.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
        senderEmail = emailMatch ? emailMatch[1] : from;
      }
      
      await emailService.processIncomingEmail(
        senderEmail,
        subject,
        text || html,
        inReplyTo
      );
    }
    
    // Mark as completed
    await storage.markEmailCompleted(queueItem.id);
    console.log(`✅ Successfully processed email ID: ${queueItem.id}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing email ID: ${queueItem.id}:`, error);
    
    // Increment attempts
    await storage.incrementEmailAttempts(queueItem.id);
    
    // If we've exceeded max attempts, mark as failed
    if (queueItem.processAttempts >= MAX_ATTEMPTS - 1) {
      await storage.markEmailFailed(
        queueItem.id, 
        error instanceof Error ? error.message : String(error)
      );
      console.log(`⚠️ Email ID ${queueItem.id} exceeded maximum processing attempts. Marked as failed.`);
    }
    
    return false;
  }
}

/**
 * Process a raw email buffer using mailparser
 */
async function processRawEmail(buffer: Buffer): Promise<void> {
  console.log('Processing raw email buffer...');
  const parsed = await simpleParser(buffer);
  await processEmailFromParsed(parsed);
}

/**
 * Process email from text content
 */
async function processEmailFromText(text: string): Promise<void> {
  console.log('Processing email from text content...');
  // This is a simplistic approach - in a real implementation,
  // we'd need proper parsing of email format
  
  // For now, just treat it as the body of an email from an unknown sender
  await emailService.processIncomingEmail(
    'unknown@example.com',
    'Email from text content',
    text,
    ''
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
  
  if (senderEmail) {
    await emailService.processIncomingEmail(
      senderEmail,
      parsed.subject || 'No Subject',
      parsed.text || parsed.html || '',
      parsed.inReplyTo || ''
    );
  } else {
    throw new Error('Could not extract sender email from parsed message');
  }
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