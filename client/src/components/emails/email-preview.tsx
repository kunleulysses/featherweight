import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdBanner } from "@/components/ads/ad-banner";
import { Feather, Reply } from "lucide-react";

interface EmailPreviewProps {
  subject?: string;
  content?: string;
  time?: string;
  onReply?: () => void;
  isPremium?: boolean;
}

export function EmailPreview({ 
  subject = "🌅 How's your day shaping up?",
  content = `Good morning!

Flappy here checking in with you. I hope your morning is off to a good start!

I've been thinking about you today and wanted to ask: What's one thing you're looking forward to this week?

Sometimes just identifying something positive ahead can brighten our outlook. It could be something small like a favorite meal, a moment of relaxation, or catching up with a friend.

If you're facing some challenges right now, that's okay too. Feel free to share what's on your mind - I'm here to listen and support you through both the good days and the tough ones.

Reply to this email anytime. Your thoughts matter and journaling about them, even briefly, can help provide clarity and perspective.

Looking forward to hearing from you!

Warmly,
Flappy 🌊`,
  time = "8:05 AM",
  onReply,
  isPremium = false
}: EmailPreviewProps) {
  return (
    <Card className="bg-background rounded-[0.75rem] shadow-lg border border-border max-w-2xl mx-auto">
      <CardContent className="p-6">
        {/* Email Header */}
        <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center mr-3">
              <Feather className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-quicksand font-medium text-foreground">Flappy from Featherweight</p>
              <p className="text-sm text-muted-foreground">flappy@featherweight.world</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{time}</p>
        </div>
        
        {/* Email Subject */}
        <h3 className="font-quicksand font-semibold text-xl text-foreground mb-4">
          {subject}
        </h3>
        
        {/* Email Content */}
        <div className="prose prose-sm max-w-none text-foreground/80 mb-6 whitespace-pre-line">
          {content}
        </div>
        
        {/* Ad Banner for Free Tier */}
        {!isPremium && (
          <div className="mt-4 mb-6">
            <AdBanner format="email" />
          </div>
        )}
        
        {/* Reply Button */}
        <div className="text-center">
          <Button onClick={onReply} className="font-quicksand font-medium shadow-md">
            <Reply className="mr-2 h-4 w-4" /> Reply to Journal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
