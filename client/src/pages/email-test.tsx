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

export default function EmailTestPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [emailContent, setEmailContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [responseInfo, setResponseInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailContent.trim()) return;

    setIsSending(true);
    try {
      const response = await apiRequest("POST", "/api/emails/simulate-reply", { 
        content: emailContent,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to simulate email");
      }

      toast({
        title: "Email simulated",
        description: "Your test email was processed successfully. Check your real email for a response from Flappy!",
      });

      setResponseInfo("Test email processed! Check your inbox for Flappy's response.");
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
                Test Flappy's email responses without sending a real email
              </p>
            </div>
            
            <Card className="max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle>Simulate an Email to Flappy</CardTitle>
                <CardDescription>
                  This will send a simulated email from your account ({user.email}) to Flappy and trigger a response.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Textarea
                        placeholder="Type your message to Flappy..."
                        className="min-h-[150px]"
                        value={emailContent}
                        onChange={(e) => setEmailContent(e.target.value)}
                      />
                    </div>
                    
                    {responseInfo && (
                      <div className={`p-4 rounded-md ${responseInfo.startsWith("Error") ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                        {responseInfo}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    disabled={isSending || !emailContent.trim()}
                  >
                    {isSending ? "Sending..." : "Simulate Email"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
            
            <div className="mt-8 max-w-3xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Email Troubleshooting</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">If you're not receiving responses from Flappy:</h3>
                      <ul className="list-disc pl-6 mt-2 space-y-2">
                        <li>Check your spam folder</li>
                        <li>Make sure your SendGrid domain authentication is properly set up</li>
                        <li>Verify the MX records are correctly pointing to SendGrid</li>
                        <li>Confirm the Inbound Parse webhook is configured in SendGrid</li>
                        <li>Check if your email's "Reply-To" address is correctly set to flappy@featherweight.world</li>
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