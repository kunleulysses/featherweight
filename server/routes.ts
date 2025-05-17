import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertJournalEntrySchema, updateUserPreferencesSchema, insertSmsMessageSchema, User } from "@shared/schema";
import { emailService } from "./email";
import { twilioService } from "./twilio";
import { journalImageUpload, getFileUrl } from "./file-upload";
import { generateFlappyContent } from "./openai";
import { memoryService } from "./memory-service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // =========== Journal Routes ===========
  
  // Upload journal image
  app.post("/api/journal/upload-image", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    journalImageUpload.single('image')(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Generate URL for the uploaded file
      const imageUrl = getFileUrl(req, req.file.filename);
      
      res.json({
        imageUrl,
        message: "Image uploaded successfully"
      });
    });
  });
  
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
  
  // SendGrid Inbound Parse webhook for handling incoming emails
  app.post("/api/emails/webhook", async (req: Request, res: Response) => {
    try {
      console.log("Received webhook from SendGrid - Headers:", req.headers);
      console.log("Received webhook from SendGrid - Body:", req.body);
      
      // SendGrid Inbound Parse format can vary between raw email and parsed objects
      // Extract email details from the request
      let from = req.body.from || req.body.sender || '';
      const to = req.body.to || req.body.recipient || '';
      const subject = req.body.subject || '';
      const text = req.body.text || '';
      const html = req.body.html || '';
      const inReplyTo = req.body.headers?.['In-Reply-To'] || req.body['In-Reply-To'] || '';
      
      // Extract the sender's email address
      let senderEmail = from;
      
      // Handle the different formats SendGrid might provide for the from field
      if (typeof from === 'string') {
        // Format can be "John Doe <john@example.com>" or just "john@example.com"
        const emailMatch = from.match(/<(.+@.+)>/) || from.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
        senderEmail = emailMatch ? emailMatch[1] : from;
      }
      
      console.log(`Processing email from: ${senderEmail}, subject: ${subject}`);
      
      // Find the user associated with this email
      const user = await storage.getUserByEmail(senderEmail);
      
      if (!user) {
        console.warn(`Email received from unregistered user: ${senderEmail}`);
        
        // For new users, we might want to create a welcome response or signup invitation
        // For now, just acknowledge receipt
        return res.status(200).send('OK');
      }
      
      // Determine if this is a reply based on subject or headers
      const isReply = inReplyTo || subject.toLowerCase().startsWith('re:');
      
      // Get the text content (prefer plain text over HTML)
      const content = text || (html ? html.replace(/<[^>]*>/g, '') : '');
      
      if (!content) {
        console.warn("Email received with empty content");
        return res.status(200).send('OK');
      }
      
      console.log(`Processing email content of length ${content.length}`);
      
      // Process the incoming email
      await emailService.processIncomingEmail(
        senderEmail,
        subject || 'No Subject',
        content,
        inReplyTo
      );
      
      console.log(`Successfully processed email from ${senderEmail}`);
      
      // Always return 200 OK to acknowledge receipt
      res.status(200).send('OK');
    } catch (error) {
      console.error('Error processing webhook:', error);
      // Still return 200 to acknowledge receipt (SendGrid will retry on non-200)
      res.status(200).send('Error processed');
    }
  });
  
  // =========== User Preferences Routes ===========
  
  // Update user profile information
  app.patch("/api/user/profile", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { username, email, firstName, lastName, bio } = req.body;
      
      // Check if the username or email are already taken by another user
      if (username !== req.user.username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== req.user.id) {
          return res.status(400).json({ message: "Username is already taken" });
        }
      }
      
      if (email !== req.user.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== req.user.id) {
          return res.status(400).json({ message: "Email is already taken" });
        }
      }
      
      // Update user profile
      const updatedUser = await storage.updateUserProfile(req.user.id, {
        username, 
        email, 
        firstName, 
        lastName,
        bio
      });
      
      // Filter out password from the response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  
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
        phoneNumber: z.string().optional() // Allow empty string or undefined
      });
      
      const { phoneNumber } = schema.parse(req.body);
      
      // If phoneNumber is empty string or undefined, set it to null
      if (!phoneNumber) {
        const updatedUser = await storage.updateUserPhoneNumber(req.user.id, null);
        // Filter out password from the response
        const { password, ...userWithoutPassword } = updatedUser;
        return res.json(userWithoutPassword);
      }
      
      // Validate phone number format only if it's provided
      if (!/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: [{ 
            path: ["phoneNumber"], 
            message: "Please enter a valid phone number in E.164 format (e.g., +14155552671)" 
          }] 
        });
      }
      
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
        durationMonths: z.number().int().positive().optional(),
        paymentDetails: z.object({
          lastFour: z.string(),
          cardBrand: z.string().optional(),
          billingDate: z.number(),
          expiryMonth: z.number(),
          expiryYear: z.number(),
        }).optional()
      });
      
      const { isPremium, durationMonths = 1, paymentDetails } = schema.parse(req.body);
      
      // Calculate subscription end date if upgrading to premium
      let premiumUntil: Date | undefined;
      if (isPremium) {
        premiumUntil = new Date();
        premiumUntil.setMonth(premiumUntil.getMonth() + durationMonths);
      }
      
      // First update the subscription status
      const updatedUser = await storage.updateUserSubscription(req.user.id, isPremium, premiumUntil);
      
      // If payment details are provided, store them
      if (isPremium && paymentDetails) {
        // Update user with payment details
        await storage.updateUserPaymentDetails(req.user.id, paymentDetails);
      }
      
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
      const users = await Promise.resolve([] as User[]); // TODO: Implement user query
      
      // Send SMS to each premium user
      const results = [];
      for (const user of users) {
        if (user.isPremium && user.preferences?.phoneNumber) {
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
  
  // =========== Analytics Routes ===========
  
  // Get mood analytics
  app.get("/api/analytics/mood", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      // Get user's journal entries
      const journalEntries = await storage.getJournalEntries(req.user.id);
      
      // Calculate mood frequencies
      const moodFrequency: Record<string, number> = {};
      const moodsByDay: Record<string, string[]> = {};
      const moodsByMonth: Record<string, string[]> = {};
      
      // Track streak data
      let currentStreak = 0;
      let longestStreak = 0;
      let lastEntryDate: Date | null = null;
      
      // Process journal entries
      journalEntries.forEach(entry => {
        const mood = entry.mood || "neutral";
        
        // Count mood frequency
        moodFrequency[mood] = (moodFrequency[mood] || 0) + 1;
        
        // Group by day for daily trends
        const entryDate = new Date(entry.createdAt);
        const dayKey = entryDate.toISOString().split('T')[0];
        if (!moodsByDay[dayKey]) moodsByDay[dayKey] = [];
        moodsByDay[dayKey].push(mood);
        
        // Group by month for monthly trends
        const monthKey = `${entryDate.getFullYear()}-${entryDate.getMonth() + 1}`;
        if (!moodsByMonth[monthKey]) moodsByMonth[monthKey] = [];
        moodsByMonth[monthKey].push(mood);
        
        // Calculate streak
        if (lastEntryDate) {
          const dayDiff = Math.floor((entryDate.getTime() - lastEntryDate.getTime()) / (1000 * 60 * 60 * 24));
          if (dayDiff <= 1) {
            // Entries on same day or consecutive days
            currentStreak = dayDiff === 0 ? currentStreak : currentStreak + 1;
          } else {
            // Streak broken
            if (currentStreak > longestStreak) {
              longestStreak = currentStreak;
            }
            currentStreak = 1;
          }
        } else {
          currentStreak = 1;
        }
        
        lastEntryDate = entryDate;
      });
      
      // Update longest streak if needed
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
      
      // Calculate daily mood trends (last 30 days)
      const today = new Date();
      const dailyTrends = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayKey = date.toISOString().split('T')[0];
        
        const moods = moodsByDay[dayKey] || [];
        let dominantMood = "none";
        if (moods.length > 0) {
          // Find most common mood for the day
          const moodCounts: Record<string, number> = {};
          moods.forEach(mood => {
            moodCounts[mood] = (moodCounts[mood] || 0) + 1;
          });
          dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "none";
        }
        
        dailyTrends.push({
          date: dayKey,
          mood: dominantMood,
          count: moods.length
        });
      }
      
      // Calculate monthly mood trends (last 12 months)
      const monthlyTrends = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        
        const moods = moodsByMonth[monthKey] || [];
        const moodCounts: Record<string, number> = {};
        moods.forEach(mood => {
          moodCounts[mood] = (moodCounts[mood] || 0) + 1;
        });
        
        const month = new Date(date.getFullYear(), date.getMonth(), 1).toLocaleString('default', { month: 'short' });
        
        monthlyTrends.push({
          month,
          monthKey,
          counts: moodCounts,
          total: moods.length
        });
      }
      
      // Generate insights
      const insights = [];
      
      // Most common mood insight
      if (Object.keys(moodFrequency).length > 0) {
        const topMood = Object.entries(moodFrequency).sort((a, b) => b[1] - a[1])[0];
        if (topMood) {
          insights.push({
            type: "topMood",
            title: "Mood Feather",
            description: `Your most common mood is "${topMood[0]}" with ${topMood[1]} entries!`,
            emoji: getMoodEmoji(topMood[0])
          });
        }
      }
      
      // Streak insight
      insights.push({
        type: "streak",
        title: "Journal Streak",
        description: `Your current journaling streak is ${currentStreak} day${currentStreak !== 1 ? 's' : ''}. Your longest streak is ${longestStreak} day${longestStreak !== 1 ? 's' : ''}!`,
        emoji: "🔥"
      });
      
      // Recent improvement insight
      const recentDays = dailyTrends.slice(-7);
      const happyDays = recentDays.filter(day => day.mood === "happy" || day.mood === "calm").length;
      if (happyDays >= 4) {
        insights.push({
          type: "improvement",
          title: "Feather in Your Cap!",
          description: `You've had ${happyDays} positive days in the last week. That's something to celebrate!`,
          emoji: "🎉"
        });
      }
      
      res.json({
        moodFrequency,
        dailyTrends,
        monthlyTrends,
        streaks: {
          current: currentStreak,
          longest: longestStreak
        },
        insights,
        entryCount: journalEntries.length
      });
    } catch (error) {
      console.error("Error fetching mood analytics:", error);
      res.status(500).json({ message: "Failed to fetch mood analytics" });
    }
  });
  
  // Helper function to get mood emoji
  function getMoodEmoji(mood: string): string {
    const emojiMap: Record<string, string> = {
      happy: "😊",
      calm: "😌",
      neutral: "😐",
      sad: "😔",
      frustrated: "😤",
      none: "❓"
    };
    
    return emojiMap[mood] || "❓";
  }
  
  // =========== Conversation Routes ===========
  
  // Chat with Flappy endpoint - optionally creates journal entries from conversations
  app.post("/api/conversation", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { message, createJournalEntry = true, isFirstMessage = true } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }
      
      // Get Flappy's response using the openAI service
      const flappyResponse = await generateFlappyContent(
        'journalResponse',
        message,
        {
          username: req.user.username,
          email: req.user.email,
          userId: req.user.id,
          firstName: req.user.firstName === null ? undefined : req.user.firstName,
          lastName: req.user.lastName === null ? undefined : req.user.lastName,
          isFirstMessage: isFirstMessage
        }
      );
      
      // Process the message for memory service
      await memoryService.processMessage(req.user.id, message, 'journal_topic');
      
      // Only create a journal entry if requested (default behavior for backwards compatibility)
      let journalEntry = null;
      if (createJournalEntry) {
        journalEntry = await storage.createJournalEntry({
          userId: req.user.id,
          title: `Conversation with Flappy - ${new Date().toLocaleDateString()}`,
          content: `**Your message:**\n\n${message}\n\n**Flappy's response:**\n\n${flappyResponse.content}`,
          tags: ["conversation"],
          mood: "neutral", // Default mood, could be extracted using sentiment analysis
        });
      }
      
      return res.status(200).json({
        response: flappyResponse.content,
        journalEntryCreated: createJournalEntry,
        journalEntryId: journalEntry?.id
      });
    } catch (error) {
      console.error("Error in conversation endpoint:", error);
      return res.status(500).json({ message: "Something went wrong processing your message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
