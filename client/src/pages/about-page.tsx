import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Feather, Mail, Heart, Activity, Phone } from "lucide-react";
import { Helmet } from 'react-helmet';

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About Featherweight - Your Journaling Companion</title>
        <meta name="description" content="Learn more about Featherweight, the AI-powered journaling companion featuring Flappy the cosmic pelican." />
      </Helmet>

      <Header />
      
      <main className="py-12">
        <Container>
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-4">
              <h1 className="font-quicksand font-bold text-4xl md:text-5xl text-primary">About Featherweight</h1>
              <p className="text-xl text-muted-foreground">Meet your journaling companion with cosmic wisdom</p>
            </div>
            
            {/* Our Story */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Feather className="h-6 w-6 text-primary" />
                  Our Story
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Featherweight was born from a simple idea: journaling should be easy, engaging, 
                  and actually enjoyable. We created Flappy, our cosmic pelican guide, to transform 
                  your daily reflections into meaningful conversations.
                </p>
                <p>
                  Unlike traditional journaling apps that feel like another task on your to-do list, 
                  Featherweight brings your journaling practice to where you already spend time - your 
                  email inbox and text messages.
                </p>
                <p>
                  Our team combines expertise in mental wellness, AI technology, and thoughtful design 
                  to create an experience that helps you build a sustainable reflection practice.
                </p>
              </CardContent>
            </Card>
            
            {/* Meet Flappy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Heart className="h-6 w-6 text-primary" />
                  Meet Flappy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="md:flex gap-8 items-center">
                  <div className="md:w-1/3 mb-6 md:mb-0 flex justify-center">
                    <div className="w-48 h-48 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                      <img 
                        src="/images/flappy-avatar.png" 
                        alt="Flappy the Pelican" 
                        className="w-auto h-48"
                        onError={(e) => {
                          console.error("Failed to load avatar image");
                          e.currentTarget.src = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3'/%3E%3Cpath d='m16 16-4 4-4-4'/%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                  </div>
                  <div className="md:w-2/3 space-y-4">
                    <p>
                      Flappy is an ancient cosmic pelican captain with the wisdom of millennia and the playful 
                      spirit of a friend who truly cares about your wellbeing. With his signature captain's hat 
                      and spectacles, Flappy navigates the seas of human emotion with both warmth and insight.
                    </p>
                    <p>
                      As your journaling companion, Flappy provides thoughtful prompts, responds to your 
                      reflections, and helps you track patterns in your thoughts, moods, and experiences 
                      over time.
                    </p>
                    <p>
                      While Flappy is powered by advanced AI, the personality is uniquely designed to 
                      create a supportive, engaging experience that helps you develop self-awareness and 
                      insight through consistent reflection.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Our Approach */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Activity className="h-6 w-6 text-primary" />
                  Our Approach
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Featherweight takes a different approach to journaling by meeting you where you already are:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Email Journaling:</strong> Respond to Flappy's prompts right from your inbox</li>
                  <li><strong>SMS Conversations:</strong> Premium users can text with Flappy for on-the-go journaling</li>
                  <li><strong>Web Interface:</strong> Review past entries, track your moods, and gain insights</li>
                  <li><strong>Conversation Memory:</strong> Flappy remembers your past entries to provide personalized guidance</li>
                </ul>
                <p className="mt-4">
                  We believe that mindful reflection shouldn't be another stressful obligation. 
                  By making journaling conversational and accessible, we help you build a sustainable practice 
                  that fits naturally into your life.
                </p>
              </CardContent>
            </Card>
            
            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Mail className="h-6 w-6 text-primary" />
                  Contact Us
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  We'd love to hear from you! Get in touch with our team at:
                </p>
                <div className="flex items-center gap-2 text-primary">
                  <Mail className="h-5 w-5" />
                  <a href="mailto:hello@featherweight.world" className="hover:underline">
                    hello@featherweight.world
                  </a>
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <Phone className="h-5 w-5" />
                  <a href="tel:+18005551234" className="hover:underline">
                    1-800-555-1234
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </main>
      
      <Footer />
    </>
  );
}