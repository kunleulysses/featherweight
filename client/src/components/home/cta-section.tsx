import { useState } from "react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export function CTASection() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Thanks for your interest!",
        description: "Redirecting you to create your account.",
      });
      navigate("/auth", { replace: true });
    }, 1000);
  };

  if (user) {
    return (
      <section className="py-16 bg-gradient-to-r from-primary to-primary/80 text-white">
        <Container className="text-center">
          <h2 className="font-quicksand font-bold text-3xl md:text-4xl mb-6">
            Ready to Start Journaling with Flappy?
          </h2>
          <p className="text-lg text-white/90 max-w-2xl mx-auto mb-8">
            Head over to your journal and begin your journey of self-discovery and reflection.
          </p>
          <Link href="/journal">
            <Button 
              variant="secondary"
              size="lg"
              className="font-quicksand font-medium text-foreground">
              Go to My Journal
            </Button>
          </Link>
        </Container>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-r from-primary to-primary/80 text-white">
      <Container className="text-center">
        <h2 className="font-quicksand font-bold text-3xl md:text-4xl mb-6">
          Begin Your Journey with Flappy Today
        </h2>
        <p className="text-lg text-white/90 max-w-2xl mx-auto mb-8">
          Join thousands of journalers who've found wisdom, joy, and self-discovery through Featherweight's unique email companion.
        </p>
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-[0.75rem] p-1 flex">
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-transparent flex-1 px-4 py-3 text-white placeholder-white/70 outline-none rounded-l-[0.75rem] border-transparent focus:border-transparent focus:ring-0"
            />
            <Button 
              type="submit" 
              disabled={loading} 
              className="bg-white text-primary hover:bg-white/90 font-quicksand font-medium rounded-[0.75rem]"
            >
              {loading ? "Processing..." : "Get Started"}
            </Button>
          </div>
          <p className="text-sm text-white/70 mt-3">
            No credit card required. Start with our free Hatchling plan.
          </p>
        </form>
      </Container>
    </section>
  );
}
