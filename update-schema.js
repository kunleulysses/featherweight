import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const sql_client = neon(process.env.DATABASE_URL);
const db = drizzle(sql_client);

async function updateSchema() {
  try {
    console.log('Adding missing columns to users table...');
    
    // First check if the columns exist
    const checkColumnQuery = `
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'phone_number';
    `;
    
    const result = await sql_client.query(checkColumnQuery);
    
    if (result.rowCount === 0) {
      console.log('Adding phone_number column...');
      await sql_client.query(`ALTER TABLE users ADD COLUMN phone_number TEXT UNIQUE;`);
    } else {
      console.log('phone_number column already exists');
    }
    
    // Check for is_premium column
    const checkPremiumQuery = `
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_premium';
    `;
    
    const premiumResult = await sql_client.query(checkPremiumQuery);
    
    if (premiumResult.rowCount === 0) {
      console.log('Adding is_premium column...');
      await sql_client.query(`ALTER TABLE users ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT false;`);
    } else {
      console.log('is_premium column already exists');
    }
    
    // Check for premium_until column
    const checkPremiumUntilQuery = `
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'premium_until';
    `;
    
    const premiumUntilResult = await sql_client.query(checkPremiumUntilQuery);
    
    if (premiumUntilResult.rowCount === 0) {
      console.log('Adding premium_until column...');
      await sql_client.query(`ALTER TABLE users ADD COLUMN premium_until TIMESTAMP;`);
    } else {
      console.log('premium_until column already exists');
    }
    
    // Check for stripe columns
    const checkStripeCustomerQuery = `
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'stripe_customer_id';
    `;
    
    const stripeCustomerResult = await sql_client.query(checkStripeCustomerQuery);
    
    if (stripeCustomerResult.rowCount === 0) {
      console.log('Adding stripe_customer_id column...');
      await sql_client.query(`ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;`);
    } else {
      console.log('stripe_customer_id column already exists');
    }
    
    const checkStripeSubscriptionQuery = `
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'stripe_subscription_id';
    `;
    
    const stripeSubscriptionResult = await sql_client.query(checkStripeSubscriptionQuery);
    
    if (stripeSubscriptionResult.rowCount === 0) {
      console.log('Adding stripe_subscription_id column...');
      await sql_client.query(`ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;`);
    } else {
      console.log('stripe_subscription_id column already exists');
    }
    
    console.log('Schema update completed successfully!');
  } catch (error) {
    console.error('Error updating schema:', error);
    throw error;
  } finally {
    // Close the connection
    await sql_client.end();
  }
}

updateSchema().catch(console.error);