import { Link } from "wouter";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function HeroSection() {
  const { user } = useAuth();
  
  return (
    <section className="relative bg-gradient-to-b from-primary/10 to-background py-16 md:py-24">
      <Container>
        <div className="flex flex-col lg:flex-row items-center">
          <div className="lg:w-1/2 mb-12 lg:mb-0 text-center lg:text-left">
            <h1 className="font-quicksand font-bold text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 leading-tight">
              Journal with <span className="text-primary">Flappy</span>, Your Pelican Pal
            </h1>
            <p className="text-lg md:text-xl text-foreground/80 dark:text-gray-200 mb-8 max-w-xl mx-auto lg:mx-0">
              Daily fun, easy journaling, and friendly check-ins — all through your inbox. Let Flappy brighten your day with cheerful messages and thoughtful questions.
            </p>
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4 relative z-20">
              <Link href={user ? "/journal" : "/auth"}>
                <Button size="lg" className="font-quicksand font-medium shadow-md">
                  Start Your Journey
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="font-quicksand font-medium">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="lg:w-1/2 relative">
            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -top-6 -left-6 bg-secondary text-white p-3 rounded-[0.75rem] shadow-lg transform rotate-3 z-10">
                <p className="font-quicksand font-medium text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  Journal through email!
                </p>
              </div>
              <div className="absolute -bottom-5 -right-5 bg-accent text-white p-3 rounded-[0.75rem] shadow-lg transform -rotate-2 z-10">
                <p className="font-quicksand font-medium text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  Daily inspiration
                </p>
              </div>
              <img 
                src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" 
                alt="Peaceful coastal scene" 
                className="rounded-[0.75rem] shadow-xl w-full h-auto object-cover aspect-[4/3]" 
              />
            </div>
          </div>
        </div>
      </Container>
      
      {/* Wave divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" className="w-full">
          <path fill="#FFFFFF" fillOpacity="1" d="M0,96L80,80C160,64,320,32,480,32C640,32,800,64,960,69.3C1120,75,1280,53,1360,42.7L1440,32L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
        </svg>
      </div>
    </section>
  );
}
