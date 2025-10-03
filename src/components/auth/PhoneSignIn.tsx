import { useState, useEffect, useRef } from "react";
import { AuthInput } from "./AuthInput";
import { AuthButton } from "./AuthButton";
import { MessageCircle, X } from "lucide-react";

interface PhoneSignInProps {
  onSendOTP: (phoneNumber: string) => void;
  onVerifyOTP?: (otp: string) => void;
  onResendOTP?: () => void;
  loading?: boolean;
  onClose?: () => void;
  isPanel?: boolean;
  onSwitchToSignup?: () => void;
  otpSent?: boolean;
  resendLoading?: boolean;
}

export function PhoneSignIn({ 
  onSendOTP, 
  onVerifyOTP,
  onResendOTP,
  loading = false, 
  onClose, 
  isPanel = false, 
  onSwitchToSignup,
  otpSent = false,
  resendLoading = false
}: PhoneSignInProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [otpError, setOtpError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for OTP
  useEffect(() => {
    if (otpSent && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpSent, timeLeft]);

  // Auto-focus first OTP input when OTP section appears
  useEffect(() => {
    if (otpSent) {
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [otpSent]);

  const validatePhoneNumber = (phone: string) => {
    // Basic phone validation - should be 10 digits for Indian numbers
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length === 10;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpSent) {
      // Phone number submission
      setError("");

      if (!phoneNumber.trim()) {
        setError("Please enter your phone number");
        return;
      }

      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (!validatePhoneNumber(cleanPhone)) {
        setError("Please enter a valid 10-digit phone number");
        return;
      }

      onSendOTP(cleanPhone);
      setTimeLeft(60); // Reset timer when OTP is sent
    } else {
      // OTP verification
      const otpString = otp.join("");
      
      if (otpString.length !== 6) {
        setOtpError("Please enter the complete 6-digit OTP");
        return;
      }

      if (onVerifyOTP) {
        onVerifyOTP(otpString);
      }
    }
  };

  const handleOTPInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newOtp.every(digit => digit) && !loading && onVerifyOTP) {
      onVerifyOTP(newOtp.join(""));
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOTPPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      setOtpError("");
      if (onVerifyOTP) {
        onVerifyOTP(pastedData);
      }
    }
  };

  const handleResend = () => {
    setTimeLeft(60);
    setOtp(["", "", "", "", "", ""]);
    setOtpError("");
    if (onResendOTP) {
      onResendOTP();
    }
    inputRefs.current[0]?.focus();
  };

  const formatPhoneNumber = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 10) {
      return cleanValue.replace(/(\d{5})(\d{0,5})/, (_, p1, p2) => 
        p2 ? `${p1} ${p2}` : p1
      );
    }
    return cleanValue.slice(0, 10).replace(/(\d{5})(\d{5})/, '$1 $2');
  };

  const maskedPhone = phoneNumber.replace(/(\d{5})(\d{5})/, '$1-XXXXX');

  if (isPanel) {
    return (
      <div className="space-y-6 max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <AuthInput
              label="Phone Number"
              type="tel"
              inputMode="numeric"
              pattern="[0-9\s]*"
              placeholder="Enter your 10-digit phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
              error={error}
              maxLength={11} // 10 digits + 1 space
              autoComplete="tel"
              aria-describedby={error ? "phone-error" : undefined}
              className="!py-6 !min-h-[72px] text-lg border-2 !border-gray-300 focus:!border-gutzo-primary focus:!ring-gutzo-primary"
              disabled={otpSent}
            />
          </div>

          {/* Progressive OTP Disclosure */}
          {otpSent && (
            <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
              {/* OTP Information */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                  <MessageCircle className="w-6 h-6 text-gutzo-primary" />
                </div>
                <p className="text-sm text-gray-600">
                  We've sent a 6-digit code to{" "}
                  <span className="font-medium text-gray-900">+91 {maskedPhone}</span>
                </p>
              </div>

              {/* OTP Input Grid */}
              <div className="flex justify-center space-x-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={digit}
                    onChange={(e) => handleOTPInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(index, e)}
                    onPaste={index === 0 ? handleOTPPaste : undefined}
                    className={`
                      w-10 h-12 text-center text-lg font-semibold
                      border border-gray-200 rounded-xl
                      focus:outline-none focus:ring-2 focus:ring-gutzo-primary focus:border-transparent
                      transition-all duration-200
                      ${otpError ? 'border-red-300' : ''}
                      ${digit ? 'border-gutzo-primary bg-green-50' : ''}
                      touch-manipulation
                    `}
                    maxLength={1}
                    aria-label={`OTP digit ${index + 1}`}
                  />
                ))}
              </div>

              {otpError && (
                <p className="text-sm text-red-600 text-center">{otpError}</p>
              )}

              {/* Resend Section */}
              <div className="text-center">
                {timeLeft > 0 ? (
                  <p className="text-sm text-gray-600">
                    Resend code in{" "}
                    <span className="font-medium text-gutzo-primary">
                      {timeLeft}s
                    </span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="text-sm text-gutzo-primary hover:text-gutzo-primary-hover font-medium transition-colors disabled:opacity-50 min-w-[44px] min-h-[44px] px-4 py-2 rounded-lg hover:bg-green-50"
                  >
                    {resendLoading ? "Sending..." : "Resend OTP"}
                  </button>
                )}
              </div>

              {/* WhatsApp Info */}
              <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-start space-x-3">
                  <MessageCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-green-800 font-medium mb-1">
                      Check WhatsApp
                    </p>
                    <p className="text-xs text-green-700">
                      The OTP has been sent to your WhatsApp. Please check your messages.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <AuthButton 
            type="submit" 
            loading={loading}
            className="!bg-gutzo-primary hover:!bg-gutzo-primary-hover !py-4 !min-h-[56px] text-base font-semibold text-center"
          >
            {otpSent ? (
              "Verify OTP"
            ) : (
              "Proceed"
            )}
          </AuthButton>
        </form>

        {onSwitchToSignup && !otpSent && (
          <div className="text-center mt-6">

          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0B5F3B]/5 to-white flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md min-h-screen sm:min-h-0 flex flex-col justify-center">
        {/* Close Button - Mobile Optimized */}
        {onClose && (
          <div className="flex justify-end mb-4 sm:mb-4">
            <button
              onClick={onClose}
              className="p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close login dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        
        {/* Logo/Header - Mobile Optimized */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B5F3B] mb-2">Gutzo</h1>
          <p className="text-gray-600 text-sm sm:text-base">Healthy meals delivered fresh</p>
        </div>

        {/* Sign In Form - Mobile Optimized */}
        <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-8 mx-2 sm:mx-0">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              Sign In
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Enter your phone number to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div>
              <AuthInput
                label="Phone Number"
                type="tel"
                inputMode="numeric"
                pattern="[0-9\s]*"
                placeholder="Enter your 10-digit phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                error={error}
                maxLength={11} // 10 digits + 1 space
                autoComplete="tel"
                aria-describedby={error ? "phone-error" : undefined}
              />
            </div>

            <AuthButton type="submit" loading={loading}>
              <div className="flex items-center justify-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                Send OTP via WhatsApp
              </div>
            </AuthButton>
          </form>

          {/* WhatsApp Info - Mobile Optimized */}
          <div className="mt-5 sm:mt-6 p-3 sm:p-4 bg-green-50 rounded-2xl border border-green-100">
            <div className="flex items-start space-x-3">
              <MessageCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-green-800 font-medium mb-1">
                  WhatsApp Verification
                </p>
                <p className="text-xs sm:text-sm text-green-700">
                  We'll send you a 6-digit code via WhatsApp to verify your number.
                </p>
              </div>
            </div>
          </div>

          {/* Terms - Mobile Optimized */}
          <p className="text-xs text-gray-500 text-center mt-5 sm:mt-6 leading-relaxed">
            By continuing, you agree to our{" "}
            <a href="/T&C" className="text-[#0B5F3B] hover:underline font-medium">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy_policy" className="text-[#0B5F3B] hover:underline font-medium">
              Privacy Policy
            </a>
          </p>
        </div>

        {/* Illustration placeholder - Hidden on small screens to save space */}
        <div className="text-center mt-6 sm:mt-8 hidden sm:block">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
            <span className="text-2xl">🥗</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">Fresh & Healthy</p>
        </div>
      </div>
    </div>
  );
}