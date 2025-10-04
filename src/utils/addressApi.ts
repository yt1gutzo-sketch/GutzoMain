import { UserAddress, AddressFormData, AddressType, AddressApiResponse, AddressListApiResponse, AvailableTypesApiResponse } from '../types/address';
import { apiService } from './api';

export class AddressApi {
  static async getUserAddresses(userPhone: string): Promise<AddressListApiResponse> {
    try {
      if (!userPhone) return { success: false, error: 'User not authenticated' };
      const data = await apiService.getUserAddresses(userPhone);
      return { success: true, data: data || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getDefaultAddress(userPhone: string): Promise<AddressApiResponse> {
    try {
      const addresses = await this.getUserAddresses(userPhone);
      if (!addresses.success) return { success: false, error: addresses.error };
      const defaultAddress = addresses.data?.find(addr => addr.is_default);
      return { success: true, data: defaultAddress || undefined };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getAvailableAddressTypes(userPhone: string): Promise<AvailableTypesApiResponse> {
    try {
      if (!userPhone) return { success: false, error: 'User not authenticated' };
      const types = await apiService.getAvailableAddressTypes(userPhone);
      return { success: true, data: types || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async createAddress(addressData: AddressFormData, userPhone: string): Promise<AddressApiResponse> {
    try {
      if (!userPhone) return { success: false, error: 'User not authenticated' };
      const result = await apiService.createAddress({ ...addressData, userPhone });
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async updateAddress(addressId: string, addressData: Partial<AddressFormData>, userPhone: string): Promise<AddressApiResponse> {
    try {
      if (!userPhone) return { success: false, error: 'User not authenticated' };
      const result = await apiService.updateAddress(addressId, { ...addressData, userPhone });
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async deleteAddress(addressId: string): Promise<AddressApiResponse> {
    try {
      const result = await apiService.deleteAddress(addressId);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async setDefaultAddress(addressId: string, userPhone: string): Promise<AddressApiResponse> {
    try {
      if (!userPhone) return { success: false, error: 'User not authenticated' };
      const result = await apiService.setDefaultAddress(addressId, userPhone);
      return { success: true, data: result };
    } catch (error: any) {
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
