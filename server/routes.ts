import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertJournalEntrySchema, updateUserPreferencesSchema, insertSmsMessageSchema } from "@shared/schema";
import { emailService } from "./email";
import { twilioService } from "./twilio";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // =========== Journal Routes ===========
  
  // Get all journal entries for the current user
  app.get("/api/journal", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const filter = req.query as any;
      const entries = await storage.getJournalEntries(req.user.id, filter);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });
  
  // Get a specific journal entry
  app.get("/api/journal/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const entry = await storage.getJournalEntry(parseInt(req.params.id));
      
      if (!entry) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (entry.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(entry);
    } catch (error) {
      console.error("Error fetching journal entry:", error);
      res.status(500).json({ message: "Failed to fetch journal entry" });
    }
  });
  
  // Create a new journal entry
  app.post("/api/journal", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
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
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      console.error("Error creating journal entry:", error);
      res.status(500).json({ message: "Failed to create journal entry" });
    }
  });
  
  // Update a journal entry
  app.patch("/api/journal/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const entryId = parseInt(req.params.id);
      const existingEntry = await storage.getJournalEntry(entryId);
      
      if (!existingEntry) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (existingEntry.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Allow partial updates
      const updateSchema = insertJournalEntrySchema.partial().omit({ userId: true });
      const validatedData = updateSchema.parse(req.body);
      
      const updatedEntry = await storage.updateJournalEntry(entryId, validatedData);
      res.json(updatedEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      console.error("Error updating journal entry:", error);
      res.status(500).json({ message: "Failed to update journal entry" });
    }
  });
  
  // Delete a journal entry
  app.delete("/api/journal/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const entryId = parseInt(req.params.id);
      const existingEntry = await storage.getJournalEntry(entryId);
      
      if (!existingEntry) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (existingEntry.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteJournalEntry(entryId);
      
      if (success) {
        res.status(204).end();
      } else {
        res.status(500).json({ message: "Failed to delete journal entry" });
      }
    } catch (error) {
      console.error("Error deleting journal entry:", error);
      res.status(500).json({ message: "Failed to delete journal entry" });
    }
  });
  
  // =========== Email Routes ===========
  
  // Get all emails for the current user
  app.get("/api/emails", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const filter = req.query as any;
      const emails = await storage.getEmails(req.user.id, filter);
      res.json(emails);
    } catch (error) {
      console.error("Error fetching emails:", error);
      res.status(500).json({ message: "Failed to fetch emails" });
    }
  });
  
  // Get a specific email
  app.get("/api/emails/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const email = await storage.getEmail(parseInt(req.params.id));
      
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }
      
      if (email.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Mark as read
      await storage.markEmailAsRead(email.id);
      
      res.json(email);
    } catch (error) {
      console.error("Error fetching email:", error);
      res.status(500).json({ message: "Failed to fetch email" });
    }
  });
  
  // Request a new inspiration email
  app.post("/api/emails/request-inspiration", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const email = await emailService.sendFlappyEmail(req.user, "dailyInspiration");
      res.status(201).json(email);
    } catch (error) {
      console.error("Error requesting inspiration email:", error);
      res.status(500).json({ 
        message: "Failed to send inspiration email", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Simulate receiving an email reply
  app.post("/api/emails/simulate-reply", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      // Validate the request body
      const schema = z.object({
        content: z.string().min(1, "Content is required"),
        inReplyTo: z.string().optional(),
      });
      
      const { content, inReplyTo } = schema.parse(req.body);
      
      // Process the simulated email response
      await emailService.processIncomingEmail(
        req.user.email,
        "Re: Flappy's Message",
        content,
        inReplyTo
      );
      
      res.status(200).json({ message: "Journal entry created successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      console.error("Error processing simulated email reply:", error);
      res.status(500).json({ message: "Failed to process email reply" });
    }
  });
  
  // =========== User Preferences Routes ===========
  
  // Update user preferences
  app.patch("/api/user/preferences", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const validatedData = updateUserPreferencesSchema.parse(req.body);
      const updatedUser = await storage.updateUserPreferences(req.user.id, validatedData);
      
      // Filter out password from the response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Failed to update user preferences" });
    }
  });

  // Update user phone number
  app.patch("/api/user/phone", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      // Validate the request body
      const schema = z.object({
        phoneNumber: z.string().refine(val => /^\+?[1-9]\d{1,14}$/.test(val), {
          message: "Please enter a valid phone number in E.164 format (e.g., +14155552671)"
        })
      });
      
      const { phoneNumber } = schema.parse(req.body);
      
      // Check if phone number is already in use
      const existingUser = await storage.getUserByPhoneNumber(phoneNumber);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({ message: "Phone number already in use" });
      }
      
      const updatedUser = await storage.updateUserPhoneNumber(req.user.id, phoneNumber);
      
      // Filter out password from the response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      console.error("Error updating user phone number:", error);
      res.status(500).json({ message: "Failed to update user phone number" });
    }
  });

  // Update user subscription status
  app.patch("/api/user/subscription", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      // Validate the request body - in a real app, this would verify payment
      const schema = z.object({
        isPremium: z.boolean(),
        durationMonths: z.number().int().positive().optional()
      });
      
      const { isPremium, durationMonths = 1 } = schema.parse(req.body);
      
      // Calculate subscription end date if upgrading to premium
      let premiumUntil: Date | undefined;
      if (isPremium) {
        premiumUntil = new Date();
        premiumUntil.setMonth(premiumUntil.getMonth() + durationMonths);
      }
      
      const updatedUser = await storage.updateUserSubscription(req.user.id, isPremium, premiumUntil);
      
      // Filter out password from the response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      console.error("Error updating user subscription:", error);
      res.status(500).json({ message: "Failed to update user subscription" });
    }
  });
  
  // =========== SMS Routes ===========
  
  // Get SMS messages for the current user
  app.get("/api/sms", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Check if user is premium
    if (!req.user.isPremium) {
      return res.status(403).json({ 
        message: "SMS features are only available to premium users. Please upgrade your subscription." 
      });
    }
    
    try {
      const filter = req.query as any;
      const messages = await storage.getSmsMessages(req.user.id, filter);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching SMS messages:", error);
      res.status(500).json({ message: "Failed to fetch SMS messages" });
    }
  });
  
  // Send an SMS message as Flappy
  app.post("/api/sms/send", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Check if user is premium
    if (!req.user.isPremium) {
      return res.status(403).json({ 
        message: "SMS features are only available to premium users. Please upgrade your subscription." 
      });
    }
    
    // Ensure the user has a phone number
    if (!req.user.phoneNumber) {
      return res.status(400).json({ 
        message: "Please add your phone number in settings before using SMS features." 
      });
    }
    
    try {
      // Validate the request body
      const schema = z.object({
        content: z.string().min(1, "Content is required"),
      });
      
      const { content } = schema.parse(req.body);
      
      // Send the message
      const message = await twilioService.sendSmsMessage(req.user, content);
      
      if (!message) {
        return res.status(500).json({ message: "Failed to send SMS" });
      }
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      console.error("Error sending SMS:", error);
      res.status(500).json({ message: "Failed to send SMS" });
    }
  });
  
  // Request daily inspiration via SMS
  app.post("/api/sms/request-inspiration", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Check if user is premium
    if (!req.user.isPremium) {
      return res.status(403).json({ 
        message: "SMS features are only available to premium users. Please upgrade your subscription." 
      });
    }
    
    // Ensure the user has a phone number
    if (!req.user.phoneNumber) {
      return res.status(400).json({ 
        message: "Please add your phone number in settings before using SMS features." 
      });
    }
    
    try {
      const message = await twilioService.sendDailyInspirationSms(req.user);
      
      if (!message) {
        return res.status(500).json({ message: "Failed to send SMS inspiration" });
      }
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending SMS inspiration:", error);
      res.status(500).json({ message: "Failed to send SMS inspiration" });
    }
  });
  
  // Webhook endpoint for incoming SMS from Twilio
  app.post("/api/sms/webhook", async (req: Request, res: Response) => {
    try {
      const { From, Body } = req.body;
      
      if (!From || !Body) {
        return res.status(400).json({ message: "Missing required parameters" });
      }
      
      // Process the incoming SMS
      await twilioService.processIncomingSms(From, Body);
      
      // Return a TwiML response
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    } catch (error) {
      console.error("Error processing incoming SMS:", error);
      
      // Still return a valid TwiML response to acknowledge the message
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }
  });
  
  // Simulate receiving an SMS (for testing without Twilio)
  app.post("/api/sms/simulate-incoming", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // For testing, only allow in development
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ message: "Not found" });
    }
    
    try {
      // Validate the request body
      const schema = z.object({
        content: z.string().min(1, "Content is required"),
      });
      
      const { content } = schema.parse(req.body);
      
      if (!req.user.phoneNumber) {
        return res.status(400).json({ 
          message: "Please add your phone number in settings first" 
        });
      }
      
      // Process the simulated SMS
      await twilioService.processIncomingSms(req.user.phoneNumber, content);
      
      res.status(200).json({ message: "SMS processed successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      console.error("Error processing simulated SMS:", error);
      res.status(500).json({ message: "Failed to process SMS" });
    }
  });
  
  // =========== Admin Routes (for development testing only) ===========
  
  // Manually trigger daily inspiration emails (development only)
  app.post("/api/admin/send-daily-inspiration", async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ message: "Not found" });
    }
    
    try {
      await emailService.sendDailyInspiration();
      res.status(200).json({ message: "Daily inspiration emails sent" });
    } catch (error) {
      console.error("Error sending daily inspiration:", error);
      res.status(500).json({ message: "Failed to send daily inspiration emails" });
    }
  });
  
  // Manually trigger weekly insights emails (development only)
  app.post("/api/admin/send-weekly-insights", async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ message: "Not found" });
    }
    
    try {
      await emailService.sendWeeklyInsights();
      res.status(200).json({ message: "Weekly insight emails sent" });
    } catch (error) {
      console.error("Error sending weekly insights:", error);
      res.status(500).json({ message: "Failed to send weekly insight emails" });
    }
  });
  
  // Manually trigger daily SMS inspirations (development only)
  app.post("/api/admin/send-sms-inspirations", async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ message: "Not found" });
    }
    
    try {
      // Get all premium users with phone numbers
      const users = await Promise.resolve([]); // TODO: Implement user query
      
      // Send SMS to each premium user
      const results = [];
      for (const user of users) {
        if (user.isPremium && user.phoneNumber) {
          try {
            const message = await twilioService.sendDailyInspirationSms(user);
            if (message) {
              results.push({ userId: user.id, success: true });
            } else {
              results.push({ userId: user.id, success: false, error: "Failed to send" });
            }
          } catch (error) {
            results.push({ 
              userId: user.id, 
              success: false, 
              error: error instanceof Error ? error.message : "Unknown error" 
            });
          }
        }
      }
      
      res.status(200).json({ 
        message: `SMS inspirations sent to ${results.filter(r => r.success).length} users`,
        results
      });
    } catch (error) {
      console.error("Error sending SMS inspirations:", error);
      res.status(500).json({ 
        message: "Failed to send SMS inspirations",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
