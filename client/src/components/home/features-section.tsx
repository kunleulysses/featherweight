import { Container } from "@/components/ui/container";
import { Mail, Reply, BookOpen } from "lucide-react";

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 bg-white">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-foreground mb-4">
            How Featherweight Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Simplify your wellness journey with our unique approach to journaling and mindfulness.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-background rounded-[0.75rem] p-6 shadow-md transform transition-transform hover:scale-105">
            <div className="rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mb-4">
              <Mail className="text-primary h-8 w-8" />
            </div>
            <h3 className="font-quicksand font-semibold text-xl text-foreground mb-3">
              Daily Inspirations
            </h3>
            <p className="text-gray-600">
              Receive thoughtful messages from Flappy each morning to start your day with positivity and purpose.
            </p>
          </div>
          
          {/* Feature 2 */}
          <div className="bg-background rounded-[0.75rem] p-6 shadow-md transform transition-transform hover:scale-105">
            <div className="rounded-full bg-secondary/10 w-16 h-16 flex items-center justify-center mb-4">
              <Reply className="text-secondary h-8 w-8" />
            </div>
            <h3 className="font-quicksand font-semibold text-xl text-foreground mb-3">
              Email Journaling
            </h3>
            <p className="text-gray-600">
              Simply reply to Flappy's emails to create journal entries. No apps to open, just your regular inbox.
            </p>
          </div>
          
          {/* Feature 3 */}
          <div className="bg-background rounded-[0.75rem] p-6 shadow-md transform transition-transform hover:scale-105">
            <div className="rounded-full bg-accent/10 w-16 h-16 flex items-center justify-center mb-4">
              <BookOpen className="text-accent h-8 w-8" />
            </div>
            <h3 className="font-quicksand font-semibold text-xl text-foreground mb-3">
              Journal Archive
            </h3>
            <p className="text-gray-600">
              Access your complete journal history in our beautifully designed web interface, organized and searchable.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
