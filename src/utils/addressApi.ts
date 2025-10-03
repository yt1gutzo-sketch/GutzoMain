import { 
  UserAddress, 
  AddressFormData, 
  AddressType,
  AddressApiResponse,
  AddressListApiResponse,
  AvailableTypesApiResponse 
} from '../types/address';
import { supabase } from './supabase/client';

const FUNCTION_NAME = 'make-server-6985f4e9';

export class AddressApi {

  private static async invoke(endpoint: string, options: { method?: string, body?: any } = {}) {
    const { data, error } = await supabase.functions.invoke(`${FUNCTION_NAME}${endpoint}`, {
      method: options.method,
      body: options.body,
    });

    if (error) {
      console.error(`❌ Error invoking ${endpoint}:`, error);
      throw new Error(error.message || `Failed to invoke ${endpoint}`);
    }

    return data;
  }

  static async getUserAddresses(userPhone: string): Promise<AddressListApiResponse> {
    try {
      if (!userPhone) return { success: false, error: 'User not authenticated' };
      const data = await this.invoke(`/user-addresses/${encodeURIComponent(userPhone)}`, { method: 'GET' });
      console.log('✅ User addresses fetched successfully:', data?.length || 0);
      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Unexpected error fetching addresses:', error);
      return { success: false, error: error.message };
    }
  }

  static async getDefaultAddress(userPhone: string): Promise<AddressApiResponse> {
    try {
      const addresses = await this.getUserAddresses(userPhone);
      if (!addresses.success) return { success: false, error: addresses.error };
      const defaultAddress = addresses.data?.find(addr => addr.is_default);
      return { success: true, data: defaultAddress || null };
    } catch (error: any) {
      console.error('❌ Unexpected error fetching default address:', error);
      return { success: false, error: error.message };
    }
  }

  static async getAvailableAddressTypes(userPhone: string): Promise<AvailableTypesApiResponse> {
    try {
      if (!userPhone) return { success: false, error: 'User not authenticated' };
      const result = await this.invoke(`/user-addresses/${encodeURIComponent(userPhone)}/available-types`, { method: 'GET' });
      console.log('✅ Available address types:', result.availableTypes);
      return { success: true, data: result.availableTypes || [] };
    } catch (error: any) {
      console.error('❌ Unexpected error fetching available types:', error);
      return { success: false, error: error.message };
    }
  }

  static async createAddress(addressData: AddressFormData, userPhone: string): Promise<AddressApiResponse> {
    try {
      if (!userPhone) return { success: false, error: 'User not authenticated' };
      if (!addressData.street || !addressData.fullAddress) return { success: false, error: 'Street and complete address are required' };
      if (addressData.type === 'other' && !addressData.label?.trim()) return { success: false, error: 'Label is required for Other address type' };

      const requestData = {
        userPhone,
        type: addressData.type.toLowerCase(),
        label: addressData.label || null,
        street: addressData.street,
        area: addressData.area || null,
        landmark: addressData.landmark || null,
        fullAddress: addressData.fullAddress,
        latitude: addressData.latitude || null,
        longitude: addressData.longitude || null,
        isDefault: addressData.isDefault || false
      };

      const result = await this.invoke('/user-addresses', { method: 'POST', body: requestData });
      console.log('✅ Address created successfully:', result?.id);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('❌ Unexpected error creating address:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateAddress(addressId: string, addressData: Partial<AddressFormData>, userPhone: string): Promise<AddressApiResponse> {
    try {
      if (!userPhone) return { success: false, error: 'User not authenticated' };

      const requestData = {
        userPhone,
        type: addressData.type?.toLowerCase(),
        label: addressData.label || null,
        street: addressData.street,
        area: addressData.area || null,
        landmark: addressData.landmark || null,
        fullAddress: addressData.fullAddress,
        latitude: addressData.latitude || null,
        longitude: addressData.longitude || null,
        isDefault: addressData.isDefault || false
      };

      const result = await this.invoke(`/user-addresses/${addressId}`, { method: 'PUT', body: requestData });
      console.log('✅ Address updated successfully:', addressId);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('❌ Unexpected error updating address:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteAddress(addressId: string): Promise<AddressApiResponse> {
    try {
      await this.invoke(`/user-addresses/${addressId}`, { method: 'DELETE' });
      console.log('✅ Address deleted successfully:', addressId);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Unexpected error deleting address:', error);
      return { success: false, error: error.message };
    }
  }

  static async setDefaultAddress(addressId: string, userPhone: string): Promise<AddressApiResponse> {
    try {
      if (!userPhone) return { success: false, error: 'User not authenticated' };
      const result = await this.invoke(`/user-addresses/${addressId}/set-default`, { method: 'POST', body: { userPhone } });
      console.log('✅ Default address set successfully:', addressId);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('❌ Unexpected error setting default address:', error);
      return { success: false, error: error.message };
    }
  }

  static getAddressDisplayText(address: UserAddress): string {
    const parts = [address.street, address.area, address.full_address].filter(Boolean);
    return parts.join(', ');
  }

  static getAddressTypeInfo(type: AddressType, customTag?: string) {
    switch (type.toLowerCase()) {
      case 'home':
        return { label: 'Home', icon: '🏠' };
      case 'work':
        return { label: 'Work', icon: '🏢' };
      case 'other':
        return { label: customTag || 'Other', icon: '📍' };
      default:
        return { label: 'Unknown', icon: '📍' };
    }
  }
}
