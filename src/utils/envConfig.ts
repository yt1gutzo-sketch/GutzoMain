// Environment configuration utility for Figma Make
// This handles the injection of environment variables into the browser environment
import { getFigmaMakeVariable } from './figmaMakeEnvironment';

declare global {
  interface Window {
    __ENV_CONFIG__?: {
      GOOGLE_MAPS_API_KEY?: string;
      [key: string]: any;
    };
  }
}

export function injectEnvironmentVariables() {
  if (typeof window === 'undefined') return;

  const apiKey = getFigmaMakeVariable('GOOGLE_MAPS_API_KEY');
  
  if (apiKey && apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    // Store in window for GoogleMapPicker
    window.GOOGLE_MAPS_API_KEY = apiKey;
    console.log('✅ Google Maps configured successfully');
    
    // Update meta tag if it exists
    const metaTag = document.querySelector('meta[name="google-maps-api-key"]');
    if (metaTag) {
      metaTag.setAttribute('content', apiKey);
    }
  } else {
    console.log('ℹ️ Maps in manual entry mode');
  }
}

// Auto-inject on module load - but safely
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure DOM is ready
  setTimeout(() => {
    injectEnvironmentVariables();
  }, 0);
}