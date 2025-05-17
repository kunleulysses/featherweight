import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export interface AdBannerProps {
  format?: "horizontal" | "vertical" | "square" | "email";
  className?: string;
  adSlot?: string;
}

export function AdBanner({ format = "horizontal", className, adSlot = "8137349583" }: AdBannerProps) {
  const { user } = useAuth();
  const adRef = useRef<HTMLDivElement>(null);
  
  // Don't show ads to premium users
  if (user?.isPremium) {
    return null;
  }
  
  useEffect(() => {
    // Check if Google AdSense is loaded
    if (window.adsbygoogle && adRef.current) {
      try {
        // Clear the container first (for hot reloads)
        adRef.current.innerHTML = "";
        
        // Create the ad
        const adElement = document.createElement("ins");
        adElement.className = "adsbygoogle";
        adElement.style.display = "block";
        adElement.setAttribute("data-ad-client", "ca-pub-7052935120099779");
        adElement.setAttribute("data-ad-slot", adSlot);
        
        // Set ad format
        if (format === "horizontal") {
          adElement.style.width = "728px";
          adElement.style.height = "90px";
        } else if (format === "vertical") {
          adElement.style.width = "160px";
          adElement.style.height = "600px";
        } else if (format === "square") {
          adElement.style.width = "300px";
          adElement.style.height = "250px";
        } else if (format === "email") {
          adElement.style.width = "100%";
          adElement.style.height = "60px";
        } else {
          adElement.setAttribute("data-ad-format", "auto");
          adElement.setAttribute("data-full-width-responsive", "true");
        }
        
        // Append the ad to the container
        adRef.current.appendChild(adElement);
        
        // Push the ad to AdSense
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.error("AdSense error:", error);
      }
    }
  }, [adSlot, format]);
  
  const baseClasses = "bg-muted/30 border border-border rounded-md overflow-hidden text-center relative";
  const formatClasses = {
    horizontal: "h-[90px] w-full",
    vertical: "h-[600px] w-[160px]",
    square: "h-[250px] w-[300px]",
    email: "h-16 w-full"
  };
  
  return (
    <Card className={`${baseClasses} ${formatClasses[format]} ${className || ""}`}>
      <div className="text-xs text-muted-foreground font-medium text-center pt-1">Advertisement</div>
      <div ref={adRef} className="ad-container h-[calc(100%-20px)] flex items-center justify-center">
        {/* Fallback content while AdSense loads or if it fails */}
        <CardContent className="p-2 flex flex-col justify-center items-center">
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
      </div>
    </Card>
  );
}