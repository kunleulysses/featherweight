import { users, type User, type InsertUser, type JournalEntry, type Email, type InsertJournalEntry, type InsertEmail, type UpdateUserPreferences, journalEntries, emails, smsMessages, type SmsMessage, type InsertSmsMessage } from "@shared/schema";
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
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    try {
      // Safe query that will work even if the column doesn't exist
      const result = await pool.query(`
        SELECT * FROM users 
        WHERE phone_number = $1 
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

    // Need to cast preferences because drizzle-orm typings are strict
    const [user] = await db.insert(users)
      .values({
        ...insertUser,
        preferences: defaultPreferences as any
      })
      .returning();
    
    return user;
  }

  async updateUserPreferences(userId: number, preferences: UpdateUserPreferences): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Cast to any to handle type issues with preferences
    const [updatedUser] = await db.update(users)
      .set({
        preferences: {
          ...user.preferences,
          ...preferences
        } as any,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async updateUserSubscription(userId: number, isPremium: boolean, premiumUntil?: Date): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const [updatedUser] = await db.update(users)
      .set({
        isPremium,
        premiumUntil: premiumUntil || null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async updateUserPhoneNumber(userId: number, phoneNumber: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const [updatedUser] = await db.update(users)
      .set({
        phoneNumber,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
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
}