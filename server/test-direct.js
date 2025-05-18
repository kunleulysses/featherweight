// This script tests adding an email directly to the queue
import { db } from './db';
import { emailQueue } from '../shared/schema';

async function testAddEmailToQueue() {
  console.log('🔔 Testing email queue by directly inserting into the database...');
  
  try {
    // Create test data similar to a webhook payload
    const testData = {
      from: 'user@example.com',
      to: 'flappy@parse.featherweight.world',
      subject: 'Direct Database Queue Test',
      text: 'This is a test email added directly to the queue to verify processing.',
      html: '<p>This is a test email added directly to the queue to verify processing.</p>',
      headers: {
        'Message-ID': `test-direct-${Date.now()}@example.com`
      }
    };
    
    console.log('Test data prepared:', JSON.stringify(testData, null, 2));
    
    // Insert directly into the email queue table
    const [result] = await db.insert(emailQueue).values({
      payload: testData,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log('✅ Test email successfully inserted into queue!');
    console.log('Queue item ID:', result.id);
    console.log('Status:', result.status);
    console.log('Created at:', result.createdAt);
    
    console.log('\nCheck the server logs to see if the email processor picks it up...');
  } catch (error) {
    console.error('❌ Error adding test email to queue:', error);
  }
}

// Run the test
testAddEmailToQueue();