import { Link } from "wouter";
import { Container } from "@/components/ui/container";
import { Feather } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#37474F] text-white py-12">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Feather className="h-4 w-4 text-white" />
              </div>
              <span className="font-quicksand font-bold text-xl">Featherweight</span>
            </div>
            <p className="text-white/70 text-sm mb-4">
              Daily journaling and mindfulness, delivered directly to your inbox with the wisdom and playfulness of Flappy.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-white/70 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-twitter">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              </a>
              <a href="#" className="text-white/70 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-instagram">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a href="#" className="text-white/70 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-facebook">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-quicksand font-semibold text-lg mb-4">Product</h4>
            <ul className="space-y-2">
              <li><Link href="/"><a className="text-white/70 hover:text-white transition-colors">Features</a></Link></li>
              <li><Link href="/"><a className="text-white/70 hover:text-white transition-colors">Pricing</a></Link></li>
              <li><Link href="/"><a className="text-white/70 hover:text-white transition-colors">FAQ</a></Link></li>
              <li><Link href="/"><a className="text-white/70 hover:text-white transition-colors">Testimonials</a></Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-quicksand font-semibold text-lg mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link href="/"><a className="text-white/70 hover:text-white transition-colors">About Us</a></Link></li>
              <li><Link href="/"><a className="text-white/70 hover:text-white transition-colors">Blog</a></Link></li>
              <li><Link href="/"><a className="text-white/70 hover:text-white transition-colors">Careers</a></Link></li>
              <li><Link href="/"><a className="text-white/70 hover:text-white transition-colors">Contact</a></Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-quicksand font-semibold text-lg mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/"><a className="text-white/70 hover:text-white transition-colors">Privacy Policy</a></Link></li>
              <li><Link href="/"><a className="text-white/70 hover:text-white transition-colors">Terms of Service</a></Link></li>
              <li><Link href="/"><a className="text-white/70 hover:text-white transition-colors">Cookie Policy</a></Link></li>
              <li><Link href="/"><a className="text-white/70 hover:text-white transition-colors">GDPR</a></Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/10 text-center text-white/50 text-sm">
          <p>© {new Date().getFullYear()} Featherweight. All rights reserved. Flappy is waiting for your emails.</p>
        </div>
      </Container>
    </footer>
  );
}
