import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquareText, PenLine, Brain, Lightbulb, Feather } from "lucide-react";

export function WelcomeDialog() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Check if this is the first time visiting after registration
  useEffect(() => {
    if (user) {
      const hasSeenWelcome = localStorage.getItem(`welcome-seen-${user.id}`);
      if (!hasSeenWelcome) {
        setOpen(true);
      }
    }
  }, [user]);

  const handleClose = () => {
    if (user) {
      localStorage.setItem(`welcome-seen-${user.id}`, "true");
    }
    setOpen(false);
    setStep(1);
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Request an inspiration email to demonstrate the flow
  const requestInspiration = async () => {
    try {
      await apiRequest("POST", "/api/emails/request-inspiration", {});
      // No need to handle response; we just want to trigger the email
    } catch (error) {
      console.error("Failed to request inspiration:", error);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-quicksand flex items-center">
                <span className="mr-2">👋</span> Welcome to Featherweight!
              </DialogTitle>
              <DialogDescription>
                Your personal journaling companion with Flappy, a cosmic pelican guide.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center my-6 text-center">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-primary flex items-center justify-center mb-4">
                <Feather className="h-16 w-16 md:h-24 md:w-24 text-white" />
              </div>
              <p className="text-lg mb-4">
                Meet Flappy, your journaling companion!
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Flappy is an ancient cosmic pelican with wisdom spanning millennia, ready to help you reflect and grow through journaling.
              </p>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-quicksand flex items-center">
                <Mail className="mr-2 h-5 w-5" /> Email Journaling
              </DialogTitle>
              <DialogDescription>
                Your primary way to interact with Flappy
              </DialogDescription>
            </DialogHeader>
            <div className="my-6">
              <div className="flex items-start mb-4">
                <div className="bg-primary/10 p-2 rounded-full mr-3">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Daily Inspiration</h4>
                  <p className="text-sm text-muted-foreground">
                    Flappy will email you daily thoughts to inspire reflection.
                  </p>
                </div>
              </div>
              <div className="flex items-start mb-4">
                <div className="bg-primary/10 p-2 rounded-full mr-3">
                  <PenLine className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Reply to Journal</h4>
                  <p className="text-sm text-muted-foreground">
                    Simply reply to Flappy's emails or send a new email to <span className="font-medium">flappy@featherweight.world</span> anytime to create journal entries.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-primary/10 p-2 rounded-full mr-3">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Personalized Insights</h4>
                  <p className="text-sm text-muted-foreground">
                    Flappy remembers your entries and provides thoughtful responses.
                  </p>
                </div>
              </div>
            </div>
          </>
        );
      case 3:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-quicksand flex items-center">
                <MessageSquareText className="mr-2 h-5 w-5" /> SMS Journaling
              </DialogTitle>
              <DialogDescription>
                A premium feature for quick on-the-go journaling
              </DialogDescription>
            </DialogHeader>
            <div className="my-6">
              <div className="bg-muted p-4 rounded-lg mb-4">
                <h4 className="text-sm font-medium mb-2">Premium Feature 🌟</h4>
                <p className="text-sm text-muted-foreground">
                  With a premium subscription, you can journal via text message, making it even easier to capture your thoughts anytime, anywhere.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-full mr-3">
                    <span className="block h-5 w-5 flex items-center justify-center font-medium text-primary">1</span>
                  </div>
                  <p className="text-sm mt-1">Add your phone number in Settings</p>
                </div>
                <div className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-full mr-3">
                    <span className="block h-5 w-5 flex items-center justify-center font-medium text-primary">2</span>
                  </div>
                  <p className="text-sm mt-1">Text Flappy anytime to create journal entries</p>
                </div>
                <div className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-full mr-3">
                    <span className="block h-5 w-5 flex items-center justify-center font-medium text-primary">3</span>
                  </div>
                  <p className="text-sm mt-1">All SMS entries sync with your journal dashboard</p>
                </div>
              </div>
            </div>
          </>
        );
      case 4:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-quicksand flex items-center">
                <PenLine className="mr-2 h-5 w-5" /> Your Journal Dashboard
              </DialogTitle>
              <DialogDescription>
                All your journal entries in one place
              </DialogDescription>
            </DialogHeader>
            <div className="my-6">
              <div className="bg-card border rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium mb-2">Dashboard Features</h4>
                <ul className="text-sm space-y-2">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                    View and edit all journal entries
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                    Filter entries by date, mood, or tags
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                    Track your emotional journey with mood insights
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                    Create new entries directly from the dashboard
                  </li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                All your journal entries from email and SMS (premium) will automatically appear in your dashboard.
              </p>
            </div>
          </>
        );
      case 5:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-quicksand">Let's Get Started!</DialogTitle>
              <DialogDescription>
                Ready to begin your journaling journey with Flappy?
              </DialogDescription>
            </DialogHeader>
            <div className="my-6 text-center">
              <div className="mb-6">
                <p className="text-sm mb-4">
                  We've sent your first inspiration email from Flappy to welcome you!
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Check your inbox and simply reply to Flappy's email to create your first journal entry.
                </p>
                <Button 
                  variant="outline" 
                  className="mx-auto" 
                  onClick={requestInspiration}
                >
                  Request Another Inspiration
                </Button>
              </div>
              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium mb-1">Need help?</p>
                <p className="text-sm text-muted-foreground">
                  Visit the Settings page for more information and support.
                </p>
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        {renderStepContent()}
        <DialogFooter className="flex justify-between gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {Array.from({ length: totalSteps }, (_, i) => (
              <span 
                key={i} 
                className={`w-2 h-2 rounded-full transition-colors ${i + 1 === step ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
            <Button onClick={handleNext}>
              {step === totalSteps ? 'Get Started' : 'Next'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}