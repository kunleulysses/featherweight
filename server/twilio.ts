import twilio from 'twilio';
import { User, InsertSmsMessage, SmsMessage, InsertJournalEntry } from '@shared/schema';
import { storage } from './storage';
import { generateFlappyContent, FlappyContentType } from './openai';
import { memoryService } from './memory-service';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client: twilio.Twilio | null = null;

// Check if all Twilio credentials are configured
const isTwilioConfigured = accountSid && authToken && twilioPhoneNumber;

if (!isTwilioConfigured) {
  console.warn('Twilio credentials not fully configured. SMS features will use mock mode.');
} else {
  try {
    client = twilio(accountSid, authToken);
    console.log('Twilio client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Twilio client:', error);
    client = null;
  }
}

// Utility function to safely send SMS using Twilio or mock it
async function safeSendMessage(to: string, body: string): Promise<{sid: string}> {
  if (client && isTwilioConfigured) {
    return await client.messages.create({
      body: body,
      from: twilioPhoneNumber!,
      to: to
    });
  } else {
    // Mock SMS sending in development
    console.log(`[MOCK SMS] To: ${to}, Content: ${body}`);
    return { sid: `mock-${Date.now()}` };
  }
}

export const twilioService = {
  /**
   * Send an SMS message to a user
   */
  async sendSmsMessage(user: User, content: string): Promise<SmsMessage | null> {
    // Check if user is premium and has a phone number in preferences
    const phoneNumber = user.preferences?.phoneNumber;
    if (!user.isPremium || !phoneNumber) {
      console.warn(`Cannot send SMS to user ${user.id}: not premium or no phone number`);
      return null;
    }

    try {
      // Use the safe utility function to send the message
      const message = await safeSendMessage(phoneNumber, content);
      
      // Store the SMS in our database
      const smsData: InsertSmsMessage = {
        userId: user.id,
        phoneNumber: phoneNumber || '',
        content,
        direction: 'outbound',
        twilioSid: message.sid,
        isJournalEntry: false
      };

      return await storage.createSmsMessage(smsData);
    } catch (error) {
      console.error('Error sending SMS message:', error);
      return null;
    }
  },

  /**
   * Send daily inspiration via SMS for premium users
   */
  async sendDailyInspirationSms(user: User): Promise<SmsMessage | null> {
    try {
      const flappyResponse = await generateFlappyContent('dailyInspiration');
      
      // Format SMS message - shorter for SMS
      const smsContent = `🐦 Daily Wisdom from Flappy 🐦\n\n${flappyResponse.content}`;
      
      return await this.sendSmsMessage(user, smsContent);
    } catch (error) {
      console.error('Error sending daily inspiration via SMS:', error);
      return null;
    }
  },

  /**
   * Process incoming SMS as a journal entry or conversation
   */
  async processIncomingSms(from: string, body: string): Promise<void> {
    try {
      // Look up the user by phone number
      const user = await storage.getUserByPhoneNumber(from);
      
      if (!user) {
        // If no user found, send a message indicating the service is unavailable
        await safeSendMessage(
          from, 
          "We couldn't find your account. Please sign up at featherweight.world to use this service with Flappy."
        );
        return;
      }

      // Check if user is premium
      if (!user.isPremium) {
        await safeSendMessage(
          from,
          "This feature requires a premium subscription. Please upgrade your account at featherweight.world to enable SMS journaling."
        );
        return;
      }

      // Store the incoming message
      const smsData: InsertSmsMessage = {
        userId: user.id,
        phoneNumber: from,
        content: body,
        direction: 'inbound',
        isJournalEntry: this.isJournalEntryRequest(body)
      };

      const savedMessage = await storage.createSmsMessage(smsData);

      // If this is a journal entry request, create a journal entry
      if (this.isJournalEntryRequest(body)) {
        // Extract the journal content from the message
        const journalContent = this.extractJournalContent(body);
        
        // Create a journal entry
        const journalData: InsertJournalEntry = {
          userId: user.id,
          content: journalContent,
          title: this.generateJournalTitle(journalContent)
        };

        const journalEntry = await storage.createJournalEntry(journalData);
        
        // Process journal content for memories
        await memoryService.processMessage(user.id, journalContent, 'journal_topic');
        
        // Update the SMS message with the journal entry ID
        await storage.updateSmsMessage(savedMessage.id, {
          journalEntryId: journalEntry.id
        });

        // Respond with acknowledgment
        await this.sendJournalAcknowledgment(user);
      } else {
        // This is a conversation with Flappy
        await this.respondToConversation(user, body);
      }
    } catch (error) {
      console.error('Error processing incoming SMS:', error);
    }
  },

  /**
   * Send journal acknowledgment response
   */
  async sendJournalAcknowledgment(user: User): Promise<SmsMessage | null> {
    const acknowledgments = [
      "I've saved your journal entry! Keep sharing your thoughts with me whenever you feel like it.",
      "Your journal entry has been recorded! I'm here whenever you need to reflect.",
      "Entry saved! Remember, consistent journaling leads to greater self-awareness.",
      "Got it! Your thoughts are now safely in your journal. How are you feeling now?",
      "Journal updated! It takes courage to reflect, and you're doing great."
    ];

    const randomResponse = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
    return await this.sendSmsMessage(user, randomResponse);
  },

  /**
   * Respond to a conversation message
   */
  async respondToConversation(user: User, message: string): Promise<SmsMessage | null> {
    try {
      // Process message for memories before responding
      await memoryService.processMessage(user.id, message, 'sms');
      
      // Generate a response using Flappy's AI personality with memories
      const responseContent = await generateFlappyContent('journalResponse', message, {
        username: user.username,
        email: user.email,
        userId: user.id,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined
      });
      
      // Format for SMS - shorter than email
      const smsResponse = responseContent.content;
      
      return await this.sendSmsMessage(user, smsResponse);
    } catch (error) {
      console.error('Error generating conversation response:', error);
      
      // Send a fallback response
      const fallbackResponses = [
        "Squawk! I'm having a bit of trouble with my ancient wisdom right now. Could you try again in a moment?",
        "My cosmic connection is a bit fuzzy. Let's chat again shortly!",
        "Even ancient pelicans have off moments. Let me gather my thoughts and try again soon.",
        "My feathers are ruffled by some technical difficulties. I'll be back to my wise self soon!"
      ];
      
      const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      return await this.sendSmsMessage(user, fallbackResponse);
    }
  },

  /**
   * Check if the message is intended as a journal entry
   * Users can prefix their message with "Journal:" or similar,
   * or use hashtags like #journal
   */
  isJournalEntryRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase().trim();
    
    // Check for the "SAVE" command (case insensitive)
    if (lowerMessage === "save") {
      return true;
    }
    
    // Check for prefixes at the beginning of the message
    const journalPrefixes = ['journal:', 'journal entry:', 'dear journal:', 'entry:', 'log:', 'diary:', 'note:'];
    
    // Check for prefixes
    if (journalPrefixes.some(prefix => lowerMessage.startsWith(prefix))) {
      return true;
    }
    
    // Check for hashtags anywhere in the message
    const journalHashtags = ['#journal', '#entry', '#diary', '#note', '#log'];
    return journalHashtags.some(tag => lowerMessage.includes(tag));
  },

  /**
   * Extract the journal content from a prefixed message and format it
   */
  async extractJournalContent(message: string, userId?: number, phoneNumber?: string): Promise<string> {
    const originalMessage = message.trim();
    const lowerMessage = originalMessage.toLowerCase();
    
    // Handle the "SAVE" command - retrieve recent conversation
    if (lowerMessage === "save") {
      if (userId) {
        // Get recent SMS messages for this user
        const recentMessages = await storage.getSmsMessages(userId, { 
          dateRange: "7days",
          limit: 10
        });
        
        if (recentMessages && recentMessages.length > 0) {
          // Format the conversation into a journal entry
          const conversation = recentMessages
            .filter(msg => msg.content.toLowerCase() !== "save") // Exclude the SAVE command itself
            .map(msg => {
              const direction = msg.direction === 'inbound' ? 'You' : 'Flappy';
              const timestamp = new Date(msg.sentAt || msg.createdAt).toLocaleTimeString();
              return `${direction} (${timestamp}): ${msg.content}`;
            })
            .join("\n\n");
            
          return this.formatJournalContent(`Conversation with Flappy\n\n${conversation}`);
        } else {
          return this.formatJournalContent("No recent conversation found to save.");
        }
      } else if (phoneNumber) {
        // Try to find the user by phone number
        const user = await storage.getUserByPhoneNumber(phoneNumber);
        if (user) {
          return this.extractJournalContent("save", user.id);
        }
      }
      
      // Fallback if we can't find messages
      return this.formatJournalContent("SMS Conversation with Flappy (saved)");
    }
    
    // First check prefixes
    const journalPrefixes = ['journal:', 'journal entry:', 'dear journal:', 'entry:', 'log:', 'diary:', 'note:'];
    
    for (const prefix of journalPrefixes) {
      if (lowerMessage.startsWith(prefix.toLowerCase())) {
        // Extract the actual content without the prefix
        const content = originalMessage.slice(prefix.length).trim();
        return this.formatJournalContent(content);
      }
    }
    
    // If using hashtags, remove them from the content
    const journalHashtags = ['#journal', '#entry', '#diary', '#note', '#log'];
    let content = originalMessage;
    
    for (const tag of journalHashtags) {
      content = content.replace(new RegExp(tag, 'gi'), '');
    }
    
    return this.formatJournalContent(content.trim());
  },
  
  /**
   * Format journal content for better readability
   */
  formatJournalContent(content: string): string {
    // Add date stamp if not present
    const dateStamp = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    if (!content.includes(dateStamp)) {
      content = `${dateStamp}\n\n${content}`;
    }
    
    return content;
  },

  /**
   * Generate a title for the journal entry based on content
   */
  generateJournalTitle(content: string): string {
    // Remove the date stamp if it exists at the beginning
    const datePattern = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}\s*/i;
    const contentWithoutDate = content.replace(datePattern, '').trim();
    
    // Try to find the first sentence for a more meaningful title
    const sentences = contentWithoutDate.split(/[.!?]\s+/);
    const firstSentence = sentences[0];
    
    if (firstSentence.length <= 50) {
      // If the first sentence is a good length, use it as the title
      return firstSentence;
    } else {
      // Otherwise, extract key words or a shorter phrase
      const words = contentWithoutDate.split(' ');
      
      // Try to find a natural break point (like a comma or semicolon)
      let breakPoint = contentWithoutDate.indexOf(',');
      if (breakPoint === -1 || breakPoint > 50) {
        breakPoint = contentWithoutDate.indexOf(';');
      }
      if (breakPoint === -1 || breakPoint > 50) {
        breakPoint = 5; // Default to first 5 words if no natural break
      } else {
        // Use the natural break only if it's not too close to the beginning
        breakPoint = Math.max(breakPoint, Math.min(content.length, 3));
      }
      
      const firstFewWords = words.slice(0, breakPoint).join(' ');
      
      // Add ellipsis if we truncated
      return words.length > breakPoint ? `${firstFewWords}...` : firstFewWords;
    }
  }
};