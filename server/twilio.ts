import twilio from 'twilio';
import { User, InsertSmsMessage, SmsMessage, InsertJournalEntry } from '@shared/schema';
import { storage } from './storage';
import { generateFlappyContent, FlappyContentType } from './openai';

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
    // Check if user is premium and has a phone number
    if (!user.isPremium || !user.phoneNumber) {
      console.warn(`Cannot send SMS to user ${user.id}: not premium or no phone number`);
      return null;
    }

    try {
      // Use the safe utility function to send the message
      const message = await safeSendMessage(user.phoneNumber, content);
      
      // Store the SMS in our database
      const smsData: InsertSmsMessage = {
        userId: user.id,
        phoneNumber: user.phoneNumber,
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
          "We couldn't find your account. Please sign up for Featherweight to use this service."
        );
        return;
      }

      // Check if user is premium
      if (!user.isPremium) {
        await safeSendMessage(
          from,
          "This feature requires a premium subscription. Please upgrade your account on our website."
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
      // Generate a response using Flappy's AI personality
      const responseContent = await generateFlappyContent('journalResponse', message);
      
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
   * Users can prefix their message with "Journal:" or similar
   */
  isJournalEntryRequest(message: string): boolean {
    const journalPrefixes = ['journal:', 'journal entry:', 'dear journal:', 'entry:'];
    const lowerMessage = message.toLowerCase().trim();
    
    return journalPrefixes.some(prefix => lowerMessage.startsWith(prefix));
  },

  /**
   * Extract the journal content from a prefixed message
   */
  extractJournalContent(message: string): string {
    const lowerMessage = message.toLowerCase().trim();
    const journalPrefixes = ['journal:', 'journal entry:', 'dear journal:', 'entry:'];
    
    for (const prefix of journalPrefixes) {
      if (lowerMessage.startsWith(prefix)) {
        return message.slice(prefix.length).trim();
      }
    }
    
    // If no prefix found, return the whole message
    return message;
  },

  /**
   * Generate a title for the journal entry based on content
   */
  generateJournalTitle(content: string): string {
    // Simple algorithm to extract first few words or sentence
    const words = content.split(' ');
    const firstFewWords = words.slice(0, 5).join(' ');
    
    // Add ellipsis if we truncated
    return words.length > 5 ? `${firstFewWords}...` : firstFewWords;
  }
};