import { useState, useEffect, useRef } from "react";
import { AuthButton } from "./AuthButton";
import { MessageCircle, ArrowLeft } from "lucide-react";

interface OTPVerificationProps {
  phoneNumber: string;
  onVerifyOTP: (otp: string) => void;
  onResendOTP: () => void;
  onBack: () => void;
  loading?: boolean;
  resendLoading?: boolean;
  isPanel?: boolean;
}

export function OTPVerification({ 
  phoneNumber, 
  onVerifyOTP, 
  onResendOTP, 
  onBack,
  loading = false,
  resendLoading = false,
  isPanel = false
}: OTPVerificationProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  // Auto-focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newOtp.every(digit => digit) && !loading) {
      const autoSubmitOtp = newOtp.join("");
      setError(""); // Clear any previous errors
      onVerifyOTP(autoSubmitOtp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      setError("");
      onVerifyOTP(pastedData);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");
    
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    setError(""); // Clear any previous errors
    onVerifyOTP(otpString);
  };

  const handleResend = () => {
    setTimeLeft(60);
    setOtp(["", "", "", "", "", ""]);
    setError("");
    onResendOTP();
    inputRefs.current[0]?.focus();
  };

  const maskedPhone = phoneNumber.replace(/(\d{5})(\d{5})/, '$1-XXXXX');

  if (isPanel) {
    return (
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center text-gutzo-primary hover:text-gutzo-primary-hover transition-colors min-w-[44px] min-h-[44px] -ml-2 pl-2 pr-4 py-2 rounded-lg hover:bg-green-50"
          aria-label="Go back to phone number entry"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span className="font-medium">Back</span>
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
            <MessageCircle className="w-7 h-7 text-gutzo-primary" />
          </div>
          <p className="text-gray-600 text-sm">
            We've sent a 6-digit code to{" "}
            <span className="font-medium text-gray-900 block mt-1">+91 {maskedPhone}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={`
                  w-10 h-12 text-center text-lg font-semibold
                  border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-gutzo-primary focus:border-transparent
                  transition-all duration-200
                  ${error ? 'border-red-300' : ''}
                  ${digit ? 'border-gutzo-primary bg-green-50' : ''}
                  touch-manipulation
                `}
                maxLength={1}
                aria-label={`OTP digit ${index + 1}`}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <AuthButton type="submit" loading={loading}>
            Verify OTP
          </AuthButton>
        </form>

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
              onClick={handleResend}
              disabled={resendLoading}
              className="text-sm text-gutzo-primary hover:text-gutzo-primary-hover font-medium transition-colors disabled:opacity-50 min-w-[44px] min-h-[44px] px-4 py-2 rounded-lg hover:bg-green-50"
            >
              {resendLoading ? "Sending..." : "Resend OTP"}
            </button>
          )}
        </div>

        {/* WhatsApp Info */}
        <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
          <div className="flex items-start space-x-3">
            <MessageCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
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
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0B5F3B]/5 to-white flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md min-h-screen sm:min-h-0 flex flex-col justify-center">
        {/* Back Button - Mobile Optimized */}
        <button
          onClick={onBack}
          className="flex items-center text-[#0B5F3B] hover:text-[#083D26] mb-6 transition-colors min-w-[44px] min-h-[44px] -ml-2 pl-2 pr-4 py-2 rounded-lg hover:bg-green-50"
          aria-label="Go back to phone number entry"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span className="font-medium">Back</span>
        </button>

        {/* Logo/Header - Mobile Optimized */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B5F3B] mb-2">Gutzo</h1>
          <p className="text-gray-600 text-sm sm:text-base">Verify your phone number</p>
        </div>

        {/* OTP Form - Mobile Optimized */}
        <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-8 mx-2 sm:mx-0">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-full mb-4">
              <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 text-[#0B5F3B]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              Enter OTP
            </h2>
            <p className="text-gray-600 text-sm sm:text-base px-2">
              We've sent a 6-digit code to{" "}
              <span className="font-medium text-gray-900 block sm:inline mt-1 sm:mt-0">+91 {maskedPhone}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {/* OTP Input Grid - Mobile Optimized */}
            <div className="flex justify-center space-x-2 sm:space-x-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className={`
                    w-10 h-12 sm:w-12 sm:h-12 text-center text-lg sm:text-xl font-semibold
                    border border-gray-200 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-[#0B5F3B] focus:border-transparent
                    transition-all duration-200
                    ${error ? 'border-red-300' : ''}
                    ${digit ? 'border-[#0B5F3B] bg-green-50' : ''}
                    touch-manipulation
                  `}
                  maxLength={1}
                  aria-label={`OTP digit ${index + 1}`}
                />
              ))}
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <AuthButton type="submit" loading={loading}>
              Verify OTP
            </AuthButton>
          </form>

          {/* Resend Section - Mobile Optimized */}
          <div className="mt-5 sm:mt-6 text-center">
            {timeLeft > 0 ? (
              <p className="text-sm text-gray-600">
                Resend code in{" "}
                <span className="font-medium text-[#0B5F3B]">
                  {timeLeft}s
                </span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="text-sm text-[#0B5F3B] hover:text-[#083D26] font-medium transition-colors disabled:opacity-50 min-w-[44px] min-h-[44px] px-4 py-2 rounded-lg hover:bg-green-50"
              >
                {resendLoading ? "Sending..." : "Resend OTP"}
              </button>
            )}
          </div>

          {/* WhatsApp Info - Mobile Optimized */}
          <div className="mt-5 sm:mt-6 p-3 sm:p-4 bg-green-50 rounded-2xl border border-green-100">
            <div className="flex items-start space-x-3">
              <MessageCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-green-800 font-medium mb-1">
                  Check WhatsApp
                </p>
                <p className="text-xs sm:text-sm text-green-700">
                  The OTP has been sent to your WhatsApp. Please check your messages.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}