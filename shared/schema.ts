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

// Payment methods table
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  stripePaymentMethodId: text("stripe_payment_method_id").notNull(),
  cardBrand: text("card_brand").notNull(), // visa, mastercard, etc.
  cardLast4: text("card_last4").notNull(),
  cardExpMonth: integer("card_exp_month").notNull(),
  cardExpYear: integer("card_exp_year").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Billing transactions table
export const billingTransactions = pgTable("billing_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeInvoiceId: text("stripe_invoice_id"),
  amount: integer("amount").notNull(), // in cents
  currency: text("currency").default("usd").notNull(),
  status: text("status").notNull(), // succeeded, failed, pending
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  conversationId: text("conversation_id"), // Unique identifier for conversation thread
});

// Conversation memory table to track interaction history
export const conversationMemories = pgTable("conversation_memories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // "email", "sms", "journal_topic"
  topic: text("topic"), // Extracted topic or theme
  sentiment: text("sentiment"), // Extracted sentiment
  importance: integer("importance").default(1), // 1-5 scale of importance
  lastDiscussed: timestamp("last_discussed").defaultNow().notNull(),
  frequency: integer("frequency").default(1), // How many times this has been discussed
  firstMentionedAt: timestamp("first_mentioned_at").defaultNow().notNull(),
  context: text("context").notNull(), // Brief context about this topic
  relatedEntryIds: json("related_entry_ids").$type<number[]>(), // IDs of related journal entries
  isResolved: boolean("is_resolved").default(false), // Whether this topic has been resolved
});

// Types for JSON fields
export type UserPreferences = {
  emailFrequency: "daily" | "weekdays" | "weekends" | "weekly";
  marketingEmails: boolean;
  receiveInsights: boolean;
  theme?: "light" | "dark" | "system";
  receiveSms?: boolean;
  phoneNumber?: string;
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
    conversationId: z.string().optional(),
  });

export const insertConversationMemorySchema = createInsertSchema(conversationMemories)
  .omit({ id: true, lastDiscussed: true, firstMentionedAt: true })
  .extend({
    type: z.enum(["email", "sms", "journal_topic"]),
    topic: z.string().min(1, { message: "Topic cannot be empty" }),
    sentiment: z.string().optional(),
    importance: z.number().int().min(1).max(5).default(1),
    frequency: z.number().int().min(1).default(1),
    context: z.string().min(1, { message: "Context cannot be empty" }),
    relatedEntryIds: z.array(z.number()).optional(),
    isResolved: z.boolean().default(false).optional(),
  });

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods)
  .omit({ id: true, createdAt: true })
  .extend({
    cardBrand: z.string().min(1, { message: "Card brand cannot be empty" }),
    cardLast4: z.string().length(4, { message: "Card last 4 digits must be 4 characters" }),
    cardExpMonth: z.number().int().min(1).max(12),
    cardExpYear: z.number().int().min(new Date().getFullYear()),
  });

export const insertBillingTransactionSchema = createInsertSchema(billingTransactions)
  .omit({ id: true, createdAt: true })
  .extend({
    amount: z.number().int().positive(),
    status: z.enum(["succeeded", "failed", "pending"]),
  });

export const updateUserPreferencesSchema = z.object({
  emailFrequency: z.enum(["daily", "weekdays", "weekends", "weekly"]),
  marketingEmails: z.boolean().default(false),
  receiveInsights: z.boolean().default(true),
  theme: z.enum(["light", "dark", "system"]).optional(),
  receiveSms: z.boolean().default(false).optional(),
  phoneNumber: z.string().optional().refine(val => !val || /^\+?[1-9]\d{1,14}$/.test(val), {
    message: "Please enter a valid phone number in E.164 format (e.g., +14155552671)"
  }),
});

// Export types for use in application
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type Email = typeof emails.$inferSelect;
export type SmsMessage = typeof smsMessages.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type BillingTransaction = typeof billingTransactions.$inferSelect;
export type ConversationMemory = typeof conversationMemories.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type InsertSmsMessage = z.infer<typeof insertSmsMessageSchema>;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type InsertBillingTransaction = z.infer<typeof insertBillingTransactionSchema>;
export type InsertConversationMemory = z.infer<typeof insertConversationMemorySchema>;
export type UpdateUserPreferences = z.infer<typeof updateUserPreferencesSchema>;
