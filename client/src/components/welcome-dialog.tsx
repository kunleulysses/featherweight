import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function WelcomeDialog() {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    // Check if this is a new user session
    const hasSeenWelcome = sessionStorage.getItem("hasSeenWelcome");
    if (!hasSeenWelcome) {
      // Show dialog after a short delay to ensure the page has loaded
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem("hasSeenWelcome", "true");
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-quicksand text-xl">Welcome to Featherweight! 🎉</DialogTitle>
          <DialogDescription>
            Your cosmic pelican companion Flappy is excited to meet you!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center py-4">
            <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5.5L22 10M2 10v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V10"/>
                <path d="m22 10-10 5.5L2 10"/>
              </svg>
            </div>
            <p className="text-foreground font-medium">Check your inbox!</p>
            <p className="text-muted-foreground text-sm">
              Flappy has sent you a welcome email. Reply to start your journaling journey!
            </p>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold">How it works:</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Receive daily inspiration emails from Flappy</li>
              <li>Simply reply to the emails to create journal entries</li>
              <li>All your entries are organized in your journal dashboard</li>
              <li>Upgrade to Premium for SMS journaling and more features</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => setIsOpen(false)} className="w-full">
            Got it, let's get started!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}