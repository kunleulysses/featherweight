import { users, journalEntries, emails, type User, type InsertUser, type JournalEntry, type InsertJournalEntry, type Email, type InsertEmail, type UpdateUserPreferences } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";
import { DatabaseStorage } from "./database-storage";

// Memory store for session
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPreferences(userId: number, preferences: UpdateUserPreferences): Promise<User>;
  
  // Journal operations
  getJournalEntries(userId: number, filter?: JournalFilter): Promise<JournalEntry[]>;
  getJournalEntry(id: number): Promise<JournalEntry | undefined>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: number, entry: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: number): Promise<boolean>;
  
  // Email operations
  getEmails(userId: number, filter?: EmailFilter): Promise<Email[]>;
  getEmail(id: number): Promise<Email | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;
  markEmailAsRead(id: number): Promise<Email | undefined>;
  
  // Session store
  sessionStore: session.SessionStore;
}

// Filter types
export type JournalFilter = {
  dateRange?: string; // 7days, 30days, year, all
  mood?: string;
  tags?: string[];
};

export type EmailFilter = {
  type?: string;
  isRead?: boolean;
  dateRange?: string; // 7days, 30days, year, all
};

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private journalEntries: Map<number, JournalEntry>;
  private emails: Map<number, Email>;
  private userIdCount: number;
  private journalIdCount: number;
  private emailIdCount: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.journalEntries = new Map();
    this.emails = new Map();
    this.userIdCount = 1;
    this.journalIdCount = 1;
    this.emailIdCount = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCount++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const preferences = {
      emailFrequency: "daily",
      marketingEmails: false,
      receiveInsights: true,
      theme: "light"
    };
    
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt, 
      updatedAt,
      preferences
    };
    
    this.users.set(id, user);
    return user;
  }

  async updateUserPreferences(userId: number, preferences: UpdateUserPreferences): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser: User = {
      ...user,
      preferences: {
        ...user.preferences,
        ...preferences
      },
      updatedAt: new Date()
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Journal methods
  async getJournalEntries(userId: number, filter?: JournalFilter): Promise<JournalEntry[]> {
    let entries = Array.from(this.journalEntries.values())
      .filter(entry => entry.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (filter) {
      // Filter by date range
      if (filter.dateRange) {
        const now = new Date();
        let cutoffDate = new Date();
        
        switch(filter.dateRange) {
          case '7days':
            cutoffDate.setDate(now.getDate() - 7);
            break;
          case '30days':
            cutoffDate.setDate(now.getDate() - 30);
            break;
          case 'year':
            cutoffDate.setFullYear(now.getFullYear() - 1);
            break;
          // 'all' doesn't need filtering
        }
        
        if (filter.dateRange !== 'all') {
          entries = entries.filter(entry => 
            new Date(entry.createdAt) >= cutoffDate
          );
        }
      }
      
      // Filter by mood
      if (filter.mood) {
        entries = entries.filter(entry => entry.mood === filter.mood);
      }
      
      // Filter by tags
      if (filter.tags && filter.tags.length > 0) {
        entries = entries.filter(entry => 
          entry.tags?.some(tag => filter.tags?.includes(tag))
        );
      }
    }
    
    return entries;
  }

  async getJournalEntry(id: number): Promise<JournalEntry | undefined> {
    return this.journalEntries.get(id);
  }

  async createJournalEntry(insertEntry: InsertJournalEntry): Promise<JournalEntry> {
    const id = this.journalIdCount++;
    const createdAt = new Date();
    const updatedAt = new Date();
    
    const entry: JournalEntry = {
      ...insertEntry,
      id,
      createdAt,
      updatedAt
    };
    
    this.journalEntries.set(id, entry);
    return entry;
  }

  async updateJournalEntry(id: number, partialEntry: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    const existingEntry = await this.getJournalEntry(id);
    if (!existingEntry) {
      return undefined;
    }
    
    const updatedEntry: JournalEntry = {
      ...existingEntry,
      ...partialEntry,
      updatedAt: new Date()
    };
    
    this.journalEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteJournalEntry(id: number): Promise<boolean> {
    const exists = this.journalEntries.has(id);
    if (exists) {
      this.journalEntries.delete(id);
      return true;
    }
    return false;
  }

  // Email methods
  async getEmails(userId: number, filter?: EmailFilter): Promise<Email[]> {
    let userEmails = Array.from(this.emails.values())
      .filter(email => email.userId === userId)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    
    if (filter) {
      // Filter by type
      if (filter.type) {
        userEmails = userEmails.filter(email => email.type === filter.type);
      }
      
      // Filter by read status
      if (filter.isRead !== undefined) {
        userEmails = userEmails.filter(email => email.isRead === filter.isRead);
      }
      
      // Filter by date range
      if (filter.dateRange) {
        const now = new Date();
        let cutoffDate = new Date();
        
        switch(filter.dateRange) {
          case '7days':
            cutoffDate.setDate(now.getDate() - 7);
            break;
          case '30days':
            cutoffDate.setDate(now.getDate() - 30);
            break;
          case 'year':
            cutoffDate.setFullYear(now.getFullYear() - 1);
            break;
          // 'all' doesn't need filtering
        }
        
        if (filter.dateRange !== 'all') {
          userEmails = userEmails.filter(email => 
            new Date(email.sentAt) >= cutoffDate
          );
        }
      }
    }
    
    return userEmails;
  }

  async getEmail(id: number): Promise<Email | undefined> {
    return this.emails.get(id);
  }

  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    const id = this.emailIdCount++;
    const sentAt = new Date();
    
    const email: Email = {
      ...insertEmail,
      id,
      sentAt,
      isRead: false
    };
    
    this.emails.set(id, email);
    return email;
  }

  async markEmailAsRead(id: number): Promise<Email | undefined> {
    const email = await this.getEmail(id);
    if (!email) {
      return undefined;
    }
    
    const updatedEmail: Email = {
      ...email,
      isRead: true
    };
    
    this.emails.set(id, updatedEmail);
    return updatedEmail;
  }
}

// Use the database storage implementation
export const storage = new DatabaseStorage();
