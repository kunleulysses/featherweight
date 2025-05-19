import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { type InsertEmailQueue } from "@shared/schema";
import { emailService } from "./email";
import { journalImageUpload, getFileUrl } from "./file-upload";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  
  // Test endpoint for public email webhook testing
  app.post("/api/public/test-email", async (req: Request, res: Response) => {
    try {
      console.log('📨 TEST EMAIL API ENDPOINT ACCESSED');
      console.log(`Request received at: ${new Date().toISOString()}`);
      console.log(`Content-Type: ${req.headers['content-type']}`);
      
      // Log request body structure for debugging
      if (req.body) {
        console.log('Request body format:', typeof req.body);
        if (typeof req.body === 'object') {
          console.log('Request body keys:', Object.keys(req.body));
        }
      } else {
        console.log('Request body is empty or undefined');
      }
      
      // Extract email content from request body
      let content = '';
      let from = '';
      
      if (typeof req.body === 'object') {
        // Format 1: SendGrid webhook style
        if (req.body.text) {
          content = req.body.text;
          from = req.body.from || 'test@example.com';
        } 
        // Format 2: Simple JSON payload
        else if (req.body.content) {
          content = req.body.content;
          from = req.body.from || 'test@example.com';
        }
      } else if (typeof req.body === 'string') {
        // Format 3: Raw text payload
        content = req.body;
        from = 'test@example.com';
      }
      
      if (!content) {
        console.log('No content extracted from request, using fallback');
        content = 'This is a test email to Flappy.';
      }
      
      // Queue the email for processing
      const queueItem: InsertEmailQueue = {
        payload: {
          from: from || 'test@example.com',
          subject: 'Test Email',
          text: content
        },
        status: "pending"
      };
      
      const saved = await storage.enqueueEmail(queueItem);
      console.log(`✅ Test email queued for processing (Queue ID: ${saved.id})`);
      
      return res.status(200).json({
        success: true,
        message: 'Email received and queued for processing',
        queueId: saved.id
      });
    } catch (error) {
      console.error('❌ Error processing test email:', error);
      return res.status(200).json({
        success: false,
        message: 'Error occurred but webhook acknowledged',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Enhanced SendGrid webhook handler with detailed logging
  app.post("/api/emails/webhook", async (req: Request, res: Response) => {
    console.log('🔔 === SENDGRID WEBHOOK REQUEST RECEIVED === 🔔');
    console.log(`Request received at: ${new Date().toISOString()}`);
    console.log(`Content-Type: ${req.headers['content-type']}`);
    console.log(`Content-Length: ${req.headers['content-length']}`);
    
    try {
      console.log("=== WEBHOOK HEADERS ===");
      Object.entries(req.headers).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });
      
      // More detailed logging of body structure
      console.log("=== WEBHOOK BODY STRUCTURE ===");
      if (req.body) {
        if (typeof req.body === 'object') {
          const bodyKeys = Object.keys(req.body);
          console.log(`Body is an object with keys: ${bodyKeys.join(', ')}`);
          
          // Try to parse as JSON if it's a SendGrid webhook
          try {
            // Create a queue item with the object data
            const queueItem: InsertEmailQueue = {
              payload: req.body,
              status: "pending"
            };
            
            const saved = await storage.enqueueEmail(queueItem);
            console.log(`✅ Parsed JSON data queued for processing (Queue ID: ${saved.id})`);
            
            return res.status(200).send('OK: Email data queued for processing');
          } catch (e) {
            console.log('Failed to process as JSON object, treating as raw data');
            
            // Create a queue item with the raw text
            const queueItem: InsertEmailQueue = {
              payload: { 
                text: JSON.stringify(req.body),
                processedAt: new Date().toISOString(),
                note: 'JSON stringified'
              },
              status: "pending"
            };
            
            const saved = await storage.enqueueEmail(queueItem);
            console.log(`✅ Raw text queued for processing (Queue ID: ${saved.id})`);
            
            return res.status(200).send('OK: Email data queued for processing');
          }
        } else if (typeof req.body === 'string') {
          console.log(`Body is a string of length: ${req.body.length}`);
          
          // Create a queue item with the string data
          const queueItem: InsertEmailQueue = {
            payload: { text: req.body },
            status: "pending"
          };
          
          const saved = await storage.enqueueEmail(queueItem);
          console.log(`✅ String data queued for processing (Queue ID: ${saved.id})`);
          
          return res.status(200).send('OK: Email data queued for processing');
        } else {
          console.log(`Body type not recognized: ${typeof req.body}`);
          
          // Create a generic queue item with whatever data we have
          const queueItem: InsertEmailQueue = {
            payload: { 
              rawData: req.body,
              processedAt: new Date().toISOString(),
              note: 'Unrecognized format'
            },
            status: "pending"
          };
          
          const saved = await storage.enqueueEmail(queueItem);
          console.log(`✅ Unrecognized data queued for processing (Queue ID: ${saved.id})`);
          
          return res.status(200).send('OK: Email data queued for processing');
        }
      } else {
        console.log("Request body is empty or undefined");
        return res.status(200).send('Error: Missing body data');
      }
    } catch (error) {
      console.error('⚠️ Error queueing webhook payload:', error);
      
      // Even on error, return 200 to prevent SendGrid from retrying
      // We'll log the error but acknowledge receipt
      return res.status(200).send('Webhook received with error');
    }
  });

  // Create the HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}