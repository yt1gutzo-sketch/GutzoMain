import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { PhoneSignIn } from "./PhoneSignIn";
import { SignUp } from "./SignUp";
import { OTPVerification } from "./OTPVerification";
import { toast } from "sonner";
import { supabase } from "../../utils/supabase/client"; // Correctly import the central supabase client

type AuthStep = 'signup' | 'login';
type AuthMode = 'signup' | 'login';

interface LoginPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthComplete: (authData: any) => void;
}

export function LoginPanel({ isOpen, onClose, onAuthComplete }: LoginPanelProps) {
  const [currentStep, setCurrentStep] = useState<AuthStep>('login');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userInfo, setUserInfo] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Reset all auth states when panel opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('login');
      setAuthMode('login');
      setPhoneNumber("");
      setUserInfo({ name: "", email: "" });
      setOtpSent(false);
      setLoading(false);
      setResendLoading(false);
    }
  }, [isOpen]);

  const handleSignUp = async (data: { phoneNumber: string; name: string; email: string }) => {
    setLoading(true);
    try {
      // First check if user already exists using supabase.functions.invoke
      const { data: checkResult, error: checkError } = await supabase.functions.invoke(
        'gutzo-api/check-user',
        {
          method: 'POST',
          body: { phone: `+91${data.phoneNumber}` },
        }
      );

      if (checkError) throw checkError;

      if (checkResult.exists) {
        toast.error("Account already exists with this phone number. Please login instead.");
        setAuthMode('login');
        setCurrentStep('login');
        setLoading(false);
        return;
      }

      // Store user info temporarily
      setUserInfo({ name: data.name, email: data.email });
      setPhoneNumber(data.phoneNumber);
      
      // Send OTP for signup
      await sendOTP(data.phoneNumber);
    } catch (error: any) {
      console.error("SignUp error:", error);
      toast.error(error.message || "Failed to process signup. Please try again.");
      setLoading(false);
    }
  };

  const handleSendOTP = async (phone: string) => {
    setLoading(true);
    try {
      // For login, check if user exists first
      if (authMode === 'login') {
        const { data: checkResult, error: checkError } = await supabase.functions.invoke(
          'gutzo-api/check-user',
          {
            method: 'POST',
            body: { phone: `+91${phone}` },
          }
        );

        if (checkError) throw checkError;

        if (!checkResult.exists) {
          // Auto-redirect to signup with phone pre-filled
          setPhoneNumber(phone);
          setAuthMode('signup');
          setCurrentStep('signup');
          setLoading(false);
          return;
        }
      }
      
      setPhoneNumber(phone);
      await sendOTP(phone);
    } catch (error: any) {
      console.error("Send OTP error:", error);
      toast.error(error.message || "Failed to send OTP. Please try again.");
      setLoading(false);
    }
  };

  const sendOTP = async (phone: string) => {
    try {
      const formattedPhone = `+91${phone}`;
      
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        'gutzo-api/send-otp',
        {
          method: 'POST',
          body: { phone: formattedPhone },
        }
      );

      if (invokeError) throw invokeError;
      if (!result.success) {
        throw new Error(result.error || 'Failed to send OTP');
      }
      
      setOtpSent(true);
      toast.success(`OTP sent to +91 ${phone.replace(/(\d{5})(\d{5})/, '$1-$2')} via WhatsApp`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (otp: string) => {
    setLoading(true);
    try {
      const formattedPhone = `+91${phoneNumber}`;
      console.log(`🔐 Verifying OTP with server for ${formattedPhone}`);
      
      const { data: result, error: verifyError } = await supabase.functions.invoke(
        'gutzo-api/verify-otp',
        {
          method: 'POST',
          body: { phone: formattedPhone, otp: otp },
        }
      );

      if (verifyError) throw verifyError;
      if (!result.success) {
        throw new Error(result.error || 'Invalid OTP');
      }

      console.log(`✅ OTP verification successful for ${formattedPhone}`);

      if (authMode === 'signup') {
        console.log('📝 Creating user account for signup...');
        const { data: createResult, error: createError } = await supabase.functions.invoke(
          'gutzo-api/create-user',
          {
            method: 'POST',
            body: {
              phone: formattedPhone,
              name: userInfo.name,
              email: userInfo.email,
            },
          }
        );

        if (createError) throw createError;
        if (!createResult.success) {
          throw new Error(createResult.error || 'Failed to create user account');
        }
        console.log('✅ User account created successfully');
      }
      
      const authData = {
        phone: formattedPhone.replace('+91', ''),
        name: userInfo.name || '',
        email: userInfo.email || '',
        verified: true,
        timestamp: Date.now(),
      };
      
      toast.success(`${authMode === 'signup' ? 'Account created and verified' : 'Phone number verified'} successfully!`);
      
      onAuthComplete(authData);
      onClose();
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast.error(error.message || "Invalid OTP. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    try {
      const formattedPhone = `+91${phoneNumber}`;
      
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        'gutzo-api/send-otp',
        {
          method: 'POST',
          body: { phone: formattedPhone },
        }
      );

      if (invokeError) throw invokeError;
      if (!result.success) {
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

  const handleSwitchToLogin = () => {
    setAuthMode('login');
    setCurrentStep('login');
    setPhoneNumber("");
    setUserInfo({ name: "", email: "" });
    setOtpSent(false);
  };

  const handleSwitchToSignup = () => {
    setAuthMode('signup');
    setCurrentStep('signup');
    setOtpSent(false);
  };

  const handleBack = () => {
    onClose();
  };

  const handleClose = () => {
    setCurrentStep('login');
    setAuthMode('login');
    setPhoneNumber("");
    setUserInfo({ name: "", email: "" });
    setOtpSent(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        onClick={handleClose}
      />
      
      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full w-[95%] max-w-lg lg:w-[50%] lg:max-w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Close Button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto relative">
          {currentStep === 'login' && (
            <div className="p-6 pl-16 pr-6 pt-20 relative min-h-full flex flex-col">
              {/* Login Content */}
              <div className="flex-1 flex flex-col justify-center max-w-sm">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Login</h1>
                  <p className="text-gray-600">
                    or <button onClick={handleSwitchToSignup} className="text-gutzo-primary font-semibold hover:underline">create an account</button>
                  </p>
                </div>
                
                <PhoneSignIn
                  onSendOTP={handleSendOTP}
                  onVerifyOTP={handleVerifyOTP}
                  onResendOTP={handleResendOTP}
                  loading={loading}
                  resendLoading={resendLoading}
                  onClose={handleClose}
                  onSwitchToSignup={handleSwitchToSignup}
                  otpSent={otpSent}
                  isPanel={true}
                />
              </div>
            </div>
          )}

          {currentStep === 'signup' && (
            <div className="p-6 pl-16 pr-6 pt-20 relative min-h-full flex flex-col">
              {/* SignUp Content */}
              <div className="flex-1 flex flex-col justify-center max-w-sm">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign up</h1>
                  <p className="text-gray-600 mb-1">
                    {phoneNumber ? 'Complete your account setup with WhatsApp OTP verification' : 'Join Gutzo to start ordering - we\'ll send a WhatsApp OTP to verify your number'}
                  </p>
                  <p className="text-gray-600">
                    or <button onClick={handleSwitchToLogin} className="text-gutzo-primary font-semibold hover:underline">login to your account</button>
                  </p>
                </div>
                
                <SignUp
                  onSignUp={handleSignUp}
                  onVerifyOTP={handleVerifyOTP}
                  onResendOTP={handleResendOTP}
                  loading={loading}
                  resendLoading={resendLoading}
                  onSwitchToLogin={handleSwitchToLogin}
                  preFilledPhone={phoneNumber}
                  otpSent={otpSent}
                  isPanel={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer - Terms and Privacy */}
        <div className="p-6 pl-16 pr-6 border-t border-gray-100 bg-gray-50">
          <div className="max-w-sm">
            <p className="text-xs text-gray-500">
              By continuing, I accept the{" "}
              <a href="/T&C" className="text-gutzo-primary hover:underline">
                Terms & Conditions
              </a>{" "}
              &{" "}
              <a href="/privacy_policy" className="text-gutzo-primary hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}