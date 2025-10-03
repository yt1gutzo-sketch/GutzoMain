import { useState, useEffect } from "react";
import { MapPin, Check, X, Loader2, Navigation } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { useLocation } from "../contexts/LocationContext";

interface LocationGateProps {
  onLocationApproved: () => void;
}

interface LocationState {
  status: 'idle' | 'requesting' | 'checking' | 'approved' | 'denied' | 'error';
  city?: string;
  error?: string;
}

export function LocationGate({ onLocationApproved }: LocationGateProps) {
  const [locationState, setLocationState] = useState<LocationState>({ status: 'idle' });
  const { location, locationDisplay, isInCoimbatore } = useLocation();

  // Use the location context to check if already detected
  useEffect(() => {
    if (location) {
      if (isInCoimbatore) {
        setLocationState({ status: 'approved', city: locationDisplay });
        setTimeout(() => {
          onLocationApproved();
        }, 1000);
      } else {
        setLocationState({ status: 'denied', city: locationDisplay });
      }
    }
  }, [location, isInCoimbatore, locationDisplay, onLocationApproved]);

  const requestLocation = () => {
    // If location is already detected by the context, use it
    if (location) {
      if (isInCoimbatore) {
        setLocationState({ status: 'approved', city: locationDisplay });
        setTimeout(() => {
          onLocationApproved();
        }, 1000);
      } else {
        setLocationState({ status: 'denied', city: locationDisplay });
      }
      return;
    }

    // Otherwise show requesting state and wait for location context
    setLocationState({ status: 'requesting' });
  };

  const renderContent = () => {
    switch (locationState.status) {
      case 'idle':
        return (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gutzo-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Navigation className="w-8 h-8 text-gutzo-primary" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Welcome to Gutzo! 🍎
              </h1>
              <p className="text-gray-600">
                To serve you fresh, healthy meals, we need to know your location
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gutzo-highlight/20 rounded-lg p-4">
                <h3 className="font-medium text-gutzo-selected mb-2">Why we need your location:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Find vendors delivering to your area</li>
                  <li>• Show accurate delivery times</li>
                  <li>• Provide the freshest meal options nearby</li>
                </ul>
              </div>
            </div>

            <Button
              onClick={requestLocation}
              className="w-full bg-gutzo-primary hover:bg-gutzo-primary-hover text-white"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Share My Location
            </Button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Your location is only used to show relevant vendors. We respect your privacy.
            </p>
          </>
        );

      case 'requesting':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-gutzo-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-gutzo-primary animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Requesting Location...
            </h2>
            <p className="text-gray-600">
              Please allow location access in your browser
            </p>
          </div>
        );

      case 'checking':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-gutzo-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-gutzo-primary animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Checking Your Area...
            </h2>
            <p className="text-gray-600">
              Verifying if we deliver to your location
            </p>
          </div>
        );

      case 'approved':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Perfect! You're in {locationState.city} 🎉
            </h2>
            <p className="text-gray-600">
              Great news! Gutzo delivers fresh, healthy meals to your area.
            </p>
          </div>
        );

      case 'denied':
        const displayCity = locationState.city || (location ? locationDisplay : 'your area');
        return (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                We're Not in {displayCity} Yet 🚀
              </h2>
              <p className="text-gray-600 mb-6">
                Gutzo is currently available only in Coimbatore, but we're expanding fast!
              </p>
            </div>

            <div className="bg-gradient-to-br from-gutzo-highlight/30 to-gutzo-primary/10 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-gutzo-selected mb-3">Coming Soon to {displayCity}!</h3>
              <p className="text-sm text-gray-700 mb-4">
                We're working hard to bring healthy, fresh meals to your area. Be the first to know when we launch!
              </p>
              
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gutzo-primary rounded-full"></div>
                  <span>Premium vendors</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gutzo-selected rounded-full"></div>
                  <span>Fresh ingredients</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gutzo-highlight rounded-full"></div>
                  <span>Quick delivery</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => window.open('mailto:hello@gutzo.in?subject=Expansion Request&body=Hi! I would love to see Gutzo in ' + displayCity + '. Please let me know when you launch here!', '_blank')}
                className="w-full bg-gutzo-primary hover:bg-gutzo-primary-hover text-white"
              >
                📧 Get Notified When We Launch
              </Button>
              
              <Button
                onClick={() => setLocationState({ status: 'idle' })}
                variant="outline"
                className="w-full"
              >
                Try Different Location
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">
                Meanwhile, follow us on social media for updates and healthy eating tips! 🌱
              </p>
            </div>
          </>
        );

      case 'error':
        return (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Location Access Required
              </h2>
              <p className="text-gray-600 mb-4">
                {locationState.error}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-2">How to enable location:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>1. Click the location icon in your browser's address bar</li>
                <li>2. Select "Allow" for location access</li>
                <li>3. Refresh the page if needed</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                onClick={requestLocation}
                className="w-full bg-gutzo-primary hover:bg-gutzo-primary-hover text-white"
              >
                Try Again
              </Button>
              
              <Button
                onClick={() => {
                  // Allow manual confirmation for Coimbatore users who can't share location
                  const isCoimbatore = window.confirm(
                    "Are you currently in Coimbatore? Click OK if you are in Coimbatore and want to continue without sharing your precise location."
                  );
                  if (isCoimbatore) {
                    setLocationState({ status: 'approved', city: 'Coimbatore' });
                    setTimeout(() => {
                      onLocationApproved();
                    }, 1000);
                  }
                }}
                variant="outline"
                className="w-full"
              >
                I'm in Coimbatore (Continue without location)
              </Button>
              
              <Button
                onClick={() => window.open('mailto:hello@gutzo.in?subject=Location Access Help&body=Hi! I\'m having trouble accessing location on Gutzo. Can you help?', '_blank')}
                variant="ghost"
                className="w-full text-sm"
              >
                Need Help? Contact Us
              </Button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 shadow-lg">
        {renderContent()}
      </Card>
    </div>
  );
}