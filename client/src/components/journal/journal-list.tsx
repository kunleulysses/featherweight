import { useQuery } from '@tanstack/react-query';
import { JournalCard } from './journal-card';
import { Skeleton } from '@/components/ui/skeleton';
import { JournalEntry } from '@shared/schema';
import { Loader2 } from 'lucide-react';

interface JournalListProps {
  filter?: {
    dateRange?: string;
    mood?: string;
    tags?: string[];
  };
}

export function JournalList({ filter }: JournalListProps) {
  const { data: entries, isLoading, error } = useQuery<JournalEntry[]>({
    queryKey: ['/api/journal', filter],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-[0.75rem] p-5 shadow-md border-l-4 border-border">
            <div className="flex justify-between items-start mb-3">
              <div>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-24 w-full mb-4" />
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-[0.75rem] p-6 shadow-md text-center">
        <p className="text-destructive mb-2">Failed to load journal entries</p>
        <p className="text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="bg-white rounded-[0.75rem] p-8 shadow-md text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h3 className="font-quicksand font-semibold text-xl mb-2">No journal entries yet</h3>
        <p className="text-muted-foreground mb-4">
          Start journaling by replying to Flappy's emails or create a new entry here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4 overflow-hidden">
      {entries.map((entry) => (
        <div key={entry.id} className="transform transition-transform duration-200 hover:translate-y-[-2px]">
          <JournalCard entry={entry} />
        </div>
      ))}
    </div>
  );
}
