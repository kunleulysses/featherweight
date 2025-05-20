import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { AdBanner } from "@/components/ads/ad-banner";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Save, PlusCircle, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

// Define the form schema
const messageFormSchema = z.object({
  message: z.string().min(1, {
    message: "Message cannot be empty.",
  }),
});

type MessageFormValues = z.infer<typeof messageFormSchema>;

// Types for conversation messages
type MessageType = "user" | "flappy";

interface Message {
  id: string;
  content: string;
  type: MessageType;
  timestamp: Date;
}

export default function ConversationCenterPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: `Hello ${user?.preferences?.firstName || user?.username || "there"}! I'm Flappy, your journaling companion. How are you feeling today? Feel free to share anything on your mind - I'm here to listen and help you reflect.`,
      type: "flappy",
      timestamp: new Date(),
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [conversationTitle, setConversationTitle] = useState("");
  const [messageCount, setMessageCount] = useState(0);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const MAX_FREE_MESSAGES = 3; // Maximum messages for free tier users
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Initialize the form
  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      message: "",
    },
  });

  // Function to generate a unique ID
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };
  
  // Scroll to the bottom of the chat when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Reset message constraints when user upgrades to premium
  useEffect(() => {
    if (user?.isPremium && showUpgradePrompt) {
      setShowUpgradePrompt(false);
    }
  }, [user?.isPremium, showUpgradePrompt]);

  // Start a new conversation
  const startNewConversation = () => {
    // Only start a new conversation if the current one is inactive or if there are only system messages
    if (!isActive || messages.length <= 1) {
      setMessages([{
        id: "welcome",
        content: `Hello ${user?.preferences?.firstName || user?.username || "there"}! I'm Flappy, your journaling companion. How are you feeling today? Feel free to share anything on your mind - I'm here to listen and help you reflect.`,
        type: "flappy",
        timestamp: new Date(),
      }]);
      setIsActive(true);
      setConversationTitle("");
      setMessageCount(0);
      setShowUpgradePrompt(false);
    } else {
      // Confirm before discarding the current conversation
      if (window.confirm("Starting a new conversation will discard the current one. Continue?")) {
        setMessages([{
          id: "welcome",
          content: `Hello ${user?.preferences?.firstName || user?.username || "there"}! I'm Flappy, your journaling companion. How are you feeling today? Feel free to share anything on your mind - I'm here to listen and help you reflect.`,
          type: "flappy",
          timestamp: new Date(),
        }]);
        setIsActive(true);
        setConversationTitle("");
        setMessageCount(0);
        setShowUpgradePrompt(false);
      }
    }
  };

  // Save the conversation as a journal entry
  const saveConversation = async () => {
    // Only save if there are messages beyond the welcome message
    if (messages.length <= 1) {
      toast({
        title: "No Conversation to Save",
        description: "Have a chat with Flappy first before saving.",
      });
      return;
    }

    // Don't save if already inactive (saved)
    if (!isActive) {
      toast({
        title: "Already Saved",
        description: "This conversation has already been saved to your journal.",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      // Format the conversation for saving
      const formattedConversation = messages.map(msg => {
        return `${msg.type === 'user' ? 'You' : 'Flappy'} (${format(msg.timestamp, "MMM d, h:mm a")}):\n${msg.content}\n\n`;
      }).join('');
      
      // Generate a title based on the conversation content
      const titleToUse = conversationTitle || `Conversation with Flappy - ${format(new Date(), "MMM d, yyyy")}`;
      
      // Call API to save the conversation as a journal entry
      const response = await apiRequest("POST", "/api/journal", {
        title: titleToUse,
        content: formattedConversation,
        tags: ["conversation"],
      });
      
      if (!response.ok) {
        throw new Error("Failed to save conversation");
      }
      
      // Mark conversation as inactive (saved)
      setIsActive(false);
      
      toast({
        title: "Conversation Saved",
        description: "Your conversation has been saved to your journal.",
      });
      
      // Invalidate the journal entries query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle form submission
  async function onSubmit(data: MessageFormValues) {
    if (isSubmitting || !isActive) return;
    
    // Check message limit for free users
    if (!user?.isPremium && messageCount >= MAX_FREE_MESSAGES) {
      setShowUpgradePrompt(true);
      toast({
        title: "Message Limit Reached",
        description: `Free users are limited to ${MAX_FREE_MESSAGES} messages per conversation. Upgrade to Premium for unlimited messages!`,
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Add user message to the conversation
    const userMessage: Message = {
      id: generateId(),
      content: data.message,
      type: "user",
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    
    // Increment message count
    setMessageCount(prevCount => prevCount + 1);
    
    // Reset the form
    form.reset();
    
    try {
      // Add a loading state for Flappy's response
      const loadingId = generateId();
      setMessages((prev) => [
        ...prev,
        {
          id: loadingId,
          content: "Flappy is ruffling his feathers...",
          type: "flappy",
          timestamp: new Date(),
        },
      ]);
      
      // Call the API to get Flappy's response
      const response = await apiRequest("POST", "/api/conversation", {
        message: data.message,
        createJournalEntry: false, // Don't create a journal entry automatically
        isFirstMessage: messages.filter(m => m.type === "user").length === 0, // Check if this is the first user message
      });
      
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      
      const responseData = await response.json();
      
      // Remove the loading message and add Flappy's actual response
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== loadingId);
        return [
          ...filtered,
          {
            id: generateId(),
            content: responseData.response,
            type: "flappy",
            timestamp: new Date(),
          },
        ];
      });
      
      // Use the first message as a potential title for the conversation
      if (messages.length <= 2 && !conversationTitle) {
        // Extract a title from the first user message - limit to 50 chars
        const potentialTitle = data.message.length > 50 
          ? data.message.substring(0, 47) + "..."
          : data.message;
        setConversationTitle(potentialTitle);
      }
    } catch (error) {
      // Remove the loading message if there was an error
      setMessages((prev) => prev.filter((msg) => msg.content !== "Flappy is ruffling his feathers..."));
      
      toast({
        title: "Message Failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user) {
    return (
      <>
        <Helmet>
          <title>Chat with Flappy - Featherweight</title>
          <meta
            name="description"
            content="Have a conversation with Flappy, your journaling companion. Sign in to start chatting."
          />
        </Helmet>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow py-8 bg-background">
            <Container>
              <div className="mb-8">
                <h1 className="font-quicksand font-bold text-3xl mb-2">Chat with Flappy</h1>
                <p className="text-foreground/70">
                  Please log in to chat with Flappy
                </p>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Authentication Required</CardTitle>
                  <CardDescription>
                    Please log in to use this feature.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button asChild>
                    <a href="/auth">Log In</a>
                  </Button>
                </CardFooter>
              </Card>
            </Container>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Chat with Flappy - Featherweight</title>
        <meta
          name="description"
          content="Have a conversation with Flappy, your journaling companion. Share your thoughts and feelings to create meaningful journal entries."
        />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow py-8 bg-background">
          <Container>
            <div className="mb-6">
              <h1 className="font-quicksand font-bold text-3xl mb-2">Chat with Flappy</h1>
              <p className="text-foreground/70">
                Share your thoughts and create journal entries through conversation
              </p>
            </div>
            
            {!user?.isPremium && (
              <div className="mb-6">
                <AdBanner format="horizontal" />
              </div>
            )}

            <Card className="max-w-3xl mx-auto">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="flex items-center">
                    <Avatar className="h-10 w-10 mr-2">
                      <AvatarImage src="/assets/flappy-avatar.png" alt="Flappy" />
                      <AvatarFallback>F</AvatarFallback>
                    </Avatar>
                    <span>Flappy</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startNewConversation}
                      className="flex items-center"
                      title="Start a new conversation"
                    >
                      <PlusCircle className="h-4 w-4 mr-1" />
                      <span>New</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveConversation}
                      className="flex items-center"
                      disabled={!isActive || messages.length <= 1 || isSaving}
                      title="Save conversation to journal"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          <span>Save</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {isActive 
                    ? "Have a conversation with Flappy and save it to your journal when done" 
                    : "This conversation has been saved to your journal. Start a new one!"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[450px] pr-4">
                  <div className="flex flex-col space-y-5">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.type === "user" ? "justify-end" : "justify-start"
                        } select-text`}
                      >
                        {message.type === "flappy" && (
                          <div className="flex-shrink-0 mr-2">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src="/assets/flappy-avatar.png" alt="Flappy" />
                              <AvatarFallback>F</AvatarFallback>
                            </Avatar>
                          </div>
                        )}
                        <div
                          className={`max-w-[75%] rounded-lg px-4 py-3 shadow-sm ${
                            message.type === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {message.content === "Flappy is ruffling his feathers..." ? (
                            <div className="flex items-center">
                              <span>{message.content}</span>
                              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                            </div>
                          ) : (
                            <>
                              <div className="whitespace-pre-wrap break-words text-left">{message.content}</div>
                              <div
                                className={`text-xs mt-2 text-right ${
                                  message.type === "user"
                                    ? "text-primary-foreground/70"
                                    : "text-foreground/50"
                                }`}
                              >
                                {format(message.timestamp, "h:mm a")}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter>
                {showUpgradePrompt ? (
                  <div className="w-full">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <h3 className="font-medium text-yellow-800 mb-1">Message Limit Reached</h3>
                      <p className="text-yellow-700 text-sm mb-2">
                        Free users are limited to {MAX_FREE_MESSAGES} messages per conversation. Upgrade to Premium for unlimited messages!
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          asChild
                        >
                          <a href="/subscription">Upgrade to Premium</a>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={startNewConversation}
                        >
                          Start New Conversation
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="w-full space-y-2"
                    >
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="flex w-full space-x-2">
                                <Textarea
                                  placeholder="Type your message here..."
                                  className="flex-1 min-h-[70px] max-h-[150px]"
                                  {...field}
                                  disabled={!isActive || isSubmitting}
                                />
                                <Button
                                  type="submit"
                                  size="icon"
                                  className="h-14 w-14 shrink-0 rounded-full"
                                  disabled={!isActive || isSubmitting}
                                >
                                  {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {isActive && !isSubmitting && !showUpgradePrompt && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {!user?.isPremium && (
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                  <line x1="12" y1="9" x2="12" y2="13"></line>
                                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                                <span>Free tier: {messageCount}/{MAX_FREE_MESSAGES} messages per conversation</span>
                              </div>
                            )}
                          </span>
                          <span>Press Enter to send</span>
                        </div>
                      )}
                    </form>
                  </Form>
                )}
              </CardFooter>
            </Card>
          </Container>
        </main>
        <Footer />
      </div>
    </>
  );
}