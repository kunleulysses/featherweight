import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from 'react-helmet';

const profileFormSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  bio: z.string().max(160).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const emailPreferencesSchema = z.object({
  emailFrequency: z.enum(["daily", "weekdays", "weekends", "weekly"]),
  marketingEmails: z.boolean().default(false),
  receiveInsights: z.boolean().default(true),
});

type EmailPreferencesValues = z.infer<typeof emailPreferencesSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
      bio: "",
    },
  });

  // Email preferences form
  const emailPreferencesForm = useForm<EmailPreferencesValues>({
    resolver: zodResolver(emailPreferencesSchema),
    defaultValues: {
      emailFrequency: "daily",
      marketingEmails: false,
      receiveInsights: true,
    },
  });

  function onProfileSubmit(data: ProfileFormValues) {
    setIsSubmitting(true);
    
    // Simulate API call to update profile
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    }, 1000);
  }

  function onEmailPreferencesSubmit(data: EmailPreferencesValues) {
    setIsSubmitting(true);
    
    // Simulate API call to update email preferences
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Email preferences updated",
        description: "Your email preferences have been saved successfully.",
      });
    }, 1000);
  }

  return (
    <>
      <Helmet>
        <title>Settings - Featherweight</title>
        <meta name="description" content="Manage your Featherweight account settings, update your profile, and customize your email preferences." />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow py-8 bg-background">
          <Container>
            <div className="mb-8">
              <h1 className="font-quicksand font-bold text-3xl mb-2">Settings</h1>
              <p className="text-foreground/70">
                Manage your account and customize your experience
              </p>
            </div>
            
            <Tabs defaultValue="profile" className="max-w-3xl mx-auto">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="profile" className="font-quicksand">Profile</TabsTrigger>
                <TabsTrigger value="email" className="font-quicksand">Email Preferences</TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-quicksand">Profile</CardTitle>
                    <CardDescription>
                      Update your personal information and how you appear in Featherweight
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                        <FormField
                          control={profileForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="Your username" {...field} />
                              </FormControl>
                              <FormDescription>
                                This is your public display name.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="your.email@example.com" {...field} />
                              </FormControl>
                              <FormDescription>
                                This is where you'll receive emails from Flappy.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Tell us a bit about yourself"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                This helps Flappy personalize your experience.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="font-quicksand" 
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Saving..." : "Save changes"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="email">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-quicksand">Email Preferences</CardTitle>
                    <CardDescription>
                      Customize how and when you receive emails from Flappy
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...emailPreferencesForm}>
                      <form onSubmit={emailPreferencesForm.handleSubmit(onEmailPreferencesSubmit)} className="space-y-6">
                        <FormField
                          control={emailPreferencesForm.control}
                          name="emailFrequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Frequency</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select email frequency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="daily">Daily (every day)</SelectItem>
                                  <SelectItem value="weekdays">Weekdays only (Mon-Fri)</SelectItem>
                                  <SelectItem value="weekends">Weekends only (Sat-Sun)</SelectItem>
                                  <SelectItem value="weekly">Weekly (once a week)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                How often would you like to receive emails from Flappy?
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={emailPreferencesForm.control}
                          name="receiveInsights"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Weekly Insights</FormLabel>
                                <FormDescription>
                                  Receive weekly insights and reflections from Flappy based on your journal entries.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={emailPreferencesForm.control}
                          name="marketingEmails"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Marketing Emails</FormLabel>
                                <FormDescription>
                                  Receive updates about new features and special offers from Featherweight.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="font-quicksand" 
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Saving..." : "Save preferences"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </Container>
        </main>
        <Footer />
      </div>
    </>
  );
}
