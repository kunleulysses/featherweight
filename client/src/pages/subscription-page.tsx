import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Check, X, CreditCard } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useElements, useStripe, PaymentElement, Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render.
// This is your test publishable API key.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function CheckoutForm({ success }: { success: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!stripe) {
      return;
    }

    const clientSecret = new URLSearchParams(window.location.search).get(
      "payment_intent_client_secret"
    );

    if (!clientSecret) {
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent?.status) {
        case "succeeded":
          setMessage("Payment succeeded!");
          success();
          break;
        case "processing":
          setMessage("Your payment is processing.");
          break;
        case "requires_payment_method":
          setMessage("Your payment was not successful, please try again.");
          break;
        default:
          setMessage("Something went wrong.");
          break;
      }
    });
  }, [stripe]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Make sure to change this to your payment completion page
        return_url: window.location.origin + "/subscription?success=true",
      },
    });

    // This point will only be reached if there is an immediate error when
    // confirming the payment. Otherwise, your customer will be redirected to
    // your `return_url`. For some payment methods like iDEAL, your customer will
    // be redirected to an intermediate site first to authorize the payment, then
    // redirected to the `return_url`.
    if (error.type === "card_error" || error.type === "validation_error") {
      setMessage(error.message || "An unexpected error occurred.");
      toast({
        title: "Payment failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } else {
      setMessage("An unexpected error occurred.");
      toast({
        title: "Payment failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement id="payment-element" />
      <Button 
        disabled={isLoading || !stripe || !elements} 
        className="w-full mt-4"
        type="submit"
      >
        {isLoading ? "Processing..." : "Subscribe Now - $4.99/month"}
      </Button>
      {/* Show any error or success messages */}
      {message && <div id="payment-message" className="mt-4 text-sm text-red-500">{message}</div>}
    </form>
  );
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [clientSecret, setClientSecret] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Check for success parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      // Payment was successful, update user subscription
      completeSubscription();
    }
  }, []);

  const completeSubscription = async () => {
    if (!user) return;
    
    try {
      // Update user subscription after payment is processed
      const res = await apiRequest("PATCH", "/api/user/subscription", {
        isPremium: true,
        durationMonths: 1,
      });

      if (!res.ok) {
        throw new Error("Failed to update subscription");
      }

      await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Subscription activated",
        description: "Welcome to Featherweight Premium! You now have access to all premium features, including SMS journaling.",
      });
      
      // Navigate to the SMS page to showcase new premium feature
      navigate("/sms");
    } catch (error) {
      console.error("Error completing subscription:", error);
    }
  };

  const handleStartSubscription = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (user?.isPremium) {
      toast({
        title: "Already subscribed",
        description: "You're already on the Premium plan.",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create subscription payment intent on server
      const response = await apiRequest("POST", "/api/create-subscription", {});
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create subscription");
      }
      
      const data = await response.json();
      setClientSecret(data.clientSecret);
      setShowPaymentForm(true);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start subscription process",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
                      onClick={handleStartSubscription} 
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
              
              {showPaymentForm && (
                <Card className="mt-8 border-2 border-primary">
                  <CardHeader>
                    <CardTitle>Payment Information</CardTitle>
                    <CardDescription>
                      You'll be charged $4.99 today and on the same day each month.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="cardholderName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cardholder Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="John Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="cardNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Card Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="4242 4242 4242 4242" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="expiryMonth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Expiry Month</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                      <SelectItem 
                                        key={month} 
                                        value={month.toString().padStart(2, '0')}
                                      >
                                        {month.toString().padStart(2, '0')}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="expiryYear"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Expiry Year</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                                      <SelectItem key={year} value={year.toString()}>
                                        {year}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="cvv"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CVV</FormLabel>
                                <FormControl>
                                  <Input placeholder="123" {...field} maxLength={4} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <FormField
                            control={form.control}
                            name="billingAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Billing Address</FormLabel>
                                <FormControl>
                                  <Input placeholder="123 Main St" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl>
                                  <Input placeholder="New York" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="state"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>State</FormLabel>
                                <FormControl>
                                  <Input placeholder="NY" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="zipCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Zip Code</FormLabel>
                                <FormControl>
                                  <Input placeholder="10001" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select country" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="US">United States</SelectItem>
                                  <SelectItem value="CA">Canada</SelectItem>
                                  <SelectItem value="UK">United Kingdom</SelectItem>
                                  <SelectItem value="AU">Australia</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex gap-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowPaymentForm(false)}
                            disabled={isProcessing}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            className="flex-1"
                            disabled={isProcessing}
                          >
                            {isProcessing ? "Processing..." : "Subscribe - $4.99/month"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}
              
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