import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { JournalList } from "@/components/journal/journal-list";
import { JournalSidebar } from "@/components/journal/journal-sidebar";
import { JournalForm } from "@/components/journal/journal-form";
import { WelcomeDialog } from "@/components/welcome-dialog";
import { Advertisement, MockAdvertisement } from "@/components/ui/advertisement";
import { Button } from "@/components/ui/button";
import { Helmet } from 'react-helmet';
import { PlusCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function JournalPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState({
    dateRange: "7days",
    mood: undefined,
    tags: [] as string[],
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Helmet>
        <title>My Journal - Featherweight</title>
        <meta name="description" content="View and manage your journal entries from Flappy. Reflect on your journey and explore your thoughts." />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow py-8 bg-background">
          {/* Welcome Dialog for new users */}
          <WelcomeDialog />
          
          <Container>
            {!user?.isPremium && (
              <div className="mb-6">
                <Advertisement adSlot="8137349583" adFormat="horizontal" className="w-full" />
              </div>
            )}
          
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h1 className="font-quicksand font-bold text-3xl mb-2">My Journal</h1>
                <p className="text-foreground/70">
                  Review and reflect on your journey with Flappy
                </p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <PlusCircle size={16} />
                    New Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                  <DialogHeader className="mb-4">
                    <DialogTitle>Create New Journal Entry</DialogTitle>
                    <DialogDescription>
                      Document your thoughts, feelings, and reflections with Flappy.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="pb-20 md:pb-0">
                    <JournalForm 
                      onSuccess={() => setIsDialogOpen(false)}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
              {/* Sidebar with filters */}
              <div className="md:w-1/4">
                <JournalSidebar />
                
                {/* Vertical ad for desktop */}
                {!user?.isPremium && (
                  <div className="hidden md:block mt-6">
                    <Advertisement adSlot="8137349583" adFormat="vertical" className="mx-auto" />
                  </div>
                )}
              </div>
              
              {/* Journal entries */}
              <div className="md:w-3/4">
                <JournalList filter={filter} />
                
                {/* Bottom ad */}
                {!user?.isPremium && (
                  <div className="mt-8">
                    <Advertisement adSlot="8137349583" adFormat="auto" className="w-full" />
                  </div>
                )}
              </div>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    </>
  );
}
