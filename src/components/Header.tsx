import { MapPin, Loader2, AlertCircle, LogOut, User, ChevronDown, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { ProfileDropdown } from "./auth/ProfileDropdown";
import { useLocation } from "../contexts/LocationContext";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import gutzoLogo from 'figma:asset/dd6aa5fc791890562276e586be507ca46d14f4ee.png';

interface HeaderProps {
  onShowLogin?: () => void;
  onLogout?: () => void;
  onShowProfile?: (content: 'profile' | 'orders' | 'address') => void;
  onShowCart?: () => void;
  onShowAddressList?: () => void;
}

export function Header({ onShowLogin, onLogout, onShowProfile, onShowCart, onShowAddressList }: HeaderProps) {
  const { locationDisplay, isLoading, error, refreshLocation, isInCoimbatore } = useLocation();
  const { totalItems } = useCart();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  // Get display name from AuthContext
  const displayName = user?.name || 'User';

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDropdownOptionClick = (option: 'profile' | 'orders' | 'address' | 'logout') => {
    if (option === 'logout') {
      onLogout?.();
    } else {
      onShowProfile?.(option);
    }
    setShowDropdown(false);
  };
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <div className="flex items-center">
              <ImageWithFallback
                src="http://192.168.1.39:54321/storage/v1/object/public/Gutzo/GUTZO.svg"
                //src="https://jrpiqxajjpyxiitweoqc.supabase.co/storage/v1/object/public/Gutzo%20Logo/GUTZO.svg"
                alt="Gutzo - Healthy Feels Good"
                className="h-24 w-auto sm:h-32 md:h-40"
              />
            </div>
          </div>

          {/* City Display & Actions */}
          <div className="flex items-center space-x-4">
            <div 
              className={`flex items-center space-x-1 px-3 py-1 rounded-full cursor-pointer transition-colors ${
                isInCoimbatore 
                  ? 'text-gutzo-selected bg-gutzo-highlight/20 hover:bg-gutzo-highlight/30' 
                  : 'text-orange-600 bg-orange-50 hover:bg-orange-100'
              }`}
              onClick={isAuthenticated ? (() => { console.log('Header: onShowAddressList called'); onShowAddressList?.(); }) : refreshLocation}
              title={
                isAuthenticated 
                  ? "Click to manage delivery addresses" 
                  : (error ? `Error: ${error}. Click to retry` : "Click to refresh location")
              }
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : error ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {isLoading ? "Detecting..." : error ? "Location Error" : locationDisplay}
              </span>
              {isAuthenticated && !isLoading && !error && (
                <span className="text-xs opacity-75 ml-1">• Change</span>
              )}
              {!isAuthenticated && !isInCoimbatore && !isLoading && !error && (
                <span className="text-xs opacity-75 ml-1">(Outside service area)</span>
              )}
            </div>
            
            {/* Cart Button */}
            <button
              onClick={onShowCart}
              className="relative flex items-center justify-center w-11 h-11 rounded-xl hover:bg-gray-50 transition-colors"
              title="View cart"
            >
              <ShoppingCart className="h-5 w-5 text-gray-600" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-gutzo-primary text-white text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </button>
            
            {/* Auth Button - Mobile Optimized */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors min-w-[44px] min-h-[44px] group"
                  title="View profile options"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gutzo-primary text-white font-medium text-sm">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex items-center space-x-1">
                    <span className="font-medium text-gray-900 text-sm max-w-20 truncate">
                      {authLoading ? 'Loading...' : displayName}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-gray-500 group-hover:text-gutzo-primary transition-all duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                
                <ProfileDropdown
                  isOpen={showDropdown}
                  onClose={() => setShowDropdown(false)}
                  onOptionClick={handleDropdownOptionClick}
                  userInfo={user ? {
                    name: user.name,
                    phone: user.phone,
                    email: user.email,
                    verified: user.verified
                  } : null}
                />
              </div>
            ) : (
              <Button
                onClick={onShowLogin}
                className="bg-gutzo-primary hover:bg-gutzo-primary-hover text-white rounded-xl font-medium transition-colors min-w-[44px] min-h-[44px] px-3 sm:px-4 py-2 text-sm sm:text-base flex items-center gap-1.5"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Login</span>
                <span className="sr-only sm:hidden">Login</span>
              </Button>
            )}

          </div>
        </div>
      </div>
    </header>
  );
}