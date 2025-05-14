import nodemailer from "nodemailer";
import { User, Email, InsertEmail } from "@shared/schema";
import { storage } from "./storage";
import { generateFlappyContent, FlappyContentType } from "./openai";
import { memoryService } from "./memory-service";

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.ethereal.email",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER || "ethereal.user@ethereal.email",
    pass: process.env.EMAIL_PASSWORD || "ethereal_password",
  },
});

// Email from address
const FROM_EMAIL = process.env.FROM_EMAIL || "flappy@featherweight.io";
const FROM_NAME = "Flappy from Featherweight";

// Export email service functions
export const emailService = {
  // Send a single email
  async sendEmail(to: string, subject: string, content: string, isPremium: boolean = false): Promise<{ messageId: string }> {
    try {
      const info = await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to,
        subject,
        html: formatEmailHTML(content, isPremium),
        text: content + (!isPremium ? '\n\n[Advertisement: Upgrade to premium for ad-free experiences]' : ''),
      });
      
      return { messageId: info.messageId };
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send email");
    }
  },

  // Send a Flappy email and store it in the database
  async sendFlappyEmail(user: User, contentType: FlappyContentType, context?: string): Promise<Email> {
    try {
      // Generate content using OpenAI (or use fallback content if there's an error)
      let subject, content, messageId;
      
      try {
        // Try to generate content using OpenAI
        const flappyContent = await generateFlappyContent(contentType, context, {
          username: user.username,
          email: user.email,
          userId: user.id,
          firstName: user.firstName || undefined, 
          lastName: user.lastName || undefined
        });
        
        subject = flappyContent.subject;
        content = flappyContent.content;
        
        // Try to send the email
        try {
          const result = await this.sendEmail(user.email, subject, content, user.isPremium);
          messageId = result.messageId;
        } catch (emailError) {
          console.warn("Could not send email, continuing with database storage only:", emailError);
          messageId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        }
      } catch (aiError) {
        console.warn("Failed to generate content with OpenAI, using fallback content:", aiError);
        
        // Fallback content based on content type
        if (contentType === "dailyInspiration") {
          subject = "Your Daily Inspiration from Flappy";
          content = `Hello ${user.firstName || user.username}! 
          
          Today is a good day to write in your journal. How are you feeling today?
          
          Flappy is always here for you, even when AI services are taking a break!
          
          Warmly,
          Flappy 🐦`;
        } else if (contentType === "journalResponse") {
          subject = "Flappy received your journal entry";
          content = `Thank you for your journal entry, ${user.firstName || user.username}!
          
          I've recorded your thoughts and will be here whenever you want to reflect on them.
          
          Keep up the great journaling!
          
          Warmly,
          Flappy 🐦`;
        } else {
          subject = "Weekly Insights from Flappy";
          content = `Hello ${user.firstName || user.username}!
          
          It's time for your weekly reflection. How has your week been? What are you grateful for?
          
          I'm here to help you reflect on your journey.
          
          Warmly,
          Flappy 🐦`;
        }
        
        // Create a local message ID since we're not actually sending an email
        messageId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      }
      
      // Store the email in the database (always do this even if sending fails)
      const emailData: InsertEmail = {
        userId: user.id,
        subject,
        content,
        type: contentType,
        messageId,
      };
      
      return await storage.createEmail(emailData);
    } catch (error) {
      console.error("Critical error in sendFlappyEmail:", error);
      throw new Error("Failed to send Flappy email");
    }
  },

  // Process an incoming email as a journal entry
  async processIncomingEmail(from: string, subject: string, content: string, inReplyTo?: string): Promise<void> {
    try {
      // Find the user by email
      const user = await storage.getUserByEmail(from);
      if (!user) {
        console.error(`No user found for email: ${from}`);
        return;
      }
      
      // Clean the content (remove email signatures, quoted replies, etc.)
      const cleanedContent = cleanEmailContent(content);
      
      // Extract title from the first line or use a default
      const lines = cleanedContent.trim().split('\n');
      const title = lines[0].length > 5 ? lines[0].substring(0, 50) : "Journal Entry";
      const journalContent = lines.length > 1 ? cleanedContent : cleanedContent;
      
      // Try to find the original email if this is a reply
      let emailId: string | undefined;
      if (inReplyTo) {
        const emails = await storage.getEmails(user.id);
        const originalEmail = emails.find(email => email.messageId === inReplyTo);
        if (originalEmail) {
          emailId = originalEmail.messageId;
        }
      }
      
      // Create the journal entry
      const journalEntry = await storage.createJournalEntry({
        userId: user.id,
        title,
        content: journalContent,
        mood: detectMood(cleanedContent),
        tags: extractTags(cleanedContent),
        emailId,
      });
      
      // Process journal content for memories
      await memoryService.processMessage(user.id, journalContent, 'journal_topic');
      
      // Send an acknowledgment email
      await this.sendFlappyEmail(user, "journalResponse", cleanedContent);
    } catch (error) {
      console.error("Error processing incoming email:", error);
    }
  },
  
  // Send daily inspirational emails to all users
  async sendDailyInspiration(): Promise<void> {
    try {
      // This would typically be called by a scheduled job
      const allUsers = Array.from(storage["users"].values()) as User[];
      
      for (const user of allUsers) {
        // Check user preferences
        const frequency = user.preferences?.emailFrequency || "daily";
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Skip based on frequency preferences
        if (
          (frequency === "weekdays" && (dayOfWeek === 0 || dayOfWeek === 6)) ||
          (frequency === "weekends" && !(dayOfWeek === 0 || dayOfWeek === 6)) ||
          (frequency === "weekly" && dayOfWeek !== 1) // Send on Mondays for weekly
        ) {
          continue;
        }
        
        await this.sendFlappyEmail(user, "dailyInspiration");
      }
    } catch (error) {
      console.error("Error sending daily inspiration:", error);
    }
  },
  
  // Send weekly insights based on user's journal entries
  async sendWeeklyInsights(): Promise<void> {
    try {
      // This would typically be called by a scheduled job
      const allUsers = Array.from(storage["users"].values()) as User[];
      
      for (const user of allUsers) {
        // Skip users who don't want insights
        if (user.preferences?.receiveInsights === false) {
          continue;
        }
        
        // Get the user's journal entries from the past week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const recentEntries = await storage.getJournalEntries(user.id, {
          dateRange: "7days"
        });
        
        // Skip if there aren't enough entries to analyze
        if (recentEntries.length < 2) {
          continue;
        }
        
        // Prepare context for OpenAI
        const context = recentEntries
          .map(entry => `Entry (${new Date(entry.createdAt).toLocaleDateString()}): ${entry.content.substring(0, 200)}${entry.content.length > 200 ? '...' : ''}`)
          .join('\n\n');
        
        await this.sendFlappyEmail(user, "weeklyInsight", context);
      }
    } catch (error) {
      console.error("Error sending weekly insights:", error);
    }
  }
};

