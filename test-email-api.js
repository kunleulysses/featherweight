// Enhanced email webhook testing script
import fetch from 'node-fetch';

// Configuration
const SERVER_URL = 'http://localhost:5000';
const TEST_ENDPOINT = '/api/public/test-email';
const TEST_SENDER = 'user@example.com';

// Available test scenarios
const TEST_SCENARIOS = {
  basic: {
    name: 'Basic Email Test',
    data: {
      from: TEST_SENDER,
      to: 'flappy@parse.featherweight.world',
      subject: 'Testing Webhook Endpoint',
      text: 'This is a test email to verify the webhook endpoint works correctly.',
      html: '<p>This is a test email to verify the webhook endpoint works correctly.</p>',
      headers: {
        'In-Reply-To': '',
        'Message-ID': `test-${Date.now()}@example.com`
      }
    }
  },
  
  journal: {
    name: 'Journal-Style Email Test',
    data: {
      from: TEST_SENDER,
      to: 'flappy@parse.featherweight.world',
      subject: 'My Journal Entry for Today',
      text: `Dear Flappy,

Today was quite a day! I started with a morning walk which really helped clear my mind.
I've been thinking a lot about my goals for the next few months.

I'm feeling grateful for the small moments of peace I found today.

Looking forward to your thoughts,
Test User`,
      headers: {
        'Message-ID': `journal-${Date.now()}@example.com`
      }
    }
  },

  reply: {
    name: 'Email Reply Test',
    data: {
      from: TEST_SENDER,
      to: 'flappy@parse.featherweight.world',
      subject: 'Re: Your previous message',
      text: `Thanks for your thoughtful response, Flappy!

I appreciate your insights about mindfulness. I'll try to incorporate some of those practices into my daily routine.

What other techniques do you recommend for staying present?`,
      headers: {
        'In-Reply-To': 'previous-message-id@featherweight.world',
        'Message-ID': `reply-${Date.now()}@example.com`
      }
    }
  },

  complex: {
    name: 'Complex Email Format Test',
    data: {
      envelope: JSON.stringify({
        from: TEST_SENDER,
        to: ['flappy@parse.featherweight.world']
      }),
      from: `Test User <${TEST_SENDER}>`,
      to: 'Flappy <flappy@parse.featherweight.world>',
      subject: 'Testing Complex Email Format',
      text: 'Here is a multi-part email with various components to test parsing logic.',
      html: '<div><p>Here is a multi-part email with <b>various components</b> to test parsing logic.</p></div>',
      headers: {
        'Content-Type': 'multipart/alternative',
        'Message-ID': `complex-${Date.now()}@example.com`
      },
      attachments: []
    }
  },

  raw: {
    name: 'Raw Text Email Test',
    isRaw: true,
    data: `From: ${TEST_SENDER}
To: flappy@parse.featherweight.world
Subject: Raw Email Format Test
Date: ${new Date().toUTCString()}
Message-ID: <raw-${Date.now()}@example.com>

This is a raw email format test.
This tests our system's ability to parse emails in raw format
without the JSON structure.

Regards,
Test User`
  },

  sendgrid: {
    name: 'SendGrid Webhook Format Test',
    data: {
      sender: { email: TEST_SENDER },
      recipient: 'flappy@parse.featherweight.world',
      subject: 'Testing SendGrid Webhook Format',
      text: 'This email simulates the format SendGrid sends in webhooks.',
      html: '<p>This email simulates the format SendGrid sends in webhooks.</p>',
      spam_report: { score: 0 },
      headers: JSON.stringify({
        'Message-ID': `sendgrid-${Date.now()}@example.com`
      })
    }
  }
};

// Function to test the email webhook
async function testEmailWebhook(scenario = 'basic') {
  // Default to basic test if scenario doesn't exist
  const testCase = TEST_SCENARIOS[scenario] || TEST_SCENARIOS.basic;
  
  console.log(`🔔 Running email test: ${testCase.name}`);
  console.log('------------------------------------------');
  
  try {
    // Prepare test data
    console.log('📧 Test data prepared:');
    const testData = testCase.data;
    console.log(JSON.stringify(testData, null, 2));
    
    // Set content type based on whether we're sending JSON or raw text
    const contentType = testCase.isRaw ? 'text/plain' : 'application/json';
    const body = testCase.isRaw ? testData : JSON.stringify(testData);
    
    console.log(`📤 Sending test webhook to ${SERVER_URL}${TEST_ENDPOINT}`);
    console.log(`📦 Content-Type: ${contentType}`);
    
    // Send the test webhook to our API endpoint
    const response = await fetch(`${SERVER_URL}${TEST_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
      },
      body: body,
    });
    
    if (response.ok) {
      console.log('✅ Test webhook successful!');
      console.log(`🔢 Status: ${response.status} ${response.statusText}`);
      
      // First try to parse as JSON, but fall back to text if that fails
      try {
        const responseData = await response.json();
        console.log(`📄 Response: ${JSON.stringify(responseData, null, 2)}`);
      } catch (error) {
        const responseText = await response.text();
        console.log(`📝 Response (text): ${responseText}`);
      }
      
      console.log('\n📋 The email should now be in the processing queue.');
      console.log('📋 Check the server logs to see if it gets processed by the background worker.');
    } else {
      console.error('❌ Test webhook failed!');
      console.error(`🔢 Status: ${response.status} ${response.statusText}`);
      try {
        const responseText = await response.text();
        console.error(`📝 Response: ${responseText}`);
      } catch (error) {
        console.error('Could not read response body');
      }
    }
  } catch (error) {
    console.error('❌ Error sending test webhook:', error);
  }
}

// Get command line arguments for test scenario
const args = process.argv.slice(2);
const scenario = args[0] || 'basic';

// List available scenarios if requested
if (scenario === 'list') {
  console.log('📋 Available test scenarios:');
  Object.keys(TEST_SCENARIOS).forEach(key => {
    console.log(`  - ${key}: ${TEST_SCENARIOS[key].name}`);
  });
  console.log('\nRun a test with: node test-email-api.js <scenario>');
} else if (scenario === 'all') {
  // Run all scenarios in sequence
  console.log('🔄 Running all test scenarios...\n');
  
  // Use async IIFE to run tests in sequence
  (async () => {
    for (const key of Object.keys(TEST_SCENARIOS)) {
      await testEmailWebhook(key);
      console.log('\n'); // Add space between tests
      
      // Wait a bit between tests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.log('🏁 All test scenarios completed!');
  })();
} else {
  // Run a single test scenario
  if (!TEST_SCENARIOS[scenario]) {
    console.error(`❌ Unknown test scenario: ${scenario}`);
    console.log('Run "node test-email-api.js list" to see available scenarios.');
  } else {
    testEmailWebhook(scenario);
  }
}