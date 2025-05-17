import { User, Email, InsertEmail } from "@shared/schema";
import { storage } from "./storage";
import { generateFlappyContent, FlappyContentType } from "./openai";
import { memoryService } from "./memory-service";
import OpenAI from "openai";
import sgMail from "@sendgrid/mail";

// Initialize OpenAI with the API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000, // 30 second timeout
  maxRetries: 2
});

// Configure SendGrid
if (!process.env.SENDGRID_API_KEY) {
  console.warn('SendGrid API key is not configured. Email functionality will be limited.');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid initialized successfully');
}

// Email from address 
const FROM_EMAIL = process.env.FROM_EMAIL || "flappy@featherweight.world";
const FROM_NAME = "Flappy from Featherweight";

// Log the FROM_EMAIL to ensure it's correctly set
console.log("Using email FROM address:", FROM_EMAIL);

// Export email service functions
export const emailService = {
  // Send a single email using SendGrid
  async sendEmail(to: string, subject: string, content: string, isPremium: boolean = false): Promise<{ messageId: string }> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('SendGrid API key is not configured. Cannot send email.');
        return { messageId: `local-${Date.now()}-${Math.random().toString(36).substring(2, 15)}` };
      }
      
      const htmlContent = formatEmailHTML(content, isPremium);
      const textContent = content + (!isPremium ? '\n\n[Advertisement: Upgrade to premium for ad-free experiences]' : '');
      
      console.log(`Sending email to: ${to}, subject: ${subject}`);
      
      const msg = {
        to,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        replyTo: FROM_EMAIL, // This is the correct way to set Reply-To header in SendGrid
        subject,
        text: textContent,
        html: htmlContent,
        trackingSettings: {
          clickTracking: {
            enable: true
          },
          openTracking: {
            enable: true
          }
        },
        mailSettings: {
          footer: {
            enable: true,
            text: 'Featherweight - Your Journaling Companion\nReply to this email to continue your conversation with Flappy',
            html: '<p style="color: #9E9E9E; font-size: 12px;">Featherweight - Your Journaling Companion<br>Reply to this email to continue your conversation with Flappy</p>'
          }
        },
        // Adding custom headers for threading, but NOT using reserved headers
        headers: {
          "X-Entity-Ref-ID": `flappy-${Date.now()}`
        }
      };
      
      const [response] = await sgMail.send(msg);
      console.log(`Email sent successfully to ${to}, status code: ${response?.statusCode}, message ID: ${response?.messageId || 'unknown'}`);
      
      // Use SendGrid message ID if available, otherwise generate one
      const messageId = response?.messageId || `sg-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      return { messageId };
    } catch (error) {
      console.error("Error sending email with SendGrid:", error);
      console.error("Error details:", error.response?.body?.errors || error.message);
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

  // Process an incoming email as a journal entry or conversation
  async processIncomingEmail(from: string, subject: string, content: string, inReplyTo?: string): Promise<void> {
    try {
      console.log(`Beginning to process email from: ${from}`);
      
      // Find the user by email
      const user = await storage.getUserByEmail(from);
      if (!user) {
        console.error(`No user found for email: ${from}`);
        
        // Send a welcome/invitation email to unregistered users
        await this.sendEmail(
          from,
          "Welcome to Featherweight - Your Personal Journaling Companion",
          `Hello there,\n\nThank you for reaching out to Flappy, the friendly pelican at Featherweight! It looks like you're not registered with us yet.\n\nFeatherweight is a journaling app that helps you capture your thoughts and reflections with the guidance of Flappy, your cosmic pelican guide.\n\nTo start your journaling journey, please visit our website to create an account. It only takes a minute!\n\nWarmly,\nFlappy the Pelican\nFeatherweight - Your Journaling Companion`,
          false
        );
        return;
      }
      
      console.log(`Processing email for user: ${user.id} (${user.email})`);
      
      // Clean the content (remove email signatures, quoted replies, etc.)
      const cleanedContent = cleanEmailContent(content);
      
      // Check if this is a reply to a previous email from Flappy
      let isReply = !!inReplyTo || (subject && subject.toLowerCase().startsWith('re:'));
      
      console.log(`Email is ${isReply ? 'a reply' : 'not a reply'}, analyzing content...`);
      
      // Determine if the user wants to save this as a journal entry
      const shouldSaveAsJournal = await this.shouldSaveAsJournal(cleanedContent);
      
      console.log(`Content should ${shouldSaveAsJournal ? '' : 'not '}be saved as journal entry`);
      
      if (shouldSaveAsJournal) {
        // This should be saved as a journal entry
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
        
        console.log(`Creating journal entry for user ${user.id}`);
        
        // Create the journal entry
        const journalEntry = await storage.createJournalEntry({
          userId: user.id,
          title,
          content: journalContent,
          mood: detectMood(cleanedContent),
          tags: extractTags(cleanedContent),
          emailId,
          source: 'email'
        });
        
        // Process journal content for memories
        await memoryService.processMessage(user.id, journalContent, 'journal_topic');
        
        console.log(`Sending journal confirmation to ${user.email}`);
        
        // Send a journal confirmation email directly rather than using sendFlappyEmail
        // This ensures an immediate response rather than going through the full process
        const confirmationSubject = `📝 Journal Entry Saved - ${new Date().toLocaleDateString()}`;
        const confirmationContent = `Hi ${user.firstName || user.username},

Thank you for your journal entry! I've saved it to your Featherweight journal.

**Entry Summary:**
- Date: ${new Date().toLocaleDateString()}
- Mood: ${detectMood(cleanedContent)}
- Tags: ${extractTags(cleanedContent).join(', ') || 'None detected'}

You can view this and all your journal entries anytime on your Featherweight dashboard.

Is there anything specific you'd like to reflect on next? Feel free to reply to this email to continue our conversation.

Warmly,
Flappy 🐦`;

        // Send the confirmation directly
        const messageId = await this.sendEmail(
          user.email,
          confirmationSubject,
          confirmationContent,
          user.isPremium
        );
        
        // Store the response in the database
        await storage.createEmail({
          userId: user.id,
          subject: confirmationSubject,
          content: confirmationContent,
          type: 'journalResponse',
          messageId: messageId.messageId,
          isRead: false
        });
        
        console.log(`Created journal entry ${journalEntry.id} from email for user ${user.id}`);
      } else {
        // This is a regular conversation with Flappy
        try {
          console.log(`Generating conversation response for ${user.email}`);
          
          // Generate Flappy's response using OpenAI
          const flappyResponse = await generateFlappyContent("emailConversation", cleanedContent, {
            username: user.username,
            email: user.email,
            userId: user.id,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined
          });
          
          // Keep track of message count for free users
          let messageCount = 1;
          if (!user.isPremium) {
            // Look through previous emails to count this conversation
            const emails = await storage.getEmails(user.id, {
              dateRange: "7days"
            });
            
            // Count messages in this conversation (those with the same subject or thread)
            const conversationEmails = emails.filter(email => 
              email.subject.toLowerCase().includes(subject.toLowerCase()) ||
              (inReplyTo && email.messageId === inReplyTo)
            );
            
            messageCount = conversationEmails.length + 1;
            console.log(`Free user message count: ${messageCount} of 3 allowed`);
          }
          
          // Check if the free user has reached their message limit
          const reachedFreeLimit = !user.isPremium && messageCount > 3;
          
          // Customize the response if they've reached the limit
          let responseContent = flappyResponse.content;
          let responseSubject = `Re: ${subject}`;
          
          if (reachedFreeLimit) {
            console.log(`User ${user.id} has reached free message limit`);
            responseContent += `\n\n---\n\nYou've reached the free message limit (3) for this conversation. To continue chatting with me and get unlimited responses, please upgrade to Premium.\n\nWith Premium, you'll also get SMS journaling, ad-free emails, and more personalized insights.`;
          }
          
          console.log(`Sending email response to ${user.email}`);
          
          // Send Flappy's response
          const messageId = await this.sendEmail(user.email, responseSubject, responseContent, user.isPremium);
          
          // Store the email in the database
          await storage.createEmail({
            userId: user.id,
            subject: responseSubject,
            content: responseContent,
            type: 'emailConversation',
            messageId: messageId.messageId,
            isRead: false
          });
          
          console.log(`Successfully sent conversation response to ${user.email} (Premium: ${user.isPremium})`);
        } catch (error) {
          console.error("Error generating conversation response:", error);
          
          // Send a fallback response if something went wrong
          const fallbackSubject = `Re: ${subject}`;
          const fallbackContent = `Hi ${user.firstName || user.username},

Thank you for your message! I'm having a moment of reflection and will get back to you soon.

In the meantime, feel free to continue journaling or send me another message.

Warmly,
Flappy`;

          console.log(`Sending fallback response to ${user.email} due to error`);
          
          const messageId = await this.sendEmail(
            user.email, 
            fallbackSubject, 
            fallbackContent, 
            user.isPremium
          );
          
          // Store the fallback response
          await storage.createEmail({
            userId: user.id,
            subject: fallbackSubject,
            content: fallbackContent,
            type: 'emailConversation',
            messageId: messageId.messageId,
            isRead: false
          });
        }
      }
    } catch (error) {
      console.error("Error processing incoming email:", error);
    }
  },
  
  // Determine if an email should be saved as a journal entry
  async shouldSaveAsJournal(content: string): Promise<boolean> {
    try {
      // Try using OpenAI to detect intent
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          {
            role: "system",
            content: "You are an analyzer for Featherweight, a journaling app. Determine if this email indicates the user wants to save content as a journal entry. Look for phrases like 'save this', 'add to my journal', 'put this in my journal', etc. Respond with only 'true' or 'false'."
          },
          {
            role: "user",
            content
          }
        ],
      });
      
      const result = response.choices[0].message.content.toLowerCase().trim();
      return result === 'true';
    } catch (error) {
      console.error("Error analyzing journal intent:", error);
      
      // Fallback analysis if OpenAI fails
      const lowerContent = content.toLowerCase();
      return lowerContent.includes('save this') || 
             lowerContent.includes('journal entry') ||
             lowerContent.includes('add to my journal') ||
             lowerContent.includes('put this in my journal') ||
             lowerContent.includes('save as journal') ||
             lowerContent.includes('record this');
    }
  },
  
  // Send daily inspirational emails to all users
  async sendDailyInspiration(): Promise<{ success: boolean; count: number }> {
    try {
      // Get all active users from the database
      const allUsers = await this.getAllActiveUsers();
      let sentCount = 0;
      
      for (const user of allUsers) {
        // Check user preferences
        const frequency = user.preferences?.emailFrequency || "daily";
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Skip users who don't want daily inspirations
        if (user.preferences?.disableDailyInspirations) {
          continue;
        }
        
        // Skip based on frequency preferences
        if (
          (frequency === "weekdays" && (dayOfWeek === 0 || dayOfWeek === 6)) ||
          (frequency === "weekends" && !(dayOfWeek === 0 || dayOfWeek === 6)) ||
          (frequency === "weekly" && dayOfWeek !== 1) // Send on Mondays for weekly
        ) {
          continue;
        }
        
        await this.sendFlappyEmail(user, "dailyInspiration");
        sentCount++;
      }
      
      console.log(`Sent daily inspiration to ${sentCount} users`);
      return { success: true, count: sentCount };
    } catch (error) {
      console.error("Error sending daily inspiration:", error);
      return { success: false, count: 0 };
    }
  },
  
  // Send weekly insights based on user's journal entries
  async sendWeeklyInsights(): Promise<{ success: boolean; count: number }> {
    try {
      // Get all active users from the database
      const allUsers = await this.getAllActiveUsers();
      let sentCount = 0;
      
      for (const user of allUsers) {
        // Skip users who don't want insights
        if (user.preferences?.receiveInsights === false) {
          continue;
        }
        
        // Get the user's journal entries from the past week
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
        sentCount++;
      }
      
      console.log(`Sent weekly insights to ${sentCount} users`);
      return { success: true, count: sentCount };
    } catch (error) {
      console.error("Error sending weekly insights:", error);
      return { success: false, count: 0 };
    }
  },
  
  /**
   * Helper function to get all active users
   * Gets users from the database and filters them based on activity status
   */
  async getAllActiveUsers(): Promise<User[]> {
    try {
      // Get all users from the database
      const allUsers = await storage.getAllUsers();
      
      // Filter out inactive users
      return allUsers.filter(user => {
        // We don't have a deactivated flag in our schema yet, so we consider all users active
        // In the future, we could add more sophisticated filtering here
        return true;
      });
    } catch (error) {
      console.error("Error getting active users:", error);
      return [];
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
  
  // Flappy avatar image URL - using the attached pelican image
  const flappyAvatarUrl = "/images/flappy-avatar.png";
  
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
        width: 50px;
        height: 50px;
        border-radius: 50%;
        margin-right: 12px;
        overflow: hidden;
      }
      .logo img {
        width: 100%;
        height: auto;
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
      .journal-tip {
        margin: 25px 0;
        padding: 15px;
        background-color: #e3f2fd;
        border-left: 4px solid #64B5F6;
        border-radius: 8px;
      }
      .journal-tip h3 {
        margin-top: 0;
        color: #1565C0;
        font-size: 18px;
      }
      .highlight {
        font-weight: bold;
        color: #1565C0;
        background-color: #f0f7ff;
        padding: 2px 5px;
        border-radius: 3px;
      }
      .premium-badge {
        display: inline-block;
        background-color: #8b5cf6;
        color: white;
        font-size: 12px;
        padding: 3px 10px;
        border-radius: 12px;
        margin-left: 8px;
        vertical-align: middle;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">
          <img src="${flappyAvatarUrl}" alt="Flappy the Pelican" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z%22></path><line x1=%2216%22 y1=%228%22 x2=%222%22 y2=%2222%22></line><line x1=%2217.5%22 y1=%2215%22 x2=%229%22 y2=%2215%22></line></svg>'; this.style.backgroundColor='#64B5F6';">
        </div>
        <div>
          <h1 class="title">Flappy ${isPremium ? '<span class="premium-badge">PREMIUM</span>' : ''}</h1>
          <div style="color: #64B5F6; font-size: 14px;">Your Journaling Companion</div>
        </div>
      </div>
      <div class="content">
        ${htmlParagraphs.join('')}
        
        <div class="journal-tip">
          <h3>📝 How to Save a Journal Entry</h3>
          <p>Want to save this conversation as a journal entry? Simply reply with a message that includes phrases like <span class="highlight">"save this as a journal entry"</span> or <span class="highlight">"add this to my journal"</span>.</p>
          <p>Your journal entries will be automatically organized with tags and mood detection to help you track your reflections over time.</p>
        </div>
        
        ${!isPremium ? `
        <div style="margin: 30px 0; padding: 15px; background-color: #f9f9f9; border-radius: 8px; border: 1px solid #e0e0e0; text-align: center;">
          <p style="margin-bottom: 10px; font-size: 14px; color: #757575;">Advertisement</p>
          <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px;">
            <p style="font-weight: bold; margin-bottom: 10px; color: #3b82f6;">Upgrade to Premium</p>
            <p style="margin-bottom: 15px; font-size: 14px;">Remove ads, unlock SMS journaling, and enjoy unlimited conversations with Flappy.</p>
            <a href="https://featherweight.world/subscription" style="display: inline-block; background-color: #3b82f6; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-weight: bold;">Upgrade Now</a>
          </div>
        </div>
        ` : ''}
        
        <div style="text-align: center">
          <a href="mailto:${FROM_EMAIL}" class="reply-button">Reply to Flappy</a>
        </div>
      </div>
      <div class="footer">
        <p>Simply reply to this email to continue your conversation with Flappy.</p>
        <p>© ${new Date().getFullYear()} Featherweight. All rights reserved.</p>
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
