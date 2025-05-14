import { Container } from "@/components/ui/container";
import { EmailPreview } from "@/components/emails/email-preview";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export function EmailPreviewSection() {
  const { toast } = useToast();
  const { user } = useAuth();
  
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
          <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-gray-900 mb-4">
            Daily Doses of Wisdom & Joy
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Here's a peek at the kind of emails you'll receive from Flappy.
            {!user?.isPremium && <span className="block mt-2 text-sm text-primary">Free tier includes ads</span>}
          </p>
        </div>
        
        <EmailPreview 
          onReply={handleReply} 
          isPremium={user?.isPremium || false}
        />
      </Container>
    </section>
  );
}
