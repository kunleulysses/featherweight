import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Menu, X, Feather } from "lucide-react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const isActive = (path: string) => location === path;
  
  const toggleMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="sticky top-0 z-10 bg-white shadow-md">
      <Container className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Feather className="h-5 w-5 text-white" />
            </div>
            <Link href="/" className="font-quicksand font-bold text-2xl text-primary">
              Featherweight
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className={`font-quicksand font-medium ${isActive("/") ? "text-primary font-bold" : "text-gray-700 hover:text-primary"} transition-colors`}>
                Home
            </Link>
            
            {user ? (
              <>
                <Link href="/journal" className={`font-quicksand font-medium ${isActive("/journal") ? "text-primary font-bold" : "text-gray-700 hover:text-primary"} transition-colors`}>
                    Journal
                </Link>
                <Link href="/conversation-center" className={`font-quicksand font-medium ${isActive("/conversation-center") ? "text-primary font-bold" : "text-gray-700 hover:text-primary"} transition-colors`}>
                    Chat with Flappy
                </Link>
                <Link href="/mood-tracker" className={`font-quicksand font-medium ${isActive("/mood-tracker") ? "text-primary font-bold" : "text-gray-700 hover:text-primary"} transition-colors`}>
                    Mood Feathers
                </Link>
                <Link href="/sms" className={`font-quicksand font-medium ${isActive("/sms") ? "text-primary font-bold" : "text-gray-700 hover:text-primary"} transition-colors`}>
                    SMS
                    {user?.isPremium && <span className="ml-1 text-xs text-green-500">•</span>}
                </Link>
                <Link href="/settings" className={`font-quicksand font-medium ${isActive("/settings") ? "text-primary font-bold" : "text-gray-700 hover:text-primary"} transition-colors`}>
                    Settings
                </Link>
                <Button 
                  onClick={handleLogout} 
                  variant="outline"
                  className="font-quicksand font-medium"
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? "Signing Out..." : "Sign Out"}
                </Button>
              </>
            ) : (
              <Link href="/auth">
                <span className="inline-block">
                  <Button className="font-quicksand font-medium">
                    Sign In
                  </Button>
                </span>
              </Link>
            )}
          </nav>
          
          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            className="md:hidden p-2" 
            onClick={toggleMenu}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </Container>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-border">
          <Container className="py-2">
            <div className="flex flex-col space-y-3">
              <Link 
                href="/" 
                className={`font-quicksand font-medium py-2 ${isActive("/") ? "text-primary font-bold" : "text-gray-700 hover:text-primary"} transition-colors`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              
              {user ? (
                <>
                  <Link 
                    href="/journal" 
                    className={`font-quicksand font-medium py-2 ${isActive("/journal") ? "text-primary font-bold" : "text-gray-700 hover:text-primary"} transition-colors`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Journal
                  </Link>
                  <Link 
                    href="/conversation" 
                    className={`font-quicksand font-medium py-2 ${isActive("/conversation") ? "text-primary font-bold" : "text-gray-700 hover:text-primary"} transition-colors`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Chat with Flappy
                  </Link>
                  <Link 
                    href="/mood-tracker" 
                    className={`font-quicksand font-medium py-2 ${isActive("/mood-tracker") ? "text-primary font-bold" : "text-gray-700 hover:text-primary"} transition-colors`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Mood Feathers
                  </Link>
                  <Link 
                    href="/sms" 
                    className={`font-quicksand font-medium py-2 ${isActive("/sms") ? "text-primary font-bold" : "text-gray-700 hover:text-primary"} transition-colors`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    SMS {user?.isPremium && <span className="ml-1 text-xs text-green-500">•</span>}
                  </Link>
                  <Link 
                    href="/settings" 
                    className={`font-quicksand font-medium py-2 ${isActive("/settings") ? "text-primary font-bold" : "text-gray-700 hover:text-primary"} transition-colors`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <Button 
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    variant="outline"
                    className="font-quicksand font-medium w-full justify-center"
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? "Signing Out..." : "Sign Out"}
                  </Button>
                </>
              ) : (
                <Link 
                  href="/auth" 
                  className="font-quicksand font-medium text-white bg-primary hover:bg-primary/90 transition-colors py-2 px-4 rounded-[0.75rem] text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
              )}
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
