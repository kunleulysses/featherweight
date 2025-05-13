import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  phoneNumber: text("phone_number").unique(),
  isPremium: boolean("is_premium").default(false).notNull(),
  premiumUntil: timestamp("premium_until"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  preferences: json("preferences").$type<UserPreferences>(),
});

// Journal entries table
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  mood: text("mood"), // happy, calm, neutral, sad, frustrated
  tags: json("tags").$type<string[]>(),
  imageUrl: text("image_url"),
  emailId: text("email_id"), // To track which email this entry is responding to
});

// Emails table to track sent emails
export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  type: text("type").notNull(), // daily_inspiration, journal_acknowledgment, weekly_insight
  isRead: boolean("is_read").default(false),
  messageId: text("message_id"), // Email message ID for tracking
});

// SMS messages table to track SMS conversations
export const smsMessages = pgTable("sms_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  phoneNumber: text("phone_number").notNull(), // User's phone number
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  direction: text("direction").notNull(), // "inbound" or "outbound"
  twilioSid: text("twilio_sid"), // Twilio message SID for tracking
  isJournalEntry: boolean("is_journal_entry").default(false), // Is this message a journal entry
  journalEntryId: integer("journal_entry_id"), // Reference to created journal entry if applicable
});

// Types for JSON fields
export type UserPreferences = {
  emailFrequency: "daily" | "weekdays" | "weekends" | "weekly";
  marketingEmails: boolean;
  receiveInsights: boolean;
  theme?: "light" | "dark" | "system";
  receiveSms?: boolean;
};

// Insert schemas using drizzle-zod
export const insertUserSchema = createInsertSchema(users)
  .omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true, 
    preferences: true,
    isPremium: true,
    premiumUntil: true,
    stripeCustomerId: true,
    stripeSubscriptionId: true
  })
  .extend({
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    phoneNumber: z.string().optional().refine(val => !val || /^\+?[1-9]\d{1,14}$/.test(val), {
      message: "Please enter a valid phone number in E.164 format (e.g., +14155552671)"
    }),
  });

export const insertJournalEntrySchema = createInsertSchema(journalEntries)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    content: z.string().min(1, { message: "Journal entry cannot be empty" }),
    mood: z.enum(["happy", "calm", "neutral", "sad", "frustrated"]).optional(),
    tags: z.array(z.string()).optional(),
  });

export const insertEmailSchema = createInsertSchema(emails)
  .omit({ id: true, sentAt: true, isRead: true })
  .extend({
    subject: z.string().min(1, { message: "Email subject cannot be empty" }),
    content: z.string().min(1, { message: "Email content cannot be empty" }),
    type: z.enum(["daily_inspiration", "journal_acknowledgment", "weekly_insight"]),
  });

export const insertSmsMessageSchema = createInsertSchema(smsMessages)
  .omit({ id: true, sentAt: true })
  .extend({
    content: z.string().min(1, { message: "Message content cannot be empty" }),
    direction: z.enum(["inbound", "outbound"]),
    isJournalEntry: z.boolean().default(false).optional(),
  });

export const updateUserPreferencesSchema = z.object({
  emailFrequency: z.enum(["daily", "weekdays", "weekends", "weekly"]),
  marketingEmails: z.boolean().default(false),
  receiveInsights: z.boolean().default(true),
  theme: z.enum(["light", "dark", "system"]).optional(),
  receiveSms: z.boolean().default(false).optional(),
});

// Export types for use in application
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type Email = typeof emails.$inferSelect;
export type SmsMessage = typeof smsMessages.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type InsertSmsMessage = z.infer<typeof insertSmsMessageSchema>;
export type UpdateUserPreferences = z.infer<typeof updateUserPreferencesSchema>;
