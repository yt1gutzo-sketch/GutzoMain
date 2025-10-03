import { useEffect } from "react";
import { CheckCircle } from "lucide-react";
import { AuthButton } from "./AuthButton";

interface AuthSuccessProps {
  phoneNumber: string;
  onContinue: () => void;
  isPanel?: boolean;
}

export function AuthSuccess({ phoneNumber, onContinue, isPanel = false }: AuthSuccessProps) {
  const maskedPhone = phoneNumber.replace(/(\d{5})(\d{5})/, '$1-XXXXX');

  // Auto-redirect after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onContinue();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onContinue]);

  if (isPanel) {
    return (
      <div className="text-center space-y-6">
        {/* Success Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
          <CheckCircle className="w-8 h-8 text-gutzo-primary" />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Verification Successful!
          </h2>

          <p className="text-gray-600 mb-6 text-sm">
            Your phone number{" "}
            <span className="font-medium text-gray-900 block mt-1">+91 {maskedPhone}</span>{" "}
            has been verified successfully.
          </p>
        </div>

        <div className="space-y-4">
          <AuthButton onClick={onContinue}>
            Continue to Gutzo
          </AuthButton>

          <p className="text-sm text-gray-500">
            Redirecting automatically in 3 seconds...
          </p>
        </div>

        {/* Welcome Message */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center space-x-2 mb-4">
            <span className="text-xl">🎉</span>
            <span className="text-xl">🥗</span>
            <span className="text-xl">🚚</span>
          </div>
          <h3 className="text-base font-semibold text-gutzo-primary mb-2">
            Ready to explore healthy meals?
          </h3>
          <p className="text-gray-600 text-xs">
            Discover fresh, nutritious meals from verified vendors in your area
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0B5F3B]/5 to-white flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md min-h-screen sm:min-h-0 flex flex-col justify-center">
        {/* Logo/Header - Mobile Optimized */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B5F3B] mb-2">Gutzo</h1>
          <p className="text-gray-600 text-sm sm:text-base">Welcome to healthy eating!</p>
        </div>

        {/* Success Card - Mobile Optimized */}
        <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-8 text-center mx-2 sm:mx-0">
          {/* Success Icon - Mobile Optimized */}
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-[#0B5F3B]" />
          </div>

          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">
            Verification Successful!
          </h2>

          <p className="text-gray-600 mb-6 text-sm sm:text-base px-2">
            Your phone number{" "}
            <span className="font-medium text-gray-900 block sm:inline mt-1 sm:mt-0">+91 {maskedPhone}</span>{" "}
            has been verified successfully.
          </p>

          <div className="space-y-4">
            <AuthButton onClick={onContinue}>
              Continue to Gutzo
            </AuthButton>

            <p className="text-sm text-gray-500">
              Redirecting automatically in 3 seconds...
            </p>
          </div>
        </div>

        {/* Welcome Message - Mobile Optimized */}
        <div className="mt-6 sm:mt-8 text-center">
          <div className="inline-flex items-center justify-center space-x-2 mb-4">
            <span className="text-xl sm:text-2xl">🎉</span>
            <span className="text-xl sm:text-2xl">🥗</span>
            <span className="text-xl sm:text-2xl">🚚</span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-[#0B5F3B] mb-2">
            Ready to explore healthy meals?
          </h3>
          <p className="text-gray-600 text-xs sm:text-sm px-4">
            Discover fresh, nutritious meals from verified vendors in your area
          </p>
        </div>
      </div>
    </div>
  );
}