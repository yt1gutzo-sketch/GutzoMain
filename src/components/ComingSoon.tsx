import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner@2.0.3";
import { apiService } from "../utils/api";

export function ComingSoon() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    if (value && !validateEmail(value)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setEmailError("Email is required");
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    setEmailError("");
    
    try {
      const response = await apiService.subscribeToNotifications(email);
      
      if (response.already_subscribed) {
        toast.success("You're already subscribed! We'll notify you when Gutzo Points launches.");
      } else {
        toast.success("Thanks! We'll notify you when Gutzo Points launches.");
      }
      
      setEmail("");
    } catch (error: any) {
      console.error('Failed to subscribe to notifications:', error);
      
      // Check for specific error messages
      if (error.message && (
        error.message.includes('already registered') || 
        error.message.includes('already subscribed')
      )) {
        toast.success("You're already subscribed! We'll notify you when Gutzo Points launches.");
        setEmail("");
      } else if (error.message && error.message.includes('network')) {
        toast.error("Network error. Please check your connection and try again.");
      } else {
        toast.error("Failed to subscribe. Please try again later.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-[#D9E86F]/30 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Poppins' }}>
          🎉 Gutzo Points — Coming Soon!
        </h2>
        <p className="text-gray-700 mb-6">
          Earn rewards for healthy orders. Be the first to know when we launch.
        </p>
        
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={handleEmailChange}
                className={`w-full ${emailError ? 'border-red-500' : ''}`}
                style={{ minHeight: '44px' }}
                required
              />
              {emailError && (
                <p className="text-red-500 text-sm mt-1 text-left">{emailError}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isSubmitting || !!emailError || !email}
              className="bg-[#E7600E] hover:bg-[#D14808] text-white whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '44px' }}
            >
              {isSubmitting ? "Subscribing..." : "Notify Me"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}