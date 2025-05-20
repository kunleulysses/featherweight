import { storage } from './storage';
import { generateFlappyContent } from './openai';
import { 
  ConversationMemory, 
  InsertConversationMemory, 
  User,
  JournalEntry,
  Email,
  SmsMessage
} from '@shared/schema';
import OpenAI from "openai";
import { v4 as uuidv4 } from 'uuid';

// Initialize OpenAI client
const apiKey = process.env.OPENAI_API_KEY;
let openai: OpenAI | null = null;

try {
  if (apiKey) {
    openai = new OpenAI({ 
      apiKey: apiKey,
      timeout: 30000,
      maxRetries: 2
    });
  } else {
    console.warn('OpenAI API key is not configured. Memory analysis will be limited.');
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client for memory service:', error);
  openai = null;
}

export const memoryService = {
  /**
   * Process a new message and extract memory-worthy topics
   */
  async processMessage(userId: number, message: string, messageType: 'email' | 'sms' | 'journal_topic' | 'conversation'): Promise<ConversationMemory[]> {
    try {
      // Analyze message content for topics and sentiment
      const analysis = await this.analyzeContent(message);
      
      if (!analysis || !analysis.topics) {
        console.warn('Failed to analyze message content for memories');
        return [];
      }
      
      const memories: ConversationMemory[] = [];
      
      // Process each extracted topic
      for (const topic of analysis.topics) {
        // Check if this topic already exists
        const existingMemories = await storage.getConversationMemories(userId);
        const matchingMemory = existingMemories.find(
          m => m.topic && m.topic.toLowerCase() === topic.name.toLowerCase()
        );
        
        if (matchingMemory) {
          // Update existing memory
          const updatedMemory = await storage.incrementConversationMemoryFrequency(matchingMemory.id);
          if (updatedMemory) {
            memories.push(updatedMemory);
          }
        } else {
          // Create new memory
          const memoryData: InsertConversationMemory = {
            userId,
            type: messageType,
            topic: topic.name,
            sentiment: topic.sentiment || 'neutral',
            importance: topic.importance || 1,
            frequency: 1,
            context: topic.context || message.substring(0, 100),
            relatedEntryIds: [],
            isResolved: false
          };
          
          const newMemory = await storage.createConversationMemory(memoryData);
          memories.push(newMemory);
        }
      }
      
      return memories;
    } catch (error) {
      console.error('Error processing message for memories:', error);
      return [];
    }
  },
  
  /**
   * Analyze content using OpenAI to extract topics and sentiment
   */
  async analyzeContent(content: string): Promise<{
    topics: Array<{
      name: string;
      sentiment: string;
      importance: number;
      context: string;
    }>;
  } | null> {
    try {
      if (!openai) {
        // Return simple analysis if OpenAI is not available
        return this.fallbackAnalysis(content);
      }
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a content analysis assistant. Analyze the following message to extract memory-worthy topics.
            Identify topics that would be relevant for a friend to remember about someone from a conversation.
            For each topic:
            1. Provide a short name (1-3 words)
            2. Determine the sentiment (positive, negative, neutral, mixed)
            3. Rate importance (1-5 where 5 is most important)
            4. Extract a brief context (10-15 words)
            
            Respond in JSON format with an array of topics:
            {"topics": [{"name": "topic name", "sentiment": "positive", "importance": 3, "context": "brief context"}]}
            
            Only include important topics that would be worth remembering for future conversations.
            If the message is small talk or doesn't contain memory-worthy topics, return an empty array.`
          },
          {
            role: "user",
            content: content
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
        max_tokens: 800
      });
      
      const analysisText = response.choices[0].message.content;
      if (!analysisText) {
        return this.fallbackAnalysis(content);
      }
      
      try {
        return JSON.parse(analysisText);
      } catch (parseError) {
        console.error('Error parsing OpenAI analysis response:', parseError);
        return this.fallbackAnalysis(content);
      }
    } catch (error) {
      console.error('Error analyzing content:', error);
      return this.fallbackAnalysis(content);
    }
  },
  
  /**
   * Get most relevant memories for a user to use in a response
   */
  async getRelevantMemories(userId: number, currentContext: string, limit: number = 3): Promise<ConversationMemory[]> {
    try {
      // Get all memories for the user
      const allMemories = await storage.getConversationMemories(userId);
      
      if (allMemories.length === 0) {
        return [];
      }
      
      // If we have OpenAI, use it to rank memories by relevance
      if (openai) {
        const rankedMemories = await this.rankMemoriesByRelevance(allMemories, currentContext);
        return rankedMemories.slice(0, limit);
      }
      
      // Fallback: Return most frequent and recent memories
      return allMemories
        .sort((a, b) => {
          // Sort by frequency first, then by recency
          const aFreq = a.frequency || 0;
          const bFreq = b.frequency || 0;
          if (bFreq !== aFreq) {
            return bFreq - aFreq;
          }
          return new Date(b.lastDiscussed).getTime() - new Date(a.lastDiscussed).getTime();
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting relevant memories:', error);
      return [];
    }
  },
  
  /**
   * Rank memories by relevance to current context
   */
  async rankMemoriesByRelevance(memories: ConversationMemory[], currentContext: string): Promise<ConversationMemory[]> {
    try {
      if (!openai || memories.length === 0) {
        return memories;
      }
      
      const memoryDescriptions = memories.map((memory, index) => 
        `Memory ${index + 1}: Topic: ${memory.topic}, Context: ${memory.context}, Sentiment: ${memory.sentiment}, Times discussed: ${memory.frequency}`
      ).join('\n');
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a memory relevance analyst. Rank the following memories by their relevance to the current context.
            Consider:
            1. How related the memory topic is to the current context
            2. How important the memory might be for the conversation
            3. If the memory could add value to the response
            
            Respond with a JSON array of memory indexes in order of relevance:
            {"ranking": [3, 1, 5, 2, 4]} where the numbers correspond to Memory 3, Memory 1, etc.`
          },
          {
            role: "user",
            content: `Current context: ${currentContext}\n\nMemories:\n${memoryDescriptions}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 200
      });
      
      const rankingText = response.choices[0].message.content;
      if (!rankingText) {
        return memories;
      }
      
      try {
        const ranking = JSON.parse(rankingText) as { ranking: number[] };
        
        // Convert ranking to 0-based indexes and filter out invalid indexes
        const validIndexes = ranking.ranking
          .map(rank => rank - 1)
          .filter(index => index >= 0 && index < memories.length);
        
        // Return memories in ranked order, followed by any that weren't ranked
        const rankedMemories = validIndexes.map(index => memories[index]);
        const unrankedMemories = memories.filter((_, index) => !validIndexes.includes(index));
        
        return [...rankedMemories, ...unrankedMemories];
      } catch (parseError) {
        console.error('Error parsing memory ranking:', parseError);
        return memories;
      }
    } catch (error) {
      console.error('Error ranking memories:', error);
      return memories;
    }
  },
  
  /**
   * Generate conversation context from memories
   */
  formatMemoriesForPrompt(memories: ConversationMemory[]): string {
    if (memories.length === 0) {
      return "";
    }
    
    return memories.map(memory => 
      `- Topic: ${memory.topic} (Sentiment: ${memory.sentiment}, Times discussed: ${memory.frequency})
       Context: ${memory.context}`
    ).join('\n\n');
  },
  
  /**
   * Generate a unique conversation ID for threading
   */
  generateConversationId(): string {
    return uuidv4();
  },
  
  /**
   * Simple fallback analysis when OpenAI is not available
   */
  fallbackAnalysis(content: string): { topics: Array<{ name: string; sentiment: string; importance: number; context: string; }> } {
    // Extract simple topic from first sentence
    const firstSentence = content.split(/[.!?]/)[0].trim();
    const words = firstSentence.split(' ').filter(word => word.length > 3);
    
    if (words.length === 0) {
      return { topics: [] };
    }
    
    // Use first significant word as topic name
    const topicName = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    
    return {
      topics: [{
        name: topicName,
        sentiment: 'neutral',
        importance: 1,
        context: firstSentence.substring(0, 100)
      }]
    };
  }
};