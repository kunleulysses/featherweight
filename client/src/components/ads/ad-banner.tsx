import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export interface AdBannerProps {
  format?: "horizontal" | "vertical" | "square" | "email";
  className?: string;
}

export function AdBanner({ format = "horizontal", className }: AdBannerProps) {
  const { user } = useAuth();
  
  // Don't show ads to premium users
  if (user?.isPremium) {
    return null;
  }
  
  const baseClasses = "bg-muted/30 border border-border rounded-md overflow-hidden text-center relative";
  const formatClasses = {
    horizontal: "h-20 w-full",
    vertical: "h-60 w-40",
    square: "h-40 w-40",
    email: "h-16 w-full"
  };
  
  return (
    <Card className={`${baseClasses} ${formatClasses[format]} ${className || ""}`}>
      <CardContent className="p-2 h-full flex flex-col justify-center items-center">
        <div className="text-xs text-muted-foreground font-medium mb-1">Advertisement</div>
        
        {format === "email" ? (
          <div className="text-xs text-muted-foreground">
            Upgrade to Premium to remove ads
          </div>
        ) : (
          <>
            <div className="text-sm text-foreground font-medium">
              Upgrade to Premium
            </div>
            <div className="text-xs text-muted-foreground">
              Remove ads and unlock SMS journaling
            </div>
            <a href="/subscription" className="text-xs text-primary mt-1 flex items-center">
              Learn More <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </>
        )}
      </CardContent>
    </Card>
  );
}