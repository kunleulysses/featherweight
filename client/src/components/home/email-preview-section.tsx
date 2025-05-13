import { Container } from "@/components/ui/container";
import { EmailPreview } from "@/components/emails/email-preview";
import { useToast } from "@/hooks/use-toast";

export function EmailPreviewSection() {
  const { toast } = useToast();
  
  const handleReply = () => {
    toast({
      title: "Demo Feature",
      description: "In the real app, this would open your email client or a reply form.",
    });
  };
  
  return (
    <section className="py-16 bg-white">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-foreground mb-4">
            Daily Doses of Wisdom & Joy
          </h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            Here's a peek at the kind of emails you'll receive from Flappy.
          </p>
        </div>
        
        <EmailPreview onReply={handleReply} />
      </Container>
    </section>
  );
}
