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
              <a href="https://twitter.com/featherweightai" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors" aria-label="Follow us on Twitter @featherweightai">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-twitter">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-quicksand font-semibold text-lg mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="/#features" className="text-white/70 hover:text-white transition-colors">Features</a></li>
              <li><a href="/#pricing" className="text-white/70 hover:text-white transition-colors">Pricing</a></li>
              <li><a href="/#faq" className="text-white/70 hover:text-white transition-colors">FAQ</a></li>
              <li><a href="/#testimonials" className="text-white/70 hover:text-white transition-colors">Testimonials</a></li>
              <li><Link href="/help"><span className="text-white/70 hover:text-white transition-colors">Help</span></Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-quicksand font-semibold text-lg mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link href="/about"><span className="text-white/70 hover:text-white transition-colors">About Us</span></Link></li>
              <li><Link href="/about"><span className="text-white/70 hover:text-white transition-colors">Blog</span></Link></li>
              <li><Link href="/contact"><span className="text-white/70 hover:text-white transition-colors">Contact</span></Link></li>
              <li><a href="tel:19174318197" className="text-white/70 hover:text-white transition-colors">(917) 431-8197</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-quicksand font-semibold text-lg mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy"><span className="text-white/70 hover:text-white transition-colors">Privacy Policy</span></Link></li>
              <li><Link href="/terms"><span className="text-white/70 hover:text-white transition-colors">Terms of Service</span></Link></li>
              <li><Link href="/privacy"><span className="text-white/70 hover:text-white transition-colors">Cookie Policy</span></Link></li>
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
