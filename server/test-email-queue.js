// This script tests the email queue processing system by sending a simulated webhook payload
import fetch from 'node-fetch';

async function testEmailQueue() {
  console.log('🔔 Testing email queue system with simulated webhook...');
  
  try {
    // This test data simulates how SendGrid would forward an email
    const testData = {
      from: 'user@example.com',
      to: 'flappy@parse.featherweight.world',
      subject: 'Testing Email Queue System',
      text: 'This is a test email to verify the queue-based processing system works correctly.',
      html: '<p>This is a test email to verify the queue-based processing system works correctly.</p>',
      headers: {
        'In-Reply-To': '',
        'Message-ID': `test-${Date.now()}@example.com`
      },
      // Simulate an attachment similar to what SendGrid might provide
      attachments: [
        {
          name: 'test.txt',
          content: 'VGhpcyBpcyBhIHRlc3QgYXR0YWNobWVudA==', // Base64 "This is a test attachment"
          type: 'text/plain'
        }
      ]
    };
    
    console.log('Test data prepared:', JSON.stringify(testData, null, 2));
    
    // Send the test webhook to our server
    const response = await fetch('http://localhost:5000/api/emails/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    if (response.ok) {
      console.log('✅ Webhook test successful!');
      console.log(`Status: ${response.status} ${response.statusText}`);
      const responseText = await response.text();
      console.log(`Response: ${responseText}`);
      console.log('\nThe email should now be in the processing queue.');
      console.log('Check the server logs to see if it gets processed by the background worker.');
    } else {
      console.error('❌ Webhook test failed!');
      console.error(`Status: ${response.status} ${response.statusText}`);
      const responseText = await response.text();
      console.error(`Response: ${responseText}`);
    }
  } catch (error) {
    console.error('❌ Error sending test webhook:', error);
  }
}

// Run the test
testEmailQueue();