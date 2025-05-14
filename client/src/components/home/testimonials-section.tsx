import { Container } from "@/components/ui/container";
import { Star, StarHalf } from "lucide-react";

export function TestimonialsSection() {
  const testimonials = [
    {
      text: "Flappy has transformed how I journal. The daily prompts feel so personal, and being able to just reply to an email has made me consistent for the first time ever.",
      author: "Jamie D.",
      duration: "Journaling for 3 months",
      initials: "JD",
      rating: 5,
      bgColor: "bg-primary/20",
      textColor: "text-primary"
    },
    {
      text: "What I love most is Flappy's personality. The cosmic wisdom mixed with playfulness makes each interaction meaningful yet fun. It's like having a wise friend who always knows what to say.",
      author: "Riley L.",
      duration: "Journaling for 6 months",
      initials: "RL",
      rating: 5,
      bgColor: "bg-secondary/20",
      textColor: "text-secondary"
    },
    {
      text: "As someone with anxiety, having Flappy's gentle nudges helps me process my thoughts without feeling overwhelmed. The interface is so calming, and I love looking back on my journey.",
      author: "Alex T.",
      duration: "Journaling for 1 year",
      initials: "AT",
      rating: 4.5,
      bgColor: "bg-accent/20",
      textColor: "text-accent"
    }
  ];

  return (
    <section id="testimonials" className="py-16 bg-gradient-to-b from-background to-primary/5">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-foreground mb-4">
            What Our Users Say
          </h2>
          <p className="text-lg text-gray-200 max-w-2xl mx-auto">
            Join thousands who've transformed their journaling habit with Featherweight.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-[0.75rem] p-6 shadow-md">
              <div className="flex items-center mb-4">
                <div className="text-yellow-400 flex">
                  {[...Array(Math.floor(testimonial.rating))].map((_, i) => (
                    <Star key={i} className="fill-current" />
                  ))}
                  {testimonial.rating % 1 !== 0 && (
                    <StarHalf className="fill-current" />
                  )}
                </div>
              </div>
              <p className="text-gray-200 italic mb-4">
                "{testimonial.text}"
              </p>
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full ${testimonial.bgColor} flex items-center justify-center ${testimonial.textColor} font-semibold mr-3`}>
                  {testimonial.initials}
                </div>
                <div>
                  <h4 className="font-quicksand font-medium text-foreground">{testimonial.author}</h4>
                  <p className="text-sm text-foreground/60">{testimonial.duration}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
