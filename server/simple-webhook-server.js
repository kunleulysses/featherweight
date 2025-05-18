import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';

// Create a separate Express app just for webhook testing
const app = express();

// Support different content types that SendGrid might use
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Special handling for multipart form data (what SendGrid typically sends)
app.use((req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    console.log('⚠️ Multipart form data detected - make sure to use a proper multipart parser');
  }
  next();
});

// Simple test endpoint
app.get('/', (req, res) => {
  res.send('Simple Webhook Server is running!');
});

// Webhook endpoint for SendGrid
app.post('/webhook', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`\n\n🔔 === WEBHOOK RECEIVED AT ${timestamp} === 🔔`);
  
  try {
    // Log headers (these are critical for debugging)
    console.log('=== HEADERS ===');
    Object.entries(req.headers).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    
    // Log basic request info
    console.log('\n=== REQUEST INFO ===');
    console.log(`Method: ${req.method}`);
    console.log(`URL: ${req.url}`);
    console.log(`IP: ${req.ip}`);
    
    // Log body
    console.log('\n=== BODY CONTENT ===');
    if (Object.keys(req.body).length > 0) {
      // If we have a parsed body, log the keys first
      console.log('Body keys:', Object.keys(req.body).join(', '));
      
      // Log specific email fields if they exist
      if (req.body.from) console.log(`From: ${req.body.from}`);
      if (req.body.to) console.log(`To: ${req.body.to}`);
      if (req.body.subject) console.log(`Subject: ${req.body.subject}`);
      
      // Check for email content
      if (req.body.text) {
        console.log(`Text content (${req.body.text.length} chars): ${req.body.text.substring(0, 100)}...`);
      }
      
      // Check for raw email
      if (req.body.email) {
        console.log(`Raw email present (${req.body.email.length} chars)`);
      }
      
      // Save the full request data to a file for detailed analysis
      const filename = `webhook-data-${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify({
        timestamp,
        headers: req.headers,
        body: req.body
      }, null, 2));
      
      console.log(`✅ Full webhook data saved to ${filename}`);
    } else {
      console.log('⚠️ No parsed body content');
    }
    
    // Always return a 200 OK to acknowledge receipt
    console.log('\n✅ Webhook processed successfully');
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    // Still return 200 to prevent SendGrid from retrying
    res.status(200).send('Error processed');
  }
});

// Start the server on a different port than our main app
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Simple webhook server running on port ${PORT}`);
  console.log(`Add this URL to your SendGrid Inbound Parse settings:`);
  console.log(`YOUR_TUNNEL_URL/webhook`);
  console.log(`\nThis server will catch any webhook from SendGrid and log the contents in detail`);
});