# SendGrid Webhook Debugging Guide

## Current Setup
- Domain: `parse.featherweight.world` (MX records pointing to SendGrid)
- SendGrid webhook URL: `https://featherweight.world/api/emails/webhook`
- Email address for testing: `flappy@parse.featherweight.world`

## Troubleshooting Steps

1. **Verify MX Record Setup**
   - Use [MXToolbox](https://mxtoolbox.com/) to check if the MX record for `parse.featherweight.world` is correctly pointing to `mx.sendgrid.net`
   - Remember DNS changes can take 24-48 hours to fully propagate

2. **Verify Webhook URL**
   - Ensure the webhook URL in SendGrid's Inbound Parse settings matches your actual deployment URL
   - For Replit deployments, the URL might look like `https://featherweight.replit.app/api/emails/webhook`

3. **Test Direct Webhook Connection**
   - Use a tool like [Webhook.site](https://webhook.site/) to get a temporary webhook URL
   - Update your SendGrid configuration to point to this temporary URL
   - Send a test email and check if it appears on Webhook.site

4. **Check SendGrid Logs**
   - Log into your SendGrid account
   - Check the Activity Feed for any errors related to parsing or delivering inbound emails
   - Look for any bounces or blocked emails

5. **Update Domain Settings**
   - Consider using a specific subdomain just for testing, like `test-parse.featherweight.world`
   - Set up MX records for this test subdomain and configure SendGrid to use it

## SendGrid Webhook Format Reference

When SendGrid forwards an email via webhook, it typically sends data in this format:

```json
{
  "headers": "Received: ...",
  "text": "Email body text",
  "html": "<p>Email HTML content</p>",
  "from": "User <user@example.com>",
  "to": "flappy@parse.featherweight.world",
  "subject": "Email subject",
  "envelope": "{\"to\":[\"flappy@parse.featherweight.world\"],\"from\":\"user@example.com\"}",
  "charsets": "{\"to\":\"UTF-8\",\"html\":\"UTF-8\",\"subject\":\"UTF-8\",\"from\":\"UTF-8\",\"text\":\"UTF-8\"}",
  "SPF": "pass"
}
```

## Testing with cURL

You can simulate a SendGrid webhook with curl:

```bash
curl -X POST https://your-deployed-url.com/api/emails/webhook \
  -d "from=test@example.com" \
  -d "to=flappy@parse.featherweight.world" \
  -d "subject=Test Email" \
  -d "text=This is a test email body" \
  -d "envelope={\"to\":[\"flappy@parse.featherweight.world\"],\"from\":\"test@example.com\"}"
```