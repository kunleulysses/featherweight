import { useState } from "react";
import { formatDistance } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { JournalEntry } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Edit, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface JournalCardProps {
  entry: JournalEntry;
}

export function JournalCard({ entry }: JournalCardProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const formattedDate = entry.createdAt 
    ? formatDistance(new Date(entry.createdAt), new Date(), { addSuffix: true })
    : '';

  const moodEmoji = {
    happy: "😊",
    calm: "😌",
    neutral: "😐",
    sad: "😔",
    frustrated: "😤"
  }[entry.mood || "neutral"];

  const borderColorClass = {
    happy: "border-primary",
    calm: "border-accent",
    neutral: "border-border",
    sad: "border-secondary",
    frustrated: "border-destructive"
  }[entry.mood || "neutral"];

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/journal/${entry.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      toast({
        title: "Entry deleted",
        description: "Your journal entry has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete journal entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className={`shadow-sm hover:shadow-md transition-shadow duration-300 ${borderColorClass} border-l-4 rounded-lg overflow-hidden`}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-quicksand font-semibold text-lg text-foreground">{entry.title || "Untitled Entry"}</h3>
            <p className="text-sm text-muted-foreground">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''} • {formattedDate}</p>
          </div>
          <div className="text-xl">{moodEmoji}</div>
        </div>
        
        <p className="text-foreground/80 mb-4 whitespace-pre-line">
          {entry.content}
        </p>
        
        {entry.imageUrl && (
          <div className="mb-4 rounded-[0.75rem] overflow-hidden">
            <img 
              src={entry.imageUrl} 
              alt="Journal entry" 
              className="w-full h-auto max-h-[300px] object-contain"
              loading="lazy" 
            />
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <div className="flex flex-wrap gap-2">
            {entry.tags && entry.tags.map((tag, index) => (
              <span 
                key={index} 
                className={`text-xs ${
                  tag.startsWith('#gratitude') ? 'bg-primary/10 text-primary' : 
                  tag.startsWith('#reflection') ? 'bg-secondary/10 text-secondary' : 
                  'bg-accent/10 text-accent'
                } px-2 py-1 rounded-full`}
              >
                {tag}
              </span>
            ))}
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-primary/10"
              aria-label="Edit entry"
            >
              <Edit className="h-[18px] w-[18px]" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full hover:bg-destructive/10"
                  aria-label="Delete entry"
                >
                  <Trash2 className="h-[18px] w-[18px]" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[90vw] md:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-center">Delete Journal Entry</AlertDialogTitle>
                  <AlertDialogDescription className="text-center">
                    This action cannot be undone. This will permanently delete your
                    journal entry and its attached image (if any).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="mt-0 w-full sm:w-auto">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
                  >
                    {isDeleting ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </div>
                    ) : (
                      "Delete Entry"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
