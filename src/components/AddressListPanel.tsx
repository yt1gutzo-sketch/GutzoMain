import { useState, useEffect } from "react";
import { X, Home, Building2, MapPin, Star, Edit2, Trash2, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { AddressApi } from "../utils/addressApi";
import { UserAddress, AddressType } from "../types/address";
import { AddressModal } from "./auth/AddressModal";

interface AddressListPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress?: (address: UserAddress) => void;
}

export function AddressListPanel({
  isOpen,
  onClose,
  onSelectAddress
}: AddressListPanelProps) {
  console.log('Rendering AddressListPanel, isOpen:', isOpen);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load user addresses
  useEffect(() => {
    if (isOpen) {
      console.log('=isOpen:', isOpen);
      loadAddresses();
    }
  }, [isOpen]);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      // Get userPhone from localStorage (or context if available)
      let userPhone = '';
      try {
        const authData = localStorage.getItem('gutzo_auth');
        if (authData) {
          const parsed = JSON.parse(authData);
          userPhone = parsed.phone || '';
          console.log('[AddressListPanel] userPhone for address fetch:', userPhone);
        }
      } catch (err) {
        console.error('[AddressListPanel] Error parsing auth data:', err);
      }
      if (!userPhone) {
        console.log('[AddressListPanel] No userPhone, skipping address fetch');
        setAddresses([]);
        setLoading(false);
        return;
      }
      const response = await AddressApi.getUserAddresses(userPhone);
      console.log('[AddressListPanel] Raw API response:', response);
      if (response.success && response.data) {
        console.log('[AddressListPanel] Setting addresses:', response.data);
        setAddresses(response.data);
      } else {
        console.log('[AddressListPanel] No addresses found or API error:', response);
      }
    } catch (error) {
      console.error('[AddressListPanel] Error loading addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      const response = await AddressApi.setDefaultAddress(addressId);
      
      if (response.success) {
        await loadAddresses(); // Refresh list
      }
    } catch (error) {
      console.error('Error setting default address:', error);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    setDeletingId(addressId);
    try {
      const response = await AddressApi.deleteAddress(addressId);
      
      if (response.success) {
        await loadAddresses(); // Refresh list
      }
    } catch (error) {
      console.error('Error deleting address:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddressAdded = async () => {
    setShowAddModal(false);
    await loadAddresses(); // Refresh list
  };

  const getTypeIcon = (type: AddressType) => {
    switch (type) {
      case 'home':
        return <Home className="h-4 w-4" />;
      case 'work':
        return <Building2 className="h-4 w-4" />;
      case 'other':
        return <MapPin className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: AddressType, customTag?: string) => {
    if (type === 'other' && customTag) {
      return customTag;
    }
    switch (type) {
      case 'home':
        return 'Home';
      case 'work':
        return 'Work';
      case 'other':
        return 'Other';
      default:
        return 'Address';
    }
  };

  // Unified address display - clean and concise for all screen sizes
  const getAddressDisplayText = (address: UserAddress): string => {
    const parts = [
      address.street,
      address.area
    ].filter(Boolean);
    // If no street or area, use first part of full_address
    if (parts.length === 0) {
      const firstPart = address.full_address?.split(',')[0]?.trim();
      return firstPart || 'Address';
    }
    return parts.join(', ');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Unified Modal - Same design for all screen sizes */}
      <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
        <div
          className="fixed inset-0 bg-black/40 transition-opacity duration-300 ease-out"
          onClick={onClose}
        />
        <div className="relative bg-white rounded-2xl w-full max-w-[600px] max-h-[85vh] z-[101] shadow-xl overflow-hidden">
          {/* Header - Consistent design */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gutzo-primary/10 rounded-full flex items-center justify-center">
                <MapPin className="h-4 w-4 text-gutzo-primary" />
              </div>
              <h3 className="font-semibold text-gray-900">Delivery Addresses</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content - Unified design */}
          <div className="flex-1 overflow-y-auto p-6 max-h-[60vh]">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-gray-100 h-24 rounded-xl" />
                ))}
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">No addresses yet</h3>
                <p className="text-gray-600 mb-6">Add your first delivery address to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                      address.is_default
                        ? 'border-gutzo-primary bg-gutzo-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => onSelectAddress?.(address)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className={`p-3 rounded-lg ${
                          address.is_default
                            ? 'bg-gutzo-primary text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {getTypeIcon(address.type)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="font-semibold text-gray-900">
                              {getTypeLabel(address.type, address.label)}
                            </span>
                            {address.is_default && (
                              <div className="flex items-center space-x-1 bg-gutzo-primary text-white px-3 py-1 rounded-full text-xs">
                                <Star className="h-3 w-3 fill-current" />
                                <span>Default</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Clean address display - no city/pincode clutter */}
                          <p className="text-gray-600 leading-relaxed">
                            {getAddressDisplayText(address)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {!address.is_default && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetDefault(address.id);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gutzo-primary transition-colors"
                            title="Set as default"
                          >
                            <Star className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAddress(address.id);
                          }}
                          disabled={deletingId === address.id}
                          className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-500 disabled:opacity-50 transition-colors"
                          title="Delete address"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer - Consistent design */}
          <div className="p-6 border-t border-gray-200">
            <Button
              onClick={() => setShowAddModal(true)}
              className="w-full bg-gutzo-primary hover:bg-gutzo-primary-hover text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Address
            </Button>
          </div>
        </div>
      </div>

      {/* Add Address Modal */}
      <AddressModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddressAdded}
      />
    </>
  );
}