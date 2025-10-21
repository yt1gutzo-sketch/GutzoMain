import { Instagram, Linkedin } from "lucide-react";
import { Button } from "./ui/button";
import { useRouter } from "./Router";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function Footer() {
  const { navigate } = useRouter();
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <ImageWithFallback
              src="http://192.168.1.39:54321/storage/v1/object/public/Gutzo/GUTZO.svg"
              //src="https://jrpiqxajjpyxiitweoqc.supabase.co/storage/v1/object/public/Gutzo%20Logo/GUTZO.svg"
              alt="Gutzo - Healthy Feels Good"
              className="h-16 w-auto mb-4"
            />
            <p className="text-gray-400 max-w-md">
              Connecting you with the healthiest kitchens in Coimbatore.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-white mb-4">Legal</h3>
            <div className="space-y-2">
              <button 
                onClick={() => navigate('/T&C')}
                className="block text-gray-400 hover:text-white transition-colors text-sm text-left"
              >
                Terms & Conditions
              </button>
              <button 
                onClick={() => navigate('/refund_policy')}
                className="block text-gray-400 hover:text-white transition-colors text-sm text-left"
              >
                Refund Policy
              </button>
              <button 
                onClick={() => navigate('/privacy_policy')}
                className="block text-gray-400 hover:text-white transition-colors text-sm text-left"
              >
                Privacy Policy
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-white mb-4">Follow Us</h3>
            <div className="flex gap-4">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-2">
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-2">
                <Linkedin className="h-5 w-5" />
                <span className="sr-only">LinkedIn</span>
              </Button>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left">
            <p className="text-gray-400 text-sm">
              © 2025 Gutzo. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-4 md:mt-0">
              <button 
                onClick={() => navigate('/T&C')}
                className="text-gray-500 hover:text-gray-400 text-xs transition-colors"
              >
                Terms
              </button>
              <button 
                onClick={() => navigate('/refund_policy')}
                className="text-gray-500 hover:text-gray-400 text-xs transition-colors"
              >
                Refund
              </button>
              <button 
                onClick={() => navigate('/privacy_policy')}
                className="text-gray-500 hover:text-gray-400 text-xs transition-colors"
              >
                Privacy
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}