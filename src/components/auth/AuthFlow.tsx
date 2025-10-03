import { useState } from "react";
import { PhoneSignIn } from "./PhoneSignIn";
import { OTPVerification } from "./OTPVerification";
import { AuthSuccess } from "./AuthSuccess";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

type AuthStep = 'phone' | 'otp' | 'success';

interface AuthFlowProps {
  onAuthComplete: () => void;
  onClose?: () => void;
}

export function AuthFlow({ onAuthComplete, onClose }: AuthFlowProps) {
  const [currentStep, setCurrentStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleSendOTP = async (phone: string) => {
    setLoading(true);
    try {
      // Format phone number to international format
      const formattedPhone = `+91${phone}`;
      
      // Call the send_otp endpoint from make-server
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-52a32140/send-otp`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: formattedPhone
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send OTP');
      }
      
      setPhoneNumber(phone);
      setCurrentStep('otp');
      toast.success(`OTP sent to +91 ${phone.replace(/(\\d{5})(\\d{5})/, '$1-$2')} via WhatsApp`);
    } catch (error: any) {
      console.error("Send OTP error:", error);
      toast.error(error.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (otp: string) => {
    setLoading(true);
    console.log(`🔧 DEVELOPMENT BYPASS ACTIVE`);
    console.log(`📱 Phone: +91${phoneNumber}`);
    console.log(`🔑 OTP: "${otp}" (length: ${otp.length})`);
    
    // DEVELOPMENT BYPASS - Accept any 6-digit OTP
    try {
      console.log(`✅ Bypassing server verification - accepting any OTP`);
      
      // Simulate realistic API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Always succeed for development
      console.log(`🎉 Development bypass successful!`);
      setCurrentStep('success');
      toast.success("✅ Phone verified! (Dev mode - any OTP works)");
      
    } catch (error: any) {
      // This should never happen in development bypass, but just in case
      console.error("Development bypass error:", error);
      toast.error("Development bypass failed - check console");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    try {
      // Format phone number to international format
      const formattedPhone = `+91${phoneNumber}`;
      
      // Call the send_otp endpoint from make-server again
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-52a32140/send-otp`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: formattedPhone
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to resend OTP');
      }
      
      toast.success("OTP resent successfully via WhatsApp");
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      toast.error(error.message || "Failed to resend OTP. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 'phone' && onClose) {
      onClose();
    } else {
      setCurrentStep('phone');
      setPhoneNumber("");
    }
  };

  const handleAuthComplete = () => {
    // Store auth state (in real app, this would be JWT token, etc.)
    localStorage.setItem('gutzo_auth', JSON.stringify({
      phone: phoneNumber,
      verified: true,
      timestamp: Date.now()
    }));
    
    onAuthComplete();
  };

  if (currentStep === 'phone') {
    return (
      <PhoneSignIn
        onSendOTP={handleSendOTP}
        loading={loading}
        onClose={onClose}
      />
    );
  }

  if (currentStep === 'otp') {
    return (
      <OTPVerification
        phoneNumber={phoneNumber}
        onVerifyOTP={handleVerifyOTP}
        onResendOTP={handleResendOTP}
        onBack={handleBack}
        loading={loading}
        resendLoading={resendLoading}
      />
    );
  }

  if (currentStep === 'success') {
    return (
      <AuthSuccess
        phoneNumber={phoneNumber}
        onContinue={handleAuthComplete}
      />
    );
  }

  return null;
}