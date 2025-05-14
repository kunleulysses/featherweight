import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, X } from "lucide-react";

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await apiRequest("PATCH", "/api/user/subscription", {
        isPremium: true,
        premiumUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });

      if (!res.ok) {
        throw new Error("Failed to update subscription");
      }

      await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Subscription activated",
        description: "Welcome to Featherweight Premium! You now have access to all premium features.",
      });
      
      // Navigate back to the journal page
      navigate("/journal");
    } catch (error) {
      toast({
        title: "Subscription failed",
        description: error instanceof Error ? error.message : "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Premium Subscription - Featherweight</title>
        <meta name="description" content="Upgrade to Featherweight Premium and unlock advanced features like SMS journaling, advanced insights, and more." />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow py-12 bg-background">
          <Container>
            <div className="max-w-3xl mx-auto mb-8">
              <h1 className="font-quicksand font-bold text-4xl mb-3 text-center">Upgrade to Premium</h1>
              <p className="text-foreground/70 text-center mb-8">
                Enhance your journaling experience with Flappy
              </p>
              
              <div className="grid md:grid-cols-2 gap-8 mt-8">
                {/* Free Tier */}
                <Card className="border-2 border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="font-quicksand text-2xl">Free</CardTitle>
                    <CardDescription>
                      Essential journaling
                    </CardDescription>
                    <div className="mt-4 text-2xl font-semibold">
                      $0
                      <span className="text-base font-normal text-muted-foreground ml-1">forever</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <Check className="mr-2 h-5 w-5 mt-0.5 text-green-500" />
                        <span>Daily email inspiration from Flappy</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-5 w-5 mt-0.5 text-green-500" />
                        <span>Email-based journaling</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-5 w-5 mt-0.5 text-green-500" />
                        <span>Journal dashboard</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-5 w-5 mt-0.5 text-green-500" />
                        <span>Basic mood tracking</span>
                      </li>
                      <li className="flex items-start text-muted-foreground">
                        <X className="mr-2 h-5 w-5 mt-0.5 text-red-400" />
                        <span>SMS journaling</span>
                      </li>
                      <li className="flex items-start text-muted-foreground">
                        <X className="mr-2 h-5 w-5 mt-0.5 text-red-400" />
                        <span>Weekly insights & reports</span>
                      </li>
                      <li className="flex items-start text-muted-foreground">
                        <X className="mr-2 h-5 w-5 mt-0.5 text-red-400" />
                        <span>Advanced mood analytics</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  </CardFooter>
                </Card>
                
                {/* Premium Tier */}
                <Card className="border-2 border-primary relative">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground py-1 px-3 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                  <CardHeader className="pb-4">
                    <CardTitle className="font-quicksand text-2xl">Premium</CardTitle>
                    <CardDescription>
                      Complete journaling experience
                    </CardDescription>
                    <div className="mt-4 text-2xl font-semibold">
                      $4.99
                      <span className="text-base font-normal text-muted-foreground ml-1">per month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <Check className="mr-2 h-5 w-5 mt-0.5 text-green-500" />
                        <span>Everything in Free tier</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-5 w-5 mt-0.5 text-green-500" />
                        <span><strong>SMS journaling</strong> with Flappy</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-5 w-5 mt-0.5 text-green-500" />
                        <span>Weekly personalized insights</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-5 w-5 mt-0.5 text-green-500" />
                        <span>Advanced mood analytics & trends</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-5 w-5 mt-0.5 text-green-500" />
                        <span>Priority support</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-5 w-5 mt-0.5 text-green-500" />
                        <span>Journal data export</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-5 w-5 mt-0.5 text-green-500" />
                        <span>Early access to new features</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={handleSubscribe} 
                      className="w-full font-quicksand" 
                      disabled={isProcessing || user?.isPremium}
                    >
                      {isProcessing 
                        ? "Processing..." 
                        : user?.isPremium 
                          ? "Current Plan" 
                          : "Upgrade Now"}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
              
              <div className="mt-10 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Money Back Guarantee</h3>
                <p className="text-sm text-muted-foreground">
                  Not satisfied with Premium? Cancel within 7 days and get a full refund, no questions asked.
                </p>
              </div>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    </>
  );
}