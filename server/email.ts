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

// Email configuration - using verified domain for authentication but friendly address for replies
const FROM_EMAIL = "flappy@em8032.featherweight.world"; // Verified domain for authentication
const REPLY_TO_EMAIL = "flappy@featherweight.world"; // Friendly address for replies
const FROM_NAME = "Flappy from Featherweight";

// Log the FROM_EMAIL to ensure it's correctly set
console.log("Using email FROM address:", FROM_EMAIL);

// Export email service functions
export const emailService = {
  // Send a single email using SendGrid
  async sendEmail(to: string, subject: string, content: string, isPremium: boolean = false): Promise<{ messageId: string }> {
    console.log('=== EMAIL SENDING PROCESS STARTED ===');
    console.log(`Target email: ${to}`);
    console.log(`Email subject: ${subject}`);
    console.log(`Content length: ${content.length} characters`);
    
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('⚠️ SendGrid API key is not configured. Cannot send email.');
        const localId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        console.log(`Generated local message ID: ${localId}`);
        return { messageId: localId };
      }
      
      console.log('Formatting HTML content');
      const htmlContent = formatEmailHTML(content, isPremium);
      
      console.log('Preparing text content');
      const textContent = content + (!isPremium ? '\n\n[Advertisement: Upgrade to premium for ad-free experiences]' : '');
      
      console.log(`FROM_EMAIL: ${FROM_EMAIL}`);
      console.log(`FROM_NAME: ${FROM_NAME}`);
      console.log(`Preparing to send email to: ${to}, subject: ${subject}`);
      
      const msg = {
        to,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        replyTo: REPLY_TO_EMAIL, // Using friendly email address for replies
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
      
      console.log('Email message object prepared, attempting to send via SendGrid');
      
      try {
        const [response] = await sgMail.send(msg);
        console.log('=== EMAIL SENT SUCCESSFULLY ===');
        console.log(`Status code: ${response?.statusCode}`);
        console.log(`Message ID: ${response?.messageId || 'unknown'}`);
        console.log(`Headers: ${JSON.stringify(response?.headers || {})}`);
        
        // Use SendGrid message ID if available, otherwise generate one
        const messageId = response?.messageId || `sg-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        return { messageId };
      } catch (sendGridError) {
        console.error('=== SENDGRID SENDING ERROR ===');
        console.error(`Error code: ${sendGridError.code || 'N/A'}`);
        console.error(`Error message: ${sendGridError.message || 'No message'}`);
        
        if (sendGridError.response) {
          console.error('SendGrid response error details:');
          console.error(`Status code: ${sendGridError.response.statusCode || 'N/A'}`);
          console.error(`Body: ${JSON.stringify(sendGridError.response.body || {})}`);
          console.error(`Headers: ${JSON.stringify(sendGridError.response.headers || {})}`);
        }
        
        throw sendGridError;
      }
    } catch (error) {
      console.error("=== GENERAL EMAIL SENDING ERROR ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      if (error.response?.body?.errors) {
        console.error("SendGrid error details:", JSON.stringify(error.response?.body?.errors));
      }
      throw new Error(`Failed to send email: ${error.message}`);
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
    console.log('=== INCOMING EMAIL PROCESSING STARTED ===');
    console.log(`From: ${from}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content length: ${content.length} characters`);
    console.log(`Reply-To Message ID: ${inReplyTo || 'Not a reply'}`);
    
    try {
      console.log('Step 1: Looking up user by email address');
      
      // Find the user by email
      const user = await storage.getUserByEmail(from);
      if (!user) {
        console.error(`No user found for email: ${from}`);
        console.log('Sending welcome email to unregistered user');
        
        // Send a welcome/invitation email to unregistered users
        await this.sendEmail(
          from,
          "Welcome to Featherweight - Your Personal Journaling Companion",
          `Hello there,\n\nThank you for reaching out to Flappy, the friendly pelican at Featherweight! It looks like you're not registered with us yet.\n\nFeatherweight is a journaling app that helps you capture your thoughts and reflections with the guidance of Flappy, your cosmic pelican guide.\n\nTo start your journaling journey, please visit our website to create an account. It only takes a minute!\n\nWarmly,\nFlappy the Pelican\nFeatherweight - Your Journaling Companion`,
          false
        );
        console.log('Welcome email sent, exiting process');
        return;
      }
      
      console.log(`Step 2: Found user - ID: ${user.id}, Email: ${user.email}, Username: ${user.username}`);
      console.log(`User premium status: ${user.isPremium ? 'Premium' : 'Free'}`);
      
      console.log('Step 3: Cleaning email content (removing signatures, quoted replies, etc.)');
      // Clean the content (remove email signatures, quoted replies, etc.)
      const cleanedContent = cleanEmailContent(content);
      console.log(`Original content length: ${content.length}, Cleaned content length: ${cleanedContent.length}`);
      
      // Check if this is a reply to a previous email from Flappy
      let isReply = !!inReplyTo || (subject && subject.toLowerCase().startsWith('re:'));
      
      console.log(`Step 4: Determining email type - ${isReply ? 'Reply to previous email' : 'New conversation'}`);
      
      console.log('Step 5: Analyzing content to determine if it should be a journal entry');
      // Determine if the user wants to save this as a journal entry
      const shouldSaveAsJournal = await this.shouldSaveAsJournal(cleanedContent);
      
      console.log(`Content analysis result: ${shouldSaveAsJournal ? 'Save as journal entry' : 'Process as conversation'}`);
      
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
      console.log("=== STARTING DAILY INSPIRATION EMAIL DELIVERY ===");
      console.log(`Current server time: ${new Date().toISOString()}`);
      
      // Get current hour in 24hr format (e.g., "11:00")
      const now = new Date();
      const currentHour = `${now.getHours().toString().padStart(2, '0')}:00`;
      console.log(`Current hour for scheduling: ${currentHour}`);
      
      // Get all active users from the database
      const allUsers = await this.getAllActiveUsers();
      
      if (!allUsers.length) {
        console.log("No active users found for daily inspiration");
        return { success: true, count: 0 };
      }
      
      console.log(`Found ${allUsers.length} total active users`);
      let sentCount = 0;
      let skippedCount = 0;
      
      for (const user of allUsers) {
        try {
          // Check if user has disabled daily emails
          if (user.preferences?.disableDailyEmails) {
            console.log(`Skipping user ${user.id}: daily emails disabled in preferences`);
            skippedCount++;
            continue;
          }
          
          // Check email frequency preference
          const frequency = user.preferences?.emailFrequency || "daily";
          const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          
          // Skip based on frequency preferences
          if ((frequency === "weekdays" && isWeekend) || 
              (frequency === "weekends" && !isWeekend) ||
              (frequency === "weekly" && dayOfWeek !== 1)) { // Send weekly emails on Mondays
            console.log(`Skipping user ${user.id}: frequency ${frequency} doesn't match current day`);
            skippedCount++;
            continue;
          }
          
          // Check delivery time preference (default to 11:00 AM if not set)
          const preferredTime = user.preferences?.emailDeliveryTime || "11:00";
          
          // Only send if current hour matches preferred hour
          if (preferredTime.substring(0, 2) + ":00" !== currentHour) {
            console.log(`Skipping user ${user.id}: preferred time ${preferredTime} doesn't match current hour ${currentHour}`);
            skippedCount++;
            continue;
          }
          
          console.log(`Sending daily inspiration to user ${user.id} (${user.email})`);
          // Send daily inspiration email
          await this.sendFlappyEmail(user, "dailyInspiration");
          sentCount++;
          console.log(`Successfully sent daily inspiration to user ${user.id}`);
        } catch (error) {
          console.error(`Failed to send daily inspiration to user ${user.id}:`, error);
        }
      }
      
      console.log(`=== DAILY INSPIRATION SUMMARY ===`);
      console.log(`Total users: ${allUsers.length}`);
      console.log(`Successfully sent: ${sentCount}`);
      console.log(`Skipped: ${skippedCount}`);
      console.log(`Failed: ${allUsers.length - sentCount - skippedCount}`);
      
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
    
    // Increased font size for better readability
    return `<p style="margin-bottom: 22px; line-height: 1.8; font-size: 18px; color: #333;">${formattedP}</p>`;
  });
  
  // Use the Flappy pelican avatar for the emails
  // This provides a consistent character image across all communications
  const flappyAvatarUrl = "https://featherweight.world/images/flappy-avatar.png";
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Message from Flappy</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Open+Sans:wght@400;500;600&display=swap');
      
      body {
        font-family: 'Open Sans', 'Helvetica Neue', sans-serif;
        color: #37474F;
        line-height: 1.6;
        background-color: #F5F7FA;
        margin: 0;
        padding: 0;
        font-size: 16px;
      }
      .container {
        max-width: 650px;
        margin: 0 auto;
        padding: 38px;
        background-color: #ffffff;
        border-radius: 20px;
        box-shadow: 0 8px 24px rgba(93, 124, 250, 0.18);
        border-top: 8px solid #5D7CFA;
        background-image: linear-gradient(to bottom, rgba(93, 124, 250, 0.03) 0%, rgba(255, 255, 255, 1) 140px);
        position: relative;
        overflow: hidden;
      }
      .container::before {
        content: '';
        position: absolute;
        top: -10px;
        right: -10px;
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, rgba(93, 124, 250, 0.05) 0%, rgba(255, 255, 255, 0) 70%);
        border-radius: 50%;
        z-index: 0;
      }
      .header {
        display: flex;
        align-items: center;
        margin-bottom: 38px;
        padding-bottom: 30px;
        border-bottom: 1px solid #E0E0E0;
        position: relative;
        z-index: 1;
      }
      .header:after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(90deg, rgba(93, 124, 250, 0.2), rgba(93, 124, 250, 0.6) 50%, rgba(93, 124, 250, 0.2));
      }
      .header::before {
        content: '';
        position: absolute;
        bottom: -30px;
        left: -20px;
        width: 80px;
        height: 80px;
        background: radial-gradient(circle, rgba(100, 181, 246, 0.06) 0%, rgba(255, 255, 255, 0) 70%);
        border-radius: 50%;
        z-index: -1;
      }
      .logo {
        width: 110px;
        height: 110px;
        margin-right: 24px;
        overflow: hidden;
        background-color: transparent;
        border-radius: 18px;
        box-shadow: 0 6px 12px rgba(93, 124, 250, 0.25);
        padding: 3px;
        border: 1px solid rgba(93, 124, 250, 0.15);
        position: relative;
      }
      .logo::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0));
        pointer-events: none;
        border-radius: 16px;
      }
      .logo img {
        width: 100%;
        height: auto;
        display: block;
        border-radius: 16px;
        transition: transform 0.3s ease;
      }
      .title {
        font-family: 'Quicksand', 'Helvetica Neue', sans-serif;
        font-weight: 700;
        color: #5D7CFA;
        margin: 0;
        font-size: 34px;
        letter-spacing: -0.5px;
        text-shadow: 0 1px 1px rgba(93, 124, 250, 0.15);
        position: relative;
        z-index: 1;
      }
      .title::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: -2px;
        width: 40px;
        height: 8px;
        background: linear-gradient(90deg, rgba(93, 124, 250, 0.15), rgba(93, 124, 250, 0));
        z-index: -1;
        border-radius: 4px;
      }
      .subtitle {
        color: #64B5F6;
        font-size: 19px;
        margin-top: 8px;
        font-weight: 500;
        letter-spacing: 0.4px;
        position: relative;
        display: inline-block;
      }
      .subtitle::after {
        content: '';
        position: absolute;
        bottom: -4px;
        left: 0;
        width: 100%;
        height: 1px;
        background: linear-gradient(90deg, rgba(100, 181, 246, 0.3), rgba(100, 181, 246, 0));
      }
      .content {
        padding: 28px 30px;
        background-color: #FAFCFF;
        border-radius: 16px;
        margin-bottom: 30px;
        box-shadow: inset 0 0 25px rgba(93, 124, 250, 0.04);
        border: 1px solid rgba(93, 124, 250, 0.1);
        position: relative;
        overflow: hidden;
        z-index: 1;
      }
      .content::before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 160px;
        height: 160px;
        background: radial-gradient(circle, rgba(93, 124, 250, 0.02) 0%, rgba(255, 255, 255, 0) 70%);
        border-radius: 50%;
        z-index: -1;
      }
      .content::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 120px;
        height: 120px;
        background: radial-gradient(circle, rgba(100, 181, 246, 0.02) 0%, rgba(255, 255, 255, 0) 70%);
        border-radius: 50%;
        z-index: -1;
      }
      .footer {
        margin-top: 40px;
        padding-top: 30px;
        border-top: 1px solid #E0E0E0;
        font-size: 14px;
        color: #757575;
        text-align: center;
        line-height: 1.6;
        position: relative;
      }
      .footer::after {
        content: '';
        position: absolute;
        top: -1px;
        left: 30%;
        right: 30%;
        height: 1px;
        background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(93, 124, 250, 0.2), rgba(255, 255, 255, 0));
      }
      .reply-button {
        display: inline-block;
        background-color: #FFFFFF;
        color: #5D7CFA;
        font-family: 'Quicksand', 'Helvetica Neue', sans-serif;
        font-weight: 600;
        font-size: 16px;
        letter-spacing: 0.5px;
        text-decoration: none;
        padding: 12px 26px;
        border-radius: 8px;
        margin-top: 16px;
        box-shadow: 0 3px 8px rgba(93, 124, 250, 0.15);
        transition: all 0.3s ease;
        border: 1.5px solid #5D7CFA;
        position: relative;
      }
      .reply-button:hover {
        background-color: #F5F8FF;
        box-shadow: 0 4px 10px rgba(93, 124, 250, 0.2);
      }
      .journal-tip {
        margin: 25px 0;
        padding: 16px 20px;
        background-color: #f5f9ff;
        border-left: 3px solid #64B5F6;
        border-radius: 8px;
        font-size: 15px;
        box-shadow: 0 2px 8px rgba(93, 124, 250, 0.07);
        background-image: linear-gradient(to right, rgba(100, 181, 246, 0.05), rgba(255, 255, 255, 0) 80%);
        position: relative;
        border: 1px solid rgba(100, 181, 246, 0.1);
      }
      .journal-tip:before {
        content: "💡";
        position: absolute;
        right: 15px;
        top: 10px;
        font-size: 18px;
        opacity: 0.4;
      }
      .journal-tip h3 {
        margin-top: 0;
        margin-bottom: 5px;
        color: #1565C0;
        font-size: 17px;
        font-family: 'Quicksand', 'Helvetica Neue', sans-serif;
        font-weight: 600;
        letter-spacing: 0.2px;
      }
      .highlight {
        font-weight: 600;
        color: #5D7CFA;
        background-color: #f0f7ff;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 15px;
        display: inline-block;
        box-shadow: 0 1px 3px rgba(93, 124, 250, 0.1);
        border: 1px solid rgba(93, 124, 250, 0.1);
      }
      .premium-badge {
        display: inline-block;
        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        color: white;
        font-size: 12px;
        font-weight: 600;
        padding: 5px 14px;
        border-radius: 12px;
        margin-left: 12px;
        vertical-align: middle;
        box-shadow: 0 3px 6px rgba(139, 92, 246, 0.35);
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">
          <img src="${flappyAvatarUrl}" alt="Flappy the Pelican" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235D7CFA%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><circle cx=%2212%22 cy=%2212%22 r=%2212%22 fill=%22%235D7CFA%22 /><text x=%228%22 y=%2218%22 font-family=%22Arial%22 font-size=%2216%22 fill=%22white%22>F</text></svg>';">
        </div>
        <div>
          <h1 class="title">Flappy ${isPremium ? '<span class="premium-badge">PREMIUM</span>' : ''}</h1>
          <div class="subtitle">Your Journaling Companion</div>
        </div>
      </div>
      <div class="content">
        ${htmlParagraphs.join('')}
        
        <div class="journal-tip">
          <h3>💬 Continue Our Conversation</h3>
          <p>Simply <span class="highlight">reply to this email</span> to continue our conversation. I'm here to chat about anything that's on your mind, offer perspective, or just listen. Our conversations can be as deep or light as you'd like.</p>
        </div>
        
        <div class="journal-tip" style="background-color: #e8f5e9; border-left-color: #66bb6a;">
          <h3>📝 How to Save as a Journal Entry</h3>
          <p>Want to save this conversation as a journal entry? Simply reply with the word <span class="highlight">"SAVE"</span> or phrases like <span class="highlight">"save this as a journal entry"</span> or <span class="highlight">"add this to my journal"</span>.</p>
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
