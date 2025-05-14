import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export function MeetFlappySection() {
  const { user } = useAuth();
  
  return (
    <section className="py-16 bg-primary/5">
      <Container>
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-2/5 mb-8 md:mb-0">
            {/* A wise-looking friendly pelican image */}
            <img 
              src="https://images.unsplash.com/photo-1508780709619-79562169bc64?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" 
              alt="Flappy the wise pelican" 
              className="rounded-[0.75rem] shadow-xl w-full h-auto object-cover aspect-square" 
            />
          </div>
          
          <div className="md:w-3/5 md:pl-12">
            <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-foreground mb-6">
              Meet <span className="text-primary">Flappy</span>,<br/>Your Pelican Pal
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              Flappy isn't just any AI companion. He's a cheerful pelican with a big personality, a love for ocean adventures, and a knack for brightening your day with the perfect blend of fun and thoughtfulness.
            </p>
            <p className="text-lg text-gray-700 mb-6">
              From his favorite perch by the sea, Flappy sends you friendly emails full of encouragement, listens to your thoughts, and helps you track your journey through easy, delightful conversations.
            </p>
            
            {/* Flappy's voice example */}
            <div className="bg-white p-6 rounded-[0.75rem] shadow-md border-l-4 border-primary mb-6">
              <p className="italic text-gray-700 font-opensans">
                "Hi there! Flappy here checking in. I noticed you've been working hard lately. What's one moment from today that made you feel proud or brought you joy? Even the smallest things count. I'd love to hear about it when you have a moment!"
              </p>
              <p className="text-right text-primary font-medium font-quicksand mt-2">— Flappy 🌊</p>
            </div>
            
            <Link href={user ? "/journal" : "/auth"}>
              <Button className="font-quicksand font-medium shadow-md">
                Start Journaling with Flappy
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
