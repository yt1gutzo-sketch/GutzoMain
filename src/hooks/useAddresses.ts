import { useState, useEffect, useCallback } from 'react';
import { AddressApi } from '../utils/addressApi';
import { 
  UserAddress, 
  AddressFormData, 
  AddressType,
  AddressListApiResponse,
  AvailableTypesApiResponse 
} from '../types/address';
import { useAuth } from '../contexts/AuthContext';

export function useAddresses() {
  const { isAuthenticated, user } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [availableTypes, setAvailableTypes] = useState<AddressType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user addresses
  const fetchAddresses = useCallback(async () => {
    if (!isAuthenticated || !user?.phone) {
      setAddresses([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await AddressApi.getUserAddresses(user.phone);
      
      if (response.success) {
        setAddresses(response.data || []);
      } else {
        // If user not found, provide empty addresses (they're new)
        if (response.error?.includes('User not found')) {
          console.log('ℹ️ New user detected, starting with empty addresses');
          setAddresses([]);
          setError(null); // Don't show error for new users
        } else {
          setError(response.error || 'Failed to fetch addresses');
          setAddresses([]);
        }
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
      setError('Failed to fetch addresses');
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Fetch available address types
  const fetchAvailableTypes = useCallback(async () => {
    if (!isAuthenticated || !user?.phone) {
      setAvailableTypes(['home', 'work', 'other']);
      return;
    }

    try {
      const response = await AddressApi.getAvailableAddressTypes(user.phone);
      
      if (response.success) {
        setAvailableTypes(response.data || []);
      } else {
        // If user not found, provide default types (they're new)
        if (response.error?.includes('User not found')) {
          console.log('ℹ️ New user detected, providing default address types');
        } else {
          console.error('Error fetching available types:', response.error);
        }
        // Fallback to all types
        setAvailableTypes(['home', 'work', 'other']);
      }
    } catch (err) {
      console.error('Error fetching available types:', err);
      setAvailableTypes(['home', 'work', 'other']);
    }
  }, [isAuthenticated, user]);

  // Create new address
  const createAddress = async (addressData: AddressFormData): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated || !user?.phone) {
      return { success: false, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const response = await AddressApi.createAddress(addressData, user.phone);
      
      if (response.success) {
        // Refresh addresses and available types
        await Promise.all([fetchAddresses(), fetchAvailableTypes()]);
        return { success: true };
      } else {
        setError(response.error || 'Failed to create address');
        return { success: false, error: response.error };
      }
    } catch (err) {
      console.error('Error creating address:', err);
      const errorMessage = 'Failed to create address';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update existing address
  const updateAddress = async (addressId: string, addressData: Partial<AddressFormData>): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated || !user?.phone) {
      return { success: false, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const response = await AddressApi.updateAddress(addressId, addressData, user.phone);
      
      if (response.success) {
        // Refresh addresses
        await fetchAddresses();
        return { success: true };
      } else {
        setError(response.error || 'Failed to update address');
        return { success: false, error: response.error };
      }
    } catch (err) {
      console.error('Error updating address:', err);
      const errorMessage = 'Failed to update address';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Delete address
  const deleteAddress = async (addressId: string): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const response = await AddressApi.deleteAddress(addressId);
      
      if (response.success) {
        // Refresh addresses and available types
        await Promise.all([fetchAddresses(), fetchAvailableTypes()]);
        return { success: true };
      } else {
        setError(response.error || 'Failed to delete address');
        return { success: false, error: response.error };
      }
    } catch (err) {
      console.error('Error deleting address:', err);
      const errorMessage = 'Failed to delete address';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Set default address
  const setDefaultAddress = async (addressId: string): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated || !user?.phone) {
      return { success: false, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const response = await AddressApi.setDefaultAddress(addressId, user.phone);
      
      if (response.success) {
        // Refresh addresses
        await fetchAddresses();
        return { success: true };
      } else {
        setError(response.error || 'Failed to set default address');
        return { success: false, error: response.error };
      }
    } catch (err) {
      console.error('Error setting default address:', err);
      const errorMessage = 'Failed to set default address';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Get default address
  const getDefaultAddress = (): UserAddress | null => {
    return addresses.find(addr => addr.is_default) || null;
  };

  // Get address by ID
  const getAddressById = (addressId: string): UserAddress | null => {
    return addresses.find(addr => addr.id === addressId) || null;
  };

  // Get formatted address display text
  const getAddressDisplayText = (address: UserAddress): string => {
    return AddressApi.getAddressDisplayText(address);
  };

  // Get address type display info
  const getAddressTypeInfo = (type: AddressType, customTag?: string) => {
    return AddressApi.getAddressTypeInfo(type, customTag);
  };

  // Load addresses on mount and when authentication changes
  useEffect(() => {
    fetchAddresses();
    fetchAvailableTypes();
  }, [fetchAddresses, fetchAvailableTypes]);

  return {
    // State
    addresses,
    availableTypes,
    loading,
    error,
    
    // Actions
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    refreshAddresses: fetchAddresses,
    refreshAvailableTypes: fetchAvailableTypes,
    
    // Getters
    getDefaultAddress,
    getAddressById,
    getAddressDisplayText,
    getAddressTypeInfo,
    
    // Computed
    hasAddresses: addresses.length > 0,
    defaultAddress: getDefaultAddress(),
  };
}
