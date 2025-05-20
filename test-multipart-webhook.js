import fetch from 'node-fetch';
import FormData from 'form-data';

async function testMultipartWebhook() {
  console.log('🔔 Testing SendGrid multipart/form-data webhook format');
  console.log('------------------------------------------');
  
  // Create form data payload similar to what SendGrid sends
  const form = new FormData();
  form.append('from', 'user@example.com');
  form.append('to', 'flappy@parse.featherweight.world');
  form.append('subject', 'Testing SendGrid Multipart Format');
  form.append('text', 'This email tests the multipart/form-data format that SendGrid actually uses');
  form.append('html', '<p>This email tests the multipart/form-data format that SendGrid actually uses</p>');
  form.append('envelope', JSON.stringify({
    from: 'user@example.com',
    to: ['flappy@parse.featherweight.world']
  }));
  form.append('headers', JSON.stringify({
    'Message-ID': 'multipart-test-123@example.com'
  }));
  
  console.log('📧 Test data prepared as multipart/form-data');
  
  try {
    // Send the webhook to our local endpoint
    console.log('📤 Sending multipart test webhook to http://localhost:5000/api/emails/webhook');
    const response = await fetch('http://localhost:5000/api/emails/webhook', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    const status = response.status;
    const responseText = await response.text();
    
    if (status >= 200 && status < 300) {
      console.log('✅ Test webhook successful!');
      console.log(`🔢 Status: ${status}`);
      console.log(`📄 Response: ${responseText}`);
    } else {
      console.log('❌ Test webhook failed!');
      console.log(`🔢 Status: ${status}`);
      console.log(`📄 Response: ${responseText}`);
    }
  } catch (error) {
    console.error('❌ Error sending test webhook:', error.message);
  }
  
  console.log('\n📋 Check the server logs to see how the webhook was processed.');
}

testMultipartWebhook();

// Add export statement to satisfy ES module requirements
export default testMultipartWebhook;