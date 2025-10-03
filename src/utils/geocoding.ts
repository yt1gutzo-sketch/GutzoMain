// Google Maps Geocoding utility for detailed address information

// HARDCODED GOOGLE MAPS API KEY - Replace with your actual key
const GOOGLE_MAPS_API_KEY = "AIzaSyBQOKhRC4lyStNP8x8L9SiUbvV581dKOSM"; // Replace with your actual API key

export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface GeocodeResult {
  formatted_address: string;
  address_components: AddressComponent[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface DetailedAddress {
  formattedAddress: string;
  streetNumber?: string;
  route?: string;
  sublocality?: string;
  locality?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

// Extract specific address components using Google's address component types
function extractAddressComponents(components: AddressComponent[]): Partial<DetailedAddress> {
  const result: Partial<DetailedAddress> = {};

  for (const component of components) {
    const { long_name, short_name, types } = component;

    // Street number
    if (types.includes('street_number')) {
      result.streetNumber = long_name;
    }
    
    // Street name/route
    if (types.includes('route')) {
      result.route = long_name;
    }
    
    // Sublocality (often the area/neighborhood in Indian addresses)
    if (types.includes('sublocality_level_1') || types.includes('sublocality')) {
      result.sublocality = long_name;
      if (!result.area) result.area = long_name; // Use as area if not set
    }
    
    // Locality (often the broader area)
    if (types.includes('locality')) {
      result.locality = long_name;
      if (!result.city) result.city = long_name; // Use as city if not set
    }
    
    // Administrative area level 2 (often district)
    if (types.includes('administrative_area_level_2')) {
      if (!result.city) result.city = long_name;
    }
    
    // Administrative area level 1 (state)
    if (types.includes('administrative_area_level_1')) {
      result.state = long_name;
    }
    
    // Country
    if (types.includes('country')) {
      result.country = long_name;
    }
    
    // Postal code
    if (types.includes('postal_code')) {
      result.postalCode = long_name;
    }
  }

  // Fallback logic for area extraction
  if (!result.area) {
    // Try political areas as backup
    for (const component of components) {
      if (component.types.includes('political') && 
          !component.types.includes('country') && 
          !component.types.includes('administrative_area_level_1')) {
        result.area = component.long_name;
        break;
      }
    }
  }

  return result;
}

// Geocode coordinates to get detailed address information
export async function reverseGeocode(lat: number, lng: number): Promise<DetailedAddress | null> {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
    console.warn('🚫 Google Maps API key not available for geocoding');
    return null;
  }

  try {
    console.log(`🔍 Reverse geocoding coordinates: ${lat}, ${lng}`);
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=en&region=IN`
    );

    if (!response.ok) {
      throw new Error(`Geocoding HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.warn('🚫 No geocoding results found:', data.status);
      return null;
    }

    const result = data.results[0] as GeocodeResult;
    const addressComponents = extractAddressComponents(result.address_components);

    const detailedAddress: DetailedAddress = {
      formattedAddress: result.formatted_address,
      coordinates: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
      },
      ...addressComponents
    };

    console.log('✅ Geocoding successful:', detailedAddress);
    return detailedAddress;

  } catch (error) {
    console.error('❌ Reverse geocoding failed:', error);
    return null;
  }
}

// Forward geocode an address to get coordinates and detailed components
export async function forwardGeocode(address: string): Promise<DetailedAddress | null> {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
    console.warn('🚫 Google Maps API key not available for geocoding');
    return null;
  }

  try {
    console.log(`🔍 Forward geocoding address: ${address}`);
    
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}&language=en&region=IN`
    );

    if (!response.ok) {
      throw new Error(`Geocoding HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.warn('🚫 No geocoding results found for address:', data.status);
      return null;
    }

    const result = data.results[0] as GeocodeResult;
    const addressComponents = extractAddressComponents(result.address_components);

    const detailedAddress: DetailedAddress = {
      formattedAddress: result.formatted_address,
      coordinates: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
      },
      ...addressComponents
    };

    console.log('✅ Forward geocoding successful:', detailedAddress);
    return detailedAddress;

  } catch (error) {
    console.error('❌ Forward geocoding failed:', error);
    return null;
  }
}

// Enhanced address extraction functions that use geocoding results
export function extractAreaFromDetailedAddress(detailedAddress: DetailedAddress | null): string {
  if (!detailedAddress) return "";
  
  // Priority order: sublocality > area > locality
  return detailedAddress.sublocality || 
         detailedAddress.area || 
         detailedAddress.locality || 
         "";
}

export function extractCityFromDetailedAddress(detailedAddress: DetailedAddress | null): string {
  if (!detailedAddress) return "";
  
  // Priority order: city > locality
  return detailedAddress.city || 
         detailedAddress.locality || 
         "";
}

// Fallback function for simple address string parsing (when geocoding fails)
export function parseAddressString(address: string): { area: string; city: string } {
  if (!address) return { area: "", city: "" };
  
  const parts = address.split(",").map(part => part.trim());
  
  if (parts.length >= 3) {
    return {
      area: parts[1] || "",
      city: parts[2] || ""
    };
  } else if (parts.length >= 2) {
    return {
      area: parts[1] || "",
      city: parts[1] || ""
    };
  }
  
  return { area: "", city: "" };
}