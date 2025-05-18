import { useState } from "react";
import { Helmet } from "react-helmet";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from "@/components/ui/accordion";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Mail, 
  MessageSquare, 
  BookOpen, 
  Settings, 
  CreditCard, 
  BarChart, 
  HelpCircle,
  Moon,
  Sun,
  Calendar,
  Search,
  Star,
  Save
} from "lucide-react";

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <>
      <Helmet>
        <title>Help & Support - Featherweight</title>
        <meta 
          name="description" 
          content="Get help with using Featherweight, your AI-powered email companion and journaling application." 
        />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow py-4 md:py-8 bg-background">
          <Container className="px-3 md:px-6">
            <div className="mb-4 md:mb-8">
              <h1 className="font-quicksand font-bold text-2xl md:text-3xl mb-2">Help & Support</h1>
              <p className="text-foreground/70 max-w-3xl text-sm md:text-base">
                Welcome to the Featherweight help center. Here you'll find detailed guides on how to use every feature of your AI-powered email companion and journaling application.
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-5xl mx-auto">
              <div className="overflow-x-auto pb-2 -mx-3 px-3">
                <TabsList className="w-full flex md:grid md:grid-cols-6 mb-4 md:mb-8 gap-1">
                  <TabsTrigger value="overview" className="flex flex-col items-center gap-1 py-2 px-2 text-xs md:text-sm whitespace-nowrap min-w-[70px]">
                    <HelpCircle className="h-4 w-4 md:h-5 md:w-5" />
                    <span>Overview</span>
                  </TabsTrigger>
                  <TabsTrigger value="journal" className="flex flex-col items-center gap-1 py-2 px-2 text-xs md:text-sm whitespace-nowrap min-w-[70px]">
                    <BookOpen className="h-4 w-4 md:h-5 md:w-5" />
                    <span>Journal</span>
                  </TabsTrigger>
                  <TabsTrigger value="email" className="flex flex-col items-center gap-1 py-2 px-2 text-xs md:text-sm whitespace-nowrap min-w-[70px]">
                    <Mail className="h-4 w-4 md:h-5 md:w-5" />
                    <span>Email</span>
                  </TabsTrigger>
                  <TabsTrigger value="sms" className="flex flex-col items-center gap-1 py-2 px-2 text-xs md:text-sm whitespace-nowrap min-w-[70px]">
                    <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
                    <span>SMS</span>
                  </TabsTrigger>
                  <TabsTrigger value="billing" className="flex flex-col items-center gap-1 py-2 px-2 text-xs md:text-sm whitespace-nowrap min-w-[70px]">
                    <CreditCard className="h-4 w-4 md:h-5 md:w-5" />
                    <span>Billing</span>
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex flex-col items-center gap-1 py-2 px-2 text-xs md:text-sm whitespace-nowrap min-w-[70px]">
                    <Settings className="h-4 w-4 md:h-5 md:w-5" />
                    <span>Settings</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="space-y-8">
                <section className="mb-6 md:mb-8">
                  <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">What is Featherweight?</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-3 md:space-y-4">
                      <p className="text-sm md:text-base">
                        Featherweight is an innovative email-driven journaling companion that transforms personal reflection into an engaging, interactive experience through Flappy, your cosmic pelican guide.
                      </p>
                      <p className="text-sm md:text-base">
                        Unlike traditional journaling apps, Featherweight uses the familiar interface of email and SMS to help you maintain a consistent practice of self-reflection and mindfulness.
                      </p>
                      <div>
                        <h3 className="text-lg md:text-xl font-semibold mb-2">Key Features:</h3>
                        <ul className="list-disc pl-5 md:pl-6 space-y-1 md:space-y-2 text-sm md:text-base">
                          <li>Daily inspirational messages from Flappy</li>
                          <li>Email-based journaling workflow</li>
                          <li>SMS journaling for premium users</li>
                          <li>Mood tracking and insights</li>
                          <li>Organized journal entries with smart tagging</li>
                          <li>Conversation memory for more personalized interactions</li>
                        </ul>
                      </div>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-4 md:p-6 border border-border">
                      <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Meet Flappy</h3>
                      <div className="flex justify-center mb-4">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-primary/10">
                          <img 
                            src="/images/flappy-avatar.png" 
                            alt="Flappy the cosmic pelican" 
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = "https://placehold.co/200x200/5f7adb/white?text=Flappy";
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm md:text-base">
                          Flappy is your personal cosmic pelican guide with ancient wisdom and a playful personality. As old as the starlight itself, Flappy has seen the cosmos evolve and brings that perspective to your journaling practice.
                        </p>
                        <p className="text-sm md:text-base">
                          Flappy communicates with you through email and SMS (for premium users), sending daily inspiration, responding to your journal entries, and engaging in meaningful conversations.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">How to Get Started</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">1</span>
                          Create an Account
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>Sign up with your email address to create your Featherweight account. Verify your email to activate all features.</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">2</span>
                          Set Up Your Profile
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>Add your name and preferences in the Settings page. Premium users can add a phone number for SMS features.</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">3</span>
                          Start Journaling
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>Respond to Flappy's emails or create new journal entries directly on the website. Premium users can also text Flappy.</p>
                      </CardContent>
                    </Card>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">Free vs. Premium</h2>
                  <div className="grid md:grid-cols-2 gap-8">
                    <Card>
                      <CardHeader>
                        <CardTitle>Free Plan</CardTitle>
                        <CardDescription>$0/month</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Email-based journaling
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Daily inspirational messages
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Basic journal organization
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Web interface access
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-red-500">✗</span>
                            SMS journaling
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-red-500">✗</span>
                            Ad-free experience
                          </li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-primary">
                      <CardHeader>
                        <CardTitle>Premium Plan</CardTitle>
                        <CardDescription>$4.99/month</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Everything in the Free plan
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            <strong>SMS journaling and conversations</strong>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            <strong>Ad-free experience</strong>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Advanced mood tracking insights
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Priority email processing
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Enhanced journal organization with smart tagging
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="journal" className="space-y-8">
                <section>
                  <h2 className="text-2xl font-bold mb-4">Journaling with Featherweight</h2>
                  <p className="mb-6">
                    Journaling is at the heart of the Featherweight experience. You can journal through email, SMS (premium), or directly on the website.
                  </p>

                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <Card>
                      <CardHeader className="bg-primary/5 rounded-t-lg">
                        <CardTitle className="flex items-center gap-2">
                          <Mail className="h-5 w-5" />
                          Email Journaling
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className="mb-4">
                          Reply to Flappy's daily emails or send a new email to <strong>flappy@parse.featherweight.world</strong> to create a journal entry.
                        </p>
                        <p className="text-muted-foreground text-sm">
                          Your emails are automatically processed and saved as journal entries, and Flappy will respond with insights or encouragement.
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="bg-primary/5 rounded-t-lg">
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5" />
                          SMS Journaling (Premium)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className="mb-4">
                          Text Flappy to create journal entries or have conversations. Use special commands or formats to organize your thoughts.
                        </p>
                        <p className="text-muted-foreground text-sm">
                          Premium feature that requires adding your phone number in Settings. Messages are securely saved as journal entries when you use journal commands.
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="bg-primary/5 rounded-t-lg">
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
                          Web Journaling
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className="mb-4">
                          Create and edit journal entries directly on the Featherweight website in the Journal section.
                        </p>
                        <p className="text-muted-foreground text-sm">
                          The most direct way to journal, with options to add tags, track mood, and attach images to your entries.
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Journal Organization Features</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-muted/30 rounded-lg p-6 border border-border">
                        <h4 className="font-medium text-lg mb-2 flex items-center gap-2">
                          <Search className="h-5 w-5" />
                          Search & Filtering
                        </h4>
                        <p className="mb-4">
                          Find specific journal entries using the search feature. Filter entries by date range, mood, or tags to analyze patterns in your journaling.
                        </p>
                        <h5 className="font-medium mb-2">How to use search:</h5>
                        <ol className="list-decimal pl-6 space-y-1">
                          <li>Go to the Journal page</li>
                          <li>Use the search bar at the top</li>
                          <li>Type keywords, tags, or mood indicators</li>
                          <li>Use the date filter to narrow down results</li>
                        </ol>
                      </div>

                      <div className="bg-muted/30 rounded-lg p-6 border border-border">
                        <h4 className="font-medium text-lg mb-2 flex items-center gap-2">
                          <Star className="h-5 w-5" />
                          Tags & Mood Tracking
                        </h4>
                        <p className="mb-4">
                          Add tags to your journal entries to categorize them. Track your mood with each entry to visualize emotional patterns over time.
                        </p>
                        <h5 className="font-medium mb-2">Common tags to try:</h5>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">#gratitude</span>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">#goals</span>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">#reflection</span>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">#ideas</span>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">#work</span>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">#health</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="sms-commands">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Save className="h-5 w-5" />
                          <span>SMS Journal Commands (Premium)</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 px-1 pt-2">
                          <p>
                            Premium users can use special SMS commands to interact with Flappy and create journal entries:
                          </p>
                          <div className="bg-muted/30 p-4 rounded-lg border border-border">
                            <h5 className="font-medium mb-2">Journal Entry Commands:</h5>
                            <ul className="space-y-3">
                              <li className="border-b border-border pb-2">
                                <code className="bg-muted px-2 py-1 rounded">SAVE</code>
                                <p className="mt-1 text-sm">
                                  Converts your recent SMS conversation with Flappy into a journal entry. Great for preserving meaningful exchanges.
                                </p>
                              </li>
                              <li className="border-b border-border pb-2">
                                <code className="bg-muted px-2 py-1 rounded">Journal: [your entry]</code>
                                <p className="mt-1 text-sm">
                                  Add "Journal:" before your message to explicitly mark it as a journal entry.
                                </p>
                              </li>
                              <li className="border-b border-border pb-2">
                                <code className="bg-muted px-2 py-1 rounded">#journal #reflection [your entry]</code>
                                <p className="mt-1 text-sm">
                                  Include hashtags anywhere in your message to create a tagged journal entry.
                                </p>
                              </li>
                              <li>
                                <code className="bg-muted px-2 py-1 rounded">Diary: [your entry]</code> or <code className="bg-muted px-2 py-1 rounded">Note: [your entry]</code>
                                <p className="mt-1 text-sm">
                                  Additional prefixes that work like "Journal:" to create entries.
                                </p>
                              </li>
                            </ul>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            All journal commands automatically format your entries and save them to your journal, which you can view on the website.
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="journal-prompts">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          <span>Journal Prompts & Inspiration</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 px-1 pt-2">
                          <p>
                            Flappy sends daily inspiration to help jumpstart your journaling practice. Here's what to expect:
                          </p>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-muted/30 p-4 rounded-lg border border-border">
                              <h5 className="font-medium mb-2">Daily Inspirations</h5>
                              <p className="text-sm mb-3">
                                Flappy sends a daily email with a thoughtful prompt, quote, or reflection topic to inspire your journaling.
                              </p>
                              <p className="text-sm">
                                <strong>Example prompts:</strong> "What are three things you're grateful for today?" or "Reflect on a challenge you overcame recently."
                              </p>
                            </div>
                            <div className="bg-muted/30 p-4 rounded-lg border border-border">
                              <h5 className="font-medium mb-2">Weekly Insights</h5>
                              <p className="text-sm mb-3">
                                At the end of each week, Flappy sends an email summarizing patterns in your journaling and providing a deeper reflection topic.
                              </p>
                              <p className="text-sm">
                                <strong>Premium feature:</strong> Includes personalized insights based on your mood tracking and journal content.
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            You can adjust the frequency of these inspirational messages in your Settings under Email Preferences.
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </section>
              </TabsContent>

              <TabsContent value="email" className="space-y-8">
                <section>
                  <h2 className="text-2xl font-bold mb-4">Email Features</h2>
                  <p className="mb-6">
                    Email is the primary way Flappy communicates with you. Here's how to make the most of the email features:
                  </p>

                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="text-xl font-semibold mb-4">How Email Journaling Works</h3>
                      <ol className="list-decimal pl-6 space-y-3">
                        <li>
                          <strong>Receive inspiration:</strong> Flappy sends daily emails with prompts and inspiration.
                        </li>
                        <li>
                          <strong>Reply to journal:</strong> Simply reply to Flappy's emails to create journal entries.
                        </li>
                        <li>
                          <strong>Start new topics:</strong> Send a new email to flappy@featherweight.world with any subject.
                        </li>
                        <li>
                          <strong>Get responses:</strong> Flappy responds to your emails with insights and encouragement.
                        </li>
                        <li>
                          <strong>Review in app:</strong> All your email conversations appear in the Featherweight web app.
                        </li>
                      </ol>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-6 border border-border">
                      <h3 className="text-xl font-semibold mb-4">Email Tips & Tricks</h3>
                      <ul className="space-y-3">
                        <li className="flex gap-2">
                          <span className="text-primary">✓</span>
                          <div>
                            <strong>Subject lines matter:</strong> Use descriptive subject lines to organize your journal entries.
                          </div>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-primary">✓</span>
                          <div>
                            <strong>Include hashtags:</strong> Add #tags in your emails to categorize entries.
                          </div>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-primary">✓</span>
                          <div>
                            <strong>Express your mood:</strong> Include mood indicators like "I feel happy today" for tracking.
                          </div>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-primary">✓</span>
                          <div>
                            <strong>Ask questions:</strong> Flappy can respond to questions about your journaling practice.
                          </div>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-primary">✓</span>
                          <div>
                            <strong>Add attachments:</strong> Include images in your emails for visual journaling.
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Email Frequency Settings</h3>
                    <div className="bg-muted/30 rounded-lg p-6 border border-border">
                      <p className="mb-4">
                        You can control how often you receive emails from Flappy in your Settings page. Choose the option that works best for your journaling practice:
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Frequency Options:</h4>
                          <ul className="space-y-2">
                            <li className="flex items-center gap-2">
                              <span className="text-primary">•</span>
                              <strong>Daily:</strong> Receive inspiration every day
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-primary">•</span>
                              <strong>Weekdays only:</strong> Monday through Friday
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-primary">•</span>
                              <strong>Weekends only:</strong> Saturday and Sunday
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-primary">•</span>
                              <strong>Weekly:</strong> Once a week on Monday
                            </li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Other Email Settings:</h4>
                          <ul className="space-y-2">
                            <li className="flex items-center gap-2">
                              <span className="text-primary">•</span>
                              <strong>Marketing emails:</strong> Toggle promotional content
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-primary">•</span>
                              <strong>Weekly insights:</strong> Toggle summary emails
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="troubleshooting">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <HelpCircle className="h-5 w-5" />
                          <span>Email Troubleshooting</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 px-1 pt-2">
                          <p>
                            If you're having trouble with the email features, here are some common issues and solutions:
                          </p>
                          <div className="space-y-4">
                            <div className="bg-muted/30 p-4 rounded-lg border border-border">
                              <h5 className="font-medium mb-2">Not receiving emails from Flappy?</h5>
                              <ul className="space-y-2">
                                <li className="flex gap-2">
                                  <span className="text-primary">1.</span>
                                  <div>
                                    Check your spam/junk folder and mark messages as "not spam"
                                  </div>
                                </li>
                                <li className="flex gap-2">
                                  <span className="text-primary">2.</span>
                                  <div>
                                    Add flappy@featherweight.world to your contacts
                                  </div>
                                </li>
                                <li className="flex gap-2">
                                  <span className="text-primary">3.</span>
                                  <div>
                                    Check your email frequency settings in the Featherweight app
                                  </div>
                                </li>
                                <li className="flex gap-2">
                                  <span className="text-primary">4.</span>
                                  <div>
                                    Verify your email address is correct in your profile settings
                                  </div>
                                </li>
                              </ul>
                            </div>
                            <div className="bg-muted/30 p-4 rounded-lg border border-border">
                              <h5 className="font-medium mb-2">Emails not being processed correctly?</h5>
                              <ul className="space-y-2">
                                <li className="flex gap-2">
                                  <span className="text-primary">1.</span>
                                  <div>
                                    Make sure you're sending from the same email address as your account
                                  </div>
                                </li>
                                <li className="flex gap-2">
                                  <span className="text-primary">2.</span>
                                  <div>
                                    Keep the original subject line when replying
                                  </div>
                                </li>
                                <li className="flex gap-2">
                                  <span className="text-primary">3.</span>
                                  <div>
                                    Check that you're sending to flappy@featherweight.world
                                  </div>
                                </li>
                                <li className="flex gap-2">
                                  <span className="text-primary">4.</span>
                                  <div>
                                    Use the Email Test page to check system functionality
                                  </div>
                                </li>
                              </ul>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Still having issues? Contact support at help@featherweight.world
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </section>
              </TabsContent>

              <TabsContent value="sms" className="space-y-8">
                <section>
                  <h2 className="text-2xl font-bold mb-4">SMS Features (Premium)</h2>
                  <div className="bg-muted/30 rounded-lg p-6 border border-primary/30 mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Star className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Premium Feature</h3>
                    </div>
                    <p>
                      SMS journaling is available exclusively for premium subscribers. Upgrade your account to access these features.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Setting Up SMS</h3>
                      <ol className="list-decimal pl-6 space-y-3">
                        <li>
                          <strong>Upgrade to premium:</strong> Subscribe to the premium plan on the Billing page.
                        </li>
                        <li>
                          <strong>Add your phone number:</strong> Go to Settings and add your phone number in international format (e.g., +12345678901).
                        </li>
                        <li>
                          <strong>Toggle SMS features:</strong> Enable "Receive SMS" in your preferences.
                        </li>
                        <li>
                          <strong>Text Flappy:</strong> Send your first message to Flappy's number to start the conversation.
                        </li>
                        <li>
                          <strong>Test the features:</strong> Use the SMS Test page to verify your setup works correctly.
                        </li>
                      </ol>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-4">SMS Journaling Commands</h3>
                      <div className="bg-muted/30 rounded-lg p-6 border border-border">
                        <ul className="space-y-4">
                          <li>
                            <div className="font-medium">Text "SAVE"</div>
                            <p className="text-sm">
                              Converts your recent SMS conversation with Flappy into a journal entry. Great for preserving meaningful exchanges.
                            </p>
                          </li>
                          <li>
                            <div className="font-medium">Start with "Journal:", "Diary:", or "Note:"</div>
                            <p className="text-sm">
                              Prefixing your message with these keywords explicitly marks it as a journal entry.
                            </p>
                          </li>
                          <li>
                            <div className="font-medium">Use hashtags like #journal</div>
                            <p className="text-sm">
                              Include hashtags anywhere in your message to create a tagged journal entry.
                            </p>
                          </li>
                          <li>
                            <div className="font-medium">Regular conversation</div>
                            <p className="text-sm">
                              Messages without special commands are treated as regular conversations with Flappy.
                            </p>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Examples of SMS Interactions</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Creating a Journal Entry</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="bg-muted/50 p-3 rounded-lg text-sm">
                              <div className="font-medium mb-1">You:</div>
                              <p>Journal: Today I felt really productive at work. I finished the project that's been hanging over me for weeks.</p>
                            </div>
                            <div className="bg-primary/10 p-3 rounded-lg text-sm">
                              <div className="font-medium mb-1">Flappy:</div>
                              <p>I've saved your journal entry! Congratulations on finishing that project. It must feel wonderful to complete something that's been weighing on you. Would you like to reflect on what helped you be so productive today?</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Converting a Conversation</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="bg-muted/50 p-3 rounded-lg text-sm">
                              <div className="font-medium mb-1">You:</div>
                              <p>I'm feeling a bit overwhelmed with everything going on right now.</p>
                            </div>
                            <div className="bg-primary/10 p-3 rounded-lg text-sm">
                              <div className="font-medium mb-1">Flappy:</div>
                              <p>I understand how that feels. Would it help to break down what's on your mind? Sometimes identifying specific concerns can make them less overwhelming.</p>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-lg text-sm">
                              <div className="font-medium mb-1">You:</div>
                              <p>I think it's just too many deadlines at once, plus family stuff.</p>
                            </div>
                            <div className="bg-primary/10 p-3 rounded-lg text-sm">
                              <div className="font-medium mb-1">Flappy:</div>
                              <p>That's a lot to handle at once. Have you tried prioritizing your deadlines? And perhaps setting some boundaries around family obligations?</p>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-lg text-sm">
                              <div className="font-medium mb-1">You:</div>
                              <p>SAVE</p>
                            </div>
                            <div className="bg-primary/10 p-3 rounded-lg text-sm">
                              <div className="font-medium mb-1">Flappy:</div>
                              <p>I've saved our conversation as a journal entry. You can view it in your journal anytime. Is there anything else you'd like to discuss about managing these pressures?</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="sms-troubleshooting">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <HelpCircle className="h-5 w-5" />
                          <span>SMS Troubleshooting</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 px-1 pt-2">
                          <p>
                            If you're having trouble with SMS features, here are some common issues and solutions:
                          </p>
                          <div className="space-y-4">
                            <div className="bg-muted/30 p-4 rounded-lg border border-border">
                              <h5 className="font-medium mb-2">Not receiving SMS responses?</h5>
                              <ul className="space-y-2">
                                <li className="flex gap-2">
                                  <span className="text-primary">1.</span>
                                  <div>
                                    Verify your premium subscription is active
                                  </div>
                                </li>
                                <li className="flex gap-2">
                                  <span className="text-primary">2.</span>
                                  <div>
                                    Check that your phone number is correctly entered in international format
                                  </div>
                                </li>
                                <li className="flex gap-2">
                                  <span className="text-primary">3.</span>
                                  <div>
                                    Make sure SMS features are enabled in your settings
                                  </div>
                                </li>
                                <li className="flex gap-2">
                                  <span className="text-primary">4.</span>
                                  <div>
                                    Use the SMS Test page to check system functionality
                                  </div>
                                </li>
                              </ul>
                            </div>
                            <div className="bg-muted/30 p-4 rounded-lg border border-border">
                              <h5 className="font-medium mb-2">Journal entries not being created from SMS?</h5>
                              <ul className="space-y-2">
                                <li className="flex gap-2">
                                  <span className="text-primary">1.</span>
                                  <div>
                                    Make sure you're using the correct formats (Journal:, SAVE, etc.)
                                  </div>
                                </li>
                                <li className="flex gap-2">
                                  <span className="text-primary">2.</span>
                                  <div>
                                    Check that you're texting from the same phone number registered in your account
                                  </div>
                                </li>
                                <li className="flex gap-2">
                                  <span className="text-primary">3.</span>
                                  <div>
                                    Verify the journal entry isn't too short (must be at least a few words)
                                  </div>
                                </li>
                              </ul>
                            </div>
                          </div>
                          <div className="mt-4">
                            <h5 className="font-medium mb-2">Note about A2P 10DLC registration:</h5>
                            <p className="text-sm text-muted-foreground">
                              US phone numbers require A2P 10DLC registration to receive messages. This regulatory process may take a few days to complete after signing up. Non-US numbers may work immediately.
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </section>
              </TabsContent>

              <TabsContent value="billing" className="space-y-8">
                <section>
                  <h2 className="text-2xl font-bold mb-4">Billing & Subscription</h2>
                  <p className="mb-6">
                    Manage your Featherweight subscription and payment methods in the Billing section.
                  </p>

                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Premium Subscription</h3>
                      <div className="bg-muted/30 rounded-lg p-6 border border-border">
                        <h4 className="font-medium mb-3">$4.99/month includes:</h4>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2">
                            <span className="text-primary">✓</span>
                            <strong>SMS journaling capabilities</strong>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-primary">✓</span>
                            <strong>Ad-free experience</strong>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-primary">✓</span>
                            Advanced mood tracking insights
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-primary">✓</span>
                            Priority email processing
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-primary">✓</span>
                            Enhanced journal organization
                          </li>
                        </ul>
                        <div className="mt-4">
                          <h5 className="font-medium mb-2">How to subscribe:</h5>
                          <ol className="list-decimal pl-6 space-y-1 text-sm">
                            <li>Go to the Billing page</li>
                            <li>Click "Upgrade to Premium"</li>
                            <li>Enter your payment information</li>
                            <li>Confirm your subscription</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Managing Your Subscription</h3>
                      <div className="bg-muted/30 rounded-lg p-6 border border-border">
                        <h4 className="font-medium mb-3">Subscription Management:</h4>
                        <ul className="space-y-4">
                          <li>
                            <div className="font-medium">Update Payment Method</div>
                            <p className="text-sm">
                              You can update your credit card information at any time on the Billing page. Your subscription will automatically use the new payment method for future charges.
                            </p>
                          </li>
                          <li>
                            <div className="font-medium">Cancel Subscription</div>
                            <p className="text-sm">
                              To cancel your premium subscription, go to the Billing page and click "Cancel Subscription." You'll continue to have premium access until the end of your current billing period.
                            </p>
                          </li>
                          <li>
                            <div className="font-medium">View Billing History</div>
                            <p className="text-sm">
                              Your payment history is available on the Billing page, showing all transactions and their status.
                            </p>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Frequently Asked Billing Questions</h3>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="billing-cycle">
                        <AccordionTrigger>
                          <span>When am I billed for premium?</span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <p>
                            Your premium subscription is billed monthly on the same day you initially subscribed. For example, if you subscribe on the 15th, you'll be billed on the 15th of each month. You can see your next billing date on the Billing page.
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="cancel-refund">
                        <AccordionTrigger>
                          <span>Can I get a refund if I cancel?</span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <p>
                            We don't offer prorated refunds for partial months. When you cancel, your premium access continues until the end of your current billing period, after which your account will revert to the free plan.
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="payment-failed">
                        <AccordionTrigger>
                          <span>What happens if my payment fails?</span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <p>
                            If your payment fails, we'll attempt to charge your card again over the next few days. You'll receive an email notification about the failed payment. If we're unable to charge your card after multiple attempts, your subscription will be downgraded to the free plan.
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="resubscribe">
                        <AccordionTrigger>
                          <span>Can I resubscribe after cancelling?</span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <p>
                            Yes, you can resubscribe at any time. Simply go to the Billing page and click "Upgrade to Premium" to restart your subscription. Your account will be upgraded immediately upon successful payment.
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="settings" className="space-y-8">
                <section>
                  <h2 className="text-2xl font-bold mb-4">Account Settings</h2>
                  <p className="mb-6">
                    Customize your Featherweight experience through the Settings page.
                  </p>

                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Profile Settings</h3>
                      <div className="bg-muted/30 rounded-lg p-6 border border-border">
                        <h4 className="font-medium mb-3">Editable Profile Information:</h4>
                        <ul className="space-y-3">
                          <li>
                            <div className="font-medium">First Name & Last Name</div>
                            <p className="text-sm">
                              Your name is used in communications from Flappy to personalize messages.
                            </p>
                          </li>
                          <li>
                            <div className="font-medium">Phone Number</div>
                            <p className="text-sm">
                              Required for SMS features (premium only). Must be in international format (+12345678901).
                            </p>
                          </li>
                          <li>
                            <div className="font-medium">Bio</div>
                            <p className="text-sm">
                              A short description about yourself that helps Flappy understand your journaling goals.
                            </p>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Preference Settings</h3>
                      <div className="bg-muted/30 rounded-lg p-6 border border-border">
                        <h4 className="font-medium mb-3">Customizable Preferences:</h4>
                        <ul className="space-y-3">
                          <li>
                            <div className="font-medium">Email Frequency</div>
                            <p className="text-sm">
                              Control how often you receive inspiration emails: daily, weekdays, weekends, or weekly.
                            </p>
                          </li>
                          <li>
                            <div className="font-medium">Marketing Emails</div>
                            <p className="text-sm">
                              Toggle to receive or opt out of promotional content.
                            </p>
                          </li>
                          <li>
                            <div className="font-medium">Weekly Insights</div>
                            <p className="text-sm">
                              Toggle to receive weekly summary emails with journaling patterns and insights.
                            </p>
                          </li>
                          <li>
                            <div className="font-medium">Theme</div>
                            <p className="text-sm">
                              Choose between light, dark, or system theme for the web app.
                            </p>
                          </li>
                          <li>
                            <div className="font-medium">Receive SMS</div>
                            <p className="text-sm">
                              Toggle SMS capabilities (premium only).
                            </p>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Theme Settings</h3>
                    <div className="bg-muted/30 rounded-lg p-6 border border-border">
                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-white text-black p-4 rounded-lg border shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <Sun className="h-5 w-5" />
                            <h4 className="font-medium">Light Theme</h4>
                          </div>
                          <p className="text-sm">
                            A clean, bright interface that's perfect for daytime journaling. High contrast for good readability in well-lit environments.
                          </p>
                        </div>
                        <div className="bg-zinc-900 text-white p-4 rounded-lg border border-zinc-700 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <Moon className="h-5 w-5" />
                            <h4 className="font-medium">Dark Theme</h4>
                          </div>
                          <p className="text-sm">
                            A soothing, low-light interface that's easier on the eyes at night. Perfect for evening journaling sessions.
                          </p>
                        </div>
                        <div className="bg-gradient-to-b from-white to-zinc-900 text-zinc-700 p-4 rounded-lg border shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <Sun className="h-5 w-5" />
                            <Moon className="h-5 w-5" />
                            <h4 className="font-medium">System Theme</h4>
                          </div>
                          <p className="text-sm">
                            Automatically switches between light and dark themes based on your device's settings. Adapts to your daily routine.
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-4">
                        You can change your theme preference at any time in Settings. The system theme option will follow your device's dark/light mode settings automatically.
                      </p>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Account Security</h3>
                    <div className="bg-muted/30 rounded-lg p-6 border border-border">
                      <h4 className="font-medium mb-3">Security Recommendations:</h4>
                      <ul className="space-y-3">
                        <li className="flex gap-2">
                          <span className="text-primary">✓</span>
                          <div>
                            <strong>Use a strong password</strong>
                            <p className="text-sm">
                              Create a unique password with at least 8 characters, including uppercase letters, numbers, and symbols.
                            </p>
                          </div>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-primary">✓</span>
                          <div>
                            <strong>Log out on shared devices</strong>
                            <p className="text-sm">
                              Always log out when using Featherweight on public or shared computers.
                            </p>
                          </div>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-primary">✓</span>
                          <div>
                            <strong>Keep your email secure</strong>
                            <p className="text-sm">
                              Since your email is linked to your account, make sure your email account has strong security.
                            </p>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </section>
              </TabsContent>
            </Tabs>
          </Container>
        </main>
        <Footer />
      </div>
    </>
  );
}