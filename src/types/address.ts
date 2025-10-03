// Address types for Gutzo marketplace
export type AddressType = 'home' | 'work' | 'other';

export interface UserAddress {
  id: string;
  user_id: string;
  type: AddressType;
  label?: string; // Custom label for 'other' type addresses
  
  // Address components  
  street: string; // House/Flat/Block No
  area?: string; // Apartment/Road/Area (Optional)
  landmark?: string; // Phone Number (Alternative Contact)
  full_address: string; // Complete address from Google Maps
  
  // Additional fields
  city: string;
  state: string;
  country: string;
  postal_code?: string;
  
  // Location coordinates
  latitude?: number;
  longitude?: number;
  
  // Delivery preferences
  delivery_instructions?: string;
  is_default: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface AddressFormData {
  type: AddressType;
  label?: string;        // Custom label for 'other' type (was custom_tag)
  street: string;        // House/flat number (was house_number)
  area?: string;         // Apartment/road (was apartment_road)  
  landmark?: string;     // Landmark (was nearby_landmark)
  fullAddress: string;   // Complete address (was complete_address)
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;   // (was is_default)
}

export interface AddressTypeOption {
  value: AddressType;
  label: string;
  icon: string;
  disabled: boolean;
}

// For Google Maps integration
export interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

// API response types
export interface AddressApiResponse {
  success: boolean;
  data?: UserAddress;
  error?: string;
}

export interface AddressListApiResponse {
  success: boolean;
  data?: UserAddress[];
  error?: string;
}

export interface AvailableTypesApiResponse {
  success: boolean;
  data?: AddressType[];
  error?: string;
}