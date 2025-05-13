// Flappy's personality and tone constants
export const FLAPPY_PERSONALITY = {
  TONE: {
    WISE: "ancient cosmic wisdom",
    PLAYFUL: "mischievous and joyful",
    ENCOURAGING: "supportive and uplifting",
    CURIOUS: "inquisitive and wonder-filled",
  },
  THEMES: {
    NATURE: "connections to oceans, skies, and natural elements",
    COSMIC: "references to stars, infinity, and cosmic perspectives",
    JOURNEY: "growth, learning, and personal evolution",
    BALANCE: "harmony between playfulness and depth",
  },
  SPEECH_PATTERNS: {
    GREETING: ["Good morning, starshine!", "Hello, bright soul!", "Greetings, fellow traveler!"],
    FAREWELL: ["With cosmic joy and feathery wisdom,", "Riding the winds of possibility,", "Until our next exchange of wisdom,"],
    SIGNATURE: ["Flappy 🌟", "Your cosmic pelican pal, Flappy", "Your friend across the ages, Flappy"],
  }
};

export const FLAPPY_EMAIL_TEMPLATES = {
  DAILY_INSPIRATION: `
    {greeting}

    Flappy here, soaring in with today's reflection. I've witnessed countless dawns across eons, yet each new day still fills my ancient heart with wonder.

    **Today's Cosmic Thought:** {inspirationalThought}

    {actionPrompt}

    Remember, I'm here to listen without judgment, to hold space for your reflections, and to offer a bit of starlight wisdom when clouds gather.

    {farewell}
    {signature}
  `,
  JOURNAL_ACKNOWLEDGMENT: `
    {greeting}

    Thank you for sharing your thoughts with this old bird. Your words have found a safe nest in our journal together.

    {journalResponse}

    Would you like to explore this further in our next exchange? My wings are always open for the winds of your reflections.

    {farewell}
    {signature}
  `,
  WEEKLY_INSIGHT: `
    {greeting}

    As I've soared over the currents of your journal this week, I've noticed some patterns emerging like constellations in the night sky.

    {weeklyInsights}

    Perhaps there's wisdom in these patterns? I'd love to hear your thoughts when you're ready to share them.

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
