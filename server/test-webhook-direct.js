// This script directly tests the email queue processing by calling the storage functions
import { storage } from './storage';

async function testEmailQueueDirectly() {
  console.log('🔔 Testing email queue system by directly adding to the queue...');
  
  try {
    // Create test data similar to a webhook payload
    const testData = {
      from: 'user@example.com',
      to: 'flappy@parse.featherweight.world',
      subject: 'Testing Email Queue System - Direct Test',
      text: 'This is a test email to verify the queue-based processing system works correctly.',
      html: '<p>This is a test email to verify the queue-based processing system works correctly.</p>',
      headers: {
        'In-Reply-To': '',
        'Message-ID': `test-${Date.now()}@example.com`
      }
    };
    
    console.log('Test data prepared:', JSON.stringify(testData, null, 2));
    
    // Create a queue item directly
    const queueItem = {
      payload: testData,
      status: "pending"
    };
    
    // Add to processing queue directly
    const result = await storage.enqueueEmail(queueItem);
    
    console.log('✅ Test email successfully queued for processing!');
    console.log('Queue item ID:', result.id);
    console.log('Status:', result.status);
    console.log('Created at:', result.createdAt);
    
    // Check if the item was processed
    console.log('\nWaiting 3 seconds to check processing status...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to get the item
    const processedItem = await storage.getEmailQueueItem(result.id);
    if (processedItem) {
      console.log('Queue item status after 3 seconds:', processedItem.status);
      if (processedItem.status === 'completed') {
        console.log('✅ Email was successfully processed by the background worker!');
      } else if (processedItem.status === 'processing') {
        console.log('⏳ Email is currently being processed...');
      } else if (processedItem.status === 'failed') {
        console.error('❌ Email processing failed:', processedItem.errorMessage);
      } else {
        console.log('⏳ Email is still pending processing...');
      }
    } else {
      console.error('❌ Could not find the queue item after adding it!');
    }
    
  } catch (error) {
    console.error('❌ Error testing email queue:', error);
  }
}

// Run the test
testEmailQueueDirectly();