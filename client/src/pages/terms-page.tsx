import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ClipboardCheck } from "lucide-react";
import { Helmet } from 'react-helmet';

export default function TermsPage() {
  return (
    <>
      <Helmet>
        <title>Terms & Conditions - Featherweight</title>
        <meta name="description" content="Read the terms and conditions for using Featherweight, the AI-powered journaling companion." />
      </Helmet>

      <Header />
      
      <main className="py-12">
        <Container>
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h1 className="font-quicksand font-bold text-4xl md:text-5xl text-primary">Terms & Conditions</h1>
              <p className="text-xl text-muted-foreground">Last updated: May 14, 2023</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <ClipboardCheck className="h-6 w-6 text-primary" />
                  Terms of Service
                </CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none dark:prose-invert">
                <h3>1. Acceptance of Terms</h3>
                <p>
                  By accessing and using Featherweight services, you agree to be bound by these Terms and 
                  Conditions. If you do not agree to these terms, please do not use our services.
                </p>
                
                <h3>2. Description of Service</h3>
                <p>
                  Featherweight is an AI-powered journaling companion that helps users maintain a journaling 
                  practice through email, SMS (for premium users), and web interfaces. The service includes:
                </p>
                <ul>
                  <li>Email-based journaling prompts and responses</li>
                  <li>SMS-based journaling for premium subscribers</li>
                  <li>Web interface for managing and reviewing journal entries</li>
                  <li>Mood tracking and personal insights</li>
                </ul>
                
                <h3>3. User Accounts</h3>
                <p>
                  To use Featherweight, you must register for an account. You are responsible for maintaining 
                  the confidentiality of your account information and for all activities that occur under your account.
                </p>
                
                <h3>4. Subscription and Billing</h3>
                <p>
                  Featherweight offers both free and premium subscription options:
                </p>
                <ul>
                  <li><strong>Free Tier:</strong> Includes basic journaling via email and web interface with advertisements</li>
                  <li><strong>Premium Tier ($4.99/month):</strong> Includes all features of the free tier plus SMS journaling, 
                    ad-free experience, advanced insights, and priority support</li>
                </ul>
                <p>
                  Premium subscriptions are billed on a monthly basis. You can cancel your subscription at any time, 
                  which will take effect at the end of the current billing cycle.
                </p>
                
                <h3>5. User Content</h3>
                <p>
                  You retain all rights to the content you submit to Featherweight, including journal entries and messages. 
                  By submitting content, you grant Featherweight a license to use this content solely for the purpose of 
                  providing and improving our services.
                </p>
                
                <h3>6. Prohibited Uses</h3>
                <p>
                  You agree not to use Featherweight to:
                </p>
                <ul>
                  <li>Violate any laws or regulations</li>
                  <li>Send spam or unsolicited messages</li>
                  <li>Harass, abuse, or harm others</li>
                  <li>Upload malicious software or content</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                </ul>
                
                <h3>7. Termination</h3>
                <p>
                  We reserve the right to suspend or terminate your account if you violate these terms or for any 
                  other reason at our discretion. Upon termination, your access to Featherweight services will be disabled.
                </p>
                
                <h3>8. Changes to Terms</h3>
                <p>
                  We may modify these terms at any time. Continued use of Featherweight after changes indicates 
                  your acceptance of the updated terms.
                </p>
                
                <h3>9. Disclaimer of Warranties</h3>
                <p>
                  Featherweight services are provided "as is" without warranties of any kind, whether express or implied.
                </p>
                
                <h3>10. Limitation of Liability</h3>
                <p>
                  Featherweight and its affiliates shall not be liable for any indirect, incidental, special, 
                  consequential, or punitive damages resulting from your use or inability to use our services.
                </p>
                
                <h3>11. Governing Law</h3>
                <p>
                  These terms shall be governed by the laws of the State of California, without regard to its 
                  conflict of law provisions.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Shield className="h-6 w-6 text-primary" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  If you have any questions about these Terms & Conditions, please contact us at:
                </p>
                <p className="mt-2">
                  <a href="mailto:legal@featherweight.world" className="text-primary hover:underline">
                    legal@featherweight.world
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </main>
      
      <Footer />
    </>
  );
}