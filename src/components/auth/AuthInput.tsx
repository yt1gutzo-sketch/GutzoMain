import { forwardRef } from "react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-3 sm:py-3
            bg-white border border-gray-200 
            rounded-2xl
            text-gray-900 placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-[#0B5F3B] focus:border-transparent
            transition-all duration-200
            min-h-[48px] sm:min-h-[44px]
            text-base sm:text-sm
            touch-manipulation
            ${error ? 'border-red-300 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = "AuthInput";