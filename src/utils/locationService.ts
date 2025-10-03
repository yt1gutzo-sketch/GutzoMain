interface LocationData {
  city: string;
  state: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  timestamp: number;
}

interface CachedLocation {
  data: LocationData;
  expiresAt: number;
}

export class LocationService {
  private static readonly CACHE_KEY = 'gutzo_user_location';
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // Check if geolocation is available
  static isGeolocationAvailable(): boolean {
    return 'geolocation' in navigator;
  }

  // Get cached location if still valid
  static getCachedLocation(): LocationData | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const parsedCache: CachedLocation = JSON.parse(cached);
      
      // Check if cache is still valid
      if (Date.now() > parsedCache.expiresAt) {
        localStorage.removeItem(this.CACHE_KEY);
        return null;
      }

      return parsedCache.data;
    } catch (error) {
      console.error('Error reading cached location:', error);
      localStorage.removeItem(this.CACHE_KEY);
      return null;
    }
  }

  // Cache location data
  private static cacheLocation(locationData: LocationData): void {
    try {
      const cacheData: CachedLocation = {
        data: locationData,
        expiresAt: Date.now() + this.CACHE_DURATION
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching location:', error);
    }
  }

  // Get location display string
  static getLocationDisplay(location: LocationData): string {
    if (location.city && location.state) {
      return `${location.city}, ${location.state}`;
    } else if (location.city) {
      return location.city;
    } else if (location.state) {
      return location.state;
    } else {
      return location.country || 'Unknown Location';
    }
  }

  // Reverse geocode coordinates to location data
  private static async reverseGeocode(latitude: number, longitude: number): Promise<LocationData> {
    try {
      // Using BigDataCloud free API (no key required, 10k requests/month)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        city: data.city || data.locality || '',
        state: data.principalSubdivision || data.countryName || '',
        country: data.countryName || '',
        coordinates: { latitude, longitude },
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      
      // Fallback location data
      return {
        city: '',
        state: '',
        country: 'Unknown',
        coordinates: { latitude, longitude },
        timestamp: Date.now()
      };
    }
  }

  // Get current device location
  static async getCurrentLocation(options: {
    timeout?: number;
    enableHighAccuracy?: boolean;
    maximumAge?: number;
  } = {}): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!this.isGeolocationAvailable()) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
        ...options
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const locationData = await this.reverseGeocode(latitude, longitude);
            
            // Cache the location
            this.cacheLocation(locationData);
            
            resolve(locationData);
          } catch (error) {
            reject(error);
          }
        },
        (error) => {
          let errorMessage = 'Unable to get your location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        defaultOptions
      );
    });
  }

  // Get location (cached or fresh)
  static async getLocation(): Promise<LocationData | null> {
    // Try cached location first
    const cached = this.getCachedLocation();
    if (cached) {
      console.log('Using cached location:', this.getLocationDisplay(cached));
      return cached;
    }

    // If no cache, try to get fresh location
    try {
      console.log('Fetching fresh location...');
      const location = await this.getCurrentLocation();
      console.log('Fresh location obtained:', this.getLocationDisplay(location));
      return location;
    } catch (error) {
      console.log('Could not get fresh location:', error);
      return null;
    }
  }

  // Clear cached location
  static clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
  }

  // Check if location is in Coimbatore (for existing logic)
  static isInCoimbatore(location: LocationData): boolean {
    const city = location.city.toLowerCase();
    const state = location.state.toLowerCase();
    
    return (
      city.includes('coimbatore') ||
      city.includes('kovai') ||
      (city.includes('coimbra') && state.includes('tamil'))
    );
  }
}