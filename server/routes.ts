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
    
    // Try to process anything we get - don't be too strict about format
    try {
      console.log("Processing webhook data...");
      
      // For debugging: log some data about what we received
      const reqBodyKeys = req.body ? Object.keys(req.body) : [];
      console.log(`Body has ${reqBodyKeys.length} keys: ${reqBodyKeys.join(', ')}`);
      
      // Just process the email directly here for debugging
      if (req.body && req.body.text) {
        const from = req.body.from || req.body.sender || 'unknown@example.com';
        const subject = req.body.subject || 'No Subject';
        const text = req.body.text;
        
        console.log(`⭐ DIRECT PROCESSING: from=${from}, subject=${subject}`);
        await emailService.processIncomingEmail(from, subject, text);
        console.log("✅ Email processed directly!");
      }
      
      // Always try to queue the raw data as received - to debug issues
      console.log("Queueing raw webhook data...");
      
      // Use any fields we can find
      const from = req.body.from || req.body.sender || (req.body.envelope ? JSON.parse(req.body.envelope).from : null) || 'unknown@example.com';
      const subject = req.body.subject || 'No Subject';
      const text = req.body.text || req.body.html || req.body.email || req.body.raw || 'No content';
      
      console.log(`From: ${from}`);
      console.log(`Subject: ${subject}`);
      console.log(`Text preview: ${text.substring(0, Math.min(100, text.length))}...`);
      
      // Create a queue item with the structured data for processing
      const queueItem: InsertEmailQueue = {
        payload: req.body, // Store the entire body for debugging
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
  
  // Journal entries API endpoints
  // Get all journal entries for the current user
  app.get('/api/journal', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
      // Extract filter parameters if any
      const { dateRange, mood, tags } = req.query;
      
      const filter: any = {};
      
      // Apply filters if provided
      if (tags && typeof tags === 'string') {
        filter.tags = tags.split(',');
      }
      
      if (mood && typeof mood === 'string') {
        filter.mood = mood;
      }
      
      if (dateRange && typeof dateRange === 'string') {
        // Handle date range filter
        const today = new Date();
        
        switch (dateRange) {
          case 'today':
            const startOfToday = new Date(today.setHours(0, 0, 0, 0));
            filter.createdAfter = startOfToday;
            break;
          case 'week':
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - 7);
            filter.createdAfter = startOfWeek;
            break;
          case 'month':
            const startOfMonth = new Date(today);
            startOfMonth.setMonth(today.getMonth() - 1);
            filter.createdAfter = startOfMonth;
            break;
          case 'year':
            const startOfYear = new Date(today);
            startOfYear.setFullYear(today.getFullYear() - 1);
            filter.createdAfter = startOfYear;
            break;
        }
      }
      
      const entries = await storage.getJournalEntries(req.user.id, filter);
      res.json(entries);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      res.status(500).json({ error: 'Failed to fetch journal entries' });
    }
  });
  
  // Get a single journal entry
  app.get('/api/journal/:id', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const entryId = parseInt(req.params.id);
    if (isNaN(entryId)) {
      return res.status(400).json({ error: 'Invalid journal entry ID' });
    }
    
    try {
      const entry = await storage.getJournalEntry(entryId);
      
      if (!entry) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }
      
      // Make sure the entry belongs to the current user
      if (entry.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(entry);
    } catch (error) {
      console.error('Error fetching journal entry:', error);
      res.status(500).json({ error: 'Failed to fetch journal entry' });
    }
  });
  
  // Create a new journal entry
  app.post('/api/journal', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
      const { title, content, tags, mood, imageUrl } = req.body;
      
      // Validate required fields
      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }
      
      const journalEntry = await storage.createJournalEntry({
        userId: req.user.id,
        title,
        content,
        tags: tags || [],
        mood: mood || 'neutral',
        imageUrl: imageUrl || null
      });
      
      res.status(201).json(journalEntry);
    } catch (error) {
      console.error('Error creating journal entry:', error);
      res.status(500).json({ error: 'Failed to create journal entry' });
    }
  });
  
  // Update a journal entry
  app.put('/api/journal/:id', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const entryId = parseInt(req.params.id);
    if (isNaN(entryId)) {
      return res.status(400).json({ error: 'Invalid journal entry ID' });
    }
    
    try {
      // First check if the entry exists and belongs to the user
      const existingEntry = await storage.getJournalEntry(entryId);
      
      if (!existingEntry) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }
      
      if (existingEntry.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Update the entry
      const { title, content, tags, mood, imageUrl } = req.body;
      
      const updatedEntry = await storage.updateJournalEntry(entryId, {
        title,
        content,
        tags,
        mood,
        imageUrl
      });
      
      res.json(updatedEntry);
    } catch (error) {
      console.error('Error updating journal entry:', error);
      res.status(500).json({ error: 'Failed to update journal entry' });
    }
  });
  
  // Delete a journal entry
  app.delete('/api/journal/:id', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const entryId = parseInt(req.params.id);
    if (isNaN(entryId)) {
      return res.status(400).json({ error: 'Invalid journal entry ID' });
    }
    
    try {
      // First check if the entry exists and belongs to the user
      const existingEntry = await storage.getJournalEntry(entryId);
      
      if (!existingEntry) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }
      
      if (existingEntry.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Delete the entry
      const success = await storage.deleteJournalEntry(entryId);
      
      if (success) {
        res.status(204).end();
      } else {
        res.status(500).json({ error: 'Failed to delete journal entry' });
      }
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      res.status(500).json({ error: 'Failed to delete journal entry' });
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

  // User profile and preferences API endpoints
  app.patch('/api/user/profile', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
      const { username, email, firstName, lastName, bio } = req.body;
      
      // Update user profile
      const updatedUser = await storage.updateUserProfile(req.user.id, {
        username,
        email,
        firstName,
        lastName, 
        bio
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  });
  
  app.patch('/api/user/phone', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
      const { phoneNumber } = req.body;
      
      // Update user phone number
      const updatedUser = await storage.updateUserPhoneNumber(req.user.id, phoneNumber);
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating phone number:', error);
      res.status(500).json({ error: 'Failed to update phone number' });
    }
  });
  
  app.patch('/api/user/preferences', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
      const {
        emailFrequency,
        marketingEmails,
        receiveInsights,
        receiveSms,
        emailDeliveryTime,
        disableDailyEmails
      } = req.body;
      
      // Update user preferences
      const updatedUser = await storage.updateUserPreferences(req.user.id, {
        emailFrequency,
        marketingEmails,
        receiveInsights,
        receiveSms,
        emailDeliveryTime,
        disableDailyEmails
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user preferences:', error);
      res.status(500).json({ error: 'Failed to update user preferences' });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}