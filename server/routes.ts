import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { type InsertEmailQueue } from "@shared/schema";
import { emailService } from "./email";
import { journalImageUpload, getFileUrl } from "./file-upload";
import multer from "multer";
import { simpleParser } from "mailparser";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Setup multer for parsing multipart/form-data (for SendGrid webhooks)
  const upload = multer();

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  
  // Simple webhook test endpoint - publicly accessible for external testing
  app.post("/api/webhook-test", (req: Request, res: Response) => {
    console.log('🔔 WEBHOOK TEST ENDPOINT ACCESSED');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Headers: ${JSON.stringify(req.headers)}`);
    console.log(`Body type: ${typeof req.body}`);
    
    if (req.body) {
      if (typeof req.body === 'object') {
        console.log(`Body keys: ${Object.keys(req.body).join(', ')}`);
        console.log(`Body sample: ${JSON.stringify(req.body).substring(0, 200)}...`);
      } else {
        console.log(`Body: ${String(req.body).substring(0, 200)}...`);
      }
    }
    
    // Always return 200 OK
    res.status(200).json({
      received: true,
      timestamp: new Date().toISOString(),
      message: "Test webhook received successfully"
    });
  });
  
  // Test endpoint for public email webhook testing
  app.post("/api/public/test-email", async (req: Request, res: Response) => {
    try {
      console.log('📨 TEST EMAIL API ENDPOINT ACCESSED');
      console.log(`Request received at: ${new Date().toISOString()}`);
      console.log(`Content-Type: ${req.headers['content-type']}`);
      
      // Log request body structure for debugging
      let requestData: any = req.body;
      let requestFormat = 'object';
      
      if (req.body === undefined || req.body === null) {
        console.log('Request body format: undefined/null');
        console.log('No content extracted from request, using fallback');
        
        // Use the request directly as a fallback
        requestData = {
          text: req.rawBody || 'No content available',
          subject: 'Test Email',
          from: 'unknown@example.com'
        };
        requestFormat = 'fallback';
      } else if (typeof req.body === 'object') {
        console.log('Request body format: object');
        console.log(`Request body keys: ${Object.keys(req.body)}`);
        requestFormat = 'object';
      } else if (typeof req.body === 'string') {
        console.log('Request body format: string');
        console.log(`Request body length: ${req.body.length}`);
        requestData = {
          text: req.body,
          subject: 'Test Email',
          from: 'unknown@example.com'
        };
        requestFormat = 'string';
      } else {
        console.log(`Request body format: ${typeof req.body}`);
        requestData = {
          text: 'Unknown content format',
          subject: 'Test Email',
          from: 'unknown@example.com'
        };
        requestFormat = 'unknown';
      }
      
      // Create a queue item with the email data
      const queueItem: InsertEmailQueue = {
        payload: requestData,
        status: "pending" as const
      };
      
      const saved = await storage.enqueueEmail(queueItem);
      console.log(`✅ Test email queued for processing (Queue ID: ${saved.id})`);
      
      return res.json({
        success: true,
        message: 'Email received and queued for processing',
        queueId: saved.id
      });
      
    } catch (error) {
      console.error('Error processing test email webhook:', error);
      return res.status(500).json({
        success: false,
        message: 'Error processing email: ' + error.message
      });
    }
  });
  
  // Raw MIME webhook route for when SendGrid is configured to post raw email content
  app.post("/api/emails/webhook-raw", async (req: Request, res: Response) => {
    console.log('🔔 === SENDGRID RAW MIME WEBHOOK RECEIVED === 🔔');
    console.log(`Request received at: ${new Date().toISOString()}`);
    console.log(`Content-Type: ${req.headers['content-type']}`);
    
    try {
      // For raw MIME emails, we need to process the raw body
      let rawBody = '';
      req.setEncoding('utf8');
      
      req.on('data', (chunk) => {
        rawBody += chunk;
      });
      
      req.on('end', async () => {
        try {
          console.log(`Raw MIME length: ${rawBody.length} bytes`);
          
          if (rawBody.length === 0) {
            console.log('❌ Empty raw MIME body received');
            return res.status(200).send('Error: Empty MIME body');
          }
          
          // Parse the raw email
          const parsed = await simpleParser(rawBody);
          
          console.log(`Parsed email from: ${parsed.from?.text}`);
          console.log(`Parsed email subject: ${parsed.subject}`);
          console.log(`Parsed email text: ${parsed.text?.substring(0, 100)}...`);
          
          // Create a queue item with the parsed email data
          const queueItem: InsertEmailQueue = {
            payload: {
              from: parsed.from?.text || '',
              subject: parsed.subject || 'No Subject',
              text: parsed.text || parsed.html || 'No content',
              headers: parsed.headers,
              receivedAt: new Date().toISOString(),
              parsedAt: new Date().toISOString(),
              messageId: parsed.messageId
            },
            status: "pending" as const
          };
          
          const saved = await storage.enqueueEmail(queueItem);
          console.log(`✅ Raw MIME email queued for processing (Queue ID: ${saved.id})`);
          
          res.status(200).send('OK: Raw MIME email queued for processing');
        } catch (error) {
          console.error('Error processing raw MIME:', error);
          res.status(200).send(`Error parsing raw MIME: ${error.message}`);
        }
      });
      
      // Return nothing here as the response is sent in the end event handler
    } catch (error) {
      console.error('Error in raw MIME webhook route:', error);
      return res.status(200).send(`Error: ${error.message}`);
    }
  });

  // Enhanced SendGrid webhook handler with multer for multipart/form-data support
  app.post("/api/emails/webhook", upload.none(), async (req: Request, res: Response) => {
    console.log('🔔 === SENDGRID WEBHOOK REQUEST RECEIVED === 🔔');
    console.log(`Request received at: ${new Date().toISOString()}`);
    console.log(`Content-Type: ${req.headers['content-type']}`);
    console.log(`Content-Length: ${req.headers['content-length']}`);
    console.log(`Remote IP: ${req.ip}`);
    console.log(`Request URL: ${req.originalUrl}`);
    console.log(`User-Agent: ${req.headers['user-agent']}`);
    
    // Dump all headers for debugging
    console.log('WEBHOOK HEADERS:');
    Object.entries(req.headers).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    // Dump body structure
    console.log('WEBHOOK BODY STRUCTURE:');
    if (req.body) {
      if (typeof req.body === 'object') {
        console.log(`Body keys: ${Object.keys(req.body).join(', ')}`);
        
        // Log a few important fields if they exist
        if (req.body.from) console.log(`From field: ${req.body.from}`);
        if (req.body.sender) console.log(`Sender field: ${req.body.sender}`);
        if (req.body.envelope) console.log(`Envelope field: ${req.body.envelope}`);
        if (req.body.subject) console.log(`Subject: ${req.body.subject}`);
      } else {
        console.log(`Body type: ${typeof req.body}`);
        console.log(`Body length: ${req.body.length || 0}`);
      }
    } else {
      console.log('Body is empty or undefined');
    }
    
    try {
      // Log the headers for debugging
      console.log("=== WEBHOOK HEADERS ===");
      Object.entries(req.headers).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });
      
      // Check if we have a body after multer parsed it
      if (!req.body || Object.keys(req.body).length === 0) {
        console.log("⚠️ Request body is empty after parsing");
        return res.status(200).send('Error: Missing body data');
      }
      
      // Log the keys available in the parsed body
      const bodyKeys = Object.keys(req.body);
      console.log(`Body keys after multer parsing: ${bodyKeys.join(', ')}`);
      
      // Extract the email fields with improved extraction
      let from = '';
      
      // First try to get from envelope (SendGrid's preferred method)
      if (req.body.envelope) {
        try {
          const envelope = JSON.parse(req.body.envelope);
          if (envelope.from) {
            console.log(`Found sender in envelope: ${envelope.from}`);
            from = envelope.from;
          }
        } catch (err) {
          console.log('Error parsing envelope:', err);
        }
      }
      
      // If envelope didn't work, try other methods
      if (!from && req.body.from) {
        from = req.body.from;
        console.log(`Using from field: ${from}`);
      }
      
      // If from has angle brackets, extract the email
      if (from.includes('<') && from.includes('>')) {
        const match = from.match(/<([^>]+)>/);
        if (match && match[1]) {
          console.log(`Extracted email from brackets: ${match[1]}`);
          from = match[1];
        }
      }
      
      // If still no valid from address, try to find any email address in the request
      if (!from.includes('@') || from === '') {
        // Check all body fields for anything that looks like an email
        Object.entries(req.body).forEach(([key, value]) => {
          if (typeof value === 'string' && value.includes('@')) {
            const emailMatch = value.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
            if (emailMatch && emailMatch[1] && !from.includes('@')) {
              console.log(`Found email in ${key}: ${emailMatch[1]}`);
              from = emailMatch[1];
            }
          }
        });
      }
      
      // Last resort fallback
      if (!from || !from.includes('@')) {
        console.log('⚠️ No valid from email found, using fallback');
        from = 'unknown@example.com';
      }
      
      const subject = req.body.subject || 'No Subject';
      const text = req.body.text || req.body.email || req.body.html || 'No content';
      
      console.log(`From: ${from}`);
      console.log(`Subject: ${subject}`);
      console.log(`Text preview: ${text.substring(0, Math.min(100, text.length))}...`);
      
      // Create a queue item with the structured data for processing
      const queueItem: InsertEmailQueue = {
        payload: {
          from,
          subject,
          text,
          headers: req.body.headers || {},
          receivedAt: new Date().toISOString()
        },
        status: "pending" as const
      };
        
      const saved = await storage.enqueueEmail(queueItem);
      console.log(`✅ Email queued for processing (Queue ID: ${saved.id})`);
      
      return res.status(200).send('OK: Email data queued for processing');
    } catch (error) {
      console.error('Error processing webhook:', error);
      
      // Always return 200 OK to prevent SendGrid from retrying
      return res.status(200).send('Error: ' + error.message);
    }
  });
  
  // Journal image upload endpoint
  app.post('/api/journal/upload', journalImageUpload.single('image'), (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileUrl = getFileUrl(req, req.file.filename);
    
    res.json({
      success: true,
      fileUrl
    });
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}