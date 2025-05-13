import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { PhoneOutgoing, PhoneIncoming, PlusCircle, RefreshCw, Send } from "lucide-react";
import { SubscriptionCard } from "@/components/subscription-card";

export default function SmsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Fetch SMS messages
  const { 
    data: messages = [], 
    isLoading,
    isError,
    refetch 
  } = useQuery({
    queryKey: ["/api/sms"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/sms");
        if (!res.ok) {
          throw new Error("Failed to fetch SMS messages");
        }
        return await res.json();
      } catch (error) {
        // The error will be handled by the isError flag
        throw error;
      }
    },
    enabled: !!user?.isPremium && !!user?.preferences?.phoneNumber
  });

  // Request a new daily inspiration SMS
  const requestInspirationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sms/request-inspiration");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to request inspiration");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Inspiration sent",
        description: "Flappy has sent you a fresh inspiration via SMS!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sms"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send SMS",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Send a new SMS message
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/sms/send", { content });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to send message");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "Your message has been sent to Flappy!",
      });
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/sms"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Simulate incoming SMS (for testing)
  const simulateIncomingMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/sms/simulate-incoming", { content });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to simulate message");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Message simulated",
        description: "Your message has been processed as an incoming SMS.",
      });
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/sms"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to simulate message",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    setIsSending(true);
    sendMessageMutation.mutate(newMessage.trim(), {
      onSettled: () => setIsSending(false)
    });
  };

  // If the user is not premium, show a subscription card
  if (!user?.isPremium) {
    return (
      <>
        <Helmet>
          <title>SMS Journaling - Featherweight</title>
          <meta name="description" content="Journal and chat with Flappy via SMS text messages. Premium feature." />
        </Helmet>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow py-8 bg-background">
            <Container>
              <div className="mb-8">
                <h1 className="font-quicksand font-bold text-3xl mb-2">SMS Journaling</h1>
                <p className="text-foreground/70">
                  Text with Flappy and journal from anywhere
                </p>
              </div>
              
              <div className="max-w-3xl mx-auto">
                <SubscriptionCard />
              </div>
            </Container>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  // If the user is premium but doesn't have a phone number, show a message
  if (!user?.preferences?.phoneNumber) {
    return (
      <>
        <Helmet>
          <title>SMS Journaling - Featherweight</title>
          <meta name="description" content="Journal and chat with Flappy via SMS text messages. Premium feature." />
        </Helmet>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow py-8 bg-background">
            <Container>
              <div className="mb-8">
                <h1 className="font-quicksand font-bold text-3xl mb-2">SMS Journaling</h1>
                <p className="text-foreground/70">
                  Text with Flappy and journal from anywhere
                </p>
              </div>
              
              <div className="max-w-3xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Add Your Phone Number</CardTitle>
                    <CardDescription>
                      To use SMS features, please add your phone number in your profile settings.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button asChild>
                      <a href="/settings">Go to Settings</a>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
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
        <title>SMS Journaling - Featherweight</title>
        <meta name="description" content="Journal and chat with Flappy via SMS text messages. Premium feature." />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow py-8 bg-background">
          <Container>
            <div className="mb-8">
              <h1 className="font-quicksand font-bold text-3xl mb-2">SMS Journaling</h1>
              <p className="text-foreground/70">
                Text with Flappy and journal from anywhere
              </p>
            </div>
            
            <div className="max-w-3xl mx-auto">
              <div className="mb-6 flex gap-3 flex-wrap">
                <Button 
                  variant="outline" 
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button 
                  onClick={() => requestInspirationMutation.mutate()}
                  disabled={requestInspirationMutation.isPending}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Get Fresh Inspiration
                </Button>
              </div>

              {isError && (
                <Card className="mb-6 border-destructive">
                  <CardHeader>
                    <CardTitle className="text-destructive">Error loading messages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>There was a problem loading your SMS messages. Please try refreshing the page.</p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
                  </CardFooter>
                </Card>
              )}

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : messages.length === 0 ? (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>No messages yet</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>You haven't exchanged any SMS messages with Flappy yet. Request an inspiration or send a message to get started!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4 mb-6">
                  {messages.map((message: any) => (
                    <Card key={message.id} className={`
                      ${message.direction === "inbound" ? "border-primary/50" : ""}
                    `}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            {message.direction === "inbound" ? (
                              <PhoneIncoming className="mr-2 h-4 w-4 text-blue-500" />
                            ) : (
                              <PhoneOutgoing className="mr-2 h-4 w-4 text-orange-500" />
                            )}
                            <CardTitle className="text-base font-medium">
                              {message.direction === "inbound" ? "Flappy" : "You"}
                            </CardTitle>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.sentAt), { addSuffix: true })}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </CardContent>
                      {message.isJournalEntry && (
                        <CardFooter className="pt-0">
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Saved to Journal
                          </Badge>
                        </CardFooter>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendMessage}>
                <div className="grid gap-3">
                  <Textarea
                    placeholder="Text Flappy... (prefix with 'Journal:' to save as a journal entry)"
                    className="min-h-[80px]"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={isSending || !newMessage.trim()}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {isSending ? "Sending..." : "Send"}
                    </Button>

                    {process.env.NODE_ENV !== "production" && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (!newMessage.trim()) return;
                          simulateIncomingMutation.mutate(newMessage);
                        }}
                        disabled={simulateIncomingMutation.isPending || !newMessage.trim()}
                      >
                        Simulate
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    </>
  );
}