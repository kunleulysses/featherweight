import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import * as schema from "../shared/schema";
import ws from "ws";

// Configure WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

// This script directly pushes the schema to the database without user interaction
async function runMigration() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }

  console.log("Connecting to database...");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log("Creating tables in the database...");
  
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        phone_number TEXT UNIQUE,
        is_premium BOOLEAN NOT NULL DEFAULT false,
        premium_until TIMESTAMP,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        preferences JSONB
      );
    `);
    console.log("Created users table");

    // Create journal_entries table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT,
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        mood TEXT,
        tags JSONB,
        image_url TEXT,
        email_id TEXT
      );
    `);
    console.log("Created journal_entries table");

    // Create payment_methods table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        stripe_payment_method_id TEXT NOT NULL,
        card_brand TEXT NOT NULL,
        card_last4 TEXT NOT NULL,
        card_exp_month INTEGER NOT NULL,
        card_exp_year INTEGER NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);
    console.log("Created payment_methods table");

    // Create billing_transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        stripe_payment_intent_id TEXT,
        stripe_invoice_id TEXT,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'usd',
        status TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);
    console.log("Created billing_transactions table");

    // Create emails table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS emails (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        sent_at TIMESTAMP NOT NULL DEFAULT now(),
        type TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        message_id TEXT
      );
    `);
    console.log("Created emails table");

    // Create sms_messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sms_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        phone_number TEXT NOT NULL,
        content TEXT NOT NULL,
        sent_at TIMESTAMP NOT NULL DEFAULT now(),
        direction TEXT NOT NULL,
        twilio_sid TEXT,
        is_journal_entry BOOLEAN DEFAULT false,
        journal_entry_id INTEGER,
        conversation_id TEXT
      );
    `);
    console.log("Created sms_messages table");

    // Create conversation_memories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_memories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        topic TEXT,
        sentiment TEXT,
        importance INTEGER DEFAULT 1,
        last_discussed TIMESTAMP NOT NULL DEFAULT now(),
        frequency INTEGER DEFAULT 1,
        first_mentioned_at TIMESTAMP NOT NULL DEFAULT now(),
        context TEXT NOT NULL,
        related_entry_ids JSONB,
        is_resolved BOOLEAN DEFAULT false
      );
    `);
    console.log("Created conversation_memories table");

    // Create conversations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        user_message TEXT NOT NULL,
        flappy_response TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        conversation_type TEXT NOT NULL DEFAULT 'general',
        saved_as_journal BOOLEAN NOT NULL DEFAULT false,
        journal_entry_id INTEGER,
        message_tags JSON,
        mood TEXT,
        reflection_prompt TEXT
      );
    `);
    console.log("Created conversations table");

    // Create email_queue table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id SERIAL PRIMARY KEY,
        payload JSON NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        processed_at TIMESTAMP,
        process_attempts INTEGER DEFAULT 0
      );
    `);
    console.log("Created email_queue table");

    // Create sessions table for connect-pg-simple
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    console.log("Created session table");

    console.log("All tables created successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });