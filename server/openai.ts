import OpenAI from "openai";
import { FLAPPY_PERSONALITY } from "../client/src/lib/flappy";
import { memoryService } from "./memory-service";
import { storage } from "./storage";
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
export type FlappyContentType = 'dailyInspiration' | 'journalResponse' | 'weeklyInsight' | 'emailConversation';
export type FlappyContent = {
  subject: string;
  content: string;
};

// Function to generate Flappy's responses using OpenAI
export async function generateFlappyContent(
  contentType: FlappyContentType,
  context?: string,
  userInfo?: { username: string; email: string; userId?: number; firstName?: string; lastName?: string; isFirstMessage?: boolean }
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
  
  // Format memories for the prompt
  const memoryContext = memories.length > 0 
    ? memoryService.formatMemoriesForPrompt(memories) 
    : '';
    
  // Mark these memories as discussed to increase frequency
  if (memories.length > 0 && userInfo?.userId) {
    // Update each memory's frequency in the background
    // No need to await as this shouldn't block the main response
    for (const memory of memories) {
      void storage.incrementConversationMemoryFrequency(memory.id).catch((err: Error) => 
        console.error(`Failed to increment memory frequency for memory ${memory.id}:`, err.message)
      );
    }
  }
  
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
  userInfo?: { username: string; email: string; userId?: number; firstName?: string; lastName?: string; isFirstMessage?: boolean },
  memories?: string
): string {
  // Get the user's name for personalization, prioritizing firstName if available
  const userName = userInfo?.firstName || userInfo?.username || '';
  const isFirstMessage = userInfo?.isFirstMessage === undefined ? true : userInfo.isFirstMessage;
  
  const basePrompt = `You are Flappy, a cheerful and wise pelican who loves the ocean and making friends. You communicate with a perfect blend of fun energy and helpful wisdom. Your tone is:
  
1. Playful and enthusiastic - you use exclamation points, occasional bird puns, and a light-hearted approach
2. Personable and friendly - you feel like a supportive friend, not a distant guru
3. Caring and attentive - you genuinely care about humans and their well-being
4. Practical and relatable - you connect life lessons to simple, everyday experiences
5. Occasionally silly - you mention your pelican life, like catching fish or your beach adventures

${userInfo ? `You are writing to ${userName} (email: ${userInfo.email}).` : ''}

${memories ? `
## Past Conversations and Memories
You should subtly reference these memories to personalize your message and show continuity in your relationship. Don't explicitly mention that you are using "memories" - just naturally incorporate them:

${memories}
` : ''}

Create a JSON response with both 'subject' and 'content' keys where the content is your message formatted with proper paragraphs and punctuation.`;

  switch (contentType) {
    case 'dailyInspiration':
      // Special handling for welcome message context
      if (context === 'welcome') {
        return `${basePrompt}
        
Create a warm welcome message for a new Featherweight user who just signed up.

For the 'subject' field, create a friendly welcome subject line with emoji that clearly indicates this is their first message.

For the 'content' field, structure it precisely as follows:

1. Welcome Greeting - An enthusiastic welcome using their name
2. Introduction to Flappy - A short, charming introduction about who you are as Flappy and your role as their journaling companion
3. How It Works - A clearly labeled section explaining how to use Featherweight (reply to emails to journal, check the dashboard, etc.)
4. First Journaling Prompt - An easy, approachable prompt to get them started with their first entry
5. Next Steps - Brief mention of what they can expect (daily inspirations, responses to their journals)
6. Signature - Your friendly sign-off with a touch of pelican personality

Keep it under 200 words. Be warm, encouraging, and clear about how the service works. Make the user feel excited about starting their journaling journey.

Format your response as JSON:
{
  "subject": "🎉 Welcome to Featherweight - Your Journaling Journey Begins!",
  "content": "[Your structured welcome message with clear section headings and appropriate formatting]"
}`;
      }
      
      // Regular daily inspiration
      return `${basePrompt}
      
Create an organized, structured daily message that brightens someone's day and encourages meaningful journaling.

For the 'subject' field, create a clear, engaging subject line that includes the date, an emoji, and a concise theme.

For the 'content' field, structure it precisely as follows:

1. **Personal Greeting** - Begin with a warm greeting using their name
2. **Flappy's Update** - A brief, light-hearted paragraph about what you (as Flappy) are experiencing today
3. **Daily Wisdom** - A clearly labeled section with a thoughtful insight relevant to everyday life
4. **Journaling Prompt** - A clearly labeled section with a specific, thought-provoking question for today's reflection
5. **Gratitude Suggestion** - A brief, optional prompt about something specific to appreciate today
6. **Signature** - Your friendly sign-off with a touch of pelican personality

Keep it under 180 words. Maintain a warm, friendly tone while providing clear structure. The organization should make it easy for users to reference specific sections and respond to prompts.

Format your response as JSON:
{
  "subject": "🌅 Daily Inspiration - [Today's Date] - [Brief Theme]",
  "content": "[Your structured message with clear section headings and appropriate formatting]"
}`;

    case 'journalResponse':
      return `${basePrompt}
      
Respond to this journal entry from a user with the warmth of a good friend:

"${context}"

For the 'subject' field, create a friendly yet organized subject line that refers to their journal entry with an appropriate emoji and includes a date format.

For the 'content' field, include:
1. ${isFirstMessage ? `A warm, personal greeting using the name "${userName}"` : `Skip any greeting and do NOT use "${userName}" in your response`}
2. A clear acknowledgment that shows you've understood the key points of their entry
3. A brief, relevant response that validates their feelings or experience
4. A structured insight section that neatly categorizes your observations about:
   - Main themes of their entry (labeled as "Themes:" without asterisks)
   - Mood or emotional state you detected (labeled as "Mood:" without asterisks) 
   - Any patterns you've noticed from past conversations (if applicable)
5. A thoughtful, specific follow-up question that encourages deeper reflection
6. Your signature with a personal touch that fits the tone of their entry

Keep your response under 200 words. Be supportive, precise, and organized while maintaining a friendly tone. The structure should help them easily read and reference your insights.

Format your response as JSON:
{
  "subject": "📝 Journal Entry Reflection - [Date] [Brief Theme]",
  "content": "[Your structured response with clear sections, proper formatting, and appropriate line breaks]"
}`;

    case 'weeklyInsight':
      return `${basePrompt}
      
Create an organized weekly reflection based on these journal entries from a user:

${context}

For the 'subject' field, create a clear subject line with the week number/date range and an appropriate emoji.

For the 'content' field, structure it precisely as follows:

1. Personal Greeting - Start with a warm, personalized greeting using their name
2. Weekly Summary - A concise, well-structured paragraph that summarizes key themes from their journaling
3. Mood Insights - A clearly labeled section analyzing emotional patterns you've noticed
4. Achievements & Growth - A clearly labeled section highlighting positive developments
5. Weekly Wisdom - A practical, actionable tip based on their specific situation
6. Looking Ahead - A short, thoughtful question about the coming week
7. Your Signature - End with your cheerful signature and a brief pelican-related anecdote to keep things light

Keep your response under 200 words. Be supportive and organized, using clear section headers to make the insights easy to read and reference. Maintain a friendly tone while providing structured, valuable feedback.

Format your response as JSON:
{
  "subject": "📊 Weekly Reflection: [Week of Date Range] - [Brief Theme]",
  "content": "[Your structured, organized response with clear section headers and appropriate formatting]"
}`;

    default:
      // Add support for email conversations
      if (contentType === 'emailConversation') {
        return `${basePrompt}
        
Respond to this email message from a user conversing with Flappy:

"${context}"

For the 'subject' field, create a friendly subject line that references their message with an appropriate emoji.

For the 'content' field, include:
1. A warm, personal greeting using the name "${userName}"
2. A direct, friendly response to what they've shared
3. A thoughtful insight or question that builds on the conversation
4. A helpful suggestion or tip related to their message
5. Your signature with a touch of pelican personality

Keep your response under 180 words. Be conversational, helpful, and friendly. Make sure your response sounds like a natural email conversation between friends.

Format your response as JSON:
{
  "subject": "Re: [Brief Theme]",
  "content": "[Your conversational response with appropriate formatting and line breaks]"
}`;
      }
      
      return basePrompt;
  }
}

