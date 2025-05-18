import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Save, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

// Types based on the Conversation schema
interface Conversation {
  id: number;
  userId: number;
  userMessage: string;
  flappyResponse: string;
  conversationType: string;
  savedAsJournal: boolean;
  messageTags: string[];
  mood: string;
  journalEntryId?: number;
  createdAt: string;
}

function getMoodEmoji(mood: string): string {
  switch (mood) {
    case 'happy': return '😊';
    case 'calm': return '😌';
    case 'sad': return '😢';
    case 'frustrated': return '😤';
    default: return '😐';
  }
}

export default function ConversationCenterPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [asJournal, setAsJournal] = useState(false);
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/direct-conversation"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; save_as_journal: boolean }) => {
      const response = await apiRequest("POST", "/api/direct-conversation", data);
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/direct-conversation"] });
      toast({
        title: "Message sent!",
        description: asJournal 
          ? "Your message has been sent and saved to your journal." 
          : "Your message has been sent to Flappy.",
      });
      setAsJournal(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save to journal mutation
  const saveToJournalMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      const response = await apiRequest("POST", `/api/direct-conversation/${conversationId}/save-journal`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/direct-conversation"] });
      toast({
        title: "Saved to journal!",
        description: "This conversation has been saved to your journal.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save to journal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    sendMessageMutation.mutate({
      content: message,
      save_as_journal: asJournal,
    });
  };

  const handleSaveToJournal = (conversationId: number) => {
    saveToJournalMutation.mutate(conversationId);
  };

  // Scroll to bottom whenever conversations update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversations]);

  if (!user) {
    return (
      <div>
        <Header />
        <Container className="py-8">
          <Card>
            <CardHeader>
              <CardTitle>Sign in required</CardTitle>
              <CardDescription>
                Please sign in to access the Conversation Center.
              </CardDescription>
            </CardHeader>
          </Card>
        </Container>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <Container className="py-8">
        <div className="flex flex-col space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Center</CardTitle>
              <CardDescription>
                Have a direct conversation with Flappy. Type your message below to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <ScrollArea className="h-[450px] pr-4 mb-4">
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col space-y-2">
                          <Skeleton className="h-10 w-3/4 ml-auto" />
                          <Skeleton className="h-24 w-3/4" />
                        </div>
                      ))}
                    </div>
                  ) : conversations && conversations.length > 0 ? (
                    <div className="space-y-6">
                      {conversations.map((conversation) => (
                        <div key={conversation.id} className="flex flex-col space-y-3">
                          <div className="flex flex-col space-y-1">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">
                                  {new Date(conversation.createdAt).toLocaleString()}
                                </Badge>
                                <Badge variant="secondary">
                                  {getMoodEmoji(conversation.mood)} {conversation.mood}
                                </Badge>
                                {conversation.messageTags?.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {conversation.messageTags.map((tag) => (
                                      <Badge key={tag} variant="outline" className="text-xs">
                                        #{tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {!conversation.savedAsJournal && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSaveToJournal(conversation.id)}
                                  className="flex items-center space-x-1"
                                >
                                  <Save className="h-4 w-4" />
                                  <span>Save to Journal</span>
                                </Button>
                              )}
                            </div>
                            <div className="bg-primary-50 p-3 rounded-lg self-end max-w-[80%]">
                              <p className="text-sm text-primary-900 whitespace-pre-wrap">
                                {conversation.userMessage}
                              </p>
                            </div>
                            <div className="bg-primary-100 p-3 rounded-lg self-start max-w-[80%]">
                              <p className="text-sm whitespace-pre-wrap">
                                {conversation.flappyResponse}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-center text-muted-foreground">
                        No conversations yet. Start chatting with Flappy!
                      </p>
                    </div>
                  )}
                </ScrollArea>

                <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What's on your mind? Type your message here..."
                    className="min-h-[100px] resize-none"
                  />
                  <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 sm:space-x-2">
                    <div className="flex items-center space-x-2">
                      <Input
                        type="checkbox"
                        id="save-journal"
                        checked={asJournal}
                        onChange={() => setAsJournal(!asJournal)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="save-journal" className="text-sm">
                        Save this as a journal entry
                      </label>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={!message.trim() || sendMessageMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {sendMessageMutation.isPending ? (
                        "Sending..."
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
      <Footer />
    </div>
  );
}