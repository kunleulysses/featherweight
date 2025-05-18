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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Send, Inbox, RefreshCw, Eye } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import flappyAvatarPath from "@assets/August9teen_a_funny_pelican_mascot_logo_for_an_ai_agent_super_683392fe-ba8f-4dd9-a789-d9c339b36d02_3.png";

export default function EmailTestPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [emailContent, setEmailContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [responseInfo, setResponseInfo] = useState<string | null>(null);
  const [responseDetails, setResponseDetails] = useState<Record<string, any> | null>(null);
  const [testType, setTestType] = useState<"simulate" | "request" | "preview" | "incoming">("simulate");
  const [isRequestingInspiration, setIsRequestingInspiration] = useState(false);
  const [previewContent, setPreviewContent] = useState("Hello from Flappy! This is an example of how my emails look with the new design. You can see that I'm using a larger font size (18px) for better readability and have a nicer overall design with soft shadows and rounded corners.\n\nI'm here to help you journal and reflect on your thoughts. Just reply to any of my emails, and I'll respond with thoughtful insights!");

  const handleSimulateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailContent.trim()) return;

    setIsSending(true);
    setResponseInfo(null);
    setResponseDetails(null);
    
    try {
      const response = await apiRequest("POST", "/api/emails/simulate-reply", { 
        content: emailContent,
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || "Failed to simulate email");
      }

      toast({
        title: "Email simulated",
        description: "Your test email was processed successfully. Check your real email for a response from Flappy!",
      });

      setResponseInfo("Test email processed! Check your inbox for Flappy's response.");
      setResponseDetails(responseData);
      setEmailContent("");
    } catch (error) {
      toast({
        title: "Failed to simulate email",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
      setResponseInfo("Error: " + (error instanceof Error ? error.message : "Something went wrong"));
    } finally {
      setIsSending(false);
    }
  };

  const handleRequestInspiration = async () => {
    setIsRequestingInspiration(true);
    setResponseInfo(null);
    setResponseDetails(null);
    
    try {
      const response = await apiRequest("POST", "/api/emails/request-inspiration");
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || "Failed to request inspiration");
      }

      toast({
        title: "Inspiration requested",
        description: "Flappy is sending you an inspiration email. Check your inbox!",
      });

      setResponseInfo("Inspiration email sent! Check your inbox for Flappy's message.");
      setResponseDetails(responseData);
    } catch (error) {
      toast({
        title: "Failed to request inspiration",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
      setResponseInfo("Error: " + (error instanceof Error ? error.message : "Something went wrong"));
    } finally {
      setIsRequestingInspiration(false);
    }
  };

  const testWebhook = async () => {
    setIsSending(true);
    setResponseInfo("Testing webhook...");
    
    try {
      // Create a simple test webhook request to check if the endpoint is properly configured
      const testData = {
        from: user?.email || "test@example.com",
        to: "flappy@featherweight.world",
        subject: "Webhook Test",
        text: "This is a test of the webhook endpoint.",
        html: "<p>This is a test of the webhook endpoint.</p>",
        headers: {
          "In-Reply-To": ""
        }
      };
      
      const response = await apiRequest("POST", "/api/emails/webhook", testData);
      
      if (response.ok) {
        setResponseInfo("Webhook test received by server! Check server logs for details.");
        toast({
          title: "Webhook test sent",
          description: "The test webhook was received by the server. This doesn't guarantee emails will work, but confirms the endpoint is functioning.",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Webhook test failed");
      }
    } catch (error) {
      toast({
        title: "Webhook test failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
      setResponseInfo("Error: " + (error instanceof Error ? error.message : "Something went wrong"));
    } finally {
      setIsSending(false);
    }
  };
  
  // Test incoming email handler with direct API call
  const [incomingFrom, setIncomingFrom] = useState(user?.email || "");
  const [incomingSubject, setIncomingSubject] = useState("Test Reply to Flappy");
  const [incomingContent, setIncomingContent] = useState("Hi Flappy, this is a test message to see if you reply back to me!");
  
  const handleTestIncomingEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSending(true);
    setResponseInfo("Processing test email...");
    setResponseDetails(null);
    
    try {
      const response = await apiRequest("POST", "/api/emails/test-incoming", {
        from: incomingFrom,
        to: "flappy@featherweight.world",
        subject: incomingSubject,
        content: incomingContent
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResponseInfo("Test email processed successfully! Check your inbox for Flappy's response.");
        setResponseDetails(data);
        
        toast({
          title: "Email Processed",
          description: "Flappy should be sending a response to your email address soon!",
        });
      } else {
        throw new Error(data.message || "Failed to process test email");
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
      setResponseInfo("Error: " + (error instanceof Error ? error.message : "Something went wrong"));
    } finally {
      setIsSending(false);
    }
  };

  if (!user) {
    return (
      <>
        <Helmet>
          <title>Email Test - Featherweight</title>
        </Helmet>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow py-8 bg-background">
            <Container>
              <div className="mb-8">
                <h1 className="font-quicksand font-bold text-3xl mb-2">Email Test</h1>
                <p className="text-foreground/70">
                  Please log in to test Flappy's email response
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
        <title>Email Test - Featherweight</title>
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow py-8 bg-background">
          <Container>
            <div className="mb-8">
              <h1 className="font-quicksand font-bold text-3xl mb-2">Email Test</h1>
              <p className="text-foreground/70">
                Test and troubleshoot Flappy's email functionality
              </p>
            </div>
            
            <div className="mb-8 p-6 bg-muted/30 rounded-lg border border-muted">
              <h2 className="text-xl font-semibold mb-4">Email Testing Guide</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">How Email Testing Works</h3>
                  <ul className="space-y-2 list-disc pl-5">
                    <li><strong>Simulate Reply:</strong> Test Flappy's response generation (no actual email sent)</li>
                    <li><strong>Request Inspiration:</strong> Send yourself a real inspiration email</li>
                    <li><strong>Email Preview:</strong> View how Flappy's emails appear in clients</li>
                    <li><strong>Test Reply System:</strong> Simulate replying to Flappy (bypasses email servers)</li>
                  </ul>
                  <p className="mt-4 text-muted-foreground text-sm">
                    <strong>Note:</strong> Direct email replies to Flappy require proper DNS configuration and webhook setup.
                  </p>
                </div>
                <div className="bg-background p-4 rounded-lg border">
                  <h3 className="text-lg font-medium mb-2">Email Flow</h3>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="p-2 bg-primary/10 rounded w-full text-center">User receives email from Flappy</div>
                    <div className="h-6 w-0.5 bg-border"></div>
                    <div className="p-2 bg-primary/10 rounded w-full text-center">User replies to flappy@parse.featherweight.world</div>
                    <div className="h-6 w-0.5 bg-border"></div>
                    <div className="p-2 bg-primary/10 rounded w-full text-center">SendGrid routes reply to our webhook</div>
                    <div className="h-6 w-0.5 bg-border"></div>
                    <div className="p-2 bg-primary/10 rounded w-full text-center">Flappy processes reply and responds</div>
                  </div>
                </div>
              </div>
            </div>
            
            <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertTitle>Important Note</AlertTitle>
              <AlertDescription>
                SendGrid domain verification may take 24-48 hours to fully propagate. 
                If emails aren't working, domain verification might still be pending.
              </AlertDescription>
            </Alert>
            
            <Card className="max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle>Email Testing Tools</CardTitle>
                <CardDescription>
                  Test Flappy's email functionality using these tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={testType} onValueChange={(value) => setTestType(value as "simulate" | "request" | "preview" | "incoming")}>
                  <TabsList className="grid w-full grid-cols-4 mb-4">
                    <TabsTrigger value="simulate">Simulate Email Reply</TabsTrigger>
                    <TabsTrigger value="request">Request Inspiration</TabsTrigger>
                    <TabsTrigger value="preview">Email Preview</TabsTrigger>
                    <TabsTrigger value="incoming">Test Reply System</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="simulate">
                    <form onSubmit={handleSimulateEmail}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="email-content" className="mb-2 block">Test Email Content</Label>
                          <Textarea
                            id="email-content"
                            placeholder="Type your message to Flappy..."
                            className="min-h-[150px]"
                            value={emailContent}
                            onChange={(e) => setEmailContent(e.target.value)}
                          />
                        </div>
                        
                        <div className="flex flex-col gap-2 sm:flex-row sm:gap-0 sm:justify-between">
                          <Button 
                            type="submit" 
                            disabled={isSending || !emailContent.trim()}
                            className="justify-center"
                          >
                            <Send className="mr-2 h-4 w-4" />
                            {isSending ? "Sending..." : "Simulate Email Reply"}
                          </Button>
                          
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={testWebhook}
                            disabled={isSending}
                            className="justify-center"
                          >
                            <Inbox className="mr-2 h-4 w-4" />
                            Test Webhook
                          </Button>
                        </div>
                      </div>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="request">
                    <div className="space-y-4">
                      <p>
                        Request a fresh inspiration email from Flappy. This will send an actual email to your 
                        account ({user.email}).
                      </p>
                      
                      <Button 
                        onClick={handleRequestInspiration}
                        disabled={isRequestingInspiration}
                        className="w-full sm:w-auto"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {isRequestingInspiration ? "Requesting..." : "Request Inspiration Email"}
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="incoming">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-2">Test Email Replies</h3>
                        <p className="text-muted-foreground mb-4">
                          This simulates sending an email to Flappy and receiving a response. It uses the direct API instead of the email service, so it works even if your DNS is not properly configured.
                        </p>
                        
                        <form onSubmit={handleTestIncomingEmail} className="space-y-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <Label htmlFor="incoming-from">Your Email Address</Label>
                              <Input 
                                id="incoming-from" 
                                value={incomingFrom} 
                                onChange={(e) => setIncomingFrom(e.target.value)}
                                placeholder="your-email@example.com"
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="incoming-subject">Subject</Label>
                              <Input 
                                id="incoming-subject" 
                                value={incomingSubject} 
                                onChange={(e) => setIncomingSubject(e.target.value)}
                                placeholder="Subject line"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="incoming-content">Email Content</Label>
                            <Textarea
                              id="incoming-content"
                              value={incomingContent}
                              onChange={(e) => setIncomingContent(e.target.value)}
                              placeholder="Type your message to Flappy..."
                              className="min-h-[150px]"
                              required
                            />
                          </div>
                          
                          <Button 
                            type="submit"
                            disabled={isSending}
                            className="w-full sm:w-auto"
                          >
                            {isSending ? "Processing..." : "Test Email Reply"}
                          </Button>
                        </form>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="preview">
                    <div className="space-y-4">
                      <p className="mb-4">
                        Preview Flappy's redesigned email template with enhanced readability and the pelican avatar image.
                      </p>
                      
                      <div className="mt-6 mb-4">
                        <Label htmlFor="preview-content">Email Content Preview</Label>
                        <Textarea
                          id="preview-content"
                          value={previewContent}
                          onChange={(e) => setPreviewContent(e.target.value)}
                          className="mt-2 min-h-[100px]"
                        />
                      </div>
                      
                      <div className="border rounded-lg overflow-hidden shadow-lg">
                        <div className="p-6 bg-[#ffffff]" style={{ backgroundImage: 'linear-gradient(to bottom, rgba(93, 124, 250, 0.02) 0%, rgba(255, 255, 255, 1) 120px)' }}>
                          <div className="flex items-center mb-8 pb-7 border-b border-[#E0E0E0] relative">
                            <div className="w-[100px] h-[100px] mr-6 overflow-hidden rounded-2xl shadow-md" 
                              style={{ 
                                boxShadow: '0 4px 10px rgba(93, 124, 250, 0.2)', 
                                border: '1px solid rgba(93, 124, 250, 0.1)',
                                padding: '2px'
                              }}>
                              <img 
                                src={flappyAvatarPath} 
                                alt="Flappy the Pelican" 
                                className="w-full h-auto rounded-xl"
                              />
                            </div>
                            <div>
                              <h1 className="font-quicksand font-bold text-3xl text-[#5D7CFA] m-0" style={{ textShadow: '0 1px 1px rgba(93, 124, 250, 0.1)' }}>
                                Flappy
                                {user?.isPremium && (
                                  <span className="ml-3 bg-[#8b5cf6] text-white text-xs px-4 py-1 rounded-full align-middle font-semibold shadow-md uppercase" 
                                    style={{ 
                                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
                                      boxShadow: '0 3px 6px rgba(139, 92, 246, 0.35)',
                                      letterSpacing: '0.5px'
                                    }}>
                                    Premium
                                  </span>
                                )}
                              </h1>
                              <div className="text-[#64B5F6] text-lg mt-2 font-medium tracking-wide">Your Journaling Companion</div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[rgba(93,124,250,0.2)] via-[rgba(93,124,250,0.6)] to-[rgba(93,124,250,0.2)]"></div>
                          </div>
                          
                          <div className="bg-[#FAFCFF] p-6 rounded-xl mb-6 border border-[rgba(93,124,250,0.08)]" 
                            style={{ 
                              boxShadow: 'inset 0 0 20px rgba(93, 124, 250, 0.03)'
                            }}>
                            {previewContent.split('\n\n').map((paragraph, idx) => (
                              <p 
                                key={idx} 
                                className="text-[#333] text-lg leading-relaxed mb-6 last:mb-0"
                                style={{ lineHeight: 1.8 }}
                              >
                                {paragraph.split('\n').map((line, lineIdx, arr) => (
                                  <span key={lineIdx}>
                                    {lineIdx > 0 && <br />}
                                    {line}
                                    {lineIdx === arr.length - 1 && line.trim().endsWith('?') && 
                                      <span className="text-[#5D7CFA] inline-block ml-1 animate-pulse">▌</span>}
                                  </span>
                                ))}
                              </p>
                            ))}
                          </div>
                          
                          <div className="bg-[#e3f2fd] p-6 rounded-xl my-8 border-l-[5px] border-[#64B5F6] shadow-md relative"
                            style={{ 
                              backgroundImage: 'linear-gradient(to right, rgba(100, 181, 246, 0.08), rgba(255, 255, 255, 0) 80%)',
                              boxShadow: '0 4px 12px rgba(93, 124, 250, 0.1)'
                            }}>
                            <div className="absolute right-5 top-3 text-2xl opacity-50">💡</div>
                            <h3 className="font-quicksand font-semibold text-xl text-[#1565C0] mt-0 mb-3 tracking-wide">
                              Journaling Tip
                            </h3>
                            <p className="m-0 text-base">
                              To turn our conversation into a journal entry, simply include the word{' '}
                              <span className="font-bold text-[#5D7CFA] bg-[#f0f7ff] px-3 py-1 rounded-lg inline-block shadow-sm"
                                style={{
                                  boxShadow: '0 2px 4px rgba(93, 124, 250, 0.15)',
                                  border: '1px solid rgba(93, 124, 250, 0.1)'
                                }}>
                                SAVE
                              </span>{' '}
                              in your reply.
                            </p>
                          </div>
                          
                          <div className="text-center mt-10">
                            <a 
                              href="mailto:flappy@featherweight.world" 
                              className="inline-block bg-[#5D7CFA] text-white font-quicksand font-semibold px-8 py-4 rounded-xl shadow-lg transition-all hover:bg-[#4C6CE7] hover:shadow-xl"
                              style={{ 
                                boxShadow: '0 4px 6px rgba(93, 124, 250, 0.25)'
                              }}
                            >
                              Reply to Flappy
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                
                {responseInfo && (
                  <div className="mt-6">
                    <Separator className="my-4" />
                    <h3 className="font-medium text-lg mb-2">Response</h3>
                    <div className={`p-4 rounded-md ${responseInfo.startsWith("Error") ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                      {responseInfo}
                    </div>
                    
                    {responseDetails && (
                      <div className="mt-4 p-4 rounded-md bg-muted overflow-auto">
                        <h4 className="text-sm font-medium mb-2">Response Details:</h4>
                        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(responseDetails, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="mt-8 max-w-3xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Email Troubleshooting Guide</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">Email Configuration Requirements</h3>
                      <ul className="list-disc pl-6 mt-2 space-y-2">
                        <li><strong>SendGrid API Key:</strong> Ensure SENDGRID_API_KEY environment variable is set</li>
                        <li><strong>Domain Verification:</strong> Domain must be verified in SendGrid (can take 24-48 hours)</li>
                        <li><strong>MX Records:</strong> Should point to mx.sendgrid.net (priority 1)</li>
                        <li><strong>SPF Record:</strong> Should include sendgrid.net (v=spf1 include:sendgrid.net ~all)</li>
                        <li><strong>DKIM:</strong> Should be configured for your domain in SendGrid</li>
                        <li><strong>Inbound Parse Webhook:</strong> Should be configured to point to /api/emails/webhook</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium">Common Issues</h3>
                      <ul className="list-disc pl-6 mt-2 space-y-2">
                        <li>Check your spam/junk folder for Flappy's emails</li>
                        <li>Verify that the FROM_EMAIL (flappy@featherweight.world) is correctly set</li>
                        <li>Make sure the domain has proper reverse DNS records</li>
                        <li>Some email providers might delay delivery of new domain emails</li>
                        <li>If simulated emails work but real emails don't, check Inbound Parse webhook configuration</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium">Testing Steps</h3>
                      <ol className="list-decimal pl-6 mt-2 space-y-2">
                        <li>Use "Simulate Email Reply" to test the email generation and sending functionality</li>
                        <li>Use "Request Inspiration" to test direct email sending</li>
                        <li>Use "Test Webhook" to verify the webhook endpoint is working properly</li>
                        <li>If all tests pass but emails aren't being received, check your email provider's spam filters</li>
                      </ol>
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