import { useState, useEffect, useRef } from "react";
import { AuthInput } from "./AuthInput";
import { AuthButton } from "./AuthButton";
import { MessageCircle } from "lucide-react";

interface SignUpProps {
  onSignUp: (data: { phoneNumber: string; name: string; email: string }) => void;
  onVerifyOTP?: (otp: string) => void;
  onResendOTP?: () => void;
  loading?: boolean;
  resendLoading?: boolean;
  onSwitchToLogin: () => void;
  isPanel?: boolean;
  preFilledPhone?: string;
  otpSent?: boolean;
}

export function SignUp({ 
  onSignUp, 
  onVerifyOTP,
  onResendOTP,
  loading = false, 
  resendLoading = false,
  onSwitchToLogin, 
  isPanel = false, 
  preFilledPhone = "",
  otpSent = false
}: SignUpProps) {
  const [formData, setFormData] = useState({
    phoneNumber: preFilledPhone,
    name: "",
    email: ""
  });
  const [errors, setErrors] = useState({
    phoneNumber: "",
    name: "",
    email: ""
  });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [otpError, setOtpError] = useState("");

  // Update form data when preFilledPhone changes
  useEffect(() => {
    if (preFilledPhone) {
      setFormData(prev => ({ ...prev, phoneNumber: formatPhoneNumber(preFilledPhone) }));
    }
  }, [preFilledPhone]);

  // Countdown timer for OTP
  useEffect(() => {
    if (otpSent && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpSent, timeLeft]);



  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhoneNumber = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length === 10;
  };

  const validateName = (name: string) => {
    return name.trim().length >= 2;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpSent) {
      // Initial signup form submission
      const newErrors = {
        phoneNumber: "",
        name: "",
        email: ""
      };

      // Validate phone number
      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = "Please enter your phone number";
      } else if (!validatePhoneNumber(formData.phoneNumber)) {
        newErrors.phoneNumber = "Please enter a valid 10-digit phone number";
      }

      // Validate name
      if (!formData.name.trim()) {
        newErrors.name = "Please enter your name";
      } else if (!validateName(formData.name)) {
        newErrors.name = "Name must be at least 2 characters long";
      }

      // Validate email
      if (!formData.email.trim()) {
        newErrors.email = "Please enter your email";
      } else if (!validateEmail(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }

      setErrors(newErrors);

      // If no errors, proceed with signup
      if (!Object.values(newErrors).some(error => error)) {
        const cleanPhone = formData.phoneNumber.replace(/\D/g, '');
        onSignUp({
          phoneNumber: cleanPhone,
          name: formData.name.trim(),
          email: formData.email.trim()
        });
        setTimeLeft(60); // Reset timer when OTP is sent
      }
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

  const handleResend = () => {
    setTimeLeft(60);
    setOtp(["", "", "", "", "", ""]);
    setOtpError("");
    if (onResendOTP) {
      onResendOTP();
    }
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phoneNumber: formatted }));
    if (errors.phoneNumber) {
      setErrors(prev => ({ ...prev, phoneNumber: "" }));
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, name: e.target.value }));
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: "" }));
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, email: e.target.value }));
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: "" }));
    }
  };

  const maskedPhone = formData.phoneNumber.replace(/(\d{5})(\d{5})/, '$1-XXXXX');

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
              value={formData.phoneNumber}
              onChange={handlePhoneChange}
              error={errors.phoneNumber}
              maxLength={11}
              autoComplete="tel"
              disabled={!!preFilledPhone}
              className={`!py-6 !min-h-[72px] text-lg border-2 !border-gray-300 focus:!border-gutzo-primary focus:!ring-gutzo-primary ${preFilledPhone ? '!bg-gray-100 !text-gray-700' : ''}`}
            />
          </div>

          <div>
            <AuthInput
              label="Full Name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleNameChange}
              error={errors.name}
              autoComplete="name"
              className="!py-6 !min-h-[72px] text-lg border-2 !border-gray-300 focus:!border-gutzo-primary focus:!ring-gutzo-primary"
            />
          </div>

          <div>
            <AuthInput
              label="Email"
              type="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleEmailChange}
              error={errors.email}
              autoComplete="email"
              className="!py-6 !min-h-[72px] text-lg border-2 !border-gray-300 focus:!border-gutzo-primary focus:!ring-gutzo-primary"
              disabled={otpSent}
            />
          </div>

          {/* Progressive OTP Disclosure */}
          {otpSent && (
            <div className="animate-in slide-in-from-top-4 duration-300">
              <AuthInput
                label="OTP"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter 6-digit OTP"
                value={otp.join("")}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  const newOtp = value.split("").concat(Array(6 - value.length).fill(""));
                  setOtp(newOtp.slice(0, 6));
                  setOtpError("");
                }}
                error={otpError}
                maxLength={6}
                className="!py-6 !min-h-[72px] text-lg border-2 !border-gray-300 focus:!border-gutzo-primary focus:!ring-gutzo-primary tracking-widest"
              />
            </div>
          )}

          <AuthButton 
            type="submit" 
            loading={loading}
            className="!bg-gutzo-primary hover:!bg-gutzo-primary-hover !py-4 !min-h-[56px] text-base font-semibold text-center"
          >
            {otpSent ? "Verify OTP" : "Continue"}
          </AuthButton>
        </form>


      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0B5F3B]/5 to-white flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md min-h-screen sm:min-h-0 flex flex-col justify-center">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B5F3B] mb-2">Gutzo</h1>
          <p className="text-gray-600 text-sm sm:text-base">Healthy meals delivered fresh</p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-8 mx-2 sm:mx-0">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              Create Account
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Join Gutzo to start ordering healthy meals
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
                value={formData.phoneNumber}
                onChange={handlePhoneChange}
                error={errors.phoneNumber}
                maxLength={11}
                autoComplete="tel"
                disabled={!!preFilledPhone}
                className={preFilledPhone ? 'bg-gray-100 text-gray-700' : ''}
              />
            </div>

            <div>
              <AuthInput
                label="Full Name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleNameChange}
                error={errors.name}
                autoComplete="name"
              />
            </div>

            <div>
              <AuthInput
                label="Email"
                type="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleEmailChange}
                error={errors.email}
                autoComplete="email"
              />
            </div>

            <AuthButton type="submit" loading={loading}>
              Continue
            </AuthButton>
          </form>



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
      </div>
    </div>
  );
}