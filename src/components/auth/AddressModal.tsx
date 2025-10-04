import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import ReactDOM from "react-dom";
import { X, MapPin, AlertCircle, Home, Building2, MapPinIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { GoogleMapPicker } from "../GoogleMapPicker";
import { useLocation } from "../../contexts/LocationContext";
import { useAddresses } from "../../hooks/useAddresses";
import { useAuth } from "../../contexts/AuthContext";
import { 
  UserAddress, 
  AddressFormData, 
  AddressType, 
  AddressTypeOption 
} from "../../types/address";
import {
  reverseGeocode,
  extractAreaFromDetailedAddress,
  extractCityFromDetailedAddress,
  parseAddressString,
  type DetailedAddress,
} from "../../utils/geocoding";

// Legacy interface for backward compatibility
interface Address {
  id?: string;
  complete_address: string;
  floor?: string;
  landmark?: string;
  area: string;
  city?: string;
  type: "Home" | "Work" | "Other";
  custom_tag?: string;
  is_default?: boolean;
  phone?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  house_number?: string;
  apartment_road?: string;
}

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => Promise<void>;
}

// Helper functions moved outside component scope
const extractAreaFromAddress = (address: string): string => {
  if (!address) return "";
  // Split by comma and try to get the area part (usually 2nd or 3rd part)
  const parts = address.split(",").map((part) => part.trim());
  if (parts.length >= 2) {
    // Return the second part which is usually the area/locality
    return parts[1] || "";
  }
  return "";
};

const extractCityFromAddress = (address: string): string => {
  if (!address) return "";
  // Split by comma and try to get the city part (usually last or second-to-last part)
  const parts = address.split(",").map((part) => part.trim());
  if (parts.length >= 3) {
    // Return the third part which is usually the city
    return parts[2] || "";
  } else if (parts.length >= 2) {
    // Fallback to second part if only 2 parts
    return parts[1] || "";
  }
  return "";
};

// Move AddressForm outside to prevent recreation on every render
interface AddressFormProps {
  newAddress: Address;
  setNewAddress: (
    address: Address | ((prev: Address) => Address),
  ) => void;
  addressData: AddressFormData;
  setAddressData: (
    data: AddressFormData | ((prev: AddressFormData) => AddressFormData),
  ) => void;
  availableTypes: AddressType[];
  loadingTypes: boolean;
  savingAddress: boolean;
  onSave: () => void;
  onClose: () => void;
  validationErrors: { [key: string]: string };
  setValidationErrors: (
    errors:
      | { [key: string]: string }
      | ((prev: { [key: string]: string }) => {
          [key: string]: string;
        }),
  ) => void;
  areaRef?: React.RefObject<HTMLInputElement>;
  customTagRef?: React.RefObject<HTMLInputElement>; // Add customTagRef to props
  modalContentRef?: React.RefObject<HTMLDivElement>; // Add modalContentRef to props
  onLocationSelect: (
    location: { lat: number; lng: number },
    address: string,
  ) => void;
}

