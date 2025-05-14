import { 
  users, journalEntries, emails, smsMessages, paymentMethods, billingTransactions, conversationMemories,
  type User, type InsertUser, type JournalEntry, type InsertJournalEntry, 
  type Email, type InsertEmail, type UpdateUserPreferences, type SmsMessage, 
  type InsertSmsMessage, type PaymentMethod, type InsertPaymentMethod,
  type BillingTransaction, type InsertBillingTransaction,
  type ConversationMemory, type InsertConversationMemory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, or, inArray } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";
import { IStorage, JournalFilter, EmailFilter, SmsFilter } from "./storage";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: any; // Using any type to avoid SessionStore type issues

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await pool.query(`
        SELECT * FROM users 
        WHERE id = $1 
        LIMIT 1
      `, [id]);
      
      return result.rows[0] as User | undefined;
    } catch (error) {
      console.error("Error getting user by id:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await pool.query(`
        SELECT * FROM users 
        WHERE username = $1 
        LIMIT 1
      `, [username]);
      
      return result.rows[0] as User | undefined;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await pool.query(`
        SELECT * FROM users 
        WHERE email = $1 
        LIMIT 1
      `, [email]);
      
      return result.rows[0] as User | undefined;
    } catch (error) {
      console.error("Error getting user by email:", error);
      return undefined;
    }
  }
  
  async getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    try {
      // Since phone number is stored in preferences, we need to query for users
      // where the preferences JSON contains the phone number
      const result = await pool.query(`
        SELECT * FROM users 
        WHERE preferences->>'phoneNumber' = $1 
        LIMIT 1
      `, [phoneNumber]);
      
      return result.rows[0] as User | undefined;
    } catch (error) {
      console.error("Error getting user by phone number:", error);
      // Return undefined if column doesn't exist or other error
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const defaultPreferences: UpdateUserPreferences = {
      emailFrequency: "daily",
      marketingEmails: false,
      receiveInsights: true,
      theme: "system"
    };

    try {
      // Use raw SQL insert to avoid schema conflicts
      const result = await pool.query(`
        INSERT INTO users (username, email, password, preferences, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING *
      `, [
        insertUser.username,
        insertUser.email,
        insertUser.password,
        JSON.stringify(defaultPreferences)
      ]);
      
      if (result.rows.length > 0) {
        return result.rows[0] as User;
      } else {
        throw new Error("Failed to create user");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUserPreferences(userId: number, preferences: UpdateUserPreferences): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    try {
      const updatedPreferences = {
        ...user.preferences,
        ...preferences
      };
      
      // Use raw SQL to update preferences to avoid schema issues
      const result = await pool.query(`
        UPDATE users
        SET 
          preferences = $1, 
          updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [updatedPreferences, userId]);
      
      if (result.rows.length > 0) {
        return result.rows[0] as User;
      } else {
        throw new Error("Failed to update user preferences");
      }
    } catch (error) {
      console.error("Error updating user preferences:", error);
      throw error;
    }
  }

  async updateUserSubscription(userId: number, isPremium: boolean, premiumUntil?: Date): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    try {
      // Use raw SQL to update user subscription to avoid schema issues
      const premiumUntilStr = premiumUntil ? premiumUntil.toISOString() : null;
      const result = await pool.query(`
        UPDATE users
        SET 
          is_premium = $1, 
          premium_until = $2, 
          updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `, [isPremium, premiumUntilStr, userId]);
      
      if (result.rows.length > 0) {
        return result.rows[0] as User;
      } else {
        throw new Error("Failed to update user subscription");
      }
    } catch (error) {
      console.error("Error updating user subscription:", error);
      throw error;
    }
  }

  async updateUserPhoneNumber(userId: number, phoneNumber: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    try {
      // Store the phone number in user preferences instead
      const currentPreferences = user.preferences || {};
      const updatedPreferences = {
        ...currentPreferences,
        phoneNumber: phoneNumber
      };
      
      // Use raw SQL to update preferences to avoid schema issues
      const result = await pool.query(`
        UPDATE users
        SET 
          preferences = $1, 
          updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [updatedPreferences, userId]);
      
      if (result.rows.length > 0) {
        return result.rows[0] as User;
      } else {
        throw new Error("Failed to update user phone number");
      }
    } catch (error) {
      console.error("Error updating user phone number:", error);
      throw error;
    }
  }

  async getJournalEntries(userId: number, filter?: JournalFilter): Promise<JournalEntry[]> {
    // Build the query conditions
    let conditions = [eq(journalEntries.userId, userId)];
    
    // Apply filters
    if (filter) {
      if (filter.dateRange && filter.dateRange !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        switch (filter.dateRange) {
          case '7days':
            startDate.setDate(now.getDate() - 7);
            break;
          case '30days':
            startDate.setDate(now.getDate() - 30);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        conditions.push(gte(journalEntries.createdAt, startDate));
      }
      
      if (filter.mood) {
        conditions.push(eq(journalEntries.mood, filter.mood));
      }
    }
    
    // Execute the query with all conditions
    const entries = await db.select()
      .from(journalEntries)
      .where(and(...conditions))
      .orderBy(journalEntries.createdAt);
    
    // Additional filtering for tags if needed - must be done in memory
    let filteredEntries = [...entries];
    if (filter?.tags?.length) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.tags && filter.tags!.some(tag => entry.tags!.includes(tag))
      );
    }
    
    return filteredEntries.reverse(); // newest first
  }

  async getJournalEntry(id: number): Promise<JournalEntry | undefined> {
    const [entry] = await db.select()
      .from(journalEntries)
      .where(eq(journalEntries.id, id));
    return entry;
  }

  async createJournalEntry(insertEntry: InsertJournalEntry): Promise<JournalEntry> {
    const [entry] = await db.insert(journalEntries)
      .values(insertEntry)
      .returning();
    
    return entry;
  }

  async updateJournalEntry(id: number, partialEntry: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    const [updatedEntry] = await db.update(journalEntries)
      .set({
        ...partialEntry,
        updatedAt: new Date()
      })
      .where(eq(journalEntries.id, id))
      .returning();
    
    return updatedEntry;
  }

  async deleteJournalEntry(id: number): Promise<boolean> {
    const result = await db.delete(journalEntries)
      .where(eq(journalEntries.id, id));
    
    return true; // PostgreSQL doesn't directly return the count of deleted rows
  }

  async getEmails(userId: number, filter?: EmailFilter): Promise<Email[]> {
    // Build the query conditions
    let conditions = [eq(emails.userId, userId)];
    
    // Apply filters
    if (filter) {
      if (filter.type) {
        conditions.push(eq(emails.type, filter.type));
      }
      
      if (filter.isRead !== undefined) {
        conditions.push(eq(emails.isRead, filter.isRead));
      }
      
      if (filter.dateRange && filter.dateRange !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        switch (filter.dateRange) {
          case '7days':
            startDate.setDate(now.getDate() - 7);
            break;
          case '30days':
            startDate.setDate(now.getDate() - 30);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        conditions.push(gte(emails.sentAt, startDate));
      }
    }
    
    // Execute the query with all conditions
    const userEmails = await db.select()
      .from(emails)
      .where(and(...conditions))
      .orderBy(emails.sentAt);
    
    return userEmails.reverse(); // newest first
  }

  async getEmail(id: number): Promise<Email | undefined> {
    const [email] = await db.select()
      .from(emails)
      .where(eq(emails.id, id));
    return email;
  }

  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    const [email] = await db.insert(emails)
      .values(insertEmail)
      .returning();
    
    return email;
  }

  async markEmailAsRead(id: number): Promise<Email | undefined> {
    const [updatedEmail] = await db.update(emails)
      .set({ isRead: true })
      .where(eq(emails.id, id))
      .returning();
    
    return updatedEmail;
  }

  // SMS operations
  async getSmsMessages(userId: number, filter?: SmsFilter): Promise<SmsMessage[]> {
    // Build the query conditions
    let conditions = [eq(smsMessages.userId, userId)];
    
    // Apply filters
    if (filter) {
      if (filter.direction) {
        conditions.push(eq(smsMessages.direction, filter.direction));
      }
      
      if (filter.isJournalEntry !== undefined) {
        conditions.push(eq(smsMessages.isJournalEntry, filter.isJournalEntry));
      }
      
      if (filter.dateRange && filter.dateRange !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        switch (filter.dateRange) {
          case '7days':
            startDate.setDate(now.getDate() - 7);
            break;
          case '30days':
            startDate.setDate(now.getDate() - 30);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        conditions.push(gte(smsMessages.sentAt, startDate));
      }
    }
    
    // Execute the query with all conditions
    const messages = await db.select()
      .from(smsMessages)
      .where(and(...conditions))
      .orderBy(smsMessages.sentAt);
    
    return messages.reverse(); // newest first
  }

  async getSmsMessage(id: number): Promise<SmsMessage | undefined> {
    const [message] = await db.select()
      .from(smsMessages)
      .where(eq(smsMessages.id, id));
    return message;
  }

  async createSmsMessage(insertMessage: InsertSmsMessage): Promise<SmsMessage> {
    const [message] = await db.insert(smsMessages)
      .values(insertMessage)
      .returning();
    
    return message;
  }

  async updateSmsMessage(id: number, partialMessage: Partial<InsertSmsMessage>): Promise<SmsMessage | undefined> {
    const [updatedMessage] = await db.update(smsMessages)
      .set(partialMessage)
      .where(eq(smsMessages.id, id))
      .returning();
    
    return updatedMessage;
  }

  // Conversation Memory methods
  async getConversationMemories(userId: number, type?: string): Promise<ConversationMemory[]> {
    let conditions = [eq(conversationMemories.userId, userId)];
    
    if (type) {
      conditions.push(eq(conversationMemories.type, type));
    }
    
    const memories = await db.select()
      .from(conversationMemories)
      .where(and(...conditions))
      .orderBy(conversationMemories.lastDiscussed);
    
    return memories.reverse(); // Most recent first
  }

  async getConversationMemory(id: number): Promise<ConversationMemory | undefined> {
    const [memory] = await db.select()
      .from(conversationMemories)
      .where(eq(conversationMemories.id, id));
    
    return memory;
  }

  async createConversationMemory(memory: InsertConversationMemory): Promise<ConversationMemory> {
    const [newMemory] = await db.insert(conversationMemories)
      .values(memory)
      .returning();
    
    return newMemory;
  }

  async updateConversationMemory(id: number, updates: Partial<InsertConversationMemory>): Promise<ConversationMemory | undefined> {
    const [updatedMemory] = await db.update(conversationMemories)
      .set({
        ...updates,
        lastDiscussed: new Date()
      })
      .where(eq(conversationMemories.id, id))
      .returning();
    
    return updatedMemory;
  }

  async incrementConversationMemoryFrequency(id: number): Promise<ConversationMemory | undefined> {
    const memory = await this.getConversationMemory(id);
    if (!memory) return undefined;
    
    const [updatedMemory] = await db.update(conversationMemories)
      .set({
        frequency: memory.frequency + 1,
        lastDiscussed: new Date()
      })
      .where(eq(conversationMemories.id, id))
      .returning();
    
    return updatedMemory;
  }

  async markConversationMemoryResolved(id: number, isResolved: boolean): Promise<ConversationMemory | undefined> {
    const [updatedMemory] = await db.update(conversationMemories)
      .set({
        isResolved,
        lastDiscussed: new Date()
      })
      .where(eq(conversationMemories.id, id))
      .returning();
    
    return updatedMemory;
  }
}