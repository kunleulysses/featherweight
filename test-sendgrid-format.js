// Test script for SendGrid inbound parse webhook formats
import fetch from 'node-fetch';
import FormData from 'form-data';

// Configuration - change this to match your production webhook URL when testing externally
const WEBHOOK_URL = 'http://localhost:5000/api/emails/webhook';
const TEST_SENDER = 'test@example.com';
const TEST_RECIPIENT = 'flappy@parse.featherweight.world';

// Function to simulate SendGrid's multipart/form-data webhook format
async function testMultipartWebhook() {
  console.log('🔔 TESTING SENDGRID MULTIPART/FORM-DATA WEBHOOK FORMAT');
  console.log('--------------------------------------------------------');
  
  try {
    // Create a FormData object to simulate multipart/form-data
    const form = new FormData();
    
    // Add the standard SendGrid parse webhook fields
    form.append('headers', JSON.stringify({
      'From': `Test User <${TEST_SENDER}>`,
      'To': TEST_RECIPIENT,
      'Subject': 'Test Email via Multipart Form',
      'Message-ID': `test-${Date.now()}@example.com`
    }));
    
    // Add the envelope JSON
    form.append('envelope', JSON.stringify({
      to: [TEST_RECIPIENT],
      from: TEST_SENDER
    }));
    
    // Add other required fields
    form.append('to', TEST_RECIPIENT);
    form.append('from', `Test User <${TEST_SENDER}>`);
    form.append('subject', 'Test Email via Multipart Form');
    form.append('text', 'This is a test email sent in multipart/form-data format.\n\nThis format simulates how SendGrid delivers webhook data for inbound parse.');
    form.append('html', '<p>This is a test email sent in multipart/form-data format.</p><p>This format simulates how SendGrid delivers webhook data for inbound parse.</p>');
    form.append('spam_score', '0.0');
    form.append('charsets', JSON.stringify({
      to: 'UTF-8',
      from: 'UTF-8',
      subject: 'UTF-8',
      text: 'UTF-8',
      html: 'UTF-8'
    }));
    
    console.log('📤 Sending test webhook to:', WEBHOOK_URL);
    
    // Send the multipart/form-data request
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    // Process the response
    if (response.ok) {
      console.log('✅ Webhook test successful!');
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      try {
        const responseText = await response.text();
        console.log(`Response: ${responseText}`);
      } catch (error) {
        console.log('Could not read response body');
      }
    } else {
      console.error('❌ Webhook test failed!');
      console.error(`Status: ${response.status} ${response.statusText}`);
      try {
        const responseText = await response.text();
        console.error(`Response: ${responseText}`);
      } catch (error) {
        console.error('Could not read response body');
      }
    }
  } catch (error) {
    console.error('❌ Error sending test webhook:', error.message);
    console.error(error.stack);
  }
}

// Directly-rendered Gmail-style test
async function testGmailStyleWebhook() {
  console.log('\n🔔 TESTING GMAIL-STYLE EMAIL FORMAT');
  console.log('----------------------------------');
  
  try {
    // Create form data for a typical Gmail email format
    const form = new FormData();
    
    // Gmail typically includes the full email in the headers
    const messageId = `gmail-${Date.now()}@mail.gmail.com`;
    const date = new Date().toUTCString();
    
    form.append('headers', JSON.stringify({
      'Delivered-To': TEST_RECIPIENT,
      'Return-Path': `<${TEST_SENDER}>`,
      'From': `Test Gmail User <${TEST_SENDER}>`,
      'To': `Flappy <${TEST_RECIPIENT}>`,
      'Subject': 'Test Email from Gmail Format',
      'Date': date,
      'Message-ID': `<${messageId}>`,
      'Content-Type': 'multipart/alternative; boundary="000000000000abcdef"'
    }));
    
    form.append('from', `Test Gmail User <${TEST_SENDER}>`);
    form.append('to', `Flappy <${TEST_RECIPIENT}>`);
    form.append('subject', 'Test Email from Gmail Format');
    
    // Text body that mimics Gmail's format with quoted text
    const textBody = `Hi Flappy,

This is a test email in Gmail format to see if you can process it correctly.

I'm trying to make sure my journaling app works properly.

Thanks,
Test User

On ${date.substring(0, 16)}, Flappy <${TEST_RECIPIENT}> wrote:
> Welcome to Featherweight!
> 
> I'm excited to help you with your journaling.
`;
    
    form.append('text', textBody);
    
    // HTML version
    const htmlBody = `<div dir="ltr">Hi Flappy,<br><br>This is a test email in Gmail format to see if you can process it correctly.<br><br>I'm trying to make sure my journaling app works properly.<br><br>Thanks,<br>Test User</div>
<div class="gmail_quote"><div dir="ltr" class="gmail_attr">On ${date.substring(0, 16)}, Flappy &lt;${TEST_RECIPIENT}&gt; wrote:<br></div>
<blockquote class="gmail_quote">
  Welcome to Featherweight!<br>
  <br>
  I'm excited to help you with your journaling.
</blockquote></div>`;
    
    form.append('html', htmlBody);
    
    form.append('envelope', JSON.stringify({
      to: [TEST_RECIPIENT],
      from: TEST_SENDER
    }));
    
    console.log('📤 Sending Gmail-style test webhook');
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    if (response.ok) {
      console.log('✅ Gmail-style webhook test successful!');
      console.log(`Status: ${response.status} ${response.statusText}`);
      try {
        const responseText = await response.text();
        console.log(`Response: ${responseText}`);
      } catch (error) {
        console.log('Could not read response body');
      }
    } else {
      console.error('❌ Gmail-style webhook test failed!');
      console.error(`Status: ${response.status} ${response.statusText}`);
      try {
        const responseText = await response.text();
        console.error(`Response: ${responseText}`);
      } catch (error) {
        console.error('Could not read response body');
      }
    }
  } catch (error) {
    console.error('❌ Error sending Gmail-style test webhook:', error.message);
  }
}

// Run the tests
(async () => {
  // Test standard multipart/form-data webhook
  await testMultipartWebhook();
  
  // Test Gmail-style email webhook
  await testGmailStyleWebhook();
  
  console.log('\n✅ Tests completed. Check the server logs to see if the emails were processed correctly.');
})();