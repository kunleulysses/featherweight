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
import { Check, X, CreditCard, Loader2 } from "lucide-react";
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
import type { StripeElementsOptions } from "@stripe/stripe-js";

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// The CheckoutForm component handles Stripe payment submission
function CheckoutForm({ success }: { success: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
  }, [stripe, success]);

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
    // your `return_url`.
    if (error.type === "card_error" || error.type === "validation_error") {
      setMessage(error.message || "An unexpected error occurred.");
    } else {
      setMessage("An unexpected error occurred.");
    }

    setIsLoading(false);
  };

  const isUpdateMode = window.location.search.includes('updatePayment=true');

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement id="payment-element" />
      <Button 
        disabled={isLoading || !stripe || !elements} 
        className="w-full mt-4"
        type="submit"
      >
        {isLoading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
        ) : (
          isUpdateMode ? "Update Payment Method" : "Subscribe Now - $4.99/month"
        )}
      </Button>
      {/* Show any error or success messages */}
      {message && <div id="payment-message" className="mt-4 text-sm text-red-500">{message}</div>}
    </form>
  );
}

// Main subscription page component
export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [clientSecret, setClientSecret] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  
  useEffect(() => {
    // Check URL for update payment mode
    const searchParams = new URLSearchParams(window.location.search);
    setIsUpdateMode(searchParams.get('updatePayment') === 'true');
    
    // Check for success parameter in URL
    if (searchParams.get('success') === 'true') {
      // Payment was successful, update user subscription
      completeSubscription();
    }
  }, []);

  // Function to update the subscription after successful payment
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
        title: isUpdateMode ? "Payment method updated" : "Subscription activated",
        description: isUpdateMode 
          ? "Your payment method has been successfully updated."
          : "Welcome to Featherweight Premium! You now have access to all premium features, including SMS journaling.",
      });
      
      // Navigate to appropriate page after completion
      navigate(isUpdateMode ? "/billing" : "/sms");
    } catch (error) {
      console.error("Error completing subscription:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  // Function to initiate the subscription process
  const handleStartSubscription = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (user?.isPremium && !isUpdateMode) {
      toast({
        title: "Already subscribed",
        description: "You're already on the Premium plan.",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create subscription payment intent on server
      const endpoint = isUpdateMode ? "/api/update-payment-method" : "/api/create-subscription";
      const response = await apiRequest("POST", endpoint, {});
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to process request");
      }
      
      const data = await response.json();
      setClientSecret(data.clientSecret);
      setShowPaymentForm(true);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Stripe Elements appearance configuration
  const appearance: any = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#4f46e5',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  };

  // Options for the Stripe Elements
  const options: StripeElementsOptions = {
    clientSecret,
    appearance,
  };

  return (
    <>
      <Helmet>
        <title>
          {isUpdateMode 
            ? "Update Payment Method - Featherweight" 
            : "Premium Subscription - Featherweight"}
        </title>
        <meta 
          name="description" 
          content={isUpdateMode
            ? "Update your payment method for your Featherweight Premium subscription."
            : "Upgrade to Featherweight Premium and unlock advanced features like SMS journaling, advanced insights, and more."}
        />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow py-12 bg-background">
          <Container>
            <div className="max-w-3xl mx-auto mb-8">
              <h1 className="font-quicksand font-bold text-4xl mb-3 text-center">
                {isUpdateMode 
                  ? "Update Payment Method" 
                  : "Upgrade to Premium"}
              </h1>
              <p className="text-foreground/70 text-center mb-8">
                {isUpdateMode
                  ? "Update your card information for your Premium subscription"
                  : "Enhance your journaling experience with Flappy"}
              </p>
              
              {/* Show payment update form or subscription options based on URL parameter */}
              {isUpdateMode ? (
                <div className="max-w-md mx-auto bg-background border border-border rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-medium mb-4">Update Payment Method</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Your subscription will continue with the new payment method.
                    Your billing date will remain the same.
                  </p>
                  
                  {clientSecret ? (
                    <Elements stripe={stripePromise} options={options}>
                      <CheckoutForm success={() => navigate('/billing?updated=true')} />
                    </Elements>
                  ) : (
                    <div className="flex flex-col space-y-4">
                      <Button 
                        onClick={handleStartSubscription}
                        disabled={isLoading}
                        className="w-full"
                      >
                        {isLoading ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                        ) : (
                          "Update Payment Method"
                        )}
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={() => navigate('/billing')}
                        className="w-full"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <>
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
                          <li className="flex items-start text-muted-foreground">
                            <X className="mr-2 h-5 w-5 mt-0.5 text-red-400" />
                            <span>Ad-free experience</span>
                          </li>
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" className="w-full" disabled>
                          {user?.isPremium ? "Free Plan" : "Current Plan"}
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
                            <span>Everything in Free, plus:</span>
                          </li>
                          <li className="flex items-start">
                            <Check className="mr-2 h-5 w-5 mt-0.5 text-green-500" />
                            <span><strong>Ad-free experience</strong></span>
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
                            <span>Advanced mood analytics</span>
                          </li>
                          <li className="flex items-start">
                            <Check className="mr-2 h-5 w-5 mt-0.5 text-green-500" />
                            <span>Priority support</span>
                          </li>
                          <li className="flex items-start">
                            <Check className="mr-2 h-5 w-5 mt-0.5 text-green-500" />
                            <span>Cancel anytime</span>
                          </li>
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          className="w-full"
                          onClick={handleStartSubscription}
                          disabled={isLoading || user?.isPremium}
                        >
                          {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                          ) : user?.isPremium ? (
                            "Current Plan"
                          ) : (
                            "Subscribe Now"
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                  
                  {showPaymentForm && clientSecret && (
                    <Card className="mt-8 border-2 border-primary">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <CreditCard className="mr-2 h-5 w-5" />
                          Payment Information
                        </CardTitle>
                        <CardDescription>
                          You'll be charged $4.99 today and on the same day each month.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Elements stripe={stripePromise} options={options}>
                          <CheckoutForm success={completeSubscription} />
                        </Elements>
                        <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                          <p className="font-semibold mb-1">Test Card Information:</p>
                          <p>Card number: 4242 4242 4242 4242</p>
                          <p>Expiry date: Any future date</p>
                          <p>CVC: Any 3 digits</p>
                          <p>ZIP: Any 5 digits</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    </>
  );
}