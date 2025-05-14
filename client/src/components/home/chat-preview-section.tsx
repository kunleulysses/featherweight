import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AdBanner } from "@/components/ads/ad-banner";
import { Send } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

// Sample conversation messages
const sampleMessages = [
  {
    id: 1,
    content: "Hi there! I'm Flappy, your journaling companion. How are you feeling today?",
    type: "flappy",
    time: "2:30 PM"
  },
  {
    id: 2,
    content: "I'm feeling a bit stressed with work deadlines, but trying to stay positive.",
    type: "user",
    time: "2:31 PM"
  },
  {
    id: 3,
    content: "I understand how work stress can be challenging. What's one small thing that helped you feel good today, despite the stress?",
    type: "flappy",
    time: "2:32 PM"
  },
  {
    id: 4,
    content: "I took a short walk during lunch which was nice. It helped clear my head.",
    type: "user",
    time: "2:33 PM"
  },
  {
    id: 5,
    content: "That's wonderful! Taking breaks for fresh air and movement can be so refreshing. These small self-care moments are important.\n\nThemes: Work-life balance, Self-care, Stress management\n\nMood: Mixed - stressed but taking positive actions\n\nWould you like to try making this a daily habit? Even just 5 minutes can make a difference.",
    type: "flappy",
    time: "2:34 PM"
  }
];

export function ChatPreviewSection() {
  const { user } = useAuth();
  
  return (
    <section className="py-16 bg-background">
      <Container>
        <div className="text-center mb-12">
          <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-foreground mb-4">
            Chat with Flappy Anytime
          </h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            Have meaningful conversations that help you reflect and grow. Every chat can be saved to your journal.
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-lg border-primary/10">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="flex items-center">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src="/assets/flappy.svg" alt="Flappy" />
                  <AvatarFallback>F</AvatarFallback>
                </Avatar>
                <span>Flappy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 mb-6">
                {sampleMessages.map((message) => (
                  <div 
                    key={message.id}
                    className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        message.type === "user" 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div 
                        className={`text-xs mt-1 ${
                          message.type === "user" 
                            ? "text-primary-foreground/70" 
                            : "text-foreground/50"
                        }`}
                      >
                        {message.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="relative border rounded-md p-1 flex items-center">
                <div className="flex-1 pl-2 text-muted-foreground text-sm">
                  Type your message here...
                </div>
                <div className="flex-none">
                  <Button size="icon" className="h-8 w-8" disabled>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-center mt-6">
                <Link href={user ? "/conversation" : "/auth"}>
                  <Button className="font-quicksand shadow-sm">
                    Start Chatting with Flappy
                  </Button>
                </Link>
              </div>
              
              {/* Ad banner has been removed as requested */}
            </CardContent>
          </Card>
        </div>
      </Container>
    </section>
  );
}