// Helper function to format email as HTML
function formatEmailHTML(content: string, isPremium: boolean = false): string {
  const paragraphs = content.split('\n\n').filter(p => p.trim() !== '');
  
  const htmlParagraphs = paragraphs.map(p => {
    // Bold text between ** **
    let formattedP = p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic text between * *
    formattedP = formattedP.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert line breaks within paragraphs
    formattedP = formattedP.replace(/\n/g, '<br>');
    
    return `<p style="margin-bottom: 16px; line-height: 1.5;">${formattedP}</p>`;
  });
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Message from Flappy</title>
    <style>
      body {
        font-family: 'Open Sans', 'Helvetica Neue', sans-serif;
        color: #37474F;
        line-height: 1.6;
        background-color: #F5F7FA;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 12px;
        border-left: 4px solid #64B5F6;
      }
      .header {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid #E0E0E0;
      }
      .logo {
        width: 40px;
        height: 40px;
        background-color: #64B5F6;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
      }
      .title {
        font-family: 'Quicksand', 'Helvetica Neue', sans-serif;
        font-weight: 700;
        color: #64B5F6;
        margin: 0;
      }
      .content {
        padding: 0 10px;
      }
      .footer {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #E0E0E0;
        font-size: 12px;
        color: #9E9E9E;
        text-align: center;
      }
      .reply-button {
        display: inline-block;
        background-color: #64B5F6;
        color: white;
        font-family: 'Quicksand', 'Helvetica Neue', sans-serif;
        font-weight: 600;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 12px;
        margin-top: 20px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg>
        </div>
        <h1 class="title">Featherweight</h1>
      </div>
      <div class="content">
        ${htmlParagraphs.join('')}
        
        ${!isPremium ? `
        <div style="margin: 30px 0; padding: 15px; background-color: #f9f9f9; border-radius: 8px; border: 1px solid #e0e0e0; text-align: center;">
          <p style="margin-bottom: 10px; font-size: 14px; color: #757575;">Advertisement</p>
          <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px;">
            <p style="font-weight: bold; margin-bottom: 10px; color: #3b82f6;">Upgrade to Premium</p>
            <p style="margin-bottom: 15px; font-size: 14px;">Remove ads, unlock SMS journaling, and enjoy an enhanced experience with Flappy.</p>
            <a href="https://featherweight.app/subscription" style="display: inline-block; background-color: #3b82f6; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-weight: bold;">Upgrade Now</a>
          </div>
        </div>
        ` : ''}
        
        <div style="text-align: center">
          <a href="mailto:${FROM_EMAIL}" class="reply-button">Reply to Journal</a>
        </div>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Featherweight. All rights reserved.</p>
        <p>To adjust your email preferences, visit your <a href="#" style="color: #64B5F6;">settings page</a>.</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

// Helper function to clean incoming email content
function cleanEmailContent(content: string): string {
  // Remove email signature (anything after -- or ____)
  let cleaned = content.split(/--|\_{2,}/)[0];
  
  // Remove quoted replies (lines starting with >)
  cleaned = cleaned
    .split('\n')
    .filter(line => !line.trim().startsWith('>'))
    .join('\n');
  
  // Remove common email footers
  const footerPhrases = [
    "Sent from my iPhone",
    "Sent from my Android",
    "Get Outlook for",
    "This email has been scanned"
  ];
  
  for (const phrase of footerPhrases) {
    if (cleaned.includes(phrase)) {
      cleaned = cleaned.substring(0, cleaned.indexOf(phrase));
    }
  }
  
  // Trim excess whitespace
  return cleaned.trim();
}

// Simple mood detection from content
function detectMood(content: string): string {
  const text = content.toLowerCase();
  
  // Simple keyword analysis
  const moodKeywords = {
    happy: ["happy", "joy", "excited", "wonderful", "great", "fantastic", "smile", "glad", "😊", "🙂", "😄"],
    calm: ["calm", "peaceful", "relaxed", "serene", "gentle", "quiet", "tranquil", "😌", "🧘"],
    sad: ["sad", "unhappy", "disappointed", "upset", "down", "blue", "depressed", "😔", "😢", "😭"],
    frustrated: ["frustrated", "angry", "annoyed", "irritated", "bothered", "mad", "😤", "😠", "😡"],
  };
  
  let moodScores = {
    happy: 0,
    calm: 0,
    sad: 0,
    frustrated: 0,
    neutral: 1, // Default score for neutral
  };
  
  // Count occurrences of mood keywords
  for (const [mood, keywords] of Object.entries(moodKeywords)) {
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b|${keyword}`, 'g');
      const matches = text.match(regex);
      if (matches) {
        moodScores[mood as keyof typeof moodScores] += matches.length;
      }
    }
  }
  
  // Find the mood with the highest score
  let dominantMood = "neutral";
  let highestScore = moodScores.neutral;
  
  for (const [mood, score] of Object.entries(moodScores)) {
    if (score > highestScore) {
      dominantMood = mood;
      highestScore = score;
    }
  }
  
  return dominantMood;
}

// Extract hashtags from content
function extractTags(content: string): string[] {
  const tags: string[] = [];
  const regex = /#(\w+)/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    tags.push(`#${match[1].toLowerCase()}`);
  }
  
  // If no tags were found, try to infer some
  if (tags.length === 0) {
    const text = content.toLowerCase();
    
    const commonThemes = {
      gratitude: ["grateful", "thankful", "appreciate", "blessing"],
      reflection: ["reflect", "thinking", "consider", "ponder", "wonder"],
      goals: ["goal", "aim", "objective", "plan", "future", "aspire"],
      nature: ["nature", "outdoor", "hike", "walk", "forest", "ocean", "mountain"],
      mindfulness: ["mindful", "present", "aware", "moment", "breath", "meditation"],
    };
    
    for (const [theme, keywords] of Object.entries(commonThemes)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          tags.push(`#${theme}`);
          break;
        }
      }
    }
  }
  
  // Return unique tags only
  return [...new Set(tags)];
}
