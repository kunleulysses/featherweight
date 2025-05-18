import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Send, Info, BookOpen, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import flappyAvatarPath from "@assets/August9teen_a_funny_pelican_mascot_logo_for_an_ai_agent_super_683392fe-ba8f-4dd9-a789-d9c339b36d02_3.png";

export default function ConversationCenterPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("conversation");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Load previous conversations
    const loadConversations = async () => {
      try {
        const response = await apiRequest("GET", "/api/conversation");
        if (response.ok) {
          const data = await response.json();
          setConversations(data);
        }
      } catch (error) {
        console.error("Failed to load conversations:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadConversations();
  }, []);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    setIsSending(true);
    
    try {
      const response = await apiRequest("POST", "/api/conversation", {
        content: message,
        save_as_journal: activeTab === "journal"
      });
      
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      
      const data = await response.json();
      
      // Add the new exchange to the conversation list
      setConversations(prev => [data, ...prev]);
      
      toast({
        title: activeTab === "journal" ? "Journal Entry Created" : "Message Sent",
        description: activeTab === "journal" 
          ? "Your journal entry has been saved and Flappy has responded."
          : "Flappy has responded to your message.",
      });
      
      setMessage("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };
  
  const saveAsJournal = async (conversationId: number) => {
    try {
      const response = await apiRequest("POST", `/api/conversation/${conversationId}/save-journal`);
      
      if (!response.ok) {
        throw new Error("Failed to save as journal");
      }
      
      toast({
        title: "Saved to Journal",
        description: "This conversation has been saved to your journal.",
      });
      
      // Update the conversation in the list
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, saved_as_journal: true } 
            : conv
        )
      );
      
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
    }
  };
  
  if (!user) {
    return (
      <>
        <Helmet>
          <title>Conversation Center - Featherweight</title>
        </Helmet>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow py-8 bg-background">
            <Container>
              <div className="mb-8">
                <h1 className="font-quicksand font-bold text-3xl mb-2">Conversation Center</h1>
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
        <title>Conversation Center - Featherweight</title>
        <meta 
          name="description" 
          content="Chat with Flappy and journal your thoughts in our conversation center."
        />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow py-4 md:py-8 bg-background">
          <Container>
            <div className="mb-8">
              <h1 className="font-quicksand font-bold text-3xl mb-2">Conversation Center</h1>
              <p className="text-foreground/70">
                Chat with Flappy and journal your thoughts
              </p>
            </div>
            
            <Alert className="mb-6 bg-primary/10 border-primary/50">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle>Email Reliability</AlertTitle>
              <AlertDescription>
                While we work on improving our email delivery system, you can use this conversation center to chat with Flappy directly.
                All the same features are available, and you can still save your conversations as journal entries.
              </AlertDescription>
            </Alert>
            
            <Card className="mb-8">
              <CardHeader>
                <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="conversation">Conversation</TabsTrigger>
                    <TabsTrigger value="journal">Journal Entry</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <div>
                    <Textarea
                      placeholder={activeTab === "journal" 
                        ? "Write a journal entry and get Flappy's insights..." 
                        : "Send a message to Flappy..."}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[150px] resize-y"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={isSending || !message.trim()}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {isSending ? "Sending..." : (activeTab === "journal" ? "Save & Send" : "Send")}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            
            <h2 className="text-2xl font-semibold mb-4">Recent Conversations</h2>
            
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : conversations.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start chatting with Flappy to see your conversations here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {conversations.map((conversation) => (
                  <Card key={conversation.id} className={conversation.saved_as_journal ? "border-primary/40" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <img src={flappyAvatarPath} alt="Flappy" className="w-10 h-10 rounded-full object-cover" />
                          <div>
                            <CardTitle className="text-lg">Conversation with Flappy</CardTitle>
                            <CardDescription>
                              {new Date(conversation.created_at).toLocaleDateString()} • 
                              {conversation.saved_as_journal ? " Saved to Journal" : " Conversation"}
                            </CardDescription>
                          </div>
                        </div>
                        
                        {!conversation.saved_as_journal && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => saveAsJournal(conversation.id)}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save to Journal
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <p className="font-medium text-sm text-muted-foreground mb-1">You</p>
                          <p>{conversation.user_message}</p>
                        </div>
                        <div className="bg-primary/10 p-3 rounded-lg">
                          <p className="font-medium text-sm text-primary mb-1">Flappy</p>
                          <p>{conversation.flappy_response}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </Container>
        </main>
        <Footer />
      </div>
    </>
  );
}