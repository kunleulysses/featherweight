import { db } from "./db.js";
import { conversations, journalEntries, users } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import { generateFlappyContent } from "./openai.js";

/**
 * Simple conversation handler for the direct Conversation Center
 */
export const directConversationHandler = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const { content, save_as_journal = false } = req.body;
    
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ message: "Message content is required" });
    }
    
    // Generate Flappy's response
    const flappyResponse = await generateFlappyContent(
      save_as_journal ? 'journalResponse' : 'emailConversation',
      req.user,
      content
    );
    
    console.log(`Generated response: ${flappyResponse.content.substring(0, 50)}...`);
    
    // Format tags from content if any
    const tags = extractTags(content);
    
    // Determine mood from content
    const mood = detectMood(content);
    
    // Save conversation to database
    const [conversation] = await db.insert(conversations)
      .values({
        userId: req.user.id,
        userMessage: content,
        flappyResponse: flappyResponse.content,
        conversationType: save_as_journal ? 'journal' : 'general',
        savedAsJournal: save_as_journal,
        messageTags: tags,
        mood: mood
      })
      .returning();
    
    // If this should be saved as a journal entry, create one
    if (save_as_journal) {
      const [journalEntry] = await db.insert(journalEntries)
        .values({
          userId: req.user.id,
          title: flappyResponse.subject || `Journal Entry ${new Date().toLocaleDateString()}`,
          content: content,
          mood: mood,
          tags: tags
        })
        .returning();
      
      // Update the conversation with the journal entry ID
      await db.update(conversations)
        .set({ journalEntryId: journalEntry.id })
        .where(eq(conversations.id, conversation.id));
      
      // Update the conversation object for the response
      conversation.journalEntryId = journalEntry.id;
    }
    
    return res.status(201).json(conversation);
  } catch (error) {
    console.error("Error in direct conversation handler:", error);
    return res.status(500).json({ message: "Failed to process conversation" });
  }
};

/**
 * Get conversations for the current user
 */
export const getConversationsHandler = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userConversations = await db.select()
      .from(conversations)
      .where(eq(conversations.userId, req.user.id))
      .orderBy(conversations.createdAt, 'desc');
    
    return res.json(userConversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res.status(500).json({ message: "Failed to fetch conversations" });
  }
};

/**
 * Save a conversation as a journal entry
 */
export const saveAsJournalHandler = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const conversationId = parseInt(req.params.id);
    
    // Get the conversation
    const [conversation] = await db.select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    if (conversation.userId !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    if (conversation.savedAsJournal) {
      return res.status(400).json({ message: "Conversation is already saved as a journal entry" });
    }
    
    // Create a journal entry
    const [journalEntry] = await db.insert(journalEntries)
      .values({
        userId: req.user.id,
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
    
    return res.json(updatedConversation);
  } catch (error) {
    console.error("Error saving conversation as journal:", error);
    return res.status(500).json({ message: "Failed to save conversation as journal" });
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
  
  // Simple mood detection
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