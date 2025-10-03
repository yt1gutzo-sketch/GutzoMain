import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LocationService } from '../utils/locationService';

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

interface LocationContextType {
  location: LocationData | null;
  locationDisplay: string;
  isLoading: boolean;
  error: string | null;
  refreshLocation: () => Promise<void>;
  isInCoimbatore: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locationDisplay = location ? LocationService.getLocationDisplay(location) : 'Location Unknown';
  const isInCoimbatore = location ? LocationService.isInCoimbatore(location) : false;

  const loadLocation = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const locationData = await LocationService.getLocation();
      setLocation(locationData);
      
      if (locationData) {
        console.log('Location loaded:', LocationService.getLocationDisplay(locationData));
      } else {
        console.log('No location available');
        setError('Location not available');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      console.error('Location error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshLocation = async () => {
    // Clear cache and get fresh location
    LocationService.clearCache();
    await loadLocation();
  };

  // Load location on mount
  useEffect(() => {
    loadLocation();
  }, []);

  // Refresh location periodically (every 30 minutes when tab is active)
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (!document.hidden) {
        loadLocation(true); // Silent refresh
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  return (
    <LocationContext.Provider
      value={{
        location,
        locationDisplay,
        isLoading,
        error,
        refreshLocation,
        isInCoimbatore
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}