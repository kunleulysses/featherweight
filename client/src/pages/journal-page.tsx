import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { JournalList } from "@/components/journal/journal-list";
import { JournalSidebar } from "@/components/journal/journal-sidebar";
import { Helmet } from 'react-helmet';

export default function JournalPage() {
  const [filter, setFilter] = useState({
    dateRange: "7days",
    mood: null,
    tags: [],
  });

  return (
    <>
      <Helmet>
        <title>My Journal - Featherweight</title>
        <meta name="description" content="View and manage your journal entries from Flappy. Reflect on your journey and explore your thoughts." />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow py-8 bg-background">
          <Container>
            <div className="mb-8">
              <h1 className="font-quicksand font-bold text-3xl mb-2">My Journal</h1>
              <p className="text-foreground/70">
                Review and reflect on your journey with Flappy
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
              {/* Sidebar with filters */}
              <div className="md:w-1/4">
                <JournalSidebar />
              </div>
              
              {/* Journal entries */}
              <div className="md:w-3/4">
                <JournalList filter={filter} />
              </div>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    </>
  );
}
