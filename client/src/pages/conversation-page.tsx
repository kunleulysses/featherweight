import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
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

export default function ConversationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: `Hello ${user?.username || "there"}! I'm Flappy, your journaling companion. How are you feeling today? Feel free to share anything on your mind - I'm here to listen and help you reflect.`,
      type: "flappy",
      timestamp: new Date(),
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Handle form submission
  async function onSubmit(data: MessageFormValues) {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    // Add user message to the conversation
    const userMessage: Message = {
      id: generateId(),
      content: data.message,
      type: "user",
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    
    // Reset the form
    form.reset();
    
    try {
      // Add a loading state for Flappy's response
      const loadingId = generateId();
      setMessages((prev) => [
        ...prev,
        {
          id: loadingId,
          content: "Flappy is thinking...",
          type: "flappy",
          timestamp: new Date(),
        },
      ]);
      
      // Call the API to get Flappy's response
      const response = await apiRequest("POST", "/api/conversation", {
        message: data.message,
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
      
      // If the conversation created a journal entry, refresh the journal entries
      if (responseData.journalEntryCreated) {
        toast({
          title: "Journal Entry Created",
          description: "This conversation has been saved to your journal.",
        });
        
        // Invalidate the journal entries query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      }
    } catch (error) {
      // Remove the loading message if there was an error
      setMessages((prev) => prev.filter((msg) => msg.content !== "Flappy is thinking..."));
      
      toast({
        title: "Message Failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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

            <Card className="max-w-3xl mx-auto">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage src="/assets/flappy.svg" alt="Flappy" />
                    <AvatarFallback>F</AvatarFallback>
                  </Avatar>
                  <span>Flappy</span>
                </CardTitle>
                <CardDescription>
                  Every conversation is saved as a journal entry to help you reflect on your thoughts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="flex flex-col space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.type === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-4 py-3 ${
                            message.type === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {message.content === "Flappy is thinking..." ? (
                            <div className="flex items-center">
                              <span>{message.content}</span>
                              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                            </div>
                          ) : (
                            <>
                              <div className="whitespace-pre-wrap">{message.content}</div>
                              <div
                                className={`text-xs mt-1 ${
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
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="w-full space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex space-x-2">
                              <Textarea
                                placeholder="Type your message here..."
                                className="flex-1 min-h-[80px]"
                                {...field}
                                disabled={isSubmitting}
                              />
                              <Button
                                type="submit"
                                size="icon"
                                className="h-10 mt-auto"
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                                <span className="sr-only">Send</span>
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardFooter>
            </Card>

            <div className="mt-8 max-w-3xl mx-auto p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Other ways to chat with Flappy:</h3>
              <ul className="list-disc ml-5 space-y-2">
                <li>
                  Email <span className="font-medium">flappy@featherweight.app</span> anytime
                </li>
                <li>Reply to any daily inspiration email from Flappy</li>
                {user?.isPremium && (
                  <li>
                    Send SMS messages to Flappy if you've added your phone number in settings
                  </li>
                )}
              </ul>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    </>
  );
}