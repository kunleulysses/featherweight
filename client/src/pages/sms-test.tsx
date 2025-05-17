import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Helmet } from "react-helmet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubscriptionCard } from "@/components/subscription-card";

export default function SmsTestPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [smsContent, setSmsContent] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(user?.preferences?.phoneNumber || "");
  const [isSending, setIsSending] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [responseInfo, setResponseInfo] = useState<string | null>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsContent.trim()) return;

    setIsSending(true);
    try {
      const response = await apiRequest("POST", "/api/sms/send", { 
        content: smsContent,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send SMS");
      }

      toast({
        title: "SMS sent",
        description: "Your message was sent to your registered phone number.",
      });

      setResponseInfo("SMS sent successfully! You should receive it shortly.");
      setSmsContent("");
    } catch (error) {
      toast({
        title: "Failed to send SMS",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
      setResponseInfo("Error: " + (error instanceof Error ? error.message : "Something went wrong"));
    } finally {
      setIsSending(false);
    }
  };

  const handleSimulateIncoming = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsContent.trim()) return;

    setIsSimulating(true);
    try {
      const response = await apiRequest("POST", "/api/sms/simulate-incoming", { 
        content: smsContent,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to simulate incoming SMS");
      }

      toast({
        title: "Incoming SMS simulated",
        description: "Your message was processed as if received from your phone.",
      });

      setResponseInfo("Incoming SMS simulation successful! Check your SMS history.");
      setSmsContent("");
    } catch (error) {
      toast({
        title: "Failed to simulate SMS",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
      setResponseInfo("Error: " + (error instanceof Error ? error.message : "Something went wrong"));
    } finally {
      setIsSimulating(false);
    }
  };

  // If the user is not premium, show a subscription card
  if (!user?.isPremium) {
    return (
      <>
        <Helmet>
          <title>SMS Test - Featherweight</title>
        </Helmet>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow py-8 bg-background">
            <Container>
              <div className="mb-8">
                <h1 className="font-quicksand font-bold text-3xl mb-2">SMS Test</h1>
                <p className="text-foreground/70">
                  SMS functionality is a premium feature
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

  // If the user doesn't have a phone number, show a message to add one
  if (!user?.preferences?.phoneNumber) {
    return (
      <>
        <Helmet>
          <title>SMS Test - Featherweight</title>
        </Helmet>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow py-8 bg-background">
            <Container>
              <div className="mb-8">
                <h1 className="font-quicksand font-bold text-3xl mb-2">SMS Test</h1>
                <p className="text-foreground/70">
                  You need to add your phone number to use SMS features
                </p>
              </div>
              
              <Card className="max-w-3xl mx-auto">
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
        <title>SMS Test - Featherweight</title>
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow py-8 bg-background">
          <Container>
            <div className="mb-8">
              <h1 className="font-quicksand font-bold text-3xl mb-2">SMS Test</h1>
              <p className="text-foreground/70">
                Test Flappy's SMS capabilities with your registered phone number
              </p>
            </div>
            
            <Card className="max-w-3xl mx-auto mb-6">
              <CardHeader>
                <CardTitle>Your SMS Configuration</CardTitle>
                <CardDescription>
                  Review and update your SMS settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="font-medium">Phone Number:</div>
                    <div>{user.preferences?.phoneNumber}</div>
                    <Button asChild variant="outline" size="sm">
                      <a href="/settings">Update</a>
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>You can update your phone number in Settings if needed. All SMS features will use this number.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Send a Test SMS</CardTitle>
                  <CardDescription>
                    This will send an SMS from Flappy to your registered phone number
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSendMessage}>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="content">Message Content</Label>
                        <Textarea
                          id="content"
                          placeholder="Type a message for Flappy to send you..."
                          className="min-h-[120px]"
                          value={smsContent}
                          onChange={(e) => setSmsContent(e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      disabled={isSending || !smsContent.trim()}
                    >
                      {isSending ? "Sending..." : "Send Test SMS"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Simulate Incoming SMS</CardTitle>
                  <CardDescription>
                    This simulates you texting Flappy from your phone
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSimulateIncoming}>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="simContent">Message Content</Label>
                        <Textarea
                          id="simContent"
                          placeholder="Type a message as if you sent it to Flappy..."
                          className="min-h-[120px]"
                          value={smsContent}
                          onChange={(e) => setSmsContent(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Tips: 
                          <br />• Start with "Journal:" to save as a journal entry
                          <br />• Text "SAVE" to convert your recent conversation into a journal entry
                          <br />• Use hashtags like #journal anywhere in your message to create a journal entry
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      disabled={isSimulating || !smsContent.trim()}
                    >
                      {isSimulating ? "Simulating..." : "Simulate Incoming SMS"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </div>
            
            {responseInfo && (
              <div className={`p-4 rounded-md mt-6 max-w-3xl mx-auto ${responseInfo.startsWith("Error") ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                {responseInfo}
              </div>
            )}
            
            <div className="mt-8 max-w-3xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>SMS Troubleshooting</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">For SMS to work properly:</h3>
                      <ul className="list-disc pl-6 mt-2 space-y-2">
                        <li>Make sure your phone number is correct in your user settings</li>
                        <li>Your phone number must be in the international format (+1XXXXXXXXXX for US numbers)</li>
                        <li>The Twilio webhook URL must point to yourdomain.com/api/sms/webhook</li>
                        <li>You can send a message to {process.env.TWILIO_PHONE_NUMBER || "Flappy's phone number"} to start a conversation</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    </>
  );
}