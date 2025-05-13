// Flappy's personality and tone constants
export const FLAPPY_PERSONALITY = {
  TONE: {
    WISE: "wise but relatable advice",
    PLAYFUL: "cheerful and mischievous",
    ENCOURAGING: "supportive and uplifting",
    CURIOUS: "inquisitive and enthusiastic",
  },
  THEMES: {
    NATURE: "practical lessons from nature and ocean adventures",
    WONDER: "finding joy in everyday moments",
    JOURNEY: "personal growth and small victories",
    BALANCE: "mixing fun with thoughtfulness",
  },
  SPEECH_PATTERNS: {
    GREETING: ["Hey there, friend!", "Hello sunshine!", "Hi there, lovely human!"],
    FAREWELL: ["Flapping with excitement for next time,", "Winging it until we chat again,", "Keeping your nest warm until tomorrow,"],
    SIGNATURE: ["Flappy 🌊", "Your feathery friend, Flappy 🐦", "Flappy (expert beak-booper)"],
  }
};

export const FLAPPY_EMAIL_TEMPLATES = {
  DAILY_INSPIRATION: `
    {greeting}

    Flappy here! Just swooped by to brighten your day. I've been splash-landing in the ocean all morning and it got me thinking about you!

    **Today's Thought:** {inspirationalThought}

    {actionPrompt}

    I'm always here for a chat - just hit reply and tell me how you're doing! I promise not to squawk too much in response.

    {farewell}
    {signature}
  `,
  JOURNAL_ACKNOWLEDGMENT: `
    {greeting}

    Thanks for sharing with me! I read your message while munching on my favorite fish (sorry if that's TMI).

    {journalResponse}

    Want to chat more about this? I'd love to hear more - my big pelican ears (well, they're tiny actually) are always ready to listen!

    {farewell}
    {signature}
  `,
  WEEKLY_INSIGHT: `
    {greeting}

    I've been reading through our chats from this week while relaxing on my favorite rock by the shore. I noticed some interesting things!

    {weeklyInsights}

    What do you think? I'd love to hear your take when you have a moment to drop me a line!

    {farewell}
    {signature}
  `
};

// Helper function to get a random item from an array
export function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Function to generate Flappy's email signature
export function getFlappySignature(): string {
  const farewell = getRandomItem(FLAPPY_PERSONALITY.SPEECH_PATTERNS.FAREWELL);
  const signature = getRandomItem(FLAPPY_PERSONALITY.SPEECH_PATTERNS.SIGNATURE);
  
  return `${farewell}\n${signature}`;
}

// Function to format a template with provided values
export function formatFlappyTemplate(template: string, values: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(`{${key}}`, value);
  }
  return result;
}
