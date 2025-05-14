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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Helmet } from 'react-helmet';

const profileFormSchema = z.object({
  firstName: z.string().min(1, {
    message: "First name is required.",
  }).optional(),
  lastName: z.string().min(1, {
    message: "Last name is required.",
  }).optional(),
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phoneNumber: z.string()
    .optional()
    .refine(val => !val || /^\+?[1-9]\d{1,14}$/.test(val), {
      message: "Please enter a valid phone number in E.164 format (e.g., +14155552671)"
    }),
  bio: z.string().max(160).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const emailPreferencesSchema = z.object({
  emailFrequency: z.enum(["daily", "weekdays", "weekends", "weekly"]),
  marketingEmails: z.boolean().default(false),
  receiveInsights: z.boolean().default(true),
  receiveSms: z.boolean().default(false),
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
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      username: user?.username || "",
      email: user?.email || "",
      phoneNumber: user?.preferences?.phoneNumber || "",
      bio: "",
    },
  });

  // Email preferences form
  const emailPreferencesForm = useForm<EmailPreferencesValues>({
    resolver: zodResolver(emailPreferencesSchema),
    defaultValues: {
      emailFrequency: user?.preferences?.emailFrequency || "daily",
      marketingEmails: user?.preferences?.marketingEmails || false,
      receiveInsights: user?.preferences?.receiveInsights || true,
      receiveSms: user?.preferences?.receiveSms || false,
    },
  });

  function onProfileSubmit(data: ProfileFormValues) {
    setIsSubmitting(true);
    let phoneNumberChanged = false;
    let profileChanged = false;
    let updates = 0;
    
    // Check if profile information has changed - username, email, firstName, or lastName
    if (data.username !== user?.username || 
        data.email !== user?.email ||
        data.firstName !== user?.firstName ||
        data.lastName !== user?.lastName) {
      profileChanged = true;
    }
    
    // Update phone number if it has changed
    if (data.phoneNumber !== user?.preferences?.phoneNumber) {
      phoneNumberChanged = true;
      updates++;
      
      apiRequest("PATCH", "/api/user/phone", { phoneNumber: data.phoneNumber })
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to update phone number");
          }
          return res.json();
        })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          updates--;
          
          // Only show toast if this is the only update or the last one to complete
          if (updates === 0) {
            if (phoneNumberChanged && profileChanged) {
              toast({
                title: "Settings updated",
                description: "Your profile information and phone number have been updated successfully.",
              });
            } else if (phoneNumberChanged) {
              toast({
                title: "Phone number updated",
                description: "Your phone number has been updated successfully.",
              });
            } else if (profileChanged) {
              toast({
                title: "Profile updated",
                description: "Your profile information has been updated successfully.",
              });
            } else {
              toast({
                title: "No changes detected",
                description: "No changes were made to your profile.",
              });
            }
            setIsSubmitting(false);
          }
        })
        .catch((error) => {
          toast({
            title: "Update failed",
            description: error.message,
            variant: "destructive",
          });
          setIsSubmitting(false);
        });
    } else {
      setIsSubmitting(false);
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    }
  }

  function onEmailPreferencesSubmit(data: EmailPreferencesValues) {
    setIsSubmitting(true);
    
    // Update user preferences
    apiRequest("PATCH", "/api/user/preferences", data)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to update preferences");
        }
        return res.json();
      })
      .then(() => {
        toast({
          title: "Preferences updated",
          description: "Your preferences have been saved successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      })
      .catch((error) => {
        toast({
          title: "Update failed",
          description: error.message,
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
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
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="profile" className="font-quicksand">Profile</TabsTrigger>
                <TabsTrigger value="email" className="font-quicksand">Email Preferences</TabsTrigger>
                <TabsTrigger value="subscription" className="font-quicksand">Subscription</TabsTrigger>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={profileForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="John" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={profileForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Doe" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
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
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number (Premium Feature)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="+14155552671" 
                                  {...field} 
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormDescription>
                                Add your phone number to enable SMS journaling. Premium feature only.
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
                          name="receiveSms"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">SMS Journaling (Premium)</FormLabel>
                                <FormDescription>
                                  Receive daily inspirations and journal by sending SMS messages to Flappy. Requires a phone number and premium subscription.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value && user?.isPremium}
                                  disabled={!user?.isPremium}
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
              
              <TabsContent value="subscription">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-quicksand">Subscription Management</CardTitle>
                    <CardDescription>
                      Manage your Featherweight subscription and billing information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="rounded-lg border p-4">
                      <h3 className="text-lg font-semibold mb-2">Current Plan</h3>
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`p-2 rounded-full ${user?.isPremium ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {user?.isPremium ? 
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L5 7.875L7.5 17H16.5L19 7.875L12 2Z"></path><path d="M12 9L9 14H15L12 9Z"></path></svg> :
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>
                          }
                        </div>
                        <span className="font-semibold">{user?.isPremium ? 'Premium' : 'Free Plan'}</span>
                      </div>
                      
                      {user?.isPremium && user?.premiumUntil && (
                        <div className="text-sm text-muted-foreground mb-4">
                          Your subscription renews on {new Date(user.premiumUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center">
                        {user?.isPremium ? (
                          <div className="text-sm">
                            $4.99/month
                          </div>
                        ) : (
                          <div className="text-sm">
                            Free plan - Limited features
                          </div>
                        )}
                        
                        <Button 
                          variant={user?.isPremium ? "destructive" : "default"}
                          size="sm"
                          onClick={() => {
                            if (user?.isPremium) {
                              if (window.confirm("Are you sure you want to cancel your premium subscription? You'll lose access to premium features at the end of your billing period.")) {
                                setIsSubmitting(true);
                                apiRequest("PATCH", "/api/user/subscription", {
                                  isPremium: false,
                                  durationMonths: 0,
                                })
                                .then(res => {
                                  if (!res.ok) throw new Error("Failed to cancel subscription");
                                  queryClient.invalidateQueries({ queryKey: ["/api/user"] });
                                  toast({
                                    title: "Subscription cancelled",
                                    description: "Your premium subscription has been cancelled. You'll have access until the end of your current billing period.",
                                  });
                                })
                                .catch(error => {
                                  toast({
                                    title: "Error",
                                    description: error.message,
                                    variant: "destructive",
                                  });
                                })
                                .finally(() => {
                                  setIsSubmitting(false);
                                });
                              }
                            } else {
                              window.location.href = '/subscription';
                            }
                          }}
                          disabled={isSubmitting}
                        >
                          {isSubmitting 
                            ? "Processing..." 
                            : user?.isPremium 
                              ? "Cancel Subscription" 
                              : "Upgrade to Premium"
                          }
                        </Button>
                      </div>
                    </div>
                    
                    {user?.isPremium && (
                      <div className="rounded-lg border p-4">
                        <h3 className="text-lg font-semibold mb-2">Payment Information</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Payment method</span>
                            <span>Visa ending in {user?.paymentDetails?.lastFour || '4242'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Billing date</span>
                            <span>Monthly on day {user?.paymentDetails?.billingDate || new Date().getDate()}</span>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.location.href = '/billing'}
                          >
                            Manage Billing Details
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="rounded-lg bg-muted p-4 text-sm">
                      <h3 className="font-medium mb-1">Need help with your subscription?</h3>
                      <p className="text-muted-foreground mb-3">
                        If you have any questions about your subscription or need assistance, please contact our support team.
                      </p>
                      <a 
                        href="mailto:support@featherweight.com" 
                        className="text-primary hover:underline inline-block"
                      >
                        support@featherweight.com
                      </a>
                    </div>
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
