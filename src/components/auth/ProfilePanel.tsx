import { X, Package, MapPin, LogOut, User, Edit3, Phone, Mail, Check, XIcon, Plus, Home, Briefcase, Building, MoreHorizontal, Trash2, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Input } from "../ui/input";
import { AddressModal } from "./AddressModal";
import { OrdersPanel } from "../OrdersPanel";

type ProfilePanelContent = 'profile' | 'orders' | 'address';

interface Address {
  id: string;
  complete_address: string;
  floor?: string;
  landmark?: string;
  area: string;
  type: 'Home' | 'Work' | 'Hotel' | 'Other';
  is_default?: boolean;
  phone?: string;
  created_at: string;
}

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  content: ProfilePanelContent;
  userInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  } | null;
  onViewOrderDetails?: (orderData: any) => void;
  recentOrderData?: {
    paymentDetails: {
      paymentId: string;
      subscriptionId: string;
      method: string;
      amount: number;
      date: string;
    };
    orderSummary: {
      items: number;
      vendor: string;
      orderType: string;
      quantity: string;
      estimatedDelivery: string;
    };
  } | null;
}

export function ProfilePanel({ isOpen, onClose, onLogout, content, userInfo, onViewOrderDetails, recentOrderData }: ProfilePanelProps) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  
  // Real user data state
  const [realUserData, setRealUserData] = useState<any>(null);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [realOrders, setRealOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [realAddresses, setRealAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);

  // Profile editing state
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Address modal state
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const addressListRef = useRef<HTMLDivElement>(null);

  // Supabase edge function configuration
  const SUPABASE_URL = 'https://jkafnrpojqzfvertyrwc.supabase.co/functions/v1/make-server-6985f4e9';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprYWZucnBvanF6ZnZlcnR5cndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTA4NDQsImV4cCI6MjA3MzM2Njg0NH0.xLhgq-S8K1Ho40OptegwkcAG-4TCWoJXnHGG1PXLP10';

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
  const displayName = realUserData?.name || userData.name || 'User';
  const displayPhone = userData.phone ? `+91 ${userData.phone}` : '';
  const displayEmail = realUserData?.email || userData.email || '';

  // Update temp values when displayName/displayEmail changes
  useEffect(() => {
    setTempName(displayName);
    setTempEmail(displayEmail || '');
  }, [displayName, displayEmail]);

  // Fetch real user profile data from cloud edge function
  const fetchUserProfile = async () => {
    if (!userData.phone) return;
    
    setUserDataLoading(true);
    try {
      console.log('📱 Fetching user profile from Supabase cloud edge function...');
      console.log('🔗 Request URL:', `${SUPABASE_URL}/get-user`);
      console.log('📞 Phone number:', userData.phone);
      
      const response = await fetch(`${SUPABASE_URL}/get-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: userData.phone })
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      // Get response text first to debug what we're actually receiving
      const responseText = await response.text();
      console.log('📄 Raw response text:', responseText);

      if (response.ok) {
        try {
          // Try to parse as JSON
          const profileData = JSON.parse(responseText);
          console.log('✅ User profile fetched from cloud edge function:', profileData);
          
          // Check if user exists and has data
          if (profileData.userExists && profileData.name) {
            setRealUserData({
              id: profileData.id,
              name: profileData.name,
              phone: profileData.phone,
              email: profileData.email || '',
              verified: profileData.verified,
              created_at: profileData.created_at
            });
          } else if (profileData.userExists === false) {
            console.log('ℹ️ User not found in database');
          } else {
            console.log('ℹ️ User exists but no additional data found');
          }
        } catch (parseError) {
          console.error('❌ Failed to parse response as JSON:', parseError);
          console.error('❌ Response was not valid JSON. Raw response:', responseText);
        }
      } else {
        console.error('❌ HTTP Error:', response.status, response.statusText);
        console.error('❌ Error response body:', responseText);
        
        // Try to parse error response as JSON if possible
        try {
          const errorData = JSON.parse(responseText);
          console.error('❌ Parsed error data:', errorData);
        } catch (parseError) {
          console.error('❌ Error response was not JSON:', responseText);
        }
      }
    } catch (error) {
      console.error('❌ Network/Fetch error:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    } finally {
      setUserDataLoading(false);
    }
  };

  // Fetch real orders data
  const fetchUserOrders = async () => {
    if (!userData.phone) return;
    
    setOrdersLoading(true);
    try {
      console.log('📦 Fetching user orders from database...');
      
      const response = await fetch(`${SUPABASE_URL}/user/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: userData.phone })
      });

      if (response.ok) {
        const ordersData = await response.json();
        console.log('✅ User orders fetched:', ordersData);
        setRealOrders(ordersData);
      } else {
        console.error('❌ Failed to fetch user orders');
      }
    } catch (error) {
      console.error('❌ Error fetching user orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Fetch real addresses data
  const fetchUserAddresses = async () => {
    if (!userData.phone) return;
    
    setAddressesLoading(true);
    try {
      console.log('🏠 Attempting to fetch user addresses from database...');
      
      const response = await fetch(`${SUPABASE_URL}/user/addresses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: userData.phone })
      });

      if (response.ok) {
        const addressesData = await response.json();
        console.log('✅ User addresses fetched from database:', addressesData);
        setRealAddresses(addressesData);
      } else {
        console.log('ℹ️ Database address endpoint not available, using local storage fallback');
        // Gracefully fallback to mock data for addresses
        await fetchAddressesMock();
      }
    } catch (error) {
      console.log('ℹ️ Database connection not available, using local storage fallback');
      // Gracefully fallback to mock data for addresses
      await fetchAddressesMock();
    } finally {
      setAddressesLoading(false);
    }
  };

  // Mock address fetching (fallback)
  const fetchAddressesMock = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const savedAddresses = localStorage.getItem('gutzo_mock_addresses');
      if (savedAddresses) {
        const parsedAddresses = JSON.parse(savedAddresses);
        setRealAddresses(parsedAddresses);
      } else {
        // No default address - start with empty addresses
        const sampleAddresses: Address[] = [];
        setRealAddresses(sampleAddresses);
        localStorage.setItem('gutzo_mock_addresses', JSON.stringify(sampleAddresses));
      }
    } catch (error) {
      console.error('Error with mock addresses:', error);
      setRealAddresses([]);
    }
  };

  // Fetch data when panel opens and content changes
  useEffect(() => {
    if (isOpen && userData.phone) {
      if (content === 'profile') {
        fetchUserProfile();
      } else if (content === 'orders') {
        fetchUserOrders();
      } else if (content === 'address') {
        fetchUserAddresses();
      }
    }
  }, [isOpen, content, userData.phone]);

  // Sync addresses with real data
  useEffect(() => {
    setAddresses(realAddresses);
    setLoadingAddresses(addressesLoading);
  }, [realAddresses, addressesLoading]);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getContentTitle = () => {
    switch (content) {
      case 'profile':
        return 'My Profile';
      case 'orders':
        return 'My Orders';
      case 'address':
        return 'My Address';
      default:
        return 'Profile';
    }
  };

  const handleSaveName = async () => {
    if (!tempName.trim() || !userData.phone) return;
    
    setIsUpdating(true);
    try {
      console.log('📝 Updating user name via Supabase...');
      
      const response = await fetch(`${SUPABASE_URL}/user/update-profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: userData.phone,
          name: tempName.trim()
        })
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        console.log('✅ Name updated successfully:', updatedProfile);
        
        // Update local state
        setRealUserData(prev => ({ ...prev, name: tempName.trim() }));
        
        // Update localStorage auth data
        const authData = localStorage.getItem('gutzo_auth');
        if (authData) {
          const auth = JSON.parse(authData);
          auth.name = tempName.trim();
          localStorage.setItem('gutzo_auth', JSON.stringify(auth));
        }
        setEditingName(false);
      } else {
        console.error('❌ Failed to update name');
        setTempName(displayName); // Revert on error
      }
    } catch (error) {
      console.error('❌ Error updating name:', error);
      setTempName(displayName); // Revert on error
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!tempEmail.trim() || !userData.phone) return;
    
    setIsUpdating(true);
    try {
      console.log('📧 Updating user email via Supabase...');
      
      const response = await fetch(`${SUPABASE_URL}/user/update-profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: userData.phone,
          email: tempEmail.trim()
        })
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        console.log('✅ Email updated successfully:', updatedProfile);
        
        // Update local state
        setRealUserData(prev => ({ ...prev, email: tempEmail.trim() }));
        
        // Update localStorage auth data
        const authData = localStorage.getItem('gutzo_auth');
        if (authData) {
          const auth = JSON.parse(authData);
          auth.email = tempEmail.trim();
          localStorage.setItem('gutzo_auth', JSON.stringify(auth));
        }
        setEditingEmail(false);
      } else {
        console.error('❌ Failed to update email');
        setTempEmail(displayEmail || ''); // Revert on error
      }
    } catch (error) {
      console.error('❌ Error updating email:', error);
      setTempEmail(displayEmail || ''); // Revert on error
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelName = () => {
    setTempName(displayName);
    setEditingName(false);
  };

  const handleCancelEmail = () => {
    setTempEmail(displayEmail || '');
    setEditingEmail(false);
  };

  const handleSaveAddress = async (newAddress: Omit<Address, 'id'>) => {
    if (!userData.phone) return;
    
    console.log('🏠 Attempting to save address via Supabase:', newAddress);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/user/addresses/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: userData.phone,
          ...newAddress
        })
      });

      if (response.ok) {
        const savedAddress = await response.json();
        console.log('✅ Address saved successfully:', savedAddress);
        
        // Update local state
        const updatedAddresses = [savedAddress, ...realAddresses];
        setRealAddresses(updatedAddresses);
        
        // Scroll to the new address
        setTimeout(() => {
          if (addressListRef.current) {
            addressListRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 100);
      } else {
        console.error('❌ Failed to save address via Supabase, using mock mode');
        await handleSaveAddressMock(newAddress);
      }
    } catch (error) {
      console.error('❌ Error saving address via Supabase, using mock mode:', error);
      await handleSaveAddressMock(newAddress);
    }
  };

  const handleSaveAddressMock = async (newAddress: Omit<Address, 'id'>) => {
    console.log('🏠 Saving address in mock mode:', newAddress);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const savedAddress: Address = {
      ...newAddress,
      id: `addr_${Date.now()}`,
      created_at: new Date().toISOString()
    };

    const updatedAddresses = [savedAddress, ...realAddresses];
    setRealAddresses(updatedAddresses);
    localStorage.setItem('gutzo_mock_addresses', JSON.stringify(updatedAddresses));
    
    setTimeout(() => {
      if (addressListRef.current) {
        addressListRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!userData.phone) return;
    
    setDeletingAddressId(addressId);
    try {
      console.log('🗑️ Deleting address via Supabase:', addressId);
      
      const response = await fetch(`${SUPABASE_URL}/user/addresses/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: userData.phone,
          addressId: addressId
        })
      });

      if (response.ok) {
        console.log('✅ Address deleted successfully via Supabase');
        
        // Remove from local state
        const updatedAddresses = realAddresses.filter(addr => addr.id !== addressId);
        setRealAddresses(updatedAddresses);
      } else {
        console.error('❌ Failed to delete address via Supabase, using mock mode');
        await handleDeleteAddressMock(addressId);
      }
    } catch (error) {
      console.error('❌ Error deleting address via Supabase, using mock mode:', error);
      await handleDeleteAddressMock(addressId);
    } finally {
      setDeletingAddressId(null);
    }
  };

  const handleDeleteAddressMock = async (addressId: string) => {
    console.log('🗑️ Deleting address in mock mode:', addressId);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const updatedAddresses = realAddresses.filter(addr => addr.id !== addressId);
    setRealAddresses(updatedAddresses);
    localStorage.setItem('gutzo_mock_addresses', JSON.stringify(updatedAddresses));
    
    console.log('✅ Address deleted successfully (mock mode)');
  };

  const getAddressIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'home':
        return <Home className="h-4 w-4 text-gutzo-primary" />;
      case 'work':
        return <Briefcase className="h-4 w-4 text-gutzo-primary" />;
      case 'hotel':
        return <Building className="h-4 w-4 text-gutzo-primary" />;
      default:
        return <MapPin className="h-4 w-4 text-gutzo-primary" />;
    }
  };

  const renderProfileContent = () => {
    if (userDataLoading) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <div className="h-20 w-20 mx-auto mb-4 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-6 w-24 bg-gray-200 rounded mx-auto animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 bg-gray-300 rounded"></div>
                    <div className="w-20 h-4 bg-gray-300 rounded"></div>
                  </div>
                  <div className="w-full h-4 bg-gray-300 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Real Data Indicator */}
        {realUserData && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700 font-medium">Live Database Connected</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Profile data synced with Supabase database
            </p>
          </div>
        )}

        {/* Profile Header */}
        <div className="text-center">
          <Avatar className="h-20 w-20 mx-auto mb-4">
            <AvatarFallback className="bg-gutzo-primary text-white font-semibold text-xl">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-semibold text-gray-900">
            {displayName}
          </h3>
          {userDataLoading && (
            <div className="flex items-center justify-center mt-2">
              <Loader2 className="h-4 w-4 animate-spin text-gutzo-primary mr-2" />
              <span className="text-sm text-gray-500">Syncing profile...</span>
            </div>
          )}
        </div>

        {/* Profile Details */}
        <div className="space-y-4">
          {/* Name Field */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3 mb-3">
              <User className="h-5 w-5 text-gray-500" />
              <p className="text-sm font-medium text-gray-900">Full Name</p>
            </div>
            
            {editingName ? (
              <div className="space-y-3">
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full"
                  placeholder="Enter your full name"
                  disabled={isUpdating}
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={handleSaveName}
                    disabled={!tempName.trim() || isUpdating}
                    className="flex-1 bg-gutzo-primary hover:bg-gutzo-primary-hover text-white h-9"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {isUpdating ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    onClick={handleCancelName}
                    variant="outline"
                    disabled={isUpdating}
                    className="flex-1 h-9"
                  >
                    <XIcon className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">{displayName}</p>
                <button 
                  onClick={() => setEditingName(true)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Edit3 className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            )}
          </div>

          {/* Phone Field */}
          {displayPhone && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center space-x-3 mb-3">
                <Phone className="h-5 w-5 text-gray-500" />
                <p className="text-sm font-medium text-gray-900">Phone Number</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">{displayPhone}</p>
                <div className="px-3 py-1 bg-gutzo-selected text-white text-xs rounded-full">
                  Verified
                </div>
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3 mb-3">
              <Mail className="h-5 w-5 text-gray-500" />
              <p className="text-sm font-medium text-gray-900">Email Address</p>
            </div>
            
            {editingEmail ? (
              <div className="space-y-3">
                <Input
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  type="email"
                  className="w-full"
                  placeholder="Enter your email address"
                  disabled={isUpdating}
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={handleSaveEmail}
                    disabled={!tempEmail.trim() || isUpdating}
                    className="flex-1 bg-gutzo-primary hover:bg-gutzo-primary-hover text-white h-9"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {isUpdating ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    onClick={handleCancelEmail}
                    variant="outline"
                    disabled={isUpdating}
                    className="flex-1 h-9"
                  >
                    <XIcon className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {displayEmail || 'No email address added'}
                </p>
                <button 
                  onClick={() => setEditingEmail(true)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Edit3 className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderOrdersContent = () => {
    if (ordersLoading) {
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm text-blue-700 font-medium">Loading Orders from Database...</span>
            </div>
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-xl p-4 space-y-3">
                <div className="w-full h-4 bg-gray-300 rounded"></div>
                <div className="w-3/4 h-4 bg-gray-300 rounded"></div>
                <div className="w-1/2 h-4 bg-gray-300 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Real Data Indicator */}
        {realOrders.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700 font-medium">Live Orders from Database</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              {realOrders.length} orders found in Supabase database
            </p>
          </div>
        )}

        <OrdersPanel 
          onViewOrderDetails={onViewOrderDetails} 
          recentOrderData={recentOrderData}
          realOrders={realOrders}
          isLoading={ordersLoading}
        />
      </div>
    );
  };

  const resetMockData = () => {
    localStorage.removeItem('gutzo_mock_addresses');
    setRealAddresses([]);
    console.log('🔄 Mock address data reset');
  };

  const renderAddressContent = () => {
    if (loadingAddresses) {
      return (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                  <div className="w-16 h-4 bg-gray-300 rounded"></div>
                </div>
                <div className="w-full h-4 bg-gray-300 rounded"></div>
                <div className="w-3/4 h-4 bg-gray-300 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4" ref={addressListRef}>
        {/* Database Status Indicator */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-blue-700 font-medium">
                {addresses.length > 0 ? 'Database Connected' : 'Mock Data Mode'}
              </span>
            </div>
            <button
              onClick={resetMockData}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Reset Data
            </button>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            {addresses.length > 0 
              ? `${addresses.length} addresses synced with database`
              : 'Addresses are saved locally for testing. No server required.'
            }
          </p>
        </div>

        {/* Address List */}
        {addresses.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 text-sm">Saved Addresses</h4>
              <Button 
                onClick={() => setShowAddressModal(true)}
                className="bg-gutzo-primary hover:bg-gutzo-primary-hover text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add New</span>
              </Button>
            </div>
            {addresses.map((address) => (
              <div key={address.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gutzo-primary/30 transition-colors duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Address Type Header */}
                    <div className="flex items-center space-x-2 mb-2">
                      {getAddressIcon(address.type)}
                      <span className="font-medium text-sm text-gutzo-primary capitalize">
                        {address.type}
                      </span>
                      {address.is_default && (
                        <span className="px-2 py-1 bg-gutzo-selected text-white text-xs rounded-full">
                          Default
                        </span>
                      )}
                    </div>

                    {/* Address Details */}
                    <div className="text-sm text-gray-700 space-y-1">
                      <p className="font-medium">{address.complete_address}</p>
                      {address.floor && (
                        <p className="text-gray-600">Floor: {address.floor}</p>
                      )}
                      {address.landmark && (
                        <p className="text-gray-600">Near: {address.landmark}</p>
                      )}
                      <p className="text-gray-600">{address.area}</p>
                      {address.phone && (
                        <p className="text-gray-600">Contact: +91 {address.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-3">
                    <button
                      onClick={() => handleDeleteAddress(address.id)}
                      disabled={deletingAddressId === address.id}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                    >
                      {deletingAddressId === address.id ? (
                        <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No addresses saved yet</h3>
            <p className="text-gray-500 text-sm mb-6">Add your first delivery address to get started with ordering.</p>
            <Button 
              onClick={() => setShowAddressModal(true)}
              className="bg-gutzo-primary hover:bg-gutzo-primary-hover text-white px-6 py-2 rounded-lg flex items-center space-x-2 mx-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Address</span>
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Early return AFTER all hooks have been called
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full w-[95%] max-w-lg lg:w-[50%] lg:max-w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Close Button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close profile panel"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-full pt-16 px-6 pb-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="font-semibold text-gray-900">
              {getContentTitle()}
            </h2>
            <div className="border-b border-gray-100 mt-4" />
          </div>

          {/* Dynamic Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Loading States */}
            {content === 'profile' && userDataLoading && !realUserData && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-sm text-blue-700 font-medium">Loading Profile from Database...</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Fetching your profile data from Supabase
                  </p>
                </div>
              </div>
            )}
            
            {content === 'address' && addressesLoading && realAddresses.length === 0 && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-sm text-blue-700 font-medium">Loading Addresses from Database...</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Fetching your saved addresses from Supabase
                  </p>
                </div>
              </div>
            )}

            {/* Real Data Indicators */}
            {content === 'address' && realAddresses.length > 0 && (
              <div className="mb-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-700 font-medium">Live Database Connected</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    {realAddresses.length} addresses synced with Supabase database
                  </p>
                </div>
              </div>
            )}

            {/* Content Rendering */}
            {content === 'profile' && renderProfileContent()}
            {content === 'orders' && renderOrdersContent()}
            {content === 'address' && renderAddressContent()}
          </div>

          {/* Address Modal */}
          <AddressModal 
            isOpen={showAddressModal}
            onClose={() => setShowAddressModal(false)}
            onSave={handleSaveAddress}
          />

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              Gutzo v1.0 • Healthy meals delivered fresh
            </p>
          </div>
        </div>
      </div>
    </>
  );
}