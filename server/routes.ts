import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { z } from "zod";
import { 
  insertJournalEntrySchema, updateUserPreferencesSchema, insertSmsMessageSchema, User,
  type InsertEmailQueue, type EmailQueueItem
} from "@shared/schema";
import { emailService } from "./email";
import { twilioService } from "./twilio";
import { journalImageUpload, getFileUrl } from "./file-upload";
import { generateFlappyContent } from "./openai";
import { memoryService } from "./memory-service";
import { stripeService } from "./stripe";
import crypto from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // A health check route to verify API is up
  app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  // Journal entry image upload
  app.post("/api/journal/upload-image", journalImageUpload.single('image'), (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }
    
    // Return the URL for the uploaded image
    const imageUrl = getFileUrl(req, req.file.filename);
    res.status(200).json({ imageUrl });
  });

  // Get all journal entries for the current user
  app.get("/api/journal", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in to access journal entries" });
    }

    // Get optional query parameters for filtering
    const { mood, tag, startDate, endDate } = req.query;
    
    const filter: any = {};
    
    if (mood) filter.mood = mood as string;
    if (tag) filter.tag = tag as string;
    if (startDate) filter.startDate = new Date(startDate as string);
    if (endDate) filter.endDate = new Date(endDate as string);

    try {
      const entries = await storage.getJournalEntries(req.user.id, filter);
      res.status(200).json(entries);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      res.status(500).json({ error: "Failed to fetch journal entries" });
    }
  });

  // Get a specific journal entry
  app.get("/api/journal/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in to access journal entries" });
    }

    const entryId = parseInt(req.params.id);
    if (isNaN(entryId)) {
      return res.status(400).json({ error: "Invalid entry ID" });
    }

    try {
      const entry = await storage.getJournalEntry(entryId);
      
      if (!entry) {
        return res.status(404).json({ error: "Journal entry not found" });
      }
      
      // Check if the entry belongs to the current user
      if (entry.userId !== req.user.id) {
        return res.status(403).json({ error: "You don't have permission to access this entry" });
      }
      
      res.status(200).json(entry);
    } catch (error) {
      console.error("Error fetching journal entry:", error);
      res.status(500).json({ error: "Failed to fetch journal entry" });
    }
  });

  // Create a new journal entry
  app.post("/api/journal", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in to create journal entries" });
    }

    try {
      const validatedData = insertJournalEntrySchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      const entry = await storage.createJournalEntry(validatedData);
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating journal entry:", error);
      res.status(500).json({ error: "Failed to create journal entry" });
    }
  });

  // Update a journal entry
  app.patch("/api/journal/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in to update journal entries" });
    }

    const entryId = parseInt(req.params.id);
    if (isNaN(entryId)) {
      return res.status(400).json({ error: "Invalid entry ID" });
    }

    try {
      // First check if the entry exists and belongs to the user
      const existingEntry = await storage.getJournalEntry(entryId);
      
      if (!existingEntry) {
        return res.status(404).json({ error: "Journal entry not found" });
      }
      
      if (existingEntry.userId !== req.user.id) {
        return res.status(403).json({ error: "You don't have permission to modify this entry" });
      }
      
      // Only allow updating content, title, mood, tags, and imageUrl
      const updateFields = ['content', 'title', 'mood', 'tags', 'imageUrl'].reduce((acc, field) => {
        if (req.body[field] !== undefined) {
          acc[field] = req.body[field];
        }
        return acc;
      }, {} as any);
      
      const updatedEntry = await storage.updateJournalEntry(entryId, updateFields);
      res.status(200).json(updatedEntry);
    } catch (error) {
      console.error("Error updating journal entry:", error);
      res.status(500).json({ error: "Failed to update journal entry" });
    }
  });

  // Delete a journal entry
  app.delete("/api/journal/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in to delete journal entries" });
    }

    const entryId = parseInt(req.params.id);
    if (isNaN(entryId)) {
      return res.status(400).json({ error: "Invalid entry ID" });
    }

    try {
      // First check if the entry exists and belongs to the user
      const existingEntry = await storage.getJournalEntry(entryId);
      
      if (!existingEntry) {
        return res.status(404).json({ error: "Journal entry not found" });
      }
      
      if (existingEntry.userId !== req.user.id) {
        return res.status(403).json({ error: "You don't have permission to delete this entry" });
      }
      
      const success = await storage.deleteJournalEntry(entryId);
      
      if (success) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to delete journal entry" });
      }
    } catch (error) {
      console.error("Error deleting journal entry:", error);
      res.status(500).json({ error: "Failed to delete journal entry" });
    }
  });

  // Get all emails
  app.get("/api/emails", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in to access emails" });
    }

    try {
      const emails = await storage.getEmails(req.user.id);
      res.status(200).json(emails);
    } catch (error) {
      console.error("Error fetching emails:", error);
      res.status(500).json({ error: "Failed to fetch emails" });
    }
  });

  // Get a specific email
  app.get("/api/emails/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in to access emails" });
    }

    const emailId = parseInt(req.params.id);
    if (isNaN(emailId)) {
      return res.status(400).json({ error: "Invalid email ID" });
    }

    try {
      const email = await storage.getEmail(emailId);
      
      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }
      
      if (email.userId !== req.user.id) {
        return res.status(403).json({ error: "You don't have permission to access this email" });
      }
      
      // Mark as read if it wasn't already
      if (!email.isRead) {
        await storage.markEmailAsRead(emailId);
      }
      
      res.status(200).json(email);
    } catch (error) {
      console.error("Error fetching email:", error);
      res.status(500).json({ error: "Failed to fetch email" });
    }
  });
  
  // Request a new daily inspiration
  app.post("/api/emails/request-inspiration", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    try {
      const email = await emailService.sendFlappyEmail(req.user, "daily_inspiration");
      res.status(200).json(email);
    } catch (error) {
      console.error("Error sending daily inspiration:", error);
      res.status(500).json({ error: "Failed to send daily inspiration" });
    }
  });
  
  // Simulate receiving an email reply (for testing)
  app.post("/api/emails/simulate-reply", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Email content is required" });
    }
    
    try {
      // Simulate receiving an email from the current user
      await emailService.processIncomingEmail(
        req.user.email, 
        "Re: From Flappy", 
        content,
        "some-message-id" // Simulating a reply
      );
      
      res.status(200).json({ success: true, message: "Email processed" });
    } catch (error) {
      console.error("Error processing simulated email:", error);
      res.status(500).json({ error: "Failed to process email" });
    }
  });
  
  // Endpoint for testing email queue
  app.post("/api/emails/test-incoming", async (req: Request, res: Response) => {
    // This is a public endpoint - no authentication required for testing
    
    const { from, subject, text } = req.body;
    
    if (!from || !subject || !text) {
      return res.status(400).json({ error: "Email details are required (from, subject, text)" });
    }
    
    try {
      console.log('🔍 TEST EMAIL RECEIVED:');
      console.log(`From: ${from}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
      
      // Create a queue item with the test data
      const queueItem: InsertEmailQueue = {
        payload: { 
          from, 
          subject, 
          text,
          html: `<p>${text}</p>`, // Simple HTML version
          headers: {
            'Message-ID': `test-${Date.now()}@test.featherweight.world`,
            'In-Reply-To': ''
          }
        },
        status: "pending"
      };
      
      const savedItem = await storage.enqueueEmail(queueItem);
      console.log(`✅ Test email queued for processing (Queue ID: ${savedItem.id})`);
      
      res.status(200).json({ 
        success: true, 
        message: "Test email queued for processing",
        queueId: savedItem.id
      });
    } catch (error) {
      console.error("Error queueing test email:", error);
      res.status(500).json({ error: "Failed to queue test email" });
    }
  });
  
  // Public endpoint for testing email functionality
  app.post("/api/public/test-email", async (req: Request, res: Response) => {
    console.log('📧 PUBLIC EMAIL TEST ENDPOINT CALLED');
    
    const { from, subject, text } = req.body;
    
    if (!from || !subject || !text) {
      return res.status(400).json({ error: "Email details are required (from, subject, text)" });
    }
    
    try {
      console.log('📝 Test email details:');
      console.log(`From: ${from}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
      
      // Create a queue item with the test data
      const queueItem: InsertEmailQueue = {
        payload: { 
          from, 
          subject, 
          text,
          html: `<p>${text}</p>`, // Simple HTML version
          headers: {
            'Message-ID': `test-${Date.now()}@test.featherweight.world`,
            'In-Reply-To': ''
          }
        },
        status: "pending"
      };
      
      const savedItem = await storage.enqueueEmail(queueItem);
      console.log(`✅ Public test email queued for processing (Queue ID: ${savedItem.id})`);
      
      res.status(200).json({ 
        success: true, 
        message: "Test email queued for processing",
        queueId: savedItem.id
      });
    } catch (error) {
      console.error("Error queueing public test email:", error);
      res.status(500).json({ error: "Failed to queue test email" });
    }
  });
  
  // SendGrid Inbound Parse webhook for handling incoming emails
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
          
          // Instead of processing immediately, enqueue the webhook payload
          const queueItem: InsertEmailQueue = {
            payload: req.body, // Store the complete webhook payload
            status: "pending"
          };
          
          // Add to processing queue
          await storage.enqueueEmail(queueItem);
          console.log('✅ Email successfully queued for processing');
          
          // Return 200 OK immediately to acknowledge receipt
          return res.status(200).send('OK: Email queued for processing');
        } else if (Buffer.isBuffer(req.body)) {
          console.log('Body is a Buffer of length:', req.body.length);
          
          // Create a queue item with the buffer data
          const queueItem: InsertEmailQueue = {
            payload: { buffer: req.body.toString('base64') },
            status: "pending"
          };
          
          await storage.enqueueEmail(queueItem);
          console.log('✅ Buffer data queued for processing');
          
          return res.status(200).send('OK: Email data queued for processing');
        } else if (typeof req.body === 'string') {
          console.log(`Body is a string of length: ${req.body.length}`);
          
          // Create a queue item with the string data
          const queueItem: InsertEmailQueue = {
            payload: { text: req.body },
            status: "pending"
          };
          
          await storage.enqueueEmail(queueItem);
          console.log('✅ String data queued for processing');
          
          return res.status(200).send('OK: Email data queued for processing');
        } else {
          console.log(`Body is of unexpected type: ${typeof req.body}`);
          
          // Still queue whatever we received
          const queueItem: InsertEmailQueue = {
            payload: { data: JSON.stringify(req.body) },
            status: "pending"
          };
          
          await storage.enqueueEmail(queueItem);
          console.log('✅ Unknown data type queued for analysis');
          
          return res.status(200).send('OK: Data queued for processing');
        }
      } else {
        console.log("Request body is empty or undefined");
        return res.status(200).send('Error: Missing body data');
      }
    } catch (error) {
      console.error('⚠️ Error queueing webhook payload:', error);
      
      // Even on error, return 200 to prevent SendGrid from retrying
      // We'll log the error but acknowledge receipt
      res.status(200).send('Webhook received with error');
    }
  });

  // Update user profile
  app.patch("/api/user/profile", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    try {
      const updateData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email
      };
      
      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      
      const updatedUser = await storage.updateUserProfile(req.user.id, updateData);
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });
  
  // Update user preferences
  app.patch("/api/user/preferences", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    try {
      const validatedData = updateUserPreferencesSchema.parse(req.body);
      const updatedUser = await storage.updateUserPreferences(req.user.id, validatedData);
      res.status(200).json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating preferences:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });
  
  // Update user phone number
  app.patch("/api/user/phone", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    const { phoneNumber } = req.body;
    
    // Allow null to remove the phone number
    if (phoneNumber !== null && typeof phoneNumber !== 'string') {
      return res.status(400).json({ error: "Phone number must be a string or null" });
    }
    
    try {
      // If providing a phone number, validate it
      if (phoneNumber && !phoneNumber.match(/^\+?[0-9]{10,15}$/)) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }
      
      const updatedUser = await storage.updateUserPhoneNumber(req.user.id, phoneNumber);
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error updating phone number:", error);
      res.status(500).json({ error: "Failed to update phone number" });
    }
  });
  
  // Create a subscription with Stripe
  app.post("/api/create-subscription", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    try {
      // If user already has a subscription, return the current one
      if (req.user.stripeSubscriptionId) {
        const subscription = await stripeService.getSubscription(req.user.stripeSubscriptionId);
        return res.status(200).json({
          subscriptionId: subscription.id,
          clientSecret: subscription.latest_invoice?.payment_intent?.client_secret
        });
      }
      
      // Otherwise create a new subscription
      const result = await stripeService.createSubscription(req.user);
      
      // Update the user record with Stripe customer ID
      if (result.customerId) {
        await storage.updateUserStripeCustomerId(req.user.id, result.customerId);
      }
      
      res.status(200).json({
        subscriptionId: result.subscriptionId,
        clientSecret: result.clientSecret
      });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });
  
  // Update payment method
  app.post("/api/update-payment-method", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    const { paymentMethodId } = req.body;
    
    if (!paymentMethodId) {
      return res.status(400).json({ error: "Payment method ID is required" });
    }
    
    try {
      // Ensure user has a Stripe customer ID
      if (!req.user.stripeCustomerId) {
        return res.status(400).json({ error: "No Stripe customer found" });
      }
      
      const result = await stripeService.updateDefaultPaymentMethod(
        req.user.stripeCustomerId,
        paymentMethodId
      );
      
      res.status(200).json({ success: true, paymentMethod: result.paymentMethod });
    } catch (error) {
      console.error("Error updating payment method:", error);
      res.status(500).json({ error: "Failed to update payment method" });
    }
  });
  
  // Cancel subscription
  app.post("/api/cancel-subscription", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    try {
      // Check if user has an active subscription
      if (!req.user.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription found" });
      }
      
      // Cancel at period end rather than immediately
      const result = await stripeService.cancelSubscription(req.user.stripeSubscriptionId);
      
      // Update the user's premium status based on the cancellation date
      const premiumUntil = new Date(result.currentPeriodEnd * 1000);
      await storage.updateUserSubscription(req.user.id, true, premiumUntil);
      
      res.status(200).json({
        success: true,
        message: "Subscription will be canceled at the end of the billing period",
        cancelAt: new Date(result.currentPeriodEnd * 1000)
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });
  
  // Get payment methods
  app.get("/api/payment-methods", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    try {
      const paymentMethods = await storage.getPaymentMethods(req.user.id);
      res.status(200).json(paymentMethods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });
  
  // Admin: Update a user's subscription status (for testing)
  app.patch("/api/user/subscription", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    // In a real app, you'd check if the user is an admin
    const { isPremium, days } = req.body;
    
    if (typeof isPremium !== 'boolean') {
      return res.status(400).json({ error: "isPremium field is required and must be a boolean" });
    }
    
    try {
      let premiumUntil = null;
      
      if (isPremium && days) {
        // Set premium expiration date
        premiumUntil = new Date();
        premiumUntil.setDate(premiumUntil.getDate() + parseInt(days));
      }
      
      const updatedUser = await storage.updateUserSubscription(req.user.id, isPremium, premiumUntil);
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error updating subscription status:", error);
      res.status(500).json({ error: "Failed to update subscription status" });
    }
  });
  
  // Get SMS messages
  app.get("/api/sms", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    // Check if user is premium
    if (!req.user.isPremium) {
      return res.status(403).json({ error: "SMS services require a premium subscription" });
    }
    
    try {
      const messages = await storage.getSmsMessages(req.user.id);
      res.status(200).json(messages);
    } catch (error) {
      console.error("Error fetching SMS messages:", error);
      res.status(500).json({ error: "Failed to fetch SMS messages" });
    }
  });
  
  // Send SMS message
  app.post("/api/sms/send", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    // Check if user is premium
    if (!req.user.isPremium) {
      return res.status(403).json({ error: "SMS services require a premium subscription" });
    }
    
    // Verify user has a phone number configured
    if (!req.user.phoneNumber) {
      return res.status(400).json({ error: "You need to add a phone number to your account first" });
    }
    
    const { content } = req.body;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: "Message content is required" });
    }
    
    try {
      // Create the message in our system first
      const validatedData = insertSmsMessageSchema.parse({
        userId: req.user.id,
        content,
        direction: 'outgoing',
        status: 'pending'
      });
      
      const message = await storage.createSmsMessage(validatedData);
      
      // Send via Twilio
      const result = await twilioService.sendSms(
        req.user.phoneNumber,
        content
      );
      
      // Update the message with delivery status
      await storage.updateSmsMessage(message.id, {
        status: result.success ? 'delivered' : 'failed',
        externalId: result.messageId || null,
        errorMessage: result.error || null
      });
      
      res.status(200).json({ success: result.success, messageId: message.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error sending SMS:", error);
      res.status(500).json({ error: "Failed to send SMS message" });
    }
  });
  
  // Request SMS inspiration
  app.post("/api/sms/request-inspiration", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    // Check if user is premium
    if (!req.user.isPremium) {
      return res.status(403).json({ error: "SMS services require a premium subscription" });
    }
    
    // Verify user has a phone number configured
    if (!req.user.phoneNumber) {
      return res.status(400).json({ error: "You need to add a phone number to your account first" });
    }
    
    try {
      // Generate an inspiration message
      const inspiration = await generateFlappyContent("daily_inspiration");
      
      // Send the SMS
      const smsResult = await twilioService.sendSms(
        req.user.phoneNumber,
        inspiration
      );
      
      if (!smsResult.success) {
        throw new Error(smsResult.error || "Failed to send SMS");
      }
      
      // Log the message
      const smsMessage = await storage.createSmsMessage({
        userId: req.user.id,
        content: inspiration,
        direction: 'outgoing',
        status: 'delivered',
        externalId: smsResult.messageId || null,
        type: 'daily_inspiration'
      });
      
      res.status(200).json({ success: true, message: smsMessage });
    } catch (error) {
      console.error("Error sending SMS inspiration:", error);
      res.status(500).json({ error: "Failed to send SMS inspiration" });
    }
  });
  
  // Webhook for inbound SMS messages (from Twilio)
  app.post("/api/sms/webhook", async (req: Request, res: Response) => {
    console.log('🔔 SMS Webhook Received:', req.body);
    
    try {
      // Extract SMS data from Twilio webhook
      const from = req.body.From;
      const body = req.body.Body;
      const messageId = req.body.MessageSid;
      
      if (!from || !body) {
        console.error("Missing critical SMS data");
        return res.status(200).send("Error: Missing SMS data");
      }
      
      // Find user by phone number
      const user = await storage.getUserByPhoneNumber(from);
      
      if (!user) {
        console.warn(`No registered user found for phone number: ${from}`);
        // We still return 200 to Twilio
        return res.status(200).send(
          "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response>" +
          "<Message>Thank you for contacting Featherweight. Please register on our website first to use SMS journaling.</Message>" +
          "</Response>"
        );
      }
      
      // Save the incoming message
      const message = await storage.createSmsMessage({
        userId: user.id,
        content: body,
        direction: 'incoming',
        status: 'received',
        externalId: messageId
      });
      
      console.log(`SMS from ${from} saved with ID ${message.id}`);
      
      // Process message content to generate Flappy's response
      // Extract sentiment, topics, etc.
      const topics = await memoryService.processMessage(user.id, body, 'sms');
      
      // Generate Flappy's response
      const flappyResponse = await generateFlappyContent("sms_reply", { 
        message: body,
        topics: topics.map(t => t.topic),
        username: user.username,
        isPremium: user.isPremium
      });
      
      // Save as a journal entry if it seems like one
      let journalEntry = null;
      if (body.length > 50 || body.includes("journal") || body.includes("dear")) {
        journalEntry = await storage.createJournalEntry({
          userId: user.id,
          content: body,
          title: null,
          mood: null,
          tags: topics.map(t => t.topic) || null,
          emailId: null
        });
      }
      
      // Send the response back
      const responseMessage = await twilioService.sendSms(from, flappyResponse);
      
      // Save Flappy's response
      await storage.createSmsMessage({
        userId: user.id,
        content: flappyResponse,
        direction: 'outgoing',
        status: responseMessage.success ? 'delivered' : 'failed',
        externalId: responseMessage.messageId || null,
        errorMessage: responseMessage.error || null
      });
      
      // Return TwiML response
      return res.status(200).send(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>"
      );
    } catch (error) {
      console.error("Error processing inbound SMS:", error);
      return res.status(200).send("Error processing SMS");
    }
  });
  
  // Simulate inbound SMS (for testing)
  app.post("/api/sms/simulate-incoming", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    // Check if user is premium
    if (!req.user.isPremium) {
      return res.status(403).json({ error: "SMS services require a premium subscription" });
    }
    
    // Verify user has a phone number configured
    if (!req.user.phoneNumber) {
      return res.status(400).json({ error: "You need to add a phone number to your account first" });
    }
    
    const { content } = req.body;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: "Message content is required" });
    }
    
    try {
      // Create the simulated inbound message
      const message = await storage.createSmsMessage({
        userId: req.user.id,
        content,
        direction: 'incoming',
        status: 'received',
        externalId: `sim-${Date.now()}`
      });
      
      // Process message content to generate Flappy's response
      const topics = await memoryService.processMessage(req.user.id, content, 'sms');
      
      // Generate Flappy's response
      const flappyResponse = await generateFlappyContent("sms_reply", { 
        message: content,
        topics: topics.map(t => t.topic),
        username: req.user.username,
        isPremium: req.user.isPremium
      });
      
      // Save as a journal entry if it seems like one
      let journalEntry = null;
      if (content.length > 50 || content.includes("journal") || content.includes("dear")) {
        journalEntry = await storage.createJournalEntry({
          userId: req.user.id,
          content,
          title: null,
          mood: null,
          tags: topics.map(t => t.topic) || null,
          emailId: null
        });
      }
      
      // Save Flappy's simulated response
      const responseMessage = await storage.createSmsMessage({
        userId: req.user.id,
        content: flappyResponse,
        direction: 'outgoing',
        status: 'delivered',
        externalId: `sim-resp-${Date.now()}`
      });
      
      res.status(200).json({
        success: true,
        inboundMessage: message,
        flappyResponse: responseMessage,
        journalEntry: journalEntry || undefined
      });
    } catch (error) {
      console.error("Error processing simulated SMS:", error);
      res.status(500).json({ error: "Failed to process simulated SMS" });
    }
  });
  
  // Admin: Send daily inspiration emails to eligible users
  app.post("/api/admin/send-daily-inspiration", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    // In a real app, check for admin privileges
    
    try {
      const result = await emailService.sendDailyInspiration();
      res.status(200).json({
        success: result.success,
        emailsSent: result.count
      });
    } catch (error) {
      console.error("Error sending daily inspirations:", error);
      res.status(500).json({ error: "Failed to send daily inspirations" });
    }
  });
  
  // API endpoint for hourly processing of emails
  app.post("/api/cron/hourly-email-delivery", async (req: Request, res: Response) => {
    const apiKey = req.headers['x-api-key'];
    
    // In production, verify the API key for cron job authentication
    if (!apiKey) {
      return res.status(401).json({ error: "Missing API key" });
    }
    
    try {
      // Process any pending emails in the queue
      let processed = 0;
      let successful = 0;
      let failed = 0;
      
      // Get pending emails from the queue
      const pendingItems: EmailQueueItem[] = [];
      let nextItem = await storage.getNextPendingEmail();
      
      while (nextItem) {
        processed++;
        
        try {
          // Mark as processing
          await storage.markEmailProcessing(nextItem.id);
          
          // Process the email
          // In real implementation, this would call an email processor
          // For now just mark it completed
          await storage.markEmailCompleted(nextItem.id);
          successful++;
        } catch (error) {
          console.error(`Failed to process email ${nextItem.id}:`, error);
          await storage.markEmailFailed(nextItem.id, String(error));
          failed++;
        }
        
        // Get next item
        nextItem = await storage.getNextPendingEmail();
      }
      
      res.status(200).json({
        processed,
        successful,
        failed
      });
    } catch (error) {
      console.error("Error in hourly email processing:", error);
      res.status(500).json({ error: "Failed to process emails" });
    }
  });
  
  // Admin: Send weekly insight emails
  app.post("/api/admin/send-weekly-insights", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    // In a real app, check for admin privileges
    
    try {
      const result = await emailService.sendWeeklyInsights();
      res.status(200).json({
        success: result.success,
        emailsSent: result.count
      });
    } catch (error) {
      console.error("Error sending weekly insights:", error);
      res.status(500).json({ error: "Failed to send weekly insights" });
    }
  });
  
  // Admin: Send SMS inspirations
  app.post("/api/admin/send-sms-inspirations", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    // In a real app, check for admin privileges
    
    try {
      // Find premium users with SMS enabled
      const users = await storage.getAllUsers();
      const smsEnabledUsers = users.filter(user => 
        user.isPremium && user.phoneNumber
      );
      
      let successCount = 0;
      let failCount = 0;
      
      // Send SMS to each eligible user
      for (const user of smsEnabledUsers) {
        try {
          // Generate inspiration content
          const inspiration = await generateFlappyContent("daily_inspiration");
          
          // Send the SMS
          const smsResult = await twilioService.sendSms(
            user.phoneNumber,
            inspiration
          );
          
          if (smsResult.success) {
            // Log the message
            await storage.createSmsMessage({
              userId: user.id,
              content: inspiration,
              direction: 'outgoing',
              status: 'delivered',
              externalId: smsResult.messageId || null,
              type: 'daily_inspiration'
            });
            
            successCount++;
          } else {
            console.error(`Failed to send SMS to ${user.id}:`, smsResult.error);
            failCount++;
          }
        } catch (error) {
          console.error(`Error sending SMS to user ${user.id}:`, error);
          failCount++;
        }
      }
      
      res.status(200).json({
        success: true,
        totalUsers: smsEnabledUsers.length,
        successful: successCount,
        failed: failCount
      });
    } catch (error) {
      console.error("Error sending SMS inspirations:", error);
      res.status(500).json({ error: "Failed to send SMS inspirations" });
    }
  });
  
  // Forgot password
  app.post("/api/forgot-password", async (req: Request, res: Response) => {
    const { email } = req.body;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: "Email is required" });
    }
    
    try {
      // Find the user by email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal that the user doesn't exist
        return res.status(200).json({ message: "If an account with that email exists, a password reset link has been sent" });
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date();
      resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // 1 hour expiry
      
      // Store token in database
      await storage.updateUserResetToken(user.id, resetToken, resetTokenExpires);
      
      // Send reset email
      await emailService.sendEmail(
        user.email,
        "Reset Your Featherweight Password",
        `Hello ${user.firstName || user.username},\n\nYou requested a password reset for your Featherweight account. Please use the following link to reset your password (valid for 1 hour):\n\n[Reset Password Link]\n\nIf you did not request this reset, please ignore this email.\n\nWarmly,\nFlappy the Pelican\nFeatherweight - Your Journaling Companion`,
        user.isPremium
      );
      
      res.status(200).json({ message: "If an account with that email exists, a password reset link has been sent" });
    } catch (error) {
      console.error("Error processing password reset:", error);
      res.status(500).json({ error: "Failed to process password reset" });
    }
  });
  
  // Reset password
  app.post("/api/reset-password", async (req: Request, res: Response) => {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
    }
    
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    
    try {
      // Find user by reset token
      const user = await storage.getUserByResetToken(token);
      
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }
      
      // Check if token is expired
      if (user.resetTokenExpires && user.resetTokenExpires < new Date()) {
        return res.status(400).json({ error: "Token has expired" });
      }
      
      // Hash new password and update user
      const hashedPassword = await hashPassword(password);
      await storage.updateUserPasswordAndClearToken(user.id, hashedPassword);
      
      res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
  
  // Get mood analytics
  app.get("/api/analytics/mood", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    try {
      // Get journal entries
      const journalEntries = await storage.getJournalEntries(req.user.id);
      
      // Extract and group moods
      const moodCounts: Record<string, number> = {};
      const moodsByDate: Record<string, string[]> = {};
      
      for (const entry of journalEntries) {
        if (entry.mood) {
          // Count total occurrences
          moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
          
          // Group by date (YYYY-MM-DD)
          const dateStr = entry.createdAt.toISOString().split('T')[0];
          if (!moodsByDate[dateStr]) {
            moodsByDate[dateStr] = [];
          }
          moodsByDate[dateStr].push(entry.mood);
        }
      }
      
      // Calculate mood frequency over time
      const dateRange = Object.keys(moodsByDate).sort();
      const moodTimeline = dateRange.map(date => {
        const dayCounts: Record<string, number> = {};
        moodsByDate[date].forEach(mood => {
          dayCounts[mood] = (dayCounts[mood] || 0) + 1;
        });
        return { date, moods: dayCounts };
      });
      
      // Get most frequent mood
      let mostFrequentMood = null;
      let maxCount = 0;
      for (const [mood, count] of Object.entries(moodCounts)) {
        if (count > maxCount) {
          mostFrequentMood = mood;
          maxCount = count;
        }
      }
      
      // Format for display
      const moodStats = {
        summary: {
          totalEntries: journalEntries.length,
          entriesWithMood: journalEntries.filter(e => e.mood).length,
          mostFrequentMood,
          mostFrequentMoodEmoji: getMoodEmoji(mostFrequentMood || ''),
          moodDistribution: Object.entries(moodCounts).map(([mood, count]) => ({
            mood,
            emoji: getMoodEmoji(mood),
            count,
            percentage: Math.round((count / journalEntries.filter(e => e.mood).length) * 100)
          }))
        },
        timeline: moodTimeline
      };
      
      res.status(200).json(moodStats);
    } catch (error) {
      console.error("Error generating mood analytics:", error);
      res.status(500).json({ error: "Failed to generate mood analytics" });
    }
  });
  
  // Helper function to get emoji for mood
  function getMoodEmoji(mood: string): string {
    const moodEmojis: Record<string, string> = {
      happy: "😊",
      calm: "😌",
      neutral: "😐",
      sad: "😢",
      frustrated: "😤"
    };
    return moodEmojis[mood] || "❓";
  }
  
  // Handle direct conversation with Flappy (non-email, non-SMS)
  app.post("/api/conversation", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "You must be logged in" });
    }
    
    const { message, saveAsJournal } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "Message is required" });
    }
    
    try {
      // Process the message and get Flappy's response
      const result = await memoryService.processMessage(req.user.id, message, 'journal_topic');
      
      // Generate Flappy's response based on the message and extracted topics
      const flappyResponse = await generateFlappyContent("conversation_reply", {
        message,
        topics: result.map(r => r.topic),
        username: req.user.username,
        isPremium: req.user.isPremium,
        isFirstMessage: false
      });
      
      // If requested, save the user's message as a journal entry
      let journalEntry = null;
      if (saveAsJournal) {
        journalEntry = await storage.createJournalEntry({
          userId: req.user.id,
          content: message,
          title: null,
          mood: null,
          tags: result.map(r => r.topic),
          emailId: null
        });
      }
      
      res.status(200).json({
        message,
        response: flappyResponse,
        topics: result,
        journalEntry
      });
    } catch (error) {
      console.error("Error processing conversation:", error);
      res.status(500).json({ error: "Failed to process conversation" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}