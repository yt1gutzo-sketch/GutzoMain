// Google Maps configuration utility
import { getGoogleMapsKeyWithFallback } from './figmaMakeEnvironment';

declare global {
  interface Window {
    GOOGLE_MAPS_API_KEY?: string;
    initGoogleMaps?: () => void;
    googleMapsScriptLoaded?: boolean;
  }
}

// Simple, direct API key getter for Figma Make
export function getGoogleMapsApiKey(): string | null {
  // First, try to get the API key directly from environment variables
  // Since the user mentioned it's already provided in Figma Make
  
  // Try Deno first (Figma Make's primary runtime)
  if (typeof Deno !== 'undefined' && (Deno as any).env?.get) {
    const denoKey = (Deno as any).env.get('GOOGLE_MAPS_API_KEY');
    if (denoKey && denoKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      return denoKey;
    }
  }
  
  // Try process.env
  if (typeof process !== 'undefined' && process.env?.GOOGLE_MAPS_API_KEY) {
    const processKey = process.env.GOOGLE_MAPS_API_KEY;
    if (processKey && processKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      return processKey;
    }
  }
  
  // Try globalThis
  if (typeof globalThis !== 'undefined' && (globalThis as any).GOOGLE_MAPS_API_KEY) {
    const globalKey = (globalThis as any).GOOGLE_MAPS_API_KEY;
    if (globalKey && globalKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      return globalKey;
    }
  }
  
  // Try window
  if (typeof window !== 'undefined' && window.GOOGLE_MAPS_API_KEY) {
    const windowKey = window.GOOGLE_MAPS_API_KEY;
    if (windowKey && windowKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      return windowKey;
    }
  }
  
  // Fallback to the complex detection
  return getGoogleMapsKeyWithFallback();
}

// This function should be called early in the app initialization
export function initializeGoogleMapsConfig() {
  if (typeof window !== 'undefined') {
    const apiKey = getGoogleMapsApiKey();
    
    if (apiKey) {
      window.GOOGLE_MAPS_API_KEY = apiKey;
      console.log('✅ Google Maps API key configured successfully');
    } else {
      // Don't show scary errors - maps will gracefully degrade
      console.log('ℹ️ Google Maps will operate in limited mode');
    }
  }
}