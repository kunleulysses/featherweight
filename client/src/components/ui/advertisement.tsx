import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";

interface AdProps {
  adSlot: string;
  adFormat?: "auto" | "rectangle" | "horizontal" | "vertical";
  className?: string;
}

export function Advertisement({ adSlot, adFormat = "auto", className = "" }: AdProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
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
        if (adFormat === "auto") {
          adElement.setAttribute("data-ad-format", "auto");
          adElement.setAttribute("data-full-width-responsive", "true");
        } else if (adFormat === "rectangle") {
          adElement.style.width = "300px";
          adElement.style.height = "250px";
        } else if (adFormat === "horizontal") {
          adElement.style.width = "728px";
          adElement.style.height = "90px";
        } else if (adFormat === "vertical") {
          adElement.style.width = "160px";
          adElement.style.height = "600px";
        }
        
        // Append the ad to the container
        adRef.current.appendChild(adElement);
        
        // Push the ad to AdSense
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.error("AdSense error:", error);
      }
    }
  }, [adSlot, adFormat]);

  return (
    <div ref={adRef} className={`ad-container ${className}`}>
      <div className="text-sm text-center text-muted-foreground mb-1">Advertisement</div>
      <div className="min-h-[250px] flex items-center justify-center bg-muted">
        <div className="text-sm text-muted-foreground">
          Loading advertisement...
        </div>
      </div>
    </div>
  );
}

// For testing when AdSense is not available
export function MockAdvertisement({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  
  // Don't show ads to premium users
  if (user?.isPremium) {
    return null;
  }

  return (
    <div className={`ad-container ${className}`}>
      <div className="text-sm text-center text-muted-foreground mb-1">Advertisement</div>
      <div 
        className="min-h-[250px] border border-dashed border-muted-foreground/20 bg-muted/30 rounded-md flex items-center justify-center"
      >
        <div className="text-center p-4">
          <p className="text-sm font-medium mb-2">Upgrade to Premium</p>
          <p className="text-xs text-muted-foreground">
            Enjoy an ad-free experience, SMS journaling, and more with Featherweight Premium.
          </p>
          <button 
            onClick={() => window.location.href="/subscription"}
            className="mt-3 text-xs bg-primary/90 hover:bg-primary text-primary-foreground px-3 py-1 rounded-md"
          >
            Get Premium
          </button>
        </div>
      </div>
    </div>
  );
}