const AddressForm = ({
  newAddress,
  setNewAddress,
  addressData,
  setAddressData,
  availableTypes,
  loadingTypes,
  savingAddress,
  onSave,
  onClose,
  validationErrors,
  setValidationErrors,
  areaRef,
  customTagRef,
  modalContentRef,
  onLocationSelect,
}: AddressFormProps) => {
  // Defensive fallback: ensure availableTypes is always an array
  const safeAvailableTypes = Array.isArray(availableTypes) ? availableTypes : ['home', 'work', 'other'];
  const { location, locationDisplay } = useLocation(); // Get device location in form component too

  // Auto-scroll when "other" type is selected
  // Improved auto-scroll: trigger after custom label field is rendered
  useEffect(() => {
    if (addressData.type === 'other' && modalContentRef?.current && customTagRef?.current) {
      const timer = setTimeout(() => {
        modalContentRef.current.scrollTo({
          top: modalContentRef.current.scrollHeight,
          behavior: "smooth",
        });
        // Optionally focus the custom label input
        customTagRef.current.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [addressData.type, modalContentRef, customTagRef, addressData.label]);

  return (
    <div className="flex flex-col h-full">
      {/* Mobile Header */}
      <div className="sm:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg -ml-2"
        >
          <X className="h-6 w-6 text-gray-600" />
        </button>
        <h2 className="font-semibold text-gray-900">
          Add Delivery Address
        </h2>
        <div className="w-10" />{" "}
        {/* Spacer for center alignment */}
      </div>

      {/* Desktop Header */}
      <div className="hidden sm:flex items-center justify-between p-6 pb-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gutzo-primary/10 rounded-full flex items-center justify-center">
            <MapPin className="h-4 w-4 text-gutzo-primary" />
          </div>
          <h3 className="font-semibold text-gray-900">
            Add Delivery Address
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 mobile-product-scroll scrollbar-hide max-h-[60vh] min-h-0"
        ref={modalContentRef}
      >
        {/* Google Maps Location Picker */}
        <GoogleMapPicker
          onLocationSelect={(locationData) =>
            onLocationSelect(
              { lat: locationData.lat, lng: locationData.lng },
              locationData.address,
            )
          }
          initialLocation={
            newAddress.latitude && newAddress.longitude
              ? {
                  lat: newAddress.latitude,
                  lng: newAddress.longitude,
                  address: newAddress.complete_address,
                }
              : (location?.coordinates?.latitude && location?.coordinates?.longitude)
                ? {
                    lat: location.coordinates.latitude,
                    lng: location.coordinates.longitude,
                    address: locationDisplay || "",
                  }
                : { lat: 40.2038, lng: -8.41, address: "" } // Fallback to Coimbra
          }
          className="mb-5"
        />

        {/* Address Form - Desktop Layout */}
        <div className="space-y-4">
          {/* Street Address */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              House / Flat / Block No.
            </label>
            <Input
              value={addressData.street}
              onChange={(e) => {
                setAddressData(prev => ({
                  ...prev,
                  street: e.target.value
                }));
                
                // Clear validation error
                if (validationErrors.street) {
                  setValidationErrors(prev => ({ ...prev, street: '' }));
                }
              }}
              placeholder="Enter house/flat number"
              className={`border-2 focus:ring-0 rounded-xl ${
                validationErrors.street
                  ? "border-red-300 focus:border-red-500"
                  : "border-gray-200 focus:border-gutzo-primary"
              }`}
              disabled={savingAddress || loadingTypes}
            />
            {validationErrors.street && (
              <div className="flex items-center mt-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {validationErrors.street}
              </div>
            )}
          </div>

          {/* Apartment/Road/Area - Matching Desktop */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Apartment / Road / Area (Optional)
            </label>
            <Input
              ref={areaRef}
              value={addressData.area || ""}
              onChange={(e) => {
                setAddressData(prev => ({
                  ...prev,
                  area: e.target.value
                }));
              }}
              placeholder="Enter area details"
              className="border-2 border-gray-200 focus:border-gutzo-primary focus:ring-0 rounded-xl"
              disabled={savingAddress || loadingTypes}
            />
          </div>

          {/* Phone Number - Matching Desktop */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Phone Number (Alternative Contact)
            </label>
            <Input
              value={addressData.landmark || ""}
              onChange={(e) => {
                setAddressData(prev => ({
                  ...prev,
                  landmark: e.target.value
                }));
              }}
              placeholder="Enter phone number"
              type="tel"
              className="border-2 border-gray-200 focus:border-gutzo-primary focus:ring-0 rounded-xl"
              disabled={savingAddress || loadingTypes}
            />
          </div>

          {/* Desktop-style Address Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Save as
            </label>
            
            <div className="flex space-x-3">
              {(['home', 'work', 'other'] as AddressType[]).map((type) => {
                const isAvailable = safeAvailableTypes.includes(type);
                const isSelected = addressData.type === type;
                
                const typeConfig = {
                  home: { label: 'Home', icon: Home },
                  work: { label: 'Work', icon: Building2 },
                  other: { label: 'Other', icon: MapPinIcon }
                };
                
                const config = typeConfig[type];
                const IconComponent = config.icon;
                
                return (
                  <div
                    key={type}
                    className={`flex-1 flex items-center justify-center space-x-2 cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-gutzo-primary bg-gutzo-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      // Always allow selection - remove complex availability checks
                      setAddressData(prev => ({ ...prev, type }));
                      
                      // Update legacy state for backward compatibility
                      const legacyType = type === 'home' ? 'Home' : 
                                        type === 'work' ? 'Work' : 'Other';
                      setNewAddress(prev => ({ ...prev, type: legacyType }));
                      
                      // Clear validation errors
                      setValidationErrors(prev => ({ ...prev, label: '' }));
                    }}
                  >
                    <input
                      type="radio"
                      name="addressType"
                      value={type}
                      checked={isSelected}
                      onChange={() => {}} // Handled by div click
                      className="w-4 h-4 text-gutzo-primary focus:ring-gutzo-primary border-gray-300"
                    />
                    
                    <div className={`p-2 rounded-lg ${
                      isSelected 
                        ? 'bg-gutzo-primary text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    
                    <span className="font-medium text-gray-900 text-sm">
                      {config.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Label for "Other" type */}
          {addressData.type === 'other' && (
            <div data-custom-tag-section>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Custom Label *
              </label>
              <Input
                ref={customTagRef}
                value={addressData.label || ""}
                onChange={e => {
                  setAddressData(prev => ({
                    ...prev,
                    label: e.target.value
                  }));
                  setNewAddress(prev => ({
                    ...prev,
                    custom_tag: e.target.value,
                  }));
                  if (validationErrors.label) {
                    setValidationErrors(prev => ({
                      ...prev,
                      label: "",
                    }));
                  }
                }}
                placeholder="Enter custom address label"
                className={`border-2 focus:ring-0 rounded-xl ${validationErrors.label ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-gutzo-primary"}`}
                disabled={savingAddress || loadingTypes}
              />
              {validationErrors.label && (
                <span className="text-xs text-red-500">{validationErrors.label}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save Button - Sticky at bottom on mobile */}
      <div className="p-4 border-t border-gray-200 bg-white sm:border-t sm:border-gray-100 sm:bg-white sm:p-6 sm:pt-4">
        {validationErrors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 mr-2" />
              {validationErrors.general}
            </div>
          </div>
        )}
        
        <Button
          onClick={onSave}
          disabled={
            !addressData.street.trim() ||
            !addressData.fullAddress?.trim() ||
            (addressData.type === 'other' && !addressData.label?.trim()) ||
            savingAddress ||
            loadingTypes
          }
          className="w-full h-12 bg-gutzo-primary hover:bg-gutzo-primary-hover text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none disabled:opacity-50"
        >
          {savingAddress ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Saving Address...</span>
            </div>
          ) : (
            "Save and Proceed"
          )}
        </Button>
        
        {loadingTypes && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Loading available address types...
          </p>
        )}
      </div>
    </div>
  );
};

export function AddressModal({
  isOpen,
  onClose,
  onSave,
}: AddressModalProps) {
  const { location } = useLocation();
  const { isAuthenticated } = useAuth();
  const { 
    availableTypes, 
    loading: addressesLoading, 
    createAddress, 
    error: addressError 
  } = useAddresses();
  
  // Legacy state for backward compatibility
  const [newAddress, setNewAddress] = useState<Address>({
    complete_address: "",
    floor: "",
    landmark: "",
    area: "",
    city: "", // Include city in reset
    type: "Home",
    phone: "",
    house_number: "",
    apartment_road: "",
  });
  const [addressData, setAddressData] = useState<AddressFormData>({
    type: 'home',
    street: '',
    area: '',
    landmark: '',
    fullAddress: '',
    isDefault: false
  });
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [savingAddress, setSavingAddress] = useState<boolean>(false);
  const [loadingTypes, setLoadingTypes] = useState<boolean>(false);
  
  const modalContentRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLInputElement>(null);
  const customTagRef = useRef<HTMLInputElement>(null);

  // Enhanced location selection handler
  const handleLocationSelect = useCallback(
    async (
      location: { lat: number; lng: number },
      address: string,
    ) => {
      console.log("📍 Location selected:", {
        lat: location.lat,
        lng: location.lng,
        address,
      });

      // Update new address system immediately
      setAddressData(prev => ({
        ...prev,
        latitude: location.lat,
        longitude: location.lng,
        fullAddress: address,
      }));

      // Update legacy state for backward compatibility
      setNewAddress((prev) => ({
        ...prev,
        latitude: location.lat,
        longitude: location.lng,
        complete_address: address || prev.complete_address,
      }));

      try {
        // Attempt to get detailed address information via geocoding
        const detailedAddress = await reverseGeocode(
          location.lat,
          location.lng,
        );

        if (detailedAddress) {
          console.log("✅ Enhanced geocoding successful:", detailedAddress);

          // Extract address components
          const area = extractAreaFromDetailedAddress(detailedAddress);
          const city = extractCityFromDetailedAddress(detailedAddress);
          
          // Update address system
          setAddressData(prev => ({
            ...prev,
            latitude: location.lat,
            longitude: location.lng,
            fullAddress: detailedAddress.formattedAddress || address,
            street: address.split(',')[0]?.trim() || '', // Extract first part as street
            area: area || '',
          }));
        } else {
          // Fallback to basic string parsing if geocoding fails
          console.log("⚠️ Geocoding failed, using basic address parsing");
          const fallbackParsed = parseAddressString(address);
          
          const area = fallbackParsed.area || extractAreaFromAddress(address);
          const city = fallbackParsed.city || extractCityFromAddress(address);

          // Update address system
          setAddressData(prev => ({
            ...prev,
            latitude: location.lat,
            longitude: location.lng,
            fullAddress: address,
            street: address.split(',')[0]?.trim() || '',
            area: area || '',
          }));
        }
      } catch (error) {
        console.error("❌ Geocoding error, using basic parsing:", error);

        // Final fallback
        const fallbackParsed = parseAddressString(address);
        const area = fallbackParsed.area || extractAreaFromAddress(address);

        // Update address system
        setAddressData(prev => ({
          ...prev,
          latitude: location.lat,
          longitude: location.lng,
          fullAddress: address,
          street: address.split(',')[0]?.trim() || '',
          area: area || '',
        }));
      }
    },
    [],
  );

  // Handle address type change with scroll behavior for "Other"
  const handleAddressTypeChange = useCallback(
    (newType: "Home" | "Work" | "Other") => {
      setNewAddress((prev) => ({
        ...prev,
        type: newType,
        // Clear custom tag when switching away from "Other"
        custom_tag:
          newType === "Other" ? prev.custom_tag : undefined,
      }));

      // Clear custom tag validation error when switching away from "Other"
      if (newType !== "Other" && validationErrors.custom_tag) {
        setValidationErrors((prev) => ({
          ...prev,
          custom_tag: "",
        }));
      }

      // Scroll to custom tag field when "Other" is selected
      if (newType === "Other") {
        setTimeout(() => {
          // Scroll modal content to show custom tag field
          if (modalContentRef.current) {
            modalContentRef.current.scrollTo({
              top: modalContentRef.current.scrollHeight,
              behavior: "smooth",
            });
          }

          // Focus on custom tag input after scroll
          setTimeout(() => {
            if (customTagRef.current) {
              customTagRef.current.focus();
            }
          }, 300);
        }, 100);
      }
    },
    [validationErrors.custom_tag],
  );

  // Load available address types when modal opens
  useEffect(() => {
    const loadAvailableTypes = async () => {
      if (isOpen) {
        setLoadingTypes(true);
        
        // Reset forms
        setAddressData({
          type: 'home',
          street: '',
          area: '',
          landmark: '',
          fullAddress: '',
          isDefault: false
        });

        
        setValidationErrors({});

        // Load available types using the hook
        setLoadingTypes(false); // Available types are loaded by the hook
      }
    };

    loadAvailableTypes();
  }, [isOpen]);

  // Validation is now handled directly in handleSaveAddress function

  const handleClose = useCallback(() => {
    setNewAddress({
      complete_address: "",
      floor: "",
      landmark: "",
      area: "",
      city: "", // Include city in reset
      type: "Home",
      phone: "",
      house_number: "",
      apartment_road: "",
    });
    onClose();
  }, [onClose]);

  const handleSaveAddress = useCallback(async () => {
    setSavingAddress(true);
    setValidationErrors({});

    try {
      // Validate required fields using the new address structure
      const errors: {[key: string]: string} = {};
      
      if (!addressData.street.trim()) {
        errors.street = 'House number is required';
      }
      
      if (!addressData.fullAddress.trim()) {
        errors.fullAddress = 'Please select a location on the map';
      }
      
      if (addressData.type === 'other' && (!addressData.label?.trim())) {
        errors.label = 'Label is required for Other address type';
      }

      if (!addressData.latitude || !addressData.longitude) {
        errors.location = 'Please select a location on the map';
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setSavingAddress(false);
        return;
      }

      // Use the modern address data
      const addressPayload: AddressFormData = {
        type: addressData.type,
        label: addressData.type === 'other' ? addressData.label : undefined,
        street: addressData.street || '',
        area: addressData.area || undefined,
        landmark: addressData.landmark || undefined,
        fullAddress: addressData.fullAddress || '',
        latitude: addressData.latitude,
        longitude: addressData.longitude,
        isDefault: addressData.isDefault || false
      };

      console.log('🏠 Saving address with payload:', addressPayload);

      // Use the address hook to create address
      const result = await createAddress(addressPayload);
      
      if (result.success) {
        console.log('✅ Address saved successfully');
        // Only trigger onSave to update UI (fetch latest addresses), not to create another address
        if (onSave) await onSave();
        // Reset and close
        handleClose();
      } else {
        setValidationErrors({
          general: result.error || 'Failed to save address. Please try again.'
        });
      }
    } catch (error) {
      console.error('❌ Error saving address:', error);
      setValidationErrors({
        general: 'Failed to save address. Please check your connection and try again.'
      });
    } finally {
      setSavingAddress(false);
    }
  }, [addressData, createAddress, onSave, handleClose]);

  if (!isOpen) return null;

  // Portal-based modal content
  const modalContent = (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity duration-300 ease-out"
        onClick={handleClose}
      />
      
      {/* Unified Modal Container */}
      <div className="fixed inset-0 flex items-end sm:items-center justify-center">
        <div className="relative bg-white w-full sm:w-[480px] sm:max-w-[90%] max-h-[90vh] sm:rounded-2xl rounded-t-3xl shadow-xl overflow-hidden transform transition-all duration-300 z-[101]">
          <AddressForm
            newAddress={newAddress}
            setNewAddress={setNewAddress}
            addressData={addressData}
            setAddressData={setAddressData}
            availableTypes={availableTypes}
            loadingTypes={loadingTypes}
            savingAddress={savingAddress}
            onSave={handleSaveAddress}
            onClose={handleClose}
            validationErrors={validationErrors}
            setValidationErrors={setValidationErrors}
            areaRef={areaRef as React.RefObject<HTMLInputElement>}
            customTagRef={customTagRef as React.RefObject<HTMLInputElement>}
            modalContentRef={modalContentRef as React.RefObject<HTMLDivElement>}
            onLocationSelect={handleLocationSelect}
          />
        </div>
      </div>
    </div>
  );

  // Use ReactDOM.createPortal to render modal at root level
  return ReactDOM.createPortal(modalContent, document.body);
}