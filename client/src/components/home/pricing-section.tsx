import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export function PricingSection() {
  const { user } = useAuth();
  
  const pricingPlans = [
    {
      name: "Free Tier",
      description: "Start your journaling journey",
      price: "$0",
      period: "/month",
      features: [
        "Daily inspiration from Flappy",
        "Unlimited journal entries via email",
        "7-day journal history",
        "Basic email responses"
      ],
      buttonText: "Start Free",
      buttonVariant: "outline" as const,
      highlight: false,
      borderClass: "border-border"
    },
    {
      name: "Premium",
      description: "Full Flappy experience",
      price: "$4.99",
      period: "/month",
      features: [
        "Everything in Free Tier",
        "SMS journaling with Flappy",
        "Unlimited journal history",
        "Custom journal tags and search",
        "Weekly personalized insights",
        "Priority response times",
        "Ad-free experience"
      ],
      buttonText: "Get Premium",
      buttonVariant: "default" as const,
      highlight: true,
      borderClass: "border-2 border-primary"
    }
  ];

  return (
    <section className="py-16 bg-primary/5">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-foreground mb-4">
            Simple Pricing, More Flappy
          </h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            Start free or upgrade for the full pelican experience. No complicated tiers!
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <div 
              key={index} 
              className={`relative ${plan.highlight ? 'transform transition-transform -translate-y-4' : ''}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-quicksand font-medium">
                  Most Popular
                </div>
              )}
              
              <Card 
                className={`h-full ${plan.borderClass} ${
                  plan.highlight ? 'shadow-xl hover:shadow-lg' : 'shadow-md hover:shadow-lg'
                } transition-shadow`}
              >
                <CardContent className="p-6">
                  <h3 className="font-quicksand font-bold text-2xl text-foreground mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-foreground/70 mb-4">
                    {plan.description}
                  </p>
                  <div className="mb-6">
                    <span className="font-quicksand font-bold text-4xl text-foreground">{plan.price}</span>
                    <span className="text-foreground/60">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="text-accent h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
                        <span className="text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={user ? "/settings" : "/auth"}>
                    <Button 
                      variant={plan.buttonVariant} 
                      className="w-full font-quicksand font-medium"
                    >
                      {plan.buttonText}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