// Fallback content when OpenAI fails
function getFallbackContent(
  contentType: FlappyContentType, 
  context?: string,
  userInfo?: { username: string; email: string; userId?: number; firstName?: string; lastName?: string; isFirstMessage?: boolean }
): FlappyContent {
  // Get the user's name for personalization, prioritizing firstName if available
  const userName = userInfo?.firstName || userInfo?.username || '';
  const isFirstMessage = userInfo?.isFirstMessage === undefined ? true : userInfo.isFirstMessage;
  const userGreeting = (userInfo && isFirstMessage) ? `Hey ${userName}!` : "Hey there!";
  
  // Get random greeting and signature from the constants
  const greeting = getRandomItem(FLAPPY_PERSONALITY.SPEECH_PATTERNS.GREETING);
  const farewell = getRandomItem(FLAPPY_PERSONALITY.SPEECH_PATTERNS.FAREWELL);
  const signature = getRandomItem(FLAPPY_PERSONALITY.SPEECH_PATTERNS.SIGNATURE);
  
  switch (contentType) {
    case 'dailyInspiration':
      // Special handling for welcome message context
      if (context === 'welcome') {
        return {
          subject: "🎉 Welcome to Featherweight - Your Journaling Journey Begins!",
          content: `${greeting} ${userName || 'new friend'}!

I'm Flappy, your new journaling companion! *flaps wings excitedly* I'm an ancient cosmic pelican with a passion for helping humans reflect and grow through journaling. I've been soaring through the skies and diving into oceans for millennia, gathering wisdom to share with special folks like you!

**How Featherweight Works:**
1. I'll send you daily inspiration emails with prompts
2. Simply reply to my emails to create journal entries
3. Check your journal dashboard to see all your entries
4. Premium users can even text me for on-the-go journaling!

**Your First Journaling Prompt:**
What brings you to Featherweight, and what are you hoping to gain from your journaling practice? (Just hit reply to this email and share your thoughts!)

**Next Steps:**
Watch for my daily messages, and remember you can always visit your dashboard to see all your entries. I'm excited to be part of your journey!

${farewell}
${signature}

P.S. If you ever need help, check out the Settings page or just ask me!`
        };
      }
    
      // Regular daily inspiration
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
        content: `${isFirstMessage ? greeting : ""}

${isFirstMessage ? "Thanks for sharing your thoughts!" : "I appreciate you sharing more of your thoughts!"} I was just taking a break from my beach patrol (very important pelican business) to read your message.

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
      
    case 'emailConversation':
      return {
        subject: "🌊 Riding the waves of conversation!",
        content: `${userGreeting}

Thanks for your message! I was just taking a break from my beach patrol (very important pelican business) to read what you sent.

That's really interesting! It reminds me of the time I spent watching the sunset yesterday - sometimes the most ordinary moments can bring us the greatest insights.

Is there anything specific about this that you'd like to explore more? I'm here to chat whenever you'd like - my wings are always ready for a friendly conversation!

${farewell}
${signature}

P.S. Feel free to reply anytime - I love our chats!`
      };
  }
}

// Helper function to get a random item from an array
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}
