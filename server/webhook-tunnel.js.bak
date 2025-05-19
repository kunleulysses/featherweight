import localtunnel from 'localtunnel';
import { spawn } from 'child_process';
import fs from 'fs';

// Start the webhook server as a separate process
console.log('🚀 Starting webhook server...');
const webhookServer = spawn('node', ['server/simple-webhook-server.js'], {
  stdio: 'inherit'
});

webhookServer.on('error', (err) => {
  console.error('Error starting webhook server:', err);
});

// Create a tunnel to expose the webhook server
async function startTunnel() {
  console.log('🔄 Setting up tunnel for webhook server...');
  
  try {
    const tunnel = await localtunnel({ 
      port: 3000,
      subdomain: `webhook-${Math.floor(Math.random() * 10000)}`
    });
    
    console.log(`\n===========================================`);
    console.log(`✅ WEBHOOK TUNNEL ESTABLISHED SUCCESSFULLY`);
    console.log(`===========================================`);
    console.log(`🔗 PUBLIC URL: ${tunnel.url}`);
    console.log(`📩 WEBHOOK URL: ${tunnel.url}/webhook`);
    console.log(`===========================================`);
    console.log(`IMPORTANT: Update your SendGrid Inbound Parse webhook URL to:`);
    console.log(`${tunnel.url}/webhook`);
    console.log(`===========================================\n`);
    
    // Save the webhook URL to a file for easy reference
    fs.writeFileSync('webhook-url.txt', `${tunnel.url}/webhook`);
    console.log('Webhook URL saved to webhook-url.txt');
    
    // Monitor tunnel status
    tunnel.on('close', () => {
      console.log('⚠️ Tunnel connection closed, attempting to reconnect...');
      startTunnel();
    });
    
    tunnel.on('error', (err) => {
      console.error('❌ Tunnel error:', err);
      console.log('⚠️ Attempting to restart tunnel...');
      startTunnel();
    });
    
  } catch (error) {
    console.error('❌ Failed to establish tunnel:', error);
    console.log('⚠️ Retrying in 5 seconds...');
    setTimeout(startTunnel, 5000);
  }
}

// Start the tunnel
startTunnel();

// Clean shutdown
process.on('SIGINT', () => {
  console.log('⏹️ Shutting down webhook server and tunnel...');
  webhookServer.kill();
  process.exit(0);
});