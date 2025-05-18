import localtunnel from 'localtunnel';

async function setupTunnel() {
  console.log('Setting up localtunnel for webhook testing...');
  
  try {
    const tunnel = await localtunnel({ 
      port: 5000,
      subdomain: 'featherweight-webhook' // Try to get a consistent subdomain
    });
    
    console.log(`✅ Tunnel established successfully!`);
    console.log(`🔗 Public URL: ${tunnel.url}`);
    console.log(`📩 Configure your SendGrid Inbound Parse webhook to point to: ${tunnel.url}/api/emails/webhook`);
    
    tunnel.on('close', () => {
      console.log('Tunnel closed');
    });
    
    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
      
      // Try to reconnect after a delay
      console.log('Attempting to reconnect in 5 seconds...');
      setTimeout(setupTunnel, 5000);
    });
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('Closing tunnel...');
      tunnel.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to establish tunnel:', error);
    console.log('Retrying in 5 seconds...');
    setTimeout(setupTunnel, 5000);
  }
}

// Start the tunnel
setupTunnel();