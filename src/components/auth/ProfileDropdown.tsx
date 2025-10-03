import { User, Package, MapPin, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOptionClick: (option: 'profile' | 'orders' | 'address' | 'logout') => void;
  userInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  } | null;
}

export function ProfileDropdown({ isOpen, onClose, onOptionClick, userInfo }: ProfileDropdownProps) {
  if (!isOpen) return null;

  // Get user data from localStorage if not provided
  const getUserData = () => {
    if (userInfo) return userInfo;
    
    try {
      const authData = localStorage.getItem('gutzo_auth');
      if (authData) {
        return JSON.parse(authData);
      }
    } catch (error) {
      console.error('Error parsing auth data:', error);
    }
    
    return { name: 'User', phone: '', email: '' };
  };

  const userData = getUserData();
  const displayName = userData.name || 'User';

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleOptionClick = (option: 'profile' | 'orders' | 'address' | 'logout') => {
    onOptionClick(option);
    onClose();
  };

  return (
    <>
      {/* Invisible backdrop to handle clicks outside */}
      <div 
        className="fixed inset-0 z-30" 
        onClick={onClose}
      />
      
      {/* Dropdown Menu */}
      <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-40 animate-in slide-in-from-top-2 duration-200">


        {/* Menu Options */}
        <div className="py-2">
          {/* My Profile */}
          <button
            onClick={() => handleOptionClick('profile')}
            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600 group-hover:text-gutzo-primary transition-colors" />
            </div>
            <span className="font-medium text-gray-900 group-hover:text-gutzo-primary transition-colors text-sm">
              My Profile
            </span>
          </button>

          {/* My Orders */}
          <button
            onClick={() => handleOptionClick('orders')}
            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              <Package className="h-4 w-4 text-gray-600 group-hover:text-gutzo-primary transition-colors" />
            </div>
            <span className="font-medium text-gray-900 group-hover:text-gutzo-primary transition-colors text-sm">
              My Orders
            </span>
          </button>

          {/* My Address */}
          <button
            onClick={() => handleOptionClick('address')}
            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-gray-600 group-hover:text-gutzo-primary transition-colors" />
            </div>
            <span className="font-medium text-gray-900 group-hover:text-gutzo-primary transition-colors text-sm">
              My Address
            </span>
          </button>

          {/* Divider */}
          <div className="border-t border-gray-100 my-2" />

          {/* Log Out */}
          <button
            onClick={() => handleOptionClick('logout')}
            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-red-50 transition-colors text-left group"
          >
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              <LogOut className="h-4 w-4 text-gray-600 group-hover:text-red-600 transition-colors" />
            </div>
            <span className="font-medium text-gray-900 group-hover:text-red-600 transition-colors text-sm">
              Log Out
            </span>
          </button>
        </div>
      </div>
    </>
  );
}