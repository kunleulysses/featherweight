// This script tests the email webhook API endpoint
import fetch from 'node-fetch';

async function testEmailWebhook() {
  console.log('🔔 Testing email webhook API endpoint...');
  
  try {
    // This test data simulates how SendGrid would forward an email
    const testData = {
      from: 'user@example.com',
      to: 'flappy@parse.featherweight.world',
      subject: 'Testing Webhook Endpoint',
      text: 'This is a test email to verify the webhook endpoint works correctly.',
      html: '<p>This is a test email to verify the webhook endpoint works correctly.</p>',
      headers: {
        'In-Reply-To': '',
        'Message-ID': `test-${Date.now()}@example.com`
      }
    };
    
    console.log('Test data prepared:', JSON.stringify(testData, null, 2));
    
    // Send the test webhook to our public endpoint
    const response = await fetch('http://localhost:5000/api/public/test-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    if (response.ok) {
      console.log('✅ Test webhook successful!');
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      // First try to parse as JSON, but fall back to text if that fails
      try {
        const responseData = await response.json();
        console.log(`Response: ${JSON.stringify(responseData, null, 2)}`);
      } catch (error) {
        const responseText = await response.text();
        console.log(`Response (text): ${responseText}`);
      }
      
      console.log('\nThe email should now be in the processing queue.');
      console.log('Check the server logs to see if it gets processed by the background worker.');
    } else {
      console.error('❌ Test webhook failed!');
      console.error(`Status: ${response.status} ${response.statusText}`);
      try {
        const responseText = await response.text();
        console.error(`Response: ${responseText}`);
      } catch (error) {
        console.error('Could not read response body');
      }
    }
  } catch (error) {
    console.error('❌ Error sending test webhook:', error);
  }
}

// Run the test
testEmailWebhook();