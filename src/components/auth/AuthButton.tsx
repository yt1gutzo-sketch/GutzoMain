import { ButtonHTMLAttributes, ReactNode } from "react";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

export function AuthButton({ 
  children, 
  variant = 'primary', 
  loading = false, 
  className = "", 
  disabled,
  ...props 
}: AuthButtonProps) {
  const baseClasses = `
    w-full px-6 py-3 sm:py-3 rounded-2xl font-medium
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    shadow-sm hover:shadow-md active:shadow-lg active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed
    min-h-[48px] sm:min-h-[44px]
    text-base sm:text-sm
    touch-manipulation
  `;

  const variantClasses = {
    primary: `
      bg-[#FF6D00] hover:bg-[#E55100] text-white
      focus:ring-[#FF6D00]
    `,
    secondary: `
      bg-white border border-[#0B5F3B] text-[#0B5F3B]
      hover:bg-gray-50 focus:ring-[#0B5F3B]
    `
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          Loading...
        </div>
      ) : (
        children
      )}
    </button>
  );
}