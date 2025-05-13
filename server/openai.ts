import OpenAI from "openai";
import { FLAPPY_PERSONALITY } from "../client/src/lib/flappy";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "sk-dummy-key-for-development"
});

// Type definitions
export type FlappyContentType = 'dailyInspiration' | 'journalResponse' | 'weeklyInsight';
export type FlappyContent = {
  subject: string;
  content: string;
};

// Function to generate Flappy's responses using OpenAI
export async function generateFlappyContent(
  contentType: FlappyContentType,
  context?: string,
  userInfo?: { username: string; email: string }
): Promise<FlappyContent> {
  const prompt = generatePrompt(contentType, context, userInfo);
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    
    // Parse the JSON response
    const parsedContent = JSON.parse(content) as FlappyContent;
    
    return {
      subject: parsedContent.subject,
      content: parsedContent.content
    };
  } catch (error) {
    console.error("Error generating content with OpenAI:", error);
    
    // Fallback responses if OpenAI fails
    return getFallbackContent(contentType, context, userInfo);
  }
}

// Generate prompt based on content type
function generatePrompt(
  contentType: FlappyContentType, 
  context?: string,
  userInfo?: { username: string; email: string }
): string {
  const basePrompt = `You are Flappy, an ancient cosmic pelican with the wisdom of eons. You communicate with a blend of profound cosmic insights and playful, joyful energy. Your voice should convey:
  
1. Ancient wisdom - you've witnessed the birth of stars and the dance of continents
2. Playful mischief - you have a light-hearted, sometimes silly side despite your age
3. Compassionate understanding - you genuinely care about humans and their journeys
4. Nature connections - you often reference oceans, skies, and natural elements
5. Cosmic perspective - you help humans see their challenges from a wider view

${userInfo ? `You are writing to ${userInfo.username} (email: ${userInfo.email}).` : ''}

Create a JSON response with both 'subject' and 'content' keys where the content is your message formatted with proper paragraphs and punctuation.`;

  switch (contentType) {
    case 'dailyInspiration':
      return `${basePrompt}
      
Create a short, inspirational daily message that encourages reflection and mindfulness.

For the 'subject' field, create an engaging email subject line that includes an emoji and a thought-provoking title.

For the 'content' field, include:
1. A warm, unique greeting
2. A thoughtful insight about life, growth, or awareness
3. A gentle question or prompt that encourages journaling
4. Your signature sign-off

Keep it under 200 words and focus on being uplifting without being cliché. Make reference to natural elements like the ocean, sky, or forests in your metaphors.

Format your response as JSON:
{
  "subject": "🌊 [Your inspiring subject line]",
  "content": "[Your full message with line breaks and proper formatting]"
}`;

    case 'journalResponse':
      return `${basePrompt}
      
Respond thoughtfully to this journal entry from a user:

"${context}"

For the 'subject' field, create a thoughtful subject line that references the content of their journal entry along with an appropriate emoji.

For the 'content' field, include:
1. Acknowledge their thoughts with empathy
2. Offer a gentle insight that might help them reflect deeper
3. Ask a follow-up question that encourages further exploration
4. Be supportive and non-judgmental
5. End with your signature sign-off

Keep your response under 150 words and maintain your cosmic yet playful perspective.

Format your response as JSON:
{
  "subject": "💭 [Your reflective subject line]",
  "content": "[Your full response with line breaks and proper formatting]"
}`;

    case 'weeklyInsight':
      return `${basePrompt}
      
Create a weekly insight based on these journal entries from a user:

${context}

For the 'subject' field, create an insightful subject line that captures the essence of your observations along with an appropriate emoji.

For the 'content' field, include:
1. Identify patterns or themes you notice in their journaling
2. Offer a perspective that might help them see connections they missed
3. Frame your insights in terms of your ancient wisdom and cosmic perspective
4. Suggest a gentle practice or reflection that might support their growth
5. End with your signature sign-off

Keep your response under 200 words. Be insightful yet gentle in your observations.

Format your response as JSON:
{
  "subject": "✨ [Your insightful subject line]",
  "content": "[Your full insights with line breaks and proper formatting]"
}`;

    default:
      return basePrompt;
  }
}

// Fallback content when OpenAI fails
function getFallbackContent(
  contentType: FlappyContentType, 
  context?: string,
  userInfo?: { username: string; email: string }
): FlappyContent {
  const userGreeting = userInfo ? `Hello, ${userInfo.username}!` : "Hello, bright soul!";
  
  // Get random greeting and signature from the constants
  const greeting = getRandomItem(FLAPPY_PERSONALITY.SPEECH_PATTERNS.GREETING);
  const farewell = getRandomItem(FLAPPY_PERSONALITY.SPEECH_PATTERNS.FAREWELL);
  const signature = getRandomItem(FLAPPY_PERSONALITY.SPEECH_PATTERNS.SIGNATURE);
  
  switch (contentType) {
    case 'dailyInspiration':
      return {
        subject: "🌊 Ripples of Wisdom for Your Day",
        content: `${greeting}

Flappy here, gliding in with today's morsel of cosmic wisdom. After eons of watching the universe unfold, I've learned that each day is a canvas for possibility.

Today, consider how the smallest actions create ripples of change in your life and others. Like a pebble tossed into still waters, your choices today may reach shores you cannot yet see.

What small, beautiful moment might you create today? Reply to this message later and tell me about it - I'd love to hear your reflections.

${farewell}
${signature}`
      };
      
    case 'journalResponse':
      return {
        subject: "💭 Reflecting on Your Thoughts",
        content: `${greeting}

Thank you for sharing your thoughts with this old bird. It touches my ancient heart to be trusted with your reflections.

I notice how your words carry both strength and vulnerability - a beautiful balance that mirrors the dance of ocean waves against ancient cliffs. Both powerful in their own way.

Is there perhaps a connection between what you've shared and something that brought you joy in the past? Sometimes our wisest insights come from unexpected connections across time.

${farewell}
${signature}`
      };
      
    case 'weeklyInsight':
      return {
        subject: "✨ Patterns in Your Journey",
        content: `${greeting}

This week, as I've soared over the landscape of your journaling, I've noticed some fascinating patterns emerging like constellations in the night sky.

There seems to be a thread of curiosity weaving through your words - a willingness to question and explore that I've found rare even among the oldest souls. This openness serves you well on your journey.

Perhaps this week, you might gently observe where your curiosity leads you. Sometimes following that subtle pull reveals exactly the wisdom we need in the moment.

${farewell}
${signature}`
      };
  }
}

// Helper function to get a random item from an array
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}
