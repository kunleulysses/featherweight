// A simple script to check if the webhook is receiving ANY data from SendGrid
import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';

const app = express();

// For capturing raw POST data
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Store raw request body for debugging
app.use((req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    data += chunk;
  });
  req.on('end', () => {
    req.rawBody = data;
    next();
  });
});

// Debug route to confirm the app is running
app.get('/', (req, res) => {
  res.send('Webhook Echo Server is running');
});

// Simple webhook endpoint that logs everything
app.post('/webhook', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`====== WEBHOOK RECEIVED AT ${timestamp} ======`);
  
  // Log headers
  console.log('HEADERS:');
  console.log(JSON.stringify(req.headers, null, 2));
  
  // Log query params
  console.log('QUERY PARAMS:');
  console.log(JSON.stringify(req.query, null, 2));
  
  // Log body
  console.log('BODY:');
  
  if (req.body) {
    if (typeof req.body === 'object') {
      console.log(JSON.stringify(req.body, null, 2));
    } else {
      console.log(req.body);
    }
  } else {
    console.log('No parsed body');
  }
  
  // Log raw body
  console.log('RAW BODY:');
  console.log(req.rawBody || 'No raw body');
  
  // Save the received data to a file for analysis
  const webhookData = {
    timestamp,
    headers: req.headers,
    query: req.query,
    body: req.body,
    rawBody: req.rawBody
  };
  
  fs.writeFileSync(
    `webhook-data-${Date.now()}.json`, 
    JSON.stringify(webhookData, null, 2)
  );
  
  // Always respond with 200 OK to acknowledge receipt
  res.status(200).send('OK');
});

// Start the server
const PORT = 3333;
app.listen(PORT, () => {
  console.log(`Webhook echo server running on port ${PORT}`);
  console.log(`Use this URL for your webhook: YOUR_TUNNEL_URL/webhook`);
});