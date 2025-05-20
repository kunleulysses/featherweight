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

// Email configuration - using different subdomains for sending vs receiving
const FROM_EMAIL = "flappy@em8032.featherweight.world"; // Verified domain for authentication (CNAME)
const REPLY_TO_EMAIL = "flappy@parse.featherweight.world"; // Domain with MX record for inbound parse
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
      
      // Generate a unique message ID for threading
      const messageId = `flappy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@featherweight.world`;
      
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
            text: 'Featherweight - Your Journaling Companion\nReply to this email to continue your conversation with Flappy\n\nTo unsubscribe from these emails, visit: https://featherweight.world/unsubscribe',
            html: `<p style="color: #9E9E9E; font-size: 12px;">
              Featherweight - Your Journaling Companion<br>
              Reply to this email to continue your conversation with Flappy<br><br>
              <a href="https://featherweight.world/unsubscribe?id=${messageId}" style="color: #9E9E9E;">Unsubscribe</a> or manage your 
              <a href="https://featherweight.world/preferences" style="color: #9E9E9E;">email preferences</a>
            </p>`
          }
        },
        // Adding custom headers for threading and deliverability
        headers: {
          "X-Entity-Ref-ID": messageId,
          "Message-ID": `<${messageId}>`,
          "List-Unsubscribe": `<https://featherweight.world/unsubscribe?id=${messageId}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "Feedback-ID": `${isPremium ? 'premium' : 'free'}:featherweight:${messageId}`
        }
      };
      
      console.log('Email message object prepared, attempting to send via SendGrid');
      
      try {
        const [response] = await sgMail.send(msg);
        console.log('=== EMAIL SENT SUCCESSFULLY ===');
        console.log(`Status code: ${response?.statusCode}`);
        console.log(`Message ID: ${response?.headers?.['x-message-id'] || messageId}`);
        console.log(`Headers: ${JSON.stringify(response?.headers || {})}`);
        
        // Use SendGrid message ID if available, otherwise use our generated one
        const finalMessageId = response?.headers?.['x-message-id'] || messageId;
        return { messageId: finalMessageId };
      } catch (sendGridError: any) {
        console.error('⚠️ SendGrid API error:');
        console.error(`Status Code: ${sendGridError?.code || 'unknown'}`);
        console.error(`Response: ${sendGridError?.response?.body ? JSON.stringify(sendGridError.response.body) : 'No response body'}`);
        console.error(`Message: ${sendGridError?.message || 'No error message'}`);
        
        // If we have response details, log more information
        if (sendGridError?.response) {
          console.error(`Response status: ${sendGridError.response.statusCode}`);
          console.error(`Response headers: ${JSON.stringify(sendGridError.response.headers || {})}`);
        }
        
        throw new Error(`SendGrid API error: ${sendGridError?.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('⚠️ General email sending error:');
      console.error(`Type: ${error?.constructor?.name || 'Unknown error type'}`);
      console.error(`Message: ${error?.message || 'No error message'}`);
      console.error(`Stack: ${error?.stack || 'No stack trace'}`);
      console.error(`Details: ${JSON.stringify(error || {})}`);
      
      throw new Error(`Failed to send email: ${error?.message || 'Unknown error'}`);
    }
  },
  
  // Send Flappy-generated content to a user
  async sendFlappyEmail(user: User, contentType: FlappyContentType, context?: string): Promise<Email> {
    // Generate a subject line based on content type
    let subject = 'A Message from Flappy';
    
    switch (contentType) {
      case 'daily_inspiration':
        subject = "Today's Inspiration from Flappy";
        break;
      case 'journal_acknowledgment':
        subject = "Your Journal Entry Has Been Received";
        break;
      case 'weekly_insight':
        subject = "Your Weekly Reflection Insights";
        break;
      case 'email_conversation':
        subject = "Flappy's Response";
        break;
      case 'journal_response':
        subject = "Flappy's Thoughts on Your Journal";
        break;
      case 'conversation_reply':
        subject = "Flappy's Reply";
        break;
    }
    
    // Create personalized greeting
    const userName = user.username || 'Friend';
    const greeting = `Hello ${userName}!`;
    
    // Generate content from Flappy
    const flappyContent = await generateFlappyContent(contentType, greeting, context);
    
    // Add a friendly signature
    const signature = "\n\nFeathery thoughts,\nFlappy 🦢";
    const fullContent = `${flappyContent}\n${signature}`;
    
    // Create an email record first in pending state
    const emailData: InsertEmail = {
      userId: user.id,
      to: user.email,
      from: FROM_EMAIL,
      subject,
      content: fullContent,
      sentAt: new Date(),
      isRead: false,
      direction: 'outbound',
      messageId: '', // Will be filled in after sending
      mood: detectMood(flappyContent),
      tags: extractTags(flappyContent),
      isJournalEntry: false
    };
    
    try {
      // Send the email
      const { messageId } = await this.sendEmail(
        user.email,
        subject,
        fullContent,
        user.isPremium // Premium users don't get ads
      );
      
      // Update the message ID
      emailData.messageId = messageId;
      
      // Save to database
      const email = await storage.createEmail(emailData);
      console.log(`Email ${email.id} saved to database`);
      
      return email;
    } catch (error) {
      console.error('Failed to send Flappy email:', error);
      throw error;
    }
  },
  
  // Process an incoming email (reply or new)
  async processIncomingEmail(from: string, subject: string, content: string, inReplyTo?: string): Promise<void> {
    console.log('🌟 === INCOMING EMAIL PROCESSING STARTED === 🌟');
    console.log(`📧 SENDER: ${from}`);
    console.log(`📝 SUBJECT: ${subject}`);
    console.log(`📊 CONTENT LENGTH: ${content.length} characters`);
    console.log(`🔄 REPLY-TO MESSAGE ID: ${inReplyTo || 'Not a reply'}`);
    console.log(`📄 CONTENT PREVIEW: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
    
    // Clean up content (remove signatures, quoting, etc.)
    const cleanContent = cleanEmailContent(content);
    
    // Check if this is a reply to a previous email
    const isReply = !!inReplyTo || subject.toLowerCase().startsWith('re:');
    
    try {
      // Step 1: Find the user by email address
      console.log('👤 STEP 1: Looking up user by email address');
      console.log(`🔍 Searching for user with email: ${from}`);
      const user = await storage.getUserByEmail(from);
      
      if (!user) {
        console.log(`❓ No user found for email: ${from}`);
        
        // Send a welcome message to this email address
        console.log('📤 Sending welcome email to unregistered user');
        
        try {
          const welcomeMessage = `
Hello from Featherweight!

It looks like you've discovered Flappy, your personal journaling companion. 
I'm a friendly pelican AI who can help you maintain a journal through email.

To get started, simply reply to this email with your thoughts, feelings, or experiences,
and I'll help you save them as journal entries. You can also ask me questions or just chat!

Looking forward to our conversations,

Flappy 🦢
`;
          
          await this.sendEmail(
            from,
            'Welcome to Featherweight - Your Personal Journaling Companion',
            welcomeMessage,
            false
          );
          
          console.log(`✅ Welcome email sent successfully to ${from}`);
        } catch (emailError) {
          console.error(`Failed to send welcome email to ${from}:`, emailError);
        }
        
        return;
      }
      
      console.log(`Found user: ID=${user.id}, Username=${user.username}, Premium=${user.isPremium}`);
      
      // Check if it looks like a journal entry (when not a reply, and a certain length)
      const shouldBeJournal = !isReply && await this.shouldSaveAsJournal(cleanContent);
      
      if (shouldBeJournal) {
        console.log('📓 Treating email as a journal entry');
        
        // Extract mood and tags from content
        const mood = detectMood(cleanContent);
        const tags = extractTags(cleanContent);
        
        console.log(`🔍 Detected mood: ${mood}`);
        console.log(`🔍 Extracted tags: ${tags.join(', ')}`);
        
        // Create journal entry
        const entry = await storage.createJournalEntry({
          userId: user.id,
          title: subject || "Journal Entry",
          content: cleanContent,
          createdAt: new Date(),
          updatedAt: new Date(),
          mood,
          tags,
          imageUrl: null,
          isPrivate: false
        });
        
        console.log(`✅ Journal entry created with ID: ${entry.id}`);
        
        // Process the content for memories
        await memoryService.processMessage(user.id, cleanContent, 'journal_topic');
        
        // Send acknowledgment email
        await this.sendFlappyEmail(user, 'journal_acknowledgment' as any, cleanContent);
        console.log('✅ Journal acknowledgment email sent');
        
        // Create a record of the incoming email
        await storage.createEmail({
          userId: user.id,
          to: REPLY_TO_EMAIL,
          from: user.email,
          subject,
          content: cleanContent,
          sentAt: new Date(),
          isRead: true,
          direction: 'inbound',
          isJournalEntry: true,
          journalEntryId: entry.id,
          messageId: inReplyTo || `incoming-${Date.now()}`,
          mood,
          tags,
        });
        
        console.log('✅ Email record saved in database');
      } else {
        console.log('💬 Treating email as a conversation message');
        
        // Generate a conversation ID for threading if this is a new conversation
        let conversationId = '';
        if (isReply && inReplyTo) {
          // Try to find previous email by message ID to maintain conversation thread
          const previousThreadEmails = await storage.getEmails(user.id, {
            messageId: inReplyTo
          });
          
          if (previousThreadEmails && previousThreadEmails.length > 0) {
            // Use the conversation ID from the previous email
            conversationId = previousThreadEmails[0].conversationId || '';
          }
        }
        
        // If no conversation ID from previous email, generate a new one
        if (!conversationId) {
          conversationId = memoryService.generateConversationId();
        }
        
        console.log(`🔄 Using conversation ID: ${conversationId}`);
        
        // Save the incoming email first
        const incomingEmail = await storage.createEmail({
          userId: user.id,
          to: REPLY_TO_EMAIL,
          from: user.email,
          subject,
          content: cleanContent,
          sentAt: new Date(),
          isRead: true,
          direction: 'inbound',
          isJournalEntry: false,
          messageId: inReplyTo || `incoming-${Date.now()}`,
          conversationId,
          mood: detectMood(cleanContent),
          tags: extractTags(cleanContent)
        });
        
        console.log(`✅ Incoming email saved with ID: ${incomingEmail.id}`);
        
        // Process the content for memories
        await memoryService.processMessage(user.id, cleanContent, 'email');
        
        // Get relevant memories to include in the response
        const relevantMemories = await memoryService.getRelevantMemories(user.id, cleanContent);
        const memoryContext = memoryService.formatMemoriesForPrompt(relevantMemories);
        
        console.log(`🧠 Found ${relevantMemories.length} relevant memories to include in response`);
        
        // Send response email
        await this.sendFlappyEmail(user, 'email_conversation' as any, `${cleanContent}\n\n${memoryContext}`);
        console.log('✅ Response email sent');
      }
    } catch (error) {
      console.error('❌ Error processing incoming email:', error);
      console.error('❌ Error details:', error instanceof Error ? error.stack : 'No stack trace');
    }
  },
  
  // Determine if content should be saved as a journal entry
  async shouldSaveAsJournal(content: string): Promise<boolean> {
    // If very short, probably not a journal entry
    if (content.length < 50) {
      return false;
    }
    
    // Try to detect if this is journaling content
    try {
      const journalIndicators = [
        "today i", "dear diary", "journal entry", "reflecting on",
        "my day", "my thoughts", "i'm feeling", "i am feeling",
        "i feel", "happened today", "grateful for", "i learned",
        "my experience", "i realized", "i've been", "i have been",
        "looking back"
      ];
      
      // Check if content contains any journal indicators
      const contentLower = content.toLowerCase();
      const hasJournalIndicator = journalIndicators.some(indicator => 
        contentLower.includes(indicator)
      );
      
      if (hasJournalIndicator) {
        return true;
      }
      
      // If length is substantial and has multiple paragraphs, likely a journal
      if (content.length > 300 && content.split(/\r?\n\r?\n/).length > 1) {
        return true;
      }
      
      // Default to not treating as journal if uncertain
      return false;
    } catch (error) {
      console.error('Error determining if content is a journal entry:', error);
      // In case of error, default to treating as conversation
      return false;
    }
  },
  
  // Send daily inspiration emails to all eligible users
  async sendDailyInspiration(): Promise<{ success: boolean; count: number }> {
    try {
      const users = await this.getAllActiveUsers();
      console.log(`Found ${users.length} active users eligible for daily inspiration`);
      
      let successCount = 0;
      
      for (const user of users) {
        try {
          await this.sendFlappyEmail(user, 'daily_inspiration' as any);
          successCount++;
          console.log(`Daily inspiration sent to ${user.email}`);
        } catch (error) {
          console.error(`Failed to send daily inspiration to ${user.email}:`, error);
        }
      }
      
      return { 
        success: true, 
        count: successCount 
      };
    } catch (error) {
      console.error('Failed to send daily inspiration emails:', error);
      return { 
        success: false, 
        count: 0 
      };
    }
  },
  
  // Send weekly insights based on journal entries
  async sendWeeklyInsights(): Promise<{ success: boolean; count: number }> {
    try {
      const users = await this.getAllActiveUsers();
      console.log(`Found ${users.length} active users eligible for weekly insights`);
      
      let successCount = 0;
      
      for (const user of users) {
        try {
          // Get journal entries from the past week
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          
          const recentEntries = await storage.getJournalEntries(user.id, {
            createdAfter: oneWeekAgo
          });
          
          if (recentEntries.length === 0) {
            console.log(`User ${user.email} has no journal entries in the past week, skipping`);
            continue;
          }
          
          // Build context for the weekly insights
          const entriesContext = recentEntries.map(entry => {
            return `Date: ${entry.createdAt.toLocaleDateString()}\nMood: ${entry.mood || 'unspecified'}\nContent: ${entry.content.substring(0, 200)}${entry.content.length > 200 ? '...' : ''}`;
          }).join('\n\n');
          
          // Send weekly insights email with the journal entries as context
          await this.sendFlappyEmail(user, 'weekly_insight' as any, entriesContext);
          successCount++;
          console.log(`Weekly insights sent to ${user.email} based on ${recentEntries.length} entries`);
        } catch (error) {
          console.error(`Failed to send weekly insights to ${user.email}:`, error);
        }
      }
      
      return { 
        success: true, 
        count: successCount 
      };
    } catch (error) {
      console.error('Failed to send weekly insights emails:', error);
      return { 
        success: false, 
        count: 0 
      };
    }
  },
  
  /**
   * Helper function to get all active users
   * Gets users from the database and filters them based on activity status
   */
  async getAllActiveUsers(): Promise<User[]> {
    const allUsers = await storage.getAllUsers();
    
    // Filter to users who have opted in to emails (or have no preference set)
    const activeUsers = allUsers.filter(user => {
      const preferences = user.preferences || {};
      // Include if no email preference is set or if emailFrequency is not 'none'
      return !preferences.emailFrequency || preferences.emailFrequency !== 'none';
    });
    
    console.log(`Found ${activeUsers.length} active users out of ${allUsers.length} total users`);
    return activeUsers;
  }
};

/**
 * Format email content as HTML with branding
 */
function formatEmailHTML(content: string, isPremium: boolean = false): string {
  // Replace newlines with <br> tags
  const htmlContent = content.replace(/\n/g, '<br>');
  
  // Apply light styling with calm colors
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Message from Flappy</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f7f9fc;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .header {
      text-align: center;
      margin-bottom: 25px;
    }
    .logo {
      max-width: 120px;
      margin-bottom: 15px;
    }
    .content {
      line-height: 1.6;
      font-size: 16px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eaeaea;
      text-align: center;
      font-size: 12px;
      color: #999;
    }
    .ad-banner {
      background-color: #f0f7ff;
      border: 1px solid #d0e3ff;
      border-radius: 6px;
      padding: 10px;
      margin-top: 25px;
      text-align: center;
      font-size: 14px;
      color: #4a6a96;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Featherweight</h1>
    </div>
    <div class="content">
      ${htmlContent}
    </div>
    ${!isPremium ? `
    <div class="ad-banner">
      Upgrade to premium for an ad-free experience and additional features including SMS journaling.<br>
      <a href="https://featherweight.world/premium">Learn More</a>
    </div>
    ` : ''}
    <div class="footer">
      &copy; ${new Date().getFullYear()} Featherweight - Your Journaling Companion<br>
      Simply reply to this email to continue your conversation with Flappy
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Clean up email content by removing common patterns like:
 * - Email signatures
 * - Quoted text in replies
 * - Legal footers
 * - Automatically inserted text
 */
function cleanEmailContent(content: string): string {
  let cleanContent = content.trim();
  
  // Remove quoted text (lines starting with >)
  cleanContent = cleanContent.replace(/^>.*$/mg, '');
  
  // Remove "On ... wrote:" pattern commonly found in replies
  cleanContent = cleanContent.replace(/On.*wrote:.*$/s, '');
  
  // Remove common signature markers
  const signatureMarkers = [
    '-- \n', '--\n', '__________', '----------', 'Sent from ', 
    'Get Outlook', 'Best regards', 'Kind regards', 'Regards,',
    'Sincerely,', 'Cheers,', 'Thanks,', 'Thank you,'
  ];
  
  for (const marker of signatureMarkers) {
    const index = cleanContent.indexOf(marker);
    if (index !== -1) {
      cleanContent = cleanContent.substring(0, index).trim();
    }
  }
  
  // Remove legal footers & confidentiality notices
  const legalMarkers = [
    'CONFIDENTIALITY NOTICE', 'DISCLAIMER', 'LEGAL NOTICE',
    'This email and any files', 'This message is confidential',
    'This communication is intended', 'The information contained in'
  ];
  
  for (const marker of legalMarkers) {
    const index = cleanContent.indexOf(marker);
    if (index !== -1) {
      cleanContent = cleanContent.substring(0, index).trim();
    }
  }
  
  // Clean up extra spacing and whitespace
  cleanContent = cleanContent
    .replace(/\n{3,}/g, '\n\n') // Replace excessive newlines
    .trim();
  
  return cleanContent;
}

/**
 * Detect mood from content using simple keyword matching
 * This is a fallback for when AI analysis isn't available
 */
function detectMood(content: string): string {
  const contentLower = content.toLowerCase();
  
  const moodPatterns = {
    happy: ['happy', 'joy', 'excited', 'amazing', 'wonderful', 'great', 'good', 'love', 'delighted'],
    calm: ['calm', 'peaceful', 'relaxed', 'tranquil', 'serene', 'content', 'comfortable', 'soothing'],
    sad: ['sad', 'unhappy', 'miserable', 'depressed', 'upset', 'blue', 'down', 'disappointed', 'sorrow'],
    frustrated: ['frustrated', 'angry', 'annoyed', 'irritated', 'mad', 'furious', 'rage', 'upset', 'stress', 'worried', 'anxiety']
  };
  
  // Count matches for each mood
  let counts = {
    happy: 0,
    calm: 0,
    sad: 0,
    frustrated: 0
  };
  
  // Count occurrences of each mood pattern
  for (const [mood, patterns] of Object.entries(moodPatterns)) {
    for (const pattern of patterns) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
      const matches = contentLower.match(regex) || [];
      counts[mood] += matches.length;
    }
  }
  
  // Find the mood with the highest count
  let dominantMood = 'neutral';
  let maxCount = 0;
  
  for (const [mood, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantMood = mood;
    }
  }
  
  // If no mood patterns found, return neutral
  return maxCount > 0 ? dominantMood : 'neutral';
}

/**
 * Extract potential tags from content
 */
function extractTags(content: string): string[] {
  // This is a simple approach for extracting tags
  // Later we can replace this with AI-based extraction
  
  // Split content into words
  const words = content.toLowerCase().split(/\s+/);
  
  // Find potential tags
  const commonTags = new Set([
    'work', 'family', 'health', 'fitness', 'travel', 'food', 'learning',
    'hobby', 'meditation', 'gratitude', 'challenge', 'reflection', 'goal',
    'achievement', 'relationship', 'nature', 'reading', 'writing', 'art',
    'music', 'technology', 'personal', 'growth', 'adventure', 'creativity',
    'inspiration', 'leadership', 'mindfulness', 'productivity', 'rest'
  ]);
  
  // Extract tags with deduplication
  const tags = new Set<string>();
  
  for (const word of words) {
    const cleanWord = word.replace(/[^a-z0-9]/g, '');
    if (cleanWord.length > 3 && commonTags.has(cleanWord)) {
      tags.add(cleanWord);
    }
  }
  
  // Convert to array and limit to top tags (maximum 5)
  return Array.from(tags).slice(0, 5);
}