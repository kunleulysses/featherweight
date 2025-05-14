import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LockKeyhole, Shield, Eye } from "lucide-react";
import { Helmet } from 'react-helmet';

export default function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - Featherweight</title>
        <meta name="description" content="Read our privacy policy to understand how we protect your data at Featherweight." />
      </Helmet>

      <Header />
      
      <main className="py-12">
        <Container>
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h1 className="font-quicksand font-bold text-4xl md:text-5xl text-primary">Privacy Policy</h1>
              <p className="text-xl text-muted-foreground">Last updated: May 14, 2023</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Shield className="h-6 w-6 text-primary" />
                  Our Commitment to Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none dark:prose-invert">
                <p>
                  At Featherweight, we take your privacy seriously. Your journal entries and personal reflections 
                  are intimate and valuable, and we're committed to protecting them. This Privacy Policy explains 
                  how we collect, use, and protect your information when you use our services.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Eye className="h-6 w-6 text-primary" />
                  Information We Collect
                </CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none dark:prose-invert">
                <h3>Personal Information</h3>
                <p>We collect the following types of personal information:</p>
                <ul>
                  <li><strong>Account Information:</strong> Name, email address, phone number (for SMS users), and password</li>
                  <li><strong>Profile Information:</strong> Username and optional profile details</li>
                  <li><strong>Payment Information:</strong> For premium subscribers, payment details processed by our secure payment processor</li>
                </ul>
                
                <h3>Content Information</h3>
                <p>We collect the content you create while using Featherweight:</p>
                <ul>
                  <li><strong>Journal Entries:</strong> Text content you write or respond with via email, SMS, or web interface</li>
                  <li><strong>Mood Data:</strong> Information about your emotional state that you share or that is analyzed from your entries</li>
                  <li><strong>Conversation History:</strong> Records of your exchanges with Flappy, our AI companion</li>
                </ul>
                
                <h3>Usage Information</h3>
                <p>We collect information about how you use Featherweight:</p>
                <ul>
                  <li><strong>Log Data:</strong> IP address, browser type, pages visited, time spent, and other usage statistics</li>
                  <li><strong>Device Information:</strong> Device type, operating system, and unique device identifiers</li>
                  <li><strong>Communication Preferences:</strong> How often you want to receive emails or SMS messages</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <LockKeyhole className="h-6 w-6 text-primary" />
                  How We Use Your Information
                </CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none dark:prose-invert">
                <p>We use your information to:</p>
                <ul>
                  <li>Provide and personalize our services</li>
                  <li>Process and respond to your journal entries through our AI companion</li>
                  <li>Send you prompts, inspirations, and other content based on your preferences</li>
                  <li>Analyze patterns in your journaling to provide mood insights and recommendations</li>
                  <li>Improve our AI systems to better support your journaling practice</li>
                  <li>Process payments and manage your subscription</li>
                  <li>Communicate with you about your account and our services</li>
                  <li>Troubleshoot issues and optimize our services</li>
                </ul>
                
                <h3>AI Training</h3>
                <p>
                  To improve our AI capabilities and provide you with better responses, we may use anonymized 
                  and aggregated data from journal entries to train our AI models. This data is stripped of 
                  all personally identifying information. You can opt out of having your data used for AI training 
                  by adjusting your privacy settings in your account.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Shield className="h-6 w-6 text-primary" />
                  Information Sharing and Disclosure
                </CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none dark:prose-invert">
                <p>We do not sell your personal information. We may share your information in the following limited circumstances:</p>
                
                <h3>Service Providers</h3>
                <p>
                  We work with third-party service providers who help us provide, improve, and secure our services. 
                  These providers include:
                </p>
                <ul>
                  <li>Email service providers to send communications</li>
                  <li>SMS providers for text message delivery</li>
                  <li>Payment processors for subscription management</li>
                  <li>Cloud storage providers for secure data storage</li>
                  <li>Analytics providers to help us improve our services</li>
                </ul>
                <p>
                  These service providers are bound by contractual obligations to keep your information confidential 
                  and use it only for the purposes for which we disclose it to them.
                </p>
                
                <h3>Legal Requirements</h3>
                <p>
                  We may disclose your information if required to do so by law or in response to valid requests 
                  by public authorities (e.g., a court or government agency).
                </p>
                
                <h3>Business Transfers</h3>
                <p>
                  If Featherweight is involved in a merger, acquisition, or sale of all or a portion of its assets, 
                  your information may be transferred as part of that transaction. We will notify you via email and/or 
                  prominent notice on our website of any change in ownership or uses of your personal information.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Shield className="h-6 w-6 text-primary" />
                  Your Rights and Choices
                </CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none dark:prose-invert">
                <p>You have several rights regarding your personal information:</p>
                
                <h3>Access and Update</h3>
                <p>
                  You can access and update your personal information at any time through your account settings.
                </p>
                
                <h3>Data Deletion</h3>
                <p>
                  You can request deletion of your account and associated data by contacting our support team.
                </p>
                
                <h3>Communication Preferences</h3>
                <p>
                  You can manage your email and SMS preferences in your account settings.
                </p>
                
                <h3>AI Training Opt-Out</h3>
                <p>
                  You can opt out of having your anonymized data used for AI training in your privacy settings.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Shield className="h-6 w-6 text-primary" />
                  Contact Us About Privacy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
                </p>
                <p className="mt-2">
                  <a href="mailto:privacy@featherweight.app" className="text-primary hover:underline">
                    privacy@featherweight.app
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