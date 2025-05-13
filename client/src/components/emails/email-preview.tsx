import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Feather, Reply } from "lucide-react";

interface EmailPreviewProps {
  subject?: string;
  content?: string;
  time?: string;
  onReply?: () => void;
}

export function EmailPreview({ 
  subject = "🌊 The Ripples of Your Day Await",
  content = `Good morning, bright soul!

Flappy here, soaring in with today's reflection. I've witnessed countless dawns across eons, yet each new day still fills my ancient heart with wonder.

**Today's Cosmic Thought:** Like pebbles cast into still waters, our smallest actions create ripples that travel far beyond our sight. What positive ripple might you create today?

Take a moment to breathe deeply and set an intention for one small act of kindness or self-care. Then, later, reply to this email and tell me how that ripple expanded through your day.

Remember, I'm here to listen without judgment, to hold space for your reflections, and to offer a bit of starlight wisdom when clouds gather.

With cosmic joy and feathery wisdom,
Flappy 🌟`,
  time = "8:05 AM",
  onReply
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
              <p className="text-sm text-muted-foreground">flappy@featherweight.io</p>
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
