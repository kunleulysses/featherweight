import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Shield, CheckCircle, Clock, CreditCard, Wallet, Calendar, ArrowRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Helmet } from 'react-helmet';

export default function BillingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const isPremium = user?.isPremium || false;
  const premiumUntil = user?.premiumUntil ? new Date(user.premiumUntil) : null;
  const [activeTab, setActiveTab] = useState("subscription");

  const handleSubscriptionChange = async (upgrade: boolean) => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      if (upgrade) {
        // Navigate to payment page for subscription
        window.location.href = '/subscription';
        return;
      } else {
        // Use the dedicated cancel subscription endpoint
        const res = await apiRequest("POST", "/api/cancel-subscription", {});

        if (!res.ok) {
          throw new Error("Failed to cancel subscription");
        }

        const data = await res.json();
        
        // Update the UI with the new user data
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        
        // Get the formatted date for the end of subscription
        const accessUntil = data.accessUntil ? new Date(data.accessUntil) : null;
        const formattedDate = accessUntil ? formatDate(accessUntil) : "the end of your billing period";
        
        toast({
          title: "Subscription Cancelled",
          description: `Your subscription has been cancelled. You'll have access until ${formattedDate}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Function to update payment method
  const handleUpdatePaymentMethod = () => {
    window.location.href = '/subscription?updatePayment=true';
  };
  
  // Format date as Month DD, YYYY
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <>
      <Helmet>
        <title>Billing & Subscription - Featherweight</title>
        <meta name="description" content="Manage your Featherweight subscription and billing details" />
      </Helmet>

      <Header />
      
      <main className="py-12 min-h-screen bg-background">
        <Container>
          <div className="mb-8">
            <h1 className="font-quicksand font-bold text-3xl mb-2">Billing & Subscription</h1>
            <p className="text-foreground/70">
              Manage your subscription plan and payment details
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="mb-8">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
                <TabsTrigger value="payment-history">Payment History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="subscription" className="space-y-8 mt-6">
              {/* Current Plan */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl flex items-center gap-2">
                    {isPremium ? (
                      <>
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        <span>Premium Plan</span>
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <span>Free Plan</span>
                      </>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {isPremium 
                      ? "You're currently on the Premium plan with all features unlocked"
                      : "You're currently on the Free plan with limited features"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {isPremium && premiumUntil && (
                      <div className="flex items-start gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">Your subscription renews on {formatDate(premiumUntil)}</p>
                          <p className="text-muted-foreground">You will be charged $4.99 on this date</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-sm">
                      <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">Payment Method</p>
                        <p className="text-muted-foreground">
                          {isPremium ? "Visa ending in 4242" : "No payment method on file"}
                        </p>
                      </div>
                      {isPremium && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleUpdatePaymentMethod}
                        >
                          Update
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-6">
                  {isPremium ? (
                    <Button 
                      variant="outline" 
                      className="ml-auto"
                      disabled={isUpdating}
                      onClick={() => handleSubscriptionChange(false)}
                    >
                      {isUpdating ? "Processing..." : "Cancel Subscription"}
                    </Button>
                  ) : (
                    <Button 
                      className="ml-auto"
                      disabled={isUpdating}
                      onClick={() => handleSubscriptionChange(true)}
                    >
                      {isUpdating ? "Processing..." : "Upgrade to Premium"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
              
              {/* Plan Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Plan Comparison</CardTitle>
                  <CardDescription>
                    Compare features between Free and Premium plans
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1"></div>
                    <div className="col-span-1 text-center">
                      <h3 className="font-medium text-lg mb-1">Free</h3>
                      <p className="text-muted-foreground">$0/month</p>
                    </div>
                    <div className="col-span-1 text-center">
                      <h3 className="font-medium text-lg mb-1 text-primary">Premium</h3>
                      <p className="text-primary">$4.99/month</p>
                    </div>
                    
                    {/* Features */}
                    <div className="col-span-3 my-4 border-t pt-4"></div>
                    
                    {/* Email Journaling */}
                    <div className="col-span-1">
                      <p className="font-medium">Email Journaling</p>
                      <p className="text-sm text-muted-foreground">Journal via email conversations with Flappy</p>
                    </div>
                    <div className="col-span-1 text-center">
                      <CheckCircle className="h-5 w-5 mx-auto text-green-500" />
                    </div>
                    <div className="col-span-1 text-center">
                      <CheckCircle className="h-5 w-5 mx-auto text-green-500" />
                    </div>
                    
                    {/* Web Interface */}
                    <div className="col-span-1">
                      <p className="font-medium">Web Interface</p>
                      <p className="text-sm text-muted-foreground">Access and manage your journals online</p>
                    </div>
                    <div className="col-span-1 text-center">
                      <CheckCircle className="h-5 w-5 mx-auto text-green-500" />
                    </div>
                    <div className="col-span-1 text-center">
                      <CheckCircle className="h-5 w-5 mx-auto text-green-500" />
                    </div>
                    
                    {/* SMS Journaling */}
                    <div className="col-span-1">
                      <p className="font-medium">SMS Journaling</p>
                      <p className="text-sm text-muted-foreground">Journal via text messages with Flappy</p>
                    </div>
                    <div className="col-span-1 text-center text-muted-foreground">
                      ✕
                    </div>
                    <div className="col-span-1 text-center">
                      <CheckCircle className="h-5 w-5 mx-auto text-green-500" />
                    </div>
                    
                    {/* Ad-Free Experience */}
                    <div className="col-span-1">
                      <p className="font-medium font-bold">100% Ad-Free Experience</p>
                      <p className="text-sm text-muted-foreground">No advertisements or sponsored content, ever</p>
                    </div>
                    <div className="col-span-1 text-center text-muted-foreground">
                      ✕
                    </div>
                    <div className="col-span-1 text-center">
                      <CheckCircle className="h-5 w-5 mx-auto text-green-500" />
                    </div>
                    
                    {/* Advanced Insights */}
                    <div className="col-span-1">
                      <p className="font-medium">Advanced Insights</p>
                      <p className="text-sm text-muted-foreground">In-depth analysis of your journaling patterns</p>
                    </div>
                    <div className="col-span-1 text-center text-muted-foreground">
                      ✕
                    </div>
                    <div className="col-span-1 text-center">
                      <CheckCircle className="h-5 w-5 mx-auto text-green-500" />
                    </div>
                    
                    {/* Priority Support */}
                    <div className="col-span-1">
                      <p className="font-medium">Priority Support</p>
                      <p className="text-sm text-muted-foreground">Get help faster when you need it</p>
                    </div>
                    <div className="col-span-1 text-center text-muted-foreground">
                      ✕
                    </div>
                    <div className="col-span-1 text-center">
                      <CheckCircle className="h-5 w-5 mx-auto text-green-500" />
                    </div>
                  </div>
                </CardContent>
                {!isPremium && (
                  <CardFooter className="border-t pt-6 flex justify-center">
                    <Button onClick={() => handleSubscriptionChange(true)} disabled={isUpdating}>
                      {isUpdating ? "Processing..." : "Upgrade to Premium"} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>
            
            <TabsContent value="payment-history">
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>
                    View your recent payments and receipts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isPremium ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground mt-1" />
                          <div>
                            <p className="font-medium">Premium Subscription</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">$4.99</p>
                          <p className="text-sm text-green-600">Paid</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <Wallet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <h3 className="text-lg font-medium mb-1">No payment history</h3>
                      <p className="text-muted-foreground">
                        You don't have any payment history yet. Upgrade to Premium to get started.
                      </p>
                      <Button className="mt-4" onClick={() => {
                        setActiveTab("subscription");
                        setTimeout(() => handleSubscriptionChange(true), 100);
                      }}>
                        Upgrade Now
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            </Tabs>
          </div>
        </Container>
      </main>
      
      <Footer />
    </>
  );
}