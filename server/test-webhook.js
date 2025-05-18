import fetch from 'node-fetch';

/**
 * This script simulates SendGrid sending a webhook to your local server.
 * It's a reliable way to test your webhook endpoint without requiring
 * external access to your Replit environment.
 */

async function testWebhook() {
  console.log('🔔 Sending test webhook to local server...');
  
  try {
    // This test data simulates how SendGrid would forward an email
    const testData = {
      from: 'user@example.com',
      to: 'flappy@parse.featherweight.world',
      subject: 'Testing Email Webhook',
      text: 'This is a test email to see if the webhook processing works correctly.',
      html: '<p>This is a test email to see if the webhook processing works correctly.</p>',
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
    
    // Send the test webhook to our local server
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
      console.log('Check your server logs to see the webhook processing in action.');
    } else {
      console.error('❌ Webhook test failed:');
      console.error(`Status: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Error: ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Error sending test webhook:', error.message);
  }
}

// Run the test
testWebhook();