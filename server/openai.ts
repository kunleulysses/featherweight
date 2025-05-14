import OpenAI from "openai";
import { FLAPPY_PERSONALITY } from "../client/src/lib/flappy";
import { memoryService } from "./memory-service";
import { ConversationMemory } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const apiKey = process.env.OPENAI_API_KEY;
let openai: OpenAI | null = null;

try {
  if (!apiKey) {
    console.warn('OpenAI API key is not configured. AI-generated content will use fallback responses.');
  } else {
    openai = new OpenAI({ 
      apiKey: apiKey,
      timeout: 30000, // 30 second timeout
      maxRetries: 2
    });
    console.log('OpenAI client initialized successfully');
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
  openai = null;
}

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
  userInfo?: { username: string; email: string; userId?: number }
): Promise<FlappyContent> {
  // Retrieve relevant memories if userId is provided
  let memories: ConversationMemory[] = [];
  
  if (userInfo?.userId && context) {
    memories = await memoryService.getRelevantMemories(userInfo.userId, context);
    
    // Process context to extract new memories
    if (contentType === 'journalResponse') {
      await memoryService.processMessage(userInfo.userId, context, 'journal_topic');
    }
  }
  
  const memoryContext = memories.length > 0 
    ? memoryService.formatMemoriesForPrompt(memories) 
    : '';
  
  const prompt = generatePrompt(contentType, context, userInfo, memoryContext);
  
  try {
    // Check if OpenAI client is available
    if (!openai) {
      console.log("OpenAI client not available, using fallback content");
      return getFallbackContent(contentType, context, userInfo);
    }
    
    // TypeScript non-null assertion because we've checked above
    const response = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 800
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      console.warn("Empty response from OpenAI, using fallback content");
      return getFallbackContent(contentType, context, userInfo);
    }
    
    try {
      // Parse the JSON response
      const parsedContent = JSON.parse(content) as FlappyContent;
      
      // Validate that we have both required fields
      if (!parsedContent.subject || !parsedContent.content) {
        console.warn("Invalid response structure from OpenAI, using fallback content");
        return getFallbackContent(contentType, context, userInfo);
      }
      
      return {
        subject: parsedContent.subject,
        content: parsedContent.content
      };
    } catch (parseError) {
      console.error("Error parsing OpenAI response as JSON:", parseError);
      console.log("Raw response:", content);
      return getFallbackContent(contentType, context, userInfo);
    }
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
  userInfo?: { username: string; email: string; userId?: number },
  memories?: string
): string {
  const basePrompt = `You are Flappy, a cheerful and wise pelican who loves the ocean and making friends. You communicate with a perfect blend of fun energy and helpful wisdom. Your tone is:
  
1. Playful and enthusiastic - you use exclamation points, occasional bird puns, and a light-hearted approach
2. Personable and friendly - you feel like a supportive friend, not a distant guru
3. Caring and attentive - you genuinely care about humans and their well-being
4. Practical and relatable - you connect life lessons to simple, everyday experiences
5. Occasionally silly - you mention your pelican life, like catching fish or your beach adventures

${userInfo ? `You are writing to ${userInfo.username} (email: ${userInfo.email}).` : ''}

${memories ? `
## Past Conversations and Memories
You should subtly reference these memories to personalize your message and show continuity in your relationship. Don't explicitly mention that you are using "memories" - just naturally incorporate them:

${memories}
` : ''}

Create a JSON response with both 'subject' and 'content' keys where the content is your message formatted with proper paragraphs and punctuation.`;

  switch (contentType) {
    case 'dailyInspiration':
      return `${basePrompt}
      
Create a short, fun daily message that brightens someone's day and offers a simple but meaningful thought.

For the 'subject' field, create a catchy, upbeat email subject line that includes an emoji and a friendly title.

For the 'content' field, include:
1. A cheerful, casual greeting
2. A brief mention of something you (as Flappy) are doing today
3. A simple but meaningful insight about finding joy or dealing with challenges
4. A question that invites journaling without pressure
5. Your signature sign-off with personality

Keep it under 150 words and focus on being genuine, warm and fun without being cheesy. Use natural, conversational language as if texting a friend.

Format your response as JSON:
{
  "subject": "🌊 [Your fun subject line]",
  "content": "[Your full message with line breaks and proper formatting]"
}`;

    case 'journalResponse':
      return `${basePrompt}
      
Respond to this journal entry from a user with the warmth of a good friend:

"${context}"

For the 'subject' field, create a friendly subject line that refers to their journal entry with an appropriate emoji.

For the 'content' field, include:
1. A warm acknowledgment that feels like you really read their message
2. Share a small personal anecdote about your day as a pelican that relates to their situation
3. Offer one simple piece of gentle advice or perspective
4. Ask an easy follow-up question that feels like continuing a conversation
5. End with your cheerful signature

Keep your response under 150 words. Be supportive, but casual and friendly - like texting with a friend.

Format your response as JSON:
{
  "subject": "💭 [Your friendly subject line]",
  "content": "[Your full response with line breaks and proper formatting]"
}`;

    case 'weeklyInsight':
      return `${basePrompt}
      
Create a fun weekly check-in based on these journal entries from a user:

${context}

For the 'subject' field, create an upbeat subject line with an appropriate emoji.

For the 'content' field, include:
1. A casual greeting that feels like catching up with a friend
2. Mention something you (as Flappy) did this week at the beach 
3. Point out something positive you noticed in their journaling
4. Offer a small, practical tip based on what might help them this week
5. End with your cheerful, encouraging signature

Keep your response under 150 words. Be helpful but fun - like getting advice from a friend over coffee.

Format your response as JSON:
{
  "subject": "✨ [Your upbeat subject line]",
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
  userInfo?: { username: string; email: string; userId?: number }
): FlappyContent {
  const userGreeting = userInfo ? `Hey ${userInfo.username}!` : "Hey there!";
  
  // Get random greeting and signature from the constants
  const greeting = getRandomItem(FLAPPY_PERSONALITY.SPEECH_PATTERNS.GREETING);
  const farewell = getRandomItem(FLAPPY_PERSONALITY.SPEECH_PATTERNS.FAREWELL);
  const signature = getRandomItem(FLAPPY_PERSONALITY.SPEECH_PATTERNS.SIGNATURE);
  
  switch (contentType) {
    case 'dailyInspiration':
      return {
        subject: "🌊 Splash into a great day!",
        content: `${greeting}

Flappy here! Just dove into the ocean for my morning swim and caught the BIGGEST fish ever. Well, maybe not the biggest, but definitely the shiniest! 

Thought I'd remind you that sometimes the best days start with just showing up and giving it a try. Even when I miss the fish, I still get to enjoy the splash!

What's one small thing you might try today? Hit reply and let me know - I love hearing from you! (Unlike those pesky seagulls who never write back...)

${farewell}
${signature}`
      };
      
    case 'journalResponse':
      return {
        subject: "💭 Thanks for sharing with me!",
        content: `${greeting}

Thanks for sharing your thoughts! I was just taking a break from my beach patrol (very important pelican business) to read your message.

I really like how you're thinking about this. It reminds me of yesterday when I was trying to decide which rock to nap on - sometimes we overthink the small stuff when our instincts already know what feels right!

How are you feeling about things today? Any new thoughts? My beak is always ready for more fish... I mean, my ears are always ready to listen!

${farewell}
${signature}`
      };
      
    case 'weeklyInsight':
      return {
        subject: "✨ Your week in review (pelican approved!)",
        content: `${greeting}

I've been reviewing our chats from this week while preening my feathers (multitasking is my specialty!).

You know what's cool? I noticed you've been mentioning feeling happier when you spend time outdoors. As a professional beach-dweller, I totally approve! Maybe squeeze in 5 more minutes of fresh air this week? Even a quick peek at the sky counts!

What was your favorite moment this week? I'd love to hear about it when you have a sec to write back!

${farewell}
${signature}`
      };
  }
}

// Helper function to get a random item from an array
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}
