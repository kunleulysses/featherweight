#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing SendGrid webhook with multipart/form-data format${NC}"
echo "------------------------------------------------------"

echo -e "${BLUE}📦 Preparing test webhook data...${NC}"

# Create test files
# Create test data as variables instead of files
EMAIL_BODY="This is a test email body from SendGrid"
HEADERS="{\"Message-ID\":\"test-sg-123@example.com\"}"

# Use curl to simulate SendGrid webhook with multipart/form-data
echo -e "${BLUE}📤 Sending webhook to http://localhost:5000/api/emails/webhook${NC}"
curl -X POST http://localhost:5000/api/emails/webhook \
  -F "from=test@example.com" \
  -F "to=flappy@parse.featherweight.world" \
  -F "subject=Testing SendGrid Webhook Format via curl" \
  -F "text=$EMAIL_BODY" \
  -F "html=<p>This is a test email body from SendGrid with <b>HTML</b></p>" \
  -F "envelope={\"from\":\"test@example.com\",\"to\":[\"flappy@parse.featherweight.world\"]}" \
  -F "headers=$HEADERS" \
  -F "spam_report={\"score\":0}" \
  -v

echo -e "\n${GREEN}✅ Test completed${NC}"
echo -e "${BLUE}👉 Check server logs to see how the webhook was processed${NC}"

# No cleanup needed as we're using variables instead of files

echo "------------------------------------------------------"