# Email Setup Guide for Featherweight

## SendGrid Configuration

### Sending Domain Configuration
1. Domain: `em8032.featherweight.world` (CNAME record)
   - This is your sending domain for outbound emails from Flappy
   - Should be verified in SendGrid

### Inbound Parse Configuration 
1. Domain: `parse.featherweight.world` (MX record)
   - This is the domain that receives emails addressed to Flappy
   - MX record should point to `mx.sendgrid.net`

2. Webhook URL: 
   - Production: `https://featherweight.world/api/emails/webhook`
   - Development: Use localtunnel URL (e.g., `https://flappy-xxxx.loca.lt/api/emails/webhook`)

3. Settings:
   - Check "POST the raw, full MIME message" if you want to receive the entire email content
   - Otherwise, SendGrid will parse the email and send it as multipart/form-data (which we now support)

## DNS Records Required

### For Sending (em8032.featherweight.world)
- CNAME record: `em8032.featherweight.world` → `u27084148.wl232.sendgrid.net`
- TXT records for SPF and DKIM as provided by SendGrid

### For Receiving (parse.featherweight.world)
- MX record: `parse.featherweight.world` → `mx.sendgrid.net` (priority 10)

## Testing Email Flow

1. Send an email to any address @parse.featherweight.world
   - Example: `flappy@parse.featherweight.world`
   - Example: `anything@parse.featherweight.world` 

2. SendGrid will:
   - Receive the email via the MX record
   - POST the email content to your webhook URL
   - Your server will queue the email for processing

3. Logs to check:
   - SendGrid Activity Feed (to verify email was received)
   - Your server logs (to verify webhook received and processed)
   - Email database queue (to verify email was stored)