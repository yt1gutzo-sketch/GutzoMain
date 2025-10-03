// Figma Make Environment Access Utility
// This file helps debug and access environment variables in Figma Make

export function debugFigmaMakeEnvironment(): void {
  console.log('🔍 Figma Make Environment Debug Report:');
  
  // Check Deno environment
  if (typeof Deno !== 'undefined') {
    console.log('✅ Deno runtime detected');
    try {
      if ((Deno as any).env?.get) {
        const testKey = (Deno as any).env.get('GOOGLE_MAPS_API_KEY');
        console.log('🔑 Deno.env.get test:', testKey ? 'KEY_FOUND' : 'NO_KEY');
        
        // Try to list some environment variables for debugging
        try {
          const allEnvVars = (Deno as any).env.toObject?.() || {};
          const envKeys = Object.keys(allEnvVars).filter(key => 
            key.includes('GOOGLE') || key.includes('MAP') || key.includes('API')
          );
          console.log('🗂️ Relevant environment keys:', envKeys);
        } catch (e) {
          console.log('⚠️ Cannot access full environment object');
        }
      } else {
        console.log('❌ Deno.env.get not available');
      }
    } catch (error) {
      console.log('❌ Error accessing Deno environment:', error);
    }
  } else {
    console.log('❌ Deno runtime not detected');
  }
  
  // Check Process environment
  if (typeof process !== 'undefined') {
    console.log('✅ Process environment detected');
    const processKey = process.env?.GOOGLE_MAPS_API_KEY;
    console.log('🔑 process.env test:', processKey ? 'KEY_FOUND' : 'NO_KEY');
  } else {
    console.log('❌ Process environment not detected');
  }
  
  // Check globalThis
  if (typeof globalThis !== 'undefined') {
    console.log('✅ globalThis detected');
    const globalKey = (globalThis as any).GOOGLE_MAPS_API_KEY;
    console.log('🔑 globalThis test:', globalKey ? 'KEY_FOUND' : 'NO_KEY');
  }
  
  // Check window object
  if (typeof window !== 'undefined') {
    console.log('✅ Window object detected');
    const windowKey = (window as any).GOOGLE_MAPS_API_KEY;
    console.log('🔑 window test:', windowKey ? 'KEY_FOUND' : 'NO_KEY');
  }
}

// Enhanced environment variable getter with Figma Make specific detection
export function getFigmaMakeVariable(key: string): string | null {
  // Try all methods silently first - only debug when specifically requested
  const shouldDebug = key === 'GOOGLE_MAPS_API_KEY';
  
  if (shouldDebug) {
    debugFigmaMakeEnvironment();
  }
  
  const methods = [
    // Method 1: Deno environment (Figma Make's primary runtime)
    () => {
      if (typeof Deno !== 'undefined' && (Deno as any).env?.get) {
        const value = (Deno as any).env.get(key);
        if (shouldDebug && value) {
          console.log(`✅ Found ${key} in Deno.env.get`);
        }
        return value;
      }
      return null;
    },
    
    // Method 2: Process environment (Node.js style)
    () => {
      if (typeof process !== 'undefined' && process.env?.[key]) {
        const value = process.env[key];
        if (shouldDebug && value) {
          console.log(`✅ Found ${key} in process.env`);
        }
        return value;
      }
      return null;
    },
    
    // Method 3: globalThis direct property
    () => {
      if (typeof globalThis !== 'undefined' && (globalThis as any)[key]) {
        const value = (globalThis as any)[key];
        if (shouldDebug && value) {
          console.log(`✅ Found ${key} in globalThis`);
        }
        return value;
      }
      return null;
    },
    
    // Method 4: Window object
    () => {
      if (typeof window !== 'undefined' && (window as any)[key]) {
        const value = (window as any)[key];
        if (shouldDebug && value) {
          console.log(`✅ Found ${key} in window`);
        }
        return value;
      }
      return null;
    },
    
    // Method 5: Figma Make specific environment patterns
    () => {
      try {
        // Check various Figma Make environment injection patterns
        const patterns = [
          () => typeof window !== 'undefined' && (window as any).__FIGMA_MAKE_ENV__?.[key],
          () => typeof window !== 'undefined' && (window as any).__ENV__?.[key],
          () => typeof window !== 'undefined' && (window as any).env?.[key],
          () => typeof globalThis !== 'undefined' && (globalThis as any).__FIGMA_MAKE_ENV__?.[key],
          () => typeof globalThis !== 'undefined' && (globalThis as any).__ENV__?.[key],
          () => typeof globalThis !== 'undefined' && (globalThis as any).env?.[key],
        ];
        
        for (const pattern of patterns) {
          try {
            const value = pattern();
            if (value && value !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
              if (shouldDebug) {
                console.log(`✅ Found ${key} in Figma Make environment pattern`);
              }
              return value;
            }
          } catch (e) {
            // Silent fail and try next pattern
          }
        }
        return null;
      } catch {
        return null;
      }
    },
  ];
  
  for (let i = 0; i < methods.length; i++) {
    try {
      const value = methods[i]();
      if (value && value !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
        return value;
      }
    } catch (error) {
      // Silent failure for cleaner logs
      if (shouldDebug) {
        console.log(`⚠️ Method ${i + 1} failed for ${key}:`, error);
      }
    }
  }
  
  if (shouldDebug) {
    console.warn(`❌ ${key} not found in any environment method`);
  }
  return null;
}

// Emergency fallback - provides a demo key or graceful degradation
export function getGoogleMapsKeyWithFallback(): string | null {
  // First try to get the real key
  const realKey = getFigmaMakeVariable('GOOGLE_MAPS_API_KEY');
  
  if (realKey) {
    console.log('✅ Using Google Maps API key from environment');
    return realKey;
  }
  
  // If no real key is found, check if we're in a development environment
  const isLocalDevelopment = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname.includes('stackblitz') ||
     window.location.hostname.includes('codesandbox'));
  
  if (isLocalDevelopment) {
    console.log('ℹ️ Development environment - maps in limited mode');
    return null;
  }
  
  // For production Figma Make environment, just return null silently
  console.log('ℹ️ Maps in manual address entry mode');
  return null;
}