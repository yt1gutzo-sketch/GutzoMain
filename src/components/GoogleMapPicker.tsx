import { useState, useRef, useCallback, useEffect } from "react";
import { MapPin, Search, Crosshair, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

// HARDCODED GOOGLE MAPS API KEY - Replace with your actual key
const GOOGLE_MAPS_API_KEY = "AIzaSyBQOKhRC4lyStNP8x8L9SiUbvV581dKOSM"; // Replace with your actual API key

interface GoogleMapPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  defaultLocation?: { lat: number; lng: number; address: string };
  initialLocation?: { lat: number; lng: number; address?: string };
  className?: string;
}

// Global state to prevent multiple script loads
let isScriptLoading = false;
let isScriptLoaded = false;
let scriptLoadPromise: Promise<void> | null = null;
let loadedCallbacks: Set<string> = new Set();

// Mobile detection utility
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  
  return isMobileUserAgent || (isTouchDevice && isSmallScreen);
};

export function GoogleMapPicker({ 
  onLocationSelect, 
  defaultLocation,
  initialLocation,
  className = ""
}: GoogleMapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const componentIdRef = useRef<string>(`gmp${Math.random().toString(36).substr(2, 9)}`); // Removed hyphens

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{lat: number; lng: number; address: string} | null>(defaultLocation || null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualAddress, setManualAddress] = useState(defaultLocation?.address || "");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [containerReady, setContainerReady] = useState(false);
  const [showLocationButton, setShowLocationButton] = useState(false);

  // Mobile address form fields
  const [addressForm, setAddressForm] = useState({
    street: "",
    area: "",
    city: "Coimbatore",
    state: "Tamil Nadu",
    pincode: "",
    landmark: ""
  });

  // Cleanup function
  useEffect(() => {
    return () => {
      // Clean up intersection observer
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
      
      // Clean up autocomplete
      if (autocompleteRef.current) {
        google.maps?.event?.clearInstanceListeners?.(autocompleteRef.current);
        autocompleteRef.current = null;
      }
      
      // Clean up map
      if (mapInstanceRef.current) {
        google.maps?.event?.clearInstanceListeners?.(mapInstanceRef.current);
        mapInstanceRef.current = null;
      }
      
      // Clear timeout if exists
      if (window.mapCenterTimeout) {
        clearTimeout(window.mapCenterTimeout);
      }
    };
  }, []);

  // Detect mobile device on mount
  useEffect(() => {
    const checkMobile = () => {
      const mobile = isMobileDevice();
      setIsMobile(mobile);
      console.log(`📱 Device detection: ${mobile ? 'Mobile' : 'Desktop'}`);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Container visibility observer for mobile
  useEffect(() => {
    if (!mapRef.current || !isMobile) {
      setContainerReady(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          console.log('📱 Mobile container ready and visible');
          setContainerReady(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(mapRef.current);
    intersectionObserverRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [isMobile]);

  // Debug effect to track button visibility
  useEffect(() => {
    console.log(`🔍 Button visibility states:`, {
      isMapLoaded,
      mapError,
      showLocationButton,
      shouldShowButton: isMapLoaded && !mapError
    });
  }, [isMapLoaded, mapError, showLocationButton]);

  const loadGoogleMapsScript = useCallback(() => {
    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      console.log('✅ Google Maps already loaded');
      setIsMapLoaded(true);
      return Promise.resolve();
    }

    // Check if script is already loading or loaded globally
    if (isScriptLoaded) {
      console.log('✅ Google Maps script already loaded globally');
      setIsMapLoaded(true);
      return Promise.resolve();
    }

    // Check if script is already loading
    if (isScriptLoading && scriptLoadPromise) {
      console.log('⏳ Google Maps script already loading, waiting...');
      return scriptLoadPromise.then(() => {
        setIsMapLoaded(true);
      });
    }

    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
      console.log('❌ No valid Google Maps API key found');
      setMapError("Google Maps API key not configured");
      setShowManualEntry(true);
      return Promise.reject(new Error("No API key"));
    }

    // Check if script with same src already exists in DOM
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`);
    if (existingScript) {
      console.log('⚠️ Google Maps script already exists in DOM, waiting for it to load...');
      
      // Return a promise that resolves when Google Maps is ready
      return new Promise((resolve, reject) => {
        const checkLoaded = () => {
          if (window.google?.maps) {
            console.log('✅ Existing Google Maps script loaded');
            setIsMapLoaded(true);
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
        
        // Timeout after 10 seconds
        setTimeout(() => {
          reject(new Error('Google Maps loading timeout'));
        }, 10000);
      });
    }

    // Set loading state
    isScriptLoading = true;
    setIsMapLoading(true);

    // Create the promise
    scriptLoadPromise = new Promise<void>((resolve, reject) => {
      console.log(`🚀 Loading Google Maps for ${isMobile ? 'mobile' : 'desktop'}...`);
      
      // Use a simple global callback name
      const callbackName = 'initGoogleMapsCallback';
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      
      // Create global callback
      (window as any)[callbackName] = () => {
        console.log('✅ Google Maps script loaded successfully');
        
        // Add mobile-specific delay
        const delay = isMobile ? 500 : 100;
        setTimeout(() => {
          isScriptLoaded = true;
          isScriptLoading = false;
          setIsMapLoaded(true);
          setIsMapLoading(false);
          setMapError(null);
          
          // Clean up callback after use
          delete (window as any)[callbackName];
          
          resolve();
        }, delay);
      };
      
      script.onerror = (error) => {
        console.error('❌ Failed to load Google Maps script:', error);
        isScriptLoading = false;
        scriptLoadPromise = null;
        
        // Clean up callback
        delete (window as any)[callbackName];
        
        setMapError("Failed to load Google Maps");
        setIsMapLoading(false);
        setShowManualEntry(true);
        reject(error);
      };
      
      document.head.appendChild(script);
    });

    return scriptLoadPromise;
  }, [isMobile]);

  const initializeMap = useCallback(async () => {
    if (!mapRef.current || !isMapLoaded || mapInstanceRef.current) return;
    
    // Wait for container readiness on mobile
    if (isMobile && !containerReady) {
      console.log('📱 Waiting for mobile container readiness...');
      return;
    }

    try {
      console.log(`🗺️ Initializing Google Map for ${isMobile ? 'mobile' : 'desktop'}...`);

      // Mobile-specific container preparation
      if (isMobile && mapRef.current) {
        // Force layout calculation
        mapRef.current.style.height = '384px';
        mapRef.current.style.width = '100%';
        mapRef.current.getBoundingClientRect(); // Force reflow
        
        // Brief delay to ensure mobile browser is ready
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Use current location if available, otherwise center on a neutral location
      const mapCenter = currentLocation 
        ? { lat: currentLocation.lat, lng: currentLocation.lng }
        : { lat: 20.5937, lng: 78.9629 }; // Center of India as neutral starting point

      // Initialize map with mobile-optimized settings
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: currentLocation ? (isMobile ? 14 : 15) : 5, // Zoomed out if no location
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false,
        gestureHandling: isMobile ? 'greedy' : 'cooperative',
        clickableIcons: false,
        // Mobile-specific optimizations
        ...(isMobile && {
          backgroundColor: '#f8fafc',
          controlSize: 32, // Larger controls for touch
          streetViewControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
          zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM }
        })
      });

      // Add center change listener with mobile debouncing
      const debounceTime = isMobile ? 750 : 500; // Longer debounce for mobile
      mapInstanceRef.current.addListener('center_changed', async () => {
        if (mapInstanceRef.current) {
          const center = mapInstanceRef.current.getCenter();
          if (center) {
            const lat = center.lat();
            const lng = center.lng();
            
            console.log('🗺️ Map center changed to:', { lat, lng });
            
            // Debounce the location update to avoid too many updates
            clearTimeout(window.mapCenterTimeout);
            window.mapCenterTimeout = setTimeout(async () => {
              // Use Google Geocoding API to get formatted address
              try {
                const geocoder = new google.maps.Geocoder();
                const geocodeResult = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
                  geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                    if (status === 'OK' && results && results.length > 0) {
                      resolve(results);
                    } else {
                      reject(new Error(`Geocoding failed: ${status}`));
                    }
                  });
                });

                // Get formatted address from geocoding result
                const formattedAddress = geocodeResult[0].formatted_address;
                console.log('✅ Geocoded address:', formattedAddress);
                
                const newLocation = { lat, lng, address: formattedAddress };
                setCurrentLocation(newLocation);
                onLocationSelect(newLocation);
                
                // Update the manual address field with the geocoded address
                setManualAddress(formattedAddress);
              } catch (error) {
                console.warn('⚠️ Geocoding failed, using coordinates:', error);
                // Fallback to coordinates if geocoding fails
                const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                const newLocation = { lat, lng, address };
                setCurrentLocation(newLocation);
                onLocationSelect(newLocation);
                
                // Update manual address field even with coordinates as fallback
                setManualAddress(address);
              }
            }, debounceTime);
          }
        }
      });

      // Mobile-specific map ready event
      if (isMobile) {
        google.maps.event.addListenerOnce(mapInstanceRef.current, 'idle', () => {
          console.log('📱 Mobile map fully loaded and ready');
        });
      }

      console.log(`✅ Google Map initialized successfully for ${isMobile ? 'mobile' : 'desktop'}`);
      
      // Show location button once map is fully initialized
      setShowLocationButton(true);
    } catch (error) {
      console.error('❌ Failed to initialize map:', error);
      setMapError("Failed to initialize map");
      setShowManualEntry(true);
    }
  }, [isMapLoaded, currentLocation, onLocationSelect, isMobile, containerReady]);

  const initializeAutocomplete = useCallback(() => {
    if (!searchInputRef.current || !isMapLoaded || autocompleteRef.current) return;

    try {
      console.log('🔍 Initializing Google Places Autocomplete...');
      
      const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
        types: ['establishment', 'geocode'],
        componentRestrictions: { country: 'IN' },
        fields: ['formatted_address', 'geometry', 'name']
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        console.log('🏢 Place selected:', place);
        
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const address = place.formatted_address || place.name || `${lat}, ${lng}`;
          
          console.log('📍 Autocomplete location:', { lat, lng, address });
          
          const newLocation = { lat, lng, address };
          setCurrentLocation(newLocation);
          onLocationSelect(newLocation);
          
          // Update map center (which will trigger center_changed event)
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter({ lat, lng });
            mapInstanceRef.current.setZoom(16);
          }
          
          setSearchValue(address);
        }
      });

      autocompleteRef.current = autocomplete;
      console.log('✅ Autocomplete initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize autocomplete:', error);
    }
  }, [isMapLoaded, onLocationSelect]);

  // Load Google Maps on component mount with mobile-specific timing
  useEffect(() => {
    const loadDelay = isMobile ? 300 : 0; // Delay for mobile
    
    const timer = setTimeout(() => {
      loadGoogleMapsScript().catch((error) => {
        console.error('Failed to load Google Maps:', error);
      });
    }, loadDelay);
    
    return () => clearTimeout(timer);
  }, [loadGoogleMapsScript, isMobile]);

  // Initialize map when loaded with mobile-specific timing
  useEffect(() => {
    if (isMapLoaded) {
      const initDelay = isMobile ? 300 : 100; // Longer delay for mobile
      
      const timer = setTimeout(() => {
        initializeMap();
        initializeAutocomplete();
      }, initDelay);
      
      return () => clearTimeout(timer);
    }
  }, [isMapLoaded, initializeMap, initializeAutocomplete, isMobile]);

  // Auto-request current location when component mounts
  useEffect(() => {
    // Longer delay for mobile to ensure component is fully mounted
    const locationDelay = isMobile ? 1000 : 500;
    
    const timer = setTimeout(() => {
      handleGetCurrentLocation();
    }, locationDelay);
    
    return () => clearTimeout(timer);
  }, [isMobile]);

  // Touch interaction handler for mobile map readiness
  const handleContainerTouch = useCallback(() => {
    if (isMobile && isMapLoaded && !mapInstanceRef.current) {
      console.log('📱 Touch triggered mobile map initialization');
      initializeMap();
    }
  }, [isMobile, isMapLoaded, initializeMap]);

  const handleGetCurrentLocation = () => {
    console.log('📱 Requesting current location...');
    
    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      return;
    }

    // Mobile-optimized geolocation options
    const options = {
      enableHighAccuracy: isMobile ? false : true, // Less accurate but more reliable for mobile
      timeout: isMobile ? 15000 : 10000, // Longer timeout for mobile
      maximumAge: isMobile ? 300000 : 600000 // 5 minutes cache for mobile
    };

    console.log('🔄 Getting current location automatically...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        console.log('✅ Auto location obtained:', { lat, lng, accuracy });
        
        try {
          // Use Google Geocoding API to get formatted address
          if (window.google?.maps) {
            const geocoder = new google.maps.Geocoder();
            const geocodeResult = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
              geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === 'OK' && results && results.length > 0) {
                  resolve(results);
                } else {
                  reject(new Error(`Geocoding failed: ${status}`));
                }
              });
            });

            // Get formatted address from geocoding result
            const formattedAddress = geocodeResult[0].formatted_address;
            console.log('✅ Auto location geocoded address:', formattedAddress);
            
            const newLocation = { lat, lng, address: formattedAddress };
            setCurrentLocation(newLocation);
            onLocationSelect(newLocation);
          } else {
            // Fallback if Google Maps not loaded
            const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            const newLocation = { lat, lng, address };
            setCurrentLocation(newLocation);
            onLocationSelect(newLocation);
          }
        } catch (error) {
          console.warn('⚠️ Auto location geocoding failed:', error);
          // Fallback to coordinates
          const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          const newLocation = { lat, lng, address };
          setCurrentLocation(newLocation);
          onLocationSelect(newLocation);
        }
        
        // Update map if loaded
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng });
          mapInstanceRef.current.setZoom(isMobile ? 14 : 16);
          if (markerRef.current) {
            markerRef.current.setPosition({ lat, lng });
          }
        }
      },
      (error) => {
        console.error('❌ Auto geolocation error:', error || 'Unknown geolocation error');
        
        // More detailed error logging for debugging
        if (error) {
          console.log('📍 Auto geolocation error details:', {
            code: error.code,
            message: error.message,
            PERMISSION_DENIED: error.PERMISSION_DENIED,
            POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
            TIMEOUT: error.TIMEOUT
          });
        } else {
          console.log('📍 Auto geolocation error: No error object provided');
        }
        
        // For auto-location requests, just silently fall back to default location
        console.warn('⚠️ Auto location failed, staying with default location');
      },
      options
    );
  };

  // Manual location request with user feedback
  const handleManualLocationRequest = () => {
    console.log('📱 Manual location request...');
    
    if (!navigator.geolocation) {
      alert('Your browser doesn\'t support location services. Please enter your address manually.');
      return;
    }

    // Check if we're on HTTPS or localhost
    const isSecureContext = window.location.protocol === 'https:' || 
                           window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
    
    if (!isSecureContext) {
      alert('Location access requires HTTPS. Please enter your address manually or enable HTTPS.');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // 1 minute cache for manual requests
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        console.log('✅ Manual location obtained:', { lat, lng });
        
        // Use coordinates as address - no geocoding
        const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        const newLocation = { lat, lng, address };
        setCurrentLocation(newLocation);
        onLocationSelect(newLocation);
        // Only update search value on manual button click, not auto-location
        setSearchValue(address);
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng });
          mapInstanceRef.current.setZoom(16);
        }
      },
      (error) => {
        console.error('❌ Manual geolocation error:', error);
        
        let errorMessage = 'Unable to get your location. ';
        let suggestion = 'Please enter your address manually.';
        
        if (error && typeof error === 'object' && error.code !== undefined) {
          switch(error.code) {
            case 1: // PERMISSION_DENIED
              errorMessage = 'Location access was denied. ';
              suggestion = 'Please allow location access in your browser settings and try again.';
              break;
            case 2: // POSITION_UNAVAILABLE
              errorMessage = 'Location information is unavailable. ';
              suggestion = 'Please check your internet connection.';
              break;
            case 3: // TIMEOUT
              errorMessage = 'Location request timed out. ';
              suggestion = 'Please try again.';
              break;
            default:
              errorMessage = 'An unknown location error occurred. ';
              break;
          }
        } else {
          if (window.location.protocol !== 'https:' && 
              window.location.hostname !== 'localhost' && 
              window.location.hostname !== '127.0.0.1') {
            errorMessage = 'Location requires HTTPS. ';
            suggestion = 'Please enable HTTPS.';
          } else {
            errorMessage = 'Location access is blocked. ';
            suggestion = 'Please check your browser settings.';
          }
        }
        
        alert(errorMessage + suggestion);
        setShowManualEntry(true);
      },
      options
    );
  };

  const handleManualSubmit = () => {
    const fullAddress = [
      addressForm.street,
      addressForm.area,
      addressForm.landmark,
      addressForm.city,
      addressForm.state,
      addressForm.pincode
    ].filter(Boolean).join(', ');

    if (!fullAddress.trim()) {
      alert('Please fill in at least the street address.');
      return;
    }

    // Use a neutral location for manual address entries
    const manualLocation = {
      lat: 20.5937, // Center of India as neutral coordinates
      lng: 78.9629,
      address: fullAddress
    };

    setCurrentLocation(manualLocation);
    onLocationSelect(manualLocation);
    setManualAddress(fullAddress);
    console.log('✅ Manual address submitted:', fullAddress);
  };

  const handleUseManualAddress = () => {
    if (!manualAddress.trim()) {
      alert('Please enter a complete address.');
      return;
    }

    // Use a neutral location for manual address entries
    const manualLocation = {
      lat: 20.5937, // Center of India as neutral coordinates
      lng: 78.9629,
      address: manualAddress
    };

    setCurrentLocation(manualLocation);
    onLocationSelect(manualLocation);
    console.log('✅ Manual address used:', manualAddress);
  };

  // Current location button handler with loading state
  const handleCurrentLocationButton = () => {
    console.log('🎯 Current location button clicked...');
    
    if (!navigator.geolocation) {
      alert('Your browser doesn\'t support location services.');
      return;
    }

    setIsGettingLocation(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000 // 1 minute cache
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        console.log('✅ Current location button - location obtained:', { lat, lng });
        
        try {
          // Use Google Geocoding API to get formatted address
          if (window.google?.maps) {
            const geocoder = new google.maps.Geocoder();
            const geocodeResult = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
              geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === 'OK' && results && results.length > 0) {
                  resolve(results);
                } else {
                  reject(new Error(`Geocoding failed: ${status}`));
                }
              });
            });

            // Get formatted address from geocoding result
            const formattedAddress = geocodeResult[0].formatted_address;
            console.log('✅ Current location button geocoded address:', formattedAddress);
            
            const newLocation = { lat, lng, address: formattedAddress };
            setCurrentLocation(newLocation);
            onLocationSelect(newLocation);
          } else {
            // Fallback if Google Maps not loaded
            const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            const newLocation = { lat, lng, address };
            setCurrentLocation(newLocation);
            onLocationSelect(newLocation);
          }
        } catch (error) {
          console.warn('⚠️ Current location button geocoding failed:', error);
          // Fallback to coordinates
          const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          const newLocation = { lat, lng, address };
          setCurrentLocation(newLocation);
          onLocationSelect(newLocation);
        } finally {
          setIsGettingLocation(false);
        }
        
        // Center map and zoom to current location
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng });
          mapInstanceRef.current.setZoom(17); // Closer zoom for current location
        }
        
        console.log('✅ Map centered to current location');
      },
      (error) => {
        console.error('❌ Current location button geolocation error:', error || 'Unknown geolocation error');
        setIsGettingLocation(false);
        
        let errorMessage = 'Unable to get your current location. ';
        if (error && typeof error === 'object' && 'code' in error) {
          switch(error.code) {
            case 1: // PERMISSION_DENIED
              errorMessage = 'Location access was denied. Please allow location access and try again.';
              break;
            case 2: // POSITION_UNAVAILABLE
              errorMessage = 'Your location is currently unavailable. Please try again.';
              break;
            case 3: // TIMEOUT
              errorMessage = 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage = 'Unable to get your location. Please try again.';
              break;
          }
        }
        
        alert(errorMessage);
      },
      options
    );
  };

  // Set initial location from props
  useEffect(() => {
    if (initialLocation && !currentLocation) {
      setCurrentLocation({
        lat: initialLocation.lat,
        lng: initialLocation.lng,
        address: initialLocation.address || `${initialLocation.lat.toFixed(6)}, ${initialLocation.lng.toFixed(6)}`
      });
    }
  }, [initialLocation, currentLocation]);

  // Show manual entry if there's an error or API key issues
  if (showManualEntry || mapError) {
    return (
      <div className={`w-full ${className}`}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Enter Your Address</h3>
            {!mapError && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setShowManualEntry(false);
                  setMapError(null);
                  loadGoogleMapsScript();
                }}
                className="text-gutzo-primary hover:text-gutzo-primary-hover"
              >
                Try Maps Again
              </Button>
            )}
          </div>

          {/* Quick address input */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Complete Address
              </label>
              <textarea
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="Enter your complete address including street, area, city, and pincode"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gutzo-primary focus:border-gutzo-primary resize-none"
                rows={3}
              />
            </div>
            
            <Button 
              onClick={handleUseManualAddress}
              className="w-full bg-gutzo-primary hover:bg-gutzo-primary-hover text-white"
            >
              Use This Address
            </Button>
          </div>

          {/* Detailed form */}
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-3">Or fill in details separately:</p>
            
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address *
                </label>
                <Input
                  value={addressForm.street}
                  onChange={(e) => setAddressForm({...addressForm, street: e.target.value})}
                  placeholder="House/Flat no, Street name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area/Locality *
                </label>
                <Input
                  value={addressForm.area}
                  onChange={(e) => setAddressForm({...addressForm, area: e.target.value})}
                  placeholder="Area, Locality"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <Input
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                    placeholder="City"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pincode
                  </label>
                  <Input
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({...addressForm, pincode: e.target.value})}
                    placeholder="Pincode"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Landmark (Optional)
                </label>
                <Input
                  value={addressForm.landmark}
                  onChange={(e) => setAddressForm({...addressForm, landmark: e.target.value})}
                  placeholder="Nearby landmark"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleManualSubmit}
              className="w-full mt-4 bg-gutzo-primary hover:bg-gutzo-primary-hover text-white"
            >
              Save Address
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="space-y-4">
        {/* Interactive Map - Pure location selection via panning */}
        <div className="relative">
          <div className="relative w-full">
            {/* Google Maps Container */}
            <div 
              ref={mapRef}
              className="w-full h-96 sm:h-96 md:h-[28rem] rounded-xl border border-gray-300 bg-gray-100 shadow-lg shadow-gray-200/50 overflow-hidden touch-manipulation"
              style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.1)',
                minHeight: '384px',
                height: '384px',
                width: '100%',
                position: 'relative',
                display: 'block',
                visibility: 'visible',
                opacity: 1,
                touchAction: 'pan-x pan-y',
                WebkitTransform: 'translateZ(0)',
                transform: 'translateZ(0)',
                willChange: 'transform',
                contain: 'layout style paint size',
                isolation: 'isolate',
                zIndex: 1,
              }}
              onTouchStart={handleContainerTouch}
              onClick={handleContainerTouch}
            />

            {/* Recenter Button - Outside Map Container */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCurrentLocationButton();
              }}
              disabled={isGettingLocation}
              className="absolute bottom-4 right-4 w-8 h-8 md:w-10 md:h-10 bg-gutzo-primary hover:bg-gutzo-primary-hover disabled:bg-gray-400 rounded-full shadow-xl hover:shadow-2xl disabled:shadow-lg flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gutzo-primary border-2 border-white z-[9999]"
              title="Back to my location"
              style={{
                backgroundColor: isGettingLocation ? '#9CA3AF' : '#E7600E',
                cursor: isGettingLocation ? 'not-allowed' : 'pointer',
                zIndex: 9999,
                pointerEvents: 'auto',
              }}
            >
              {isGettingLocation ? (
                <Loader2 className="w-3 h-3 md:w-4 md:h-4 text-white animate-spin" />
              ) : (
                <Crosshair className="w-3 h-3 md:w-4 md:h-4 text-white transition-transform duration-200 hover:scale-110" strokeWidth={2.5} />
              )}
            </button>
          </div>
          
          {/* Center Location Pointer - Always stays in center */}
          {isMapLoaded && !mapError && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
              <div className="relative">
                {/* Location Pin Icon */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="relative">
                    {/* Pin Shadow/Glow Effect */}
                    <div className="absolute inset-0 bg-gutzo-primary rounded-full blur-sm opacity-40 scale-125" style={{ backgroundColor: '#E7600E' }}></div>
                    
                    {/* Main Location Pin */}
                    <MapPin 
                      className="w-8 h-8 text-gutzo-primary drop-shadow-lg relative z-10" 
                      style={{ color: '#E7600E' }}
                      fill="currentColor"
                      strokeWidth={1.5}
                    />
                    
                    {/* Pin Tip Highlight */}
                    <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 translate-y-1 shadow-md z-20"></div>
                  </div>
                </div>
              </div>
              
              {/* Instruction text */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-md">
                <p className="text-xs text-gray-700 font-medium">Move map to pin your location</p>
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {isMapLoading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gutzo-primary mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading Google Maps...</p>
              </div>
            </div>
          )}

          {/* Map Not Loaded State */}
          {!isMapLoaded && !isMapLoading && !mapError && (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center rounded-lg">
              <div className="text-center p-4">
                <MapPin className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                <p className="text-sm text-blue-700 mb-2 font-medium">Initializing Maps...</p>
                <p className="text-xs text-blue-600 max-w-xs leading-relaxed">
                  Setting up interactive map for location selection
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Selected Location Display - Removed to hide from user while keeping lat/lng for DB storage */}
        {/* {currentLocation && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-1">Selected Location:</p>
            <p className="text-sm text-gray-600">
              {currentLocation.address && !currentLocation.address.includes(',') 
                ? 'Getting address...' 
                : currentLocation.address || 'Loading location...'}
            </p>
          </div>
        )} */} 
        
        {/* Show location button if map is fully initialized */}
        {showLocationButton && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-1">Selected Location:</p>
            <p className="text-sm text-gray-600">
              {currentLocation.address && !currentLocation.address.includes(',') 
                ? 'Getting address...' 
                : currentLocation.address || 'Loading location...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}