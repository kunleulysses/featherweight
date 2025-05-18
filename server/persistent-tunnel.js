import localtunnel from 'localtunnel';
import { exec } from 'child_process';

// Keep track of the tunnel
let activeTunnel = null;
let shutdownRequested = false;
let retryCount = 0;
const MAX_RETRIES = 10;

async function startTunnel() {
  console.log('🚀 Starting persistent tunnel service...');
  
  try {
    // Try to get a consistent subdomain for better reliability
    const tunnel = await localtunnel({ 
      port: 5000,
      subdomain: `flappy-${Math.floor(Math.random() * 10000)}` // Random subdomain to avoid conflicts
    });
    
    activeTunnel = tunnel;
    retryCount = 0;
    
    console.log(`\n===========================================`);
    console.log(`✅ TUNNEL ESTABLISHED SUCCESSFULLY`);
    console.log(`===========================================`);
    console.log(`🔗 PUBLIC URL: ${tunnel.url}`);
    console.log(`📮 WEBHOOK URL: ${tunnel.url}/api/emails/webhook`);
    console.log(`===========================================`);
    console.log(`IMPORTANT: Update your SendGrid Inbound Parse webhook URL to:`);
    console.log(`${tunnel.url}/api/emails/webhook`);
    console.log(`===========================================\n`);
    
    // Save the webhook URL to a file for easy reference
    exec(`echo "${tunnel.url}/api/emails/webhook" > webhook-url.txt`, (error) => {
      if (error) {
        console.error('Error saving webhook URL to file:', error);
      } else {
        console.log('Webhook URL saved to webhook-url.txt');
      }
    });
    
    // Monitor tunnel status
    tunnel.on('close', () => {
      console.log('⚠️ Tunnel connection closed');
      activeTunnel = null;
      
      if (!shutdownRequested && retryCount < MAX_RETRIES) {
        retryCount++;
        const delay = Math.min(retryCount * 1000, 10000); // Exponential backoff up to 10 seconds
        console.log(`🔄 Attempting to restart tunnel in ${delay/1000} seconds... (Attempt ${retryCount}/${MAX_RETRIES})`);
        setTimeout(startTunnel, delay);
      } else if (retryCount >= MAX_RETRIES) {
        console.error('❌ Maximum retry attempts reached. Please restart the script manually.');
      }
    });
    
    tunnel.on('error', (err) => {
      console.error('❌ Tunnel error:', err);
      
      if (activeTunnel === tunnel) {
        activeTunnel = null;
        
        if (!shutdownRequested && retryCount < MAX_RETRIES) {
          retryCount++;
          const delay = Math.min(retryCount * 1000, 10000);
          console.log(`🔄 Attempting to restart tunnel after error in ${delay/1000} seconds... (Attempt ${retryCount}/${MAX_RETRIES})`);
          setTimeout(startTunnel, delay);
        } else if (retryCount >= MAX_RETRIES) {
          console.error('❌ Maximum retry attempts reached. Please restart the script manually.');
        }
      }
    });
    
    // Send a test webhook to make sure our system is working
    setTimeout(() => {
      console.log('🧪 Sending test webhook to local server to verify functionality...');
      
      const testData = {
        from: 'test@example.com',
        to: 'flappy@parse.featherweight.world',
        subject: 'Tunnel Test',
        text: 'This is an automatic test from the tunnel service.',
        html: '<p>This is an automatic test from the tunnel service.</p>'
      };
      
      try {
        fetch('http://localhost:5000/api/emails/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testData)
        })
        .then(res => {
          if (res.ok) {
            console.log('✅ Test webhook successfully processed!');
            console.log('✅ Your webhook endpoint is ready to receive emails.');
            console.log('✅ 📧 Send an email to flappy@parse.featherweight.world to test it.');
          } else {
            console.error('❌ Test webhook failed:', res.status, res.statusText);
          }
        })
        .catch(err => {
          console.error('❌ Error sending test webhook:', err.message);
        });
      } catch (error) {
        console.error('❌ Error sending test webhook:', error.message);
      }
    }, 2000);
    
  } catch (error) {
    console.error('❌ Failed to establish tunnel:', error);
    
    if (!shutdownRequested && retryCount < MAX_RETRIES) {
      retryCount++;
      const delay = Math.min(retryCount * 1000, 10000);
      console.log(`🔄 Retrying in ${delay/1000} seconds... (Attempt ${retryCount}/${MAX_RETRIES})`);
      setTimeout(startTunnel, delay);
    } else if (retryCount >= MAX_RETRIES) {
      console.error('❌ Maximum retry attempts reached. Please restart the script manually.');
    }
  }
}

// Handle clean shutdown
process.on('SIGINT', () => {
  console.log('⏹️ Shutting down tunnel service...');
  shutdownRequested = true;
  
  if (activeTunnel) {
    activeTunnel.close();
  }
  
  process.exit(0);
});

// Start the tunnel
startTunnel();