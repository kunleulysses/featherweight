import express, { type Express, Request, Response, NextFunction } from "express";
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
          text: 'No content available',
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

  // Main SendGrid Inbound Parse Webhook - handles raw MIME messages
  app.post(
    "/api/emails/webhook",
    express.raw({ type: '*/*', limit: '50mb' }), // Middleware to get raw body
    async (req: Request, res: Response) => {
      console.log('🔔 === SENDGRID RAW MIME WEBHOOK (/api/emails/webhook) RECEIVED === 🔔');
      console.log(`Request received at: ${new Date().toISOString()}`);
      console.log(`Content-Type: ${req.headers['content-type']}`);
      console.log(`Content-Length: ${req.headers['content-length']}`);

      try {
        if (!req.body || req.body.length === 0) {
          console.log('❌ Empty raw MIME body received from SendGrid.');
          // Still return 200 OK to SendGrid to prevent retries
          return res.status(200).send('Error: Empty MIME body');
        }

        const rawEmailBuffer = req.body as Buffer;
        console.log(`Raw MIME length: ${rawEmailBuffer.length} bytes`);

        // For the queue, store the raw email as base64.
        // The email-processor will decode and parse it.
        const queuePayload = {
          rawMimeBase64: rawEmailBuffer.toString('base64'),
          receivedAt: new Date().toISOString(),
          contentType: req.headers['content-type'] as string,
          source: 'sendgrid-inbound-webhook'
        };

        const queueItem: InsertEmailQueue = {
          payload: queuePayload,
          status: "pending" as const
        };

        const savedQueueItem = await storage.enqueueEmail(queueItem);
        console.log(`✅ Raw MIME email (base64) queued for processing. Queue ID: ${savedQueueItem.id}`);

        // Always return 200 OK to SendGrid quickly.
        res.status(200).send('OK: Email data queued for processing.');

      } catch (error) {
        console.error('❌ Error processing raw MIME webhook:', error);
        // Still return 200 OK to SendGrid.
        res.status(200).send(`Error processing email: ${error.message}`);
      }
    }
  );
  
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

  // Mood analytics for the mood tracker feature
  app.get("/api/analytics/mood", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
      // Get the user's journal entries
      const entries = await storage.getJournalEntries(req.user.id);
      
      // Create type for insight items
      interface Insight {
        title: string;
        description: string;
        emoji: string;
      }
      
      // Generate mood insights based on journal entries
      function generateMoodInsights(
        entries: any[], 
        moodFrequency: Record<string, number>,
        dailyTrends: any[],
        monthlyTrends: any[],
        streaks: { current: number, longest: number }
      ): Insight[] {
        const insights: Insight[] = [];
        
        // Only generate insights if we have enough data
        if (entries.length === 0) {
          return [];
        }
        
        // Add streak insight
        if (streaks.current > 0) {
          insights.push({
            title: 'Journaling Streak',
            description: `You've journaled for ${streaks.current} consecutive day${streaks.current !== 1 ? 's' : ''}! Keep it up to build a healthy reflection habit.`,
            emoji: '🔥'
          });
        }
        
        // Add top mood insight
        const moodEntries = Object.entries(moodFrequency);
        if (moodEntries.length > 0) {
          const [topMood, topCount] = moodEntries.sort((a, b) => b[1] - a[1])[0];
          const percentage = Math.round((topCount / entries.length) * 100);
          
          const moodEmojis: Record<string, string> = {
            happy: '😊',
            calm: '😌',
            neutral: '😐',
            sad: '😔',
            frustrated: '😤',
            none: '❓'
          };
          
          const moodDescriptions: Record<string, string> = {
            happy: "You've been feeling quite positive lately! This is a great time to build on this momentum.",
            calm: "Serenity has been your companion lately. These peaceful moments are perfect for deeper reflection.",
            neutral: "Your mood has been balanced recently. This equilibrium can be a good foundation for growth.",
            sad: "You've been experiencing some sadness lately. Remember that acknowledging these feelings is an important step in processing them.",
            frustrated: "Frustration has been present in your recent entries. Consider what specific situations trigger these feelings.",
            none: "We don't have enough mood data yet. Try adding mood tags to your entries!"
          };
          
          insights.push({
            title: `Mood Pattern: ${topMood.charAt(0).toUpperCase() + topMood.slice(1)}`,
            description: moodDescriptions[topMood] || "We're noticing patterns in your mood entries.",
            emoji: moodEmojis[topMood] || '📊'
          });
        }
        
        // Add frequency insight
        if (entries.length >= 5) {
          insights.push({
            title: 'Journaling Progress',
            description: `You've created ${entries.length} journal entries so far. Each entry helps build your self-awareness.`,
            emoji: '📝'
          });
        }
        
        // Generate random personalized insight based on mood patterns
        const positiveEmotions = (moodFrequency['happy'] || 0) + (moodFrequency['calm'] || 0);
        const negativeEmotions = (moodFrequency['sad'] || 0) + (moodFrequency['frustrated'] || 0);
        
        if (positiveEmotions > negativeEmotions && positiveEmotions > 0) {
          insights.push({
            title: 'Positive Outlook',
            description: 'Your entries show a tendency toward positive emotions, which can enhance resilience and creative thinking.',
            emoji: '✨'
          });
        } else if (negativeEmotions > positiveEmotions && negativeEmotions > 0) {
          insights.push({
            title: 'Emotional Processing',
            description: 'You\'re processing some challenging emotions, which shows courage and self-awareness. Consider what small actions might shift your perspective.',
            emoji: '🌱'
          });
        }
        
        // Add random helpful insight if we have few insights so far
        if (insights.length < 3) {
          const randomInsights = [
            {
              title: 'Reflection Tip',
              description: 'Try journaling at the same time each day to build a consistent habit that sticks.',
              emoji: '⏰'
            },
            {
              title: 'Self-Discovery',
              description: 'Looking back at old journal entries can reveal patterns and growth you might not have noticed in the moment.',
              emoji: '🔍'
            },
            {
              title: 'Journaling Habit',
              description: 'Even short journal entries of 2-3 sentences can provide valuable insights when reviewed over time.',
              emoji: '💫'
            },
            {
              title: 'Mood Patterns',
              description: 'Your mood often follows patterns. Tracking it can help you identify triggers and make positive adjustments.',
              emoji: '📊'
            }
          ];
          
          // Add random insights until we have at least 3
          while (insights.length < 3 && randomInsights.length > 0) {
            const randomIndex = Math.floor(Math.random() * randomInsights.length);
            insights.push(randomInsights[randomIndex]);
            randomInsights.splice(randomIndex, 1);
          }
        }
        
        return insights;
      }
      
      // If there are no entries, return default empty data
      if (!entries || entries.length === 0) {
        return res.json({
          moodFrequency: {},
          dailyTrends: [],
          monthlyTrends: [],
          streaks: { current: 0, longest: 0 },
          insights: [
            {
              title: 'Getting Started',
              description: 'Welcome to your mood tracker! Start journaling to see patterns and insights about your emotional well-being.',
              emoji: '👋'
            },
            {
              title: 'Mood Tracking',
              description: 'Select a mood for each journal entry to build your personal mood pattern visualization.',
              emoji: '📊'
            },
            {
              title: 'Reflection Tip',
              description: 'Even short journal entries of 2-3 sentences can provide valuable insights when reviewed over time.',
              emoji: '💫'
            }
          ],
          entryCount: 0
        });
      }
      
      // Calculate mood frequency
      const moodFrequency: Record<string, number> = {};
      const dailyMoodMap = new Map<string, Map<string, number>>();
      const monthlyMoodMap = new Map<string, Map<string, number>>();
      
      // Organize entries by date for streak calculation
      const entriesByDate = new Map<string, boolean>();
      
      // Sort entries by date
      const sortedEntries = [...entries].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      // Process all entries
      for (const entry of entries) {
        const mood = entry.mood || 'none';
        const createdAt = new Date(entry.createdAt);
        
        // Format date strings
        const dateStr = createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
        const monthKey = dateStr.substring(0, 7); // YYYY-MM
        const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(createdAt);
        
        // Count mood frequency
        moodFrequency[mood] = (moodFrequency[mood] || 0) + 1;
        
        // Track daily counts
        if (!dailyMoodMap.has(dateStr)) {
          dailyMoodMap.set(dateStr, new Map());
        }
        const dailyMoods = dailyMoodMap.get(dateStr)!;
        dailyMoods.set(mood, (dailyMoods.get(mood) || 0) + 1);
        
        // Track monthly counts
        if (!monthlyMoodMap.has(monthKey)) {
          monthlyMoodMap.set(monthKey, new Map());
        }
        const monthlyMoods = monthlyMoodMap.get(monthKey)!;
        monthlyMoods.set(mood, (monthlyMoods.get(mood) || 0) + 1);
        
        // Track dates with entries for streak calculation
        entriesByDate.set(dateStr, true);
      }
      
      // Convert daily mood map to array
      const dailyTrends = Array.from(dailyMoodMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0])) // Sort by date
        .flatMap(([date, moods]) => 
          Array.from(moods.entries()).map(([mood, count]) => ({
            date,
            mood,
            count
          }))
        );
      
      // Convert monthly mood map to array
      const monthlyTrends = Array.from(monthlyMoodMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0])) // Sort by month
        .map(([monthKey, moods]) => {
          const counts: Record<string, number> = {};
          let total = 0;
          
          moods.forEach((count, mood) => {
            counts[mood] = count;
            total += count;
          });
          
          // Get month name from the key (YYYY-MM)
          const [year, month] = monthKey.split('-');
          const monthName = new Intl.DateTimeFormat('en-US', { 
            month: 'long', 
            year: 'numeric' 
          }).format(new Date(parseInt(year), parseInt(month) - 1, 1));
          
          return {
            month: monthName,
            monthKey,
            counts,
            total
          };
        });
      
      // Calculate streaks
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      
      // Get dates array and sort in descending order (newest first)
      const dates = Array.from(entriesByDate.keys()).sort((a, b) => 
        b.localeCompare(a)
      );
      
      // Calculate current streak (consecutive days with entries, counting from today)
      const today = new Date().toISOString().split('T')[0];
      
      // If today has an entry, start counting from today
      if (entriesByDate.has(today)) {
        currentStreak = 1;
        
        // Check consecutive previous days
        let prevDate = new Date();
        
        for (let i = 1; i <= 365; i++) { // Check up to a year back
          prevDate.setDate(prevDate.getDate() - 1);
          const prevDateStr = prevDate.toISOString().split('T')[0];
          
          if (entriesByDate.has(prevDateStr)) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
      
      // Calculate longest streak
      for (let i = 0; i < dates.length; i++) {
        // If this is the first date or consecutive with previous date, increment temp streak
        if (i === 0) {
          tempStreak = 1;
        } else {
          const currDate = new Date(dates[i]);
          const prevDate = new Date(dates[i-1]);
          
          // Calculate difference in days
          const diffTime = Math.abs(prevDate.getTime() - currDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            tempStreak++;
          } else {
            // Reset streak counter if days aren't consecutive
            tempStreak = 1;
          }
        }
        
        // Update longest streak if current temp streak is longer
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      }
      
      // Generate insights based on the data
      const insights = generateMoodInsights(
        entries, 
        moodFrequency, 
        dailyTrends, 
        monthlyTrends, 
        { current: currentStreak, longest: longestStreak }
      );
      
      res.json({
        moodFrequency,
        dailyTrends,
        monthlyTrends,
        streaks: {
          current: currentStreak,
          longest: longestStreak
        },
        insights,
        entryCount: entries.length
      });
    } catch (error) {
      console.error("Error generating mood analytics:", error);
      res.status(500).json({ error: "Failed to generate mood analytics" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}