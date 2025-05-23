import { emailService } from "./email";

// Interval for checking if daily emails need to be sent (every 15 minutes)
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

// Track the last date emails were sent to avoid duplicates
let lastSendDate: string | null = null;

/**
 * Check if it's time to send daily emails based on the current time
 */
async function checkAndSendDailyEmails() {
  const now = new Date();
  
  // Get current hour in 24hr format (for delivery time check)
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Format today's date as YYYY-MM-DD for tracking
  const today = now.toISOString().split('T')[0];
  
  // If we already sent emails today, skip
  if (lastSendDate === today) {
    console.log(`📅 Daily emails already sent for ${today}, skipping check`);
    return;
  }
  
  // Check if it's time to send based on preferred delivery hour (default: 11:00 AM)
  // We'll send within 15 minutes of the target hour
  if (currentHour === 11 && currentMinute < 15) {
    console.log(`🕚 It's around 11:00 AM - time to send daily inspiration emails!`);
    
    try {
      // Send daily inspiration emails
      const result = await emailService.sendDailyInspiration();
      
      if (result.success) {
        console.log(`✅ Successfully sent ${result.count} daily inspiration emails`);
        // Update last send date to avoid sending duplicates today
        lastSendDate = today;
      } else {
        console.error(`❌ Failed to send daily inspiration emails`);
      }
    } catch (error) {
      console.error('Error sending daily inspiration emails:', error);
    }
  } else {
    // Not time yet
    console.log(`⏰ Current time: ${currentHour}:${currentMinute} - Not yet time to send daily emails (scheduled for ~11:00 AM)`);
  }
}

/**
 * Start the email scheduler
 */
export function startEmailScheduler() {
  console.log('📅 Starting email scheduler service...');
  
  // Check immediately on startup (but with a small delay to let other systems initialize)
  setTimeout(() => {
    checkAndSendDailyEmails();
  }, 10000);
  
  // Then set up regular interval checks
  setInterval(checkAndSendDailyEmails, CHECK_INTERVAL_MS);
}