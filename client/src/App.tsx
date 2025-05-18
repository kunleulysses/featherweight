import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import JournalPage from "@/pages/journal-page";
import SettingsPage from "@/pages/settings-page";
import SmsPage from "@/pages/sms-page";
import MoodTrackerPage from "@/pages/mood-tracker-page";
import SubscriptionPage from "@/pages/subscription-page";
import ConversationPage from "@/pages/conversation-page";
import AboutPage from "@/pages/about-page";
import TermsPage from "@/pages/terms-page";
import PrivacyPage from "@/pages/privacy-page";
import ContactPage from "@/pages/contact-page";
import BillingPage from "@/pages/billing-page";
import HelpPage from "@/pages/help-page";
import EmailTestPage from "@/pages/email-test";
import SmsTestPage from "@/pages/sms-test";
import ConversationCenterPage from "@/pages/conversation-center-page";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/reset-password" component={AuthPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/help" component={HelpPage} />
      <ProtectedRoute path="/journal" component={JournalPage} />
      <ProtectedRoute path="/mood-tracker" component={MoodTrackerPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/sms" component={SmsPage} />
      <ProtectedRoute path="/subscription" component={SubscriptionPage} />
      <ProtectedRoute path="/billing" component={BillingPage} />
      <ProtectedRoute path="/conversation" component={ConversationPage} />
      <ProtectedRoute path="/conversation-center" component={ConversationCenterPage} />
      <ProtectedRoute path="/direct-chat" component={ConversationCenterPage} />
      <ProtectedRoute path="/email-test" component={EmailTestPage} />
      <ProtectedRoute path="/sms-test" component={SmsTestPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <Router />
    </TooltipProvider>
  );
}

export default App;
