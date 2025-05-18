import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema } from "@shared/schema";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Helmet } from 'react-helmet';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Extend schema for client-side validation
const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const loginSchema = insertUserSchema.pick({
  email: true,
  password: true,
});

// Add forgot password schema
const forgotPasswordSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

// Add reset password schema
const resetPasswordSchema = z.object({
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  confirmPassword: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;
type LoginFormValues = z.infer<typeof loginSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState("");
  
  // For reset password flow
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [resetMessage, setResetMessage] = useState("");
  
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const { user, loginMutation, registerMutation } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/journal");
    }
  }, [user, navigate]);
  
  // Check for reset token in URL
  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get('token');
    if (token) {
      setResetToken(token);
    }
  }, [search]);

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  // Forgot password form
  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });
  
  // Reset password form
  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onRegisterSubmit = (data: RegisterFormValues) => {
    const { confirmPassword, ...userData } = data;
    registerMutation.mutate(userData, {
      onSuccess: () => {
        // Force navigation after registration
        navigate("/journal");
      }
    });
  };

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        // Force navigation after login
        navigate("/journal");
      }
    });
  };
  
  const onForgotPasswordSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      setForgotPasswordStatus("loading");
      const response = await apiRequest("POST", "/api/forgot-password", data);
      const result = await response.json();
      
      if (response.ok) {
        setForgotPasswordStatus("success");
        setForgotPasswordMessage(result.message || "If your email exists in our system, you'll receive a reset link shortly.");
      } else {
        setForgotPasswordStatus("error");
        setForgotPasswordMessage(result.message || "An error occurred. Please try again.");
      }
    } catch (error) {
      setForgotPasswordStatus("error");
      setForgotPasswordMessage("An error occurred. Please try again.");
    }
  };
  
  const onResetPasswordSubmit = async (data: ResetPasswordFormValues) => {
    if (!resetToken) return;
    
    try {
      setResetStatus("loading");
      const response = await apiRequest("POST", "/api/reset-password", {
        token: resetToken,
        newPassword: data.password
      });
      const result = await response.json();
      
      if (response.ok) {
        setResetStatus("success");
        setResetMessage("Your password has been reset successfully. You can now log in with your new password.");
        
        // Clear the token from URL after successful reset
        window.history.replaceState({}, document.title, "/auth");
        
        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          setResetToken(null);
          setActiveTab("login");
        }, 3000);
      } else {
        setResetStatus("error");
        setResetMessage(result.message || "Failed to reset password. Please try again or request a new reset link.");
      }
    } catch (error) {
      setResetStatus("error");
      setResetMessage("An error occurred. Please try again.");
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign In or Register - Featherweight</title>
        <meta name="description" content="Sign in to your Featherweight account or create a new one to start journaling with Flappy, your email companion." />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow py-12 bg-background">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
              {/* Auth Forms */}
              <div>
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle className="font-quicksand text-2xl text-center">Welcome to Featherweight</CardTitle>
                    <CardDescription className="text-center">
                      Sign in to your account or create a new one to start your journey with Flappy
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
                      <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="login" className="font-quicksand">Login</TabsTrigger>
                        <TabsTrigger value="register" className="font-quicksand">Register</TabsTrigger>
                      </TabsList>
                      
                      {/* Login Tab */}
                      <TabsContent value="login">
                        <Form {...loginForm}>
                          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                            <FormField
                              control={loginForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input placeholder="your.email@example.com" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={loginForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Password</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="••••••••" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button 
                              type="submit" 
                              className="w-full font-quicksand" 
                              disabled={loginMutation.isPending}
                            >
                              {loginMutation.isPending ? "Signing in..." : "Sign in"}
                            </Button>
                            
                            <div className="flex justify-between items-center w-full mt-4">
                              <button
                                type="button"
                                className="text-xs text-muted-foreground hover:text-primary"
                                onClick={() => setShowForgotPassword(true)}
                              >
                                Forgot password?
                              </button>
                              <button
                                type="button"
                                className="text-xs text-muted-foreground hover:text-primary"
                                onClick={() => setActiveTab("register")}
                              >
                                Don't have an account? Register
                              </button>
                            </div>
                          </form>
                        </Form>
                      </TabsContent>
                      
                      {/* Register Tab */}
                      <TabsContent value="register">
                        <Form {...registerForm}>
                          <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={registerForm.control}
                                name="firstName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>First Name</FormLabel>
                                    <FormControl>
                                      <Input placeholder="John" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={registerForm.control}
                                name="lastName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Last Name</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={registerForm.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Username</FormLabel>
                                  <FormControl>
                                    <Input placeholder="flappyfan" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={registerForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input placeholder="your.email@example.com" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={registerForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Password</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="••••••••" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={registerForm.control}
                              name="confirmPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Confirm Password</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="••••••••" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button 
                              type="submit" 
                              className="w-full font-quicksand" 
                              disabled={registerMutation.isPending}
                            >
                              {registerMutation.isPending ? "Creating account..." : "Create account"}
                            </Button>
                          </form>
                        </Form>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-2 text-center text-sm text-muted-foreground">
                    <p>By continuing, you agree to Featherweight's Terms of Service and Privacy Policy.</p>
                  </CardFooter>
                </Card>
              </div>
              
              {/* Hero Section */}
              <div className="hidden lg:block">
                <div className="text-center lg:text-left">
                  <h1 className="font-quicksand font-bold text-3xl md:text-4xl text-foreground mb-6">
                    Begin Your Journaling Journey with <span className="text-primary">Flappy</span>
                  </h1>
                  <p className="text-lg text-foreground/70 mb-6">
                    Join Featherweight and discover the joy of journaling through email. Get daily inspiration from Flappy, your cosmic pelican companion with ancient wisdom and playful energy.
                  </p>
                  <div className="space-y-6">
                    <div className="flex items-start space-x-3">
                      <div className="bg-primary/10 p-2 rounded-full mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z"/><polyline points="15,9 18,9 18,11"/><path d="M6 10V5.5C6 4.1 7.1 3 8.5 3H15"/><rect x="6" y="9" width="6" height="2" rx="1"/></svg>
                      </div>
                      <div>
                        <h3 className="font-quicksand font-semibold text-lg">Daily Inspiration in Your Inbox</h3>
                        <p className="text-foreground/70">
                          Start each day with Flappy's wisdom, delivered straight to your email.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="bg-secondary/10 p-2 rounded-full mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
                      </div>
                      <div>
                        <h3 className="font-quicksand font-semibold text-lg">Journal With Ease</h3>
                        <p className="text-foreground/70">
                          Simply reply to Flappy's emails to create journal entries. No apps to open.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="bg-accent/10 p-2 rounded-full mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
                      </div>
                      <div>
                        <h3 className="font-quicksand font-semibold text-lg">Track Your Growth</h3>
                        <p className="text-foreground/70">
                          Watch your journey unfold as Flappy helps you reflect and grow over time.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    </>
  );
}
