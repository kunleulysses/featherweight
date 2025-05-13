import { users, type User, type InsertUser, type JournalEntry, type Email, type InsertJournalEntry, type InsertEmail, type UpdateUserPreferences, journalEntries, emails } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, or, inArray } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";
import { IStorage, JournalFilter, EmailFilter } from "./storage";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

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

  async createUser(insertUser: InsertUser): Promise<User> {
    const defaultPreferences = {
      emailFrequency: "daily",
      marketingEmails: false,
      receiveInsights: true,
      theme: "system"
    };

    const [user] = await db.insert(users)
      .values({
        ...insertUser,
        preferences: defaultPreferences
      })
      .returning();
    
    return user;
  }

  async updateUserPreferences(userId: number, preferences: UpdateUserPreferences): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const [updatedUser] = await db.update(users)
      .set({
        preferences: {
          ...user.preferences,
          ...preferences
        },
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async getJournalEntries(userId: number, filter?: JournalFilter): Promise<JournalEntry[]> {
    let query = db.select().from(journalEntries).where(eq(journalEntries.userId, userId));
    
    // Apply filters
    if (filter) {
      if (filter.dateRange) {
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
          case 'all':
            // No date filtering
            break;
        }
        
        if (filter.dateRange !== 'all') {
          query = query.where(gte(journalEntries.createdAt, startDate));
        }
      }
      
      if (filter.mood) {
        query = query.where(eq(journalEntries.mood, filter.mood));
      }
      
      // Note: Tags filtering is more complex with JSON, we'll handle any additional filtering in memory
    }
    
    // Sort by newest first
    let entries = await query.orderBy(journalEntries.createdAt);
    
    // Additional filtering for tags if needed
    if (filter?.tags?.length) {
      entries = entries.filter(entry => 
        entry.tags && filter.tags!.some(tag => entry.tags!.includes(tag))
      );
    }
    
    return entries.reverse(); // newest first
  }

  async getJournalEntry(id: number): Promise<JournalEntry | undefined> {
    const [entry] = await db.select().from(journalEntries).where(eq(journalEntries.id, id));
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
    let query = db.select().from(emails).where(eq(emails.userId, userId));
    
    // Apply filters
    if (filter) {
      if (filter.type) {
        query = query.where(eq(emails.type, filter.type));
      }
      
      if (filter.isRead !== undefined) {
        query = query.where(eq(emails.isRead, filter.isRead));
      }
      
      if (filter.dateRange) {
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
          case 'all':
            // No date filtering
            break;
        }
        
        if (filter.dateRange !== 'all') {
          query = query.where(gte(emails.sentAt, startDate));
        }
      }
    }
    
    // Sort by newest first
    const userEmails = await query.orderBy(emails.sentAt);
    return userEmails.reverse(); // newest first
  }

  async getEmail(id: number): Promise<Email | undefined> {
    const [email] = await db.select().from(emails).where(eq(emails.id, id));
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
}