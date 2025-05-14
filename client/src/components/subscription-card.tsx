import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Stars, Check } from "lucide-react";

export function SubscriptionCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Subscribe to premium (simulation for demo purposes)
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/user/subscription", { 
        isPremium: true,
        durationMonths: 1
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to subscribe");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription activated!",
        description: "You now have access to premium features!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Subscription failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubscribe = () => {
    // Redirect to the billing page instead of directly subscribing
    window.location.href = '/billing';
  };

  // If the user is already premium, show a different message
  if (user?.isPremium) {
    return (
      <Card className="border-primary/50">
        <CardHeader>
          <Stars className="h-8 w-8 text-primary mb-2" />
          <CardTitle className="font-quicksand">You're a Premium Member!</CardTitle>
          <CardDescription>
            You have access to all premium features including SMS journaling.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              SMS journaling and conversations with Flappy
            </li>
            <li className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              Daily inspirations via text message
            </li>
            <li className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              Priority support
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            Your subscription will {user.premiumUntil 
              ? `renew on ${new Date(user.premiumUntil).toLocaleDateString()}` 
              : "renew automatically"}
          </p>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Stars className="h-8 w-8 text-primary mb-2" />
        <CardTitle className="font-quicksand">Upgrade to Premium</CardTitle>
        <CardDescription>
          Get access to SMS journaling and more premium features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex items-baseline mb-2">
            <span className="text-3xl font-bold">$4.99</span>
            <span className="text-muted-foreground ml-1">/month</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Cancel anytime. No commitment required.
          </p>
        </div>
        <ul className="space-y-2">
          <li className="flex items-center">
            <Check className="h-4 w-4 text-green-500 mr-2" />
            SMS journaling and conversations with Flappy
          </li>
          <li className="flex items-center">
            <Check className="h-4 w-4 text-green-500 mr-2" />
            Daily inspirations via text message
          </li>
          <li className="flex items-center">
            <Check className="h-4 w-4 text-green-500 mr-2" />
            Priority support
          </li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubscribe} 
          className="w-full" 
          disabled={isSubscribing}
        >
          {isSubscribing ? "Processing..." : "Subscribe Now"}
        </Button>
      </CardFooter>
    </Card>
  );
}