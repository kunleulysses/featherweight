import { db } from "./db.js";
import { conversations, journalEntries, users } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import { generateFlappyContent } from "./openai.js";
import { memoryService } from "./memory-service.js";

/**
 * Service to handle conversations with Flappy
 */
export const conversationService = {
  /**
   * Process a new message from the user and generate a response
   */
  async processMessage(userId, content, saveAsJournal = false) {
    console.log(`Processing message for user ${userId}`);
    console.log(`Content: ${content.substring(0, 50)}...`);
    console.log(`Save as journal: ${saveAsJournal}`);
    
    try {
      // Get user information
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }
      
      // Process this message to extract potential memories
      await memoryService.processMessage(
        userId, 
        content,
        saveAsJournal ? 'journal_topic' : 'conversation'
      );
      
      // Generate Flappy's response
      const contentType = saveAsJournal ? 'journalResponse' : 'emailConversation';
      const flappyContent = await generateFlappyContent(contentType, user, content);
      
      // Create conversation record
      const [conversation] = await db.insert(conversations)
        .values({
          userId: userId,
          userMessage: content,
          flappyResponse: flappyContent.content,
          conversationType: saveAsJournal ? 'journal' : 'general',
          savedAsJournal: saveAsJournal,
          messageTags: extractTags(content),
          mood: detectMood(content)
        })
        .returning();
      
      // If this should be saved as a journal entry, create one
      if (saveAsJournal) {
        const [journalEntry] = await db.insert(journalEntries)
          .values({
            userId: userId,
            title: flappyContent.subject || `Journal Entry ${new Date().toLocaleDateString()}`,
            content: content,
            mood: detectMood(content),
            tags: extractTags(content)
          })
          .returning();
        
        // Update the conversation with the journal entry ID
        await db.update(conversations)
          .set({ journalEntryId: journalEntry.id })
          .where(eq(conversations.id, conversation.id));
        
        // Update the conversation object for the response
        conversation.journalEntryId = journalEntry.id;
      }
      
      return conversation;
    } catch (error) {
      console.error("Error processing conversation:", error);
      throw error;
    }
  },
  
  /**
   * Get conversations for a user
   */
  async getConversations(userId) {
    return db.select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(conversations.createdAt, 'desc');
  },
  
  /**
   * Get a single conversation
   */
  async getConversation(id) {
    const [conversation] = await db.select()
      .from(conversations)
      .where(eq(conversations.id, id));
    
    return conversation;
  },
  
  /**
   * Save a conversation as a journal entry
   */
  async saveAsJournal(conversationId, userId) {
    // Get the conversation
    const [conversation] = await db.select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    
    if (conversation.userId !== userId) {
      throw new Error("Not authorized to access this conversation");
    }
    
    if (conversation.savedAsJournal) {
      // Already saved as journal
      return conversation;
    }
    
    // Create a journal entry
    const [journalEntry] = await db.insert(journalEntries)
      .values({
        userId: userId,
        title: `Conversation from ${new Date(conversation.createdAt).toLocaleDateString()}`,
        content: conversation.userMessage,
        mood: conversation.mood || undefined,
        tags: conversation.messageTags || []
      })
      .returning();
    
    // Update the conversation
    const [updatedConversation] = await db.update(conversations)
      .set({
        savedAsJournal: true,
        journalEntryId: journalEntry.id
      })
      .where(eq(conversations.id, conversationId))
      .returning();
    
    return updatedConversation;
  }
};

/**
 * Extract tags from content
 */
function extractTags(content) {
  const tagRegex = /#(\w+)/g;
  const matches = content.match(tagRegex);
  
  if (!matches) return [];
  
  return [...new Set(matches.map(tag => tag.slice(1).toLowerCase()))];
}

/**
 * Detect mood from content
 */
function detectMood(content) {
  const lowerContent = content.toLowerCase();
  
  // Very simple mood detection - in a real app, use NLP or sentiment analysis
  if (lowerContent.includes('happy') || 
      lowerContent.includes('joy') || 
      lowerContent.includes('excited')) {
    return 'happy';
  } else if (lowerContent.includes('calm') || 
             lowerContent.includes('peaceful') || 
             lowerContent.includes('relaxed')) {
    return 'calm';
  } else if (lowerContent.includes('sad') || 
             lowerContent.includes('unhappy') || 
             lowerContent.includes('depressed')) {
    return 'sad';
  } else if (lowerContent.includes('angry') || 
             lowerContent.includes('frustrated') || 
             lowerContent.includes('annoyed')) {
    return 'frustrated';
  }
  
  return 'neutral';
}