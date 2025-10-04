import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../utils/api';

// Types
interface AuthData {
  phone: string;
  name: string;
  verified: boolean;
  timestamp: number;
  lastValidated?: number;
  sessionId?: string;
  version?: string;
}

interface UserData {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  verified: boolean;
  created_at?: string;
}

interface AuthContextType {
  // Auth state
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserData | null;
  
  // Auth actions
  login: (authData: AuthData) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
  
  // Utility
  shouldValidate: () => boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Configuration
const AUTH_CONFIG = {
  VALIDATION_INTERVAL: 60 * 60 * 1000, // 1 hour
  TOKEN_EXPIRY: 30 * 24 * 60 * 60 * 1000, // 30 days
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_FUNCTION_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
};

// Auth Provider Component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  console.log('🚀 AuthProvider initializing...');
  
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    isLoading: true,
    user: null as UserData | null
  });

  // Generate unique session ID
  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Get auth data from localStorage with validation
  const getStoredAuthData = (): AuthData | null => {
    try {
      console.log('🔍 Checking localStorage for gutzo_auth...');
      const authData = localStorage.getItem('gutzo_auth');
      
      if (!authData) {
        console.log('📱 No gutzo_auth found in localStorage');
        return null;
      }

      console.log('📄 Raw auth data from localStorage:', authData);
      const parsed: AuthData = JSON.parse(authData);
      
      // Validate required fields - allow empty name but ensure it exists as a property
      if (!parsed.phone || typeof parsed.name !== 'string' || typeof parsed.verified !== 'boolean') {
        console.log('❌ Invalid auth data structure, clearing. Found:', {
          phone: parsed.phone,
          name: parsed.name,
          nameType: typeof parsed.name,
          verified: parsed.verified,
          verifiedType: typeof parsed.verified
        });
        localStorage.removeItem('gutzo_auth');
        return null;
      }

      // Check if token is expired
      const tokenAge = Date.now() - parsed.timestamp;
      const isExpired = tokenAge > AUTH_CONFIG.TOKEN_EXPIRY;
      
      console.log('⏰ Token age check:', {
        tokenAge: Math.round(tokenAge / (1000 * 60 * 60 * 24)) + ' days',
        maxAge: Math.round(AUTH_CONFIG.TOKEN_EXPIRY / (1000 * 60 * 60 * 24)) + ' days',
        isExpired
      });
      
      if (isExpired) {
        console.log('❌ Auth token expired, clearing');
        localStorage.removeItem('gutzo_auth');
        return null;
      }

      console.log('✅ Valid auth data found in localStorage');
      return parsed;
    } catch (error) {
      console.error('❌ Error parsing auth data:', error);
      localStorage.removeItem('gutzo_auth');
      return null;
    }
  };

  // Save auth data to localStorage
  const saveAuthData = (authData: AuthData): void => {
    try {
      const enhancedAuth: AuthData = {
        ...authData,
        sessionId: authData.sessionId || generateSessionId(),
        lastValidated: Date.now(),
        version: '2.0'
      };
      
      localStorage.setItem('gutzo_auth', JSON.stringify(enhancedAuth));
      console.log('✅ Auth data saved to localStorage');
    } catch (error) {
      console.error('❌ Error saving auth data:', error);
    }
  };

  // Check if user validation is needed
  const shouldValidateUser = (authData: AuthData): boolean => {
    // If user just logged in (within 10 minutes), don't validate
    const timeSinceLogin = Date.now() - authData.timestamp;
    const justLoggedIn = timeSinceLogin < (10 * 60 * 1000); // 10 minutes
    
    if (justLoggedIn) {
      console.log('⏱️ Recent login detected, skipping validation:', {
        timeSinceLogin: Math.round(timeSinceLogin / (1000 * 60)) + ' minutes ago',
        justLoggedIn
      });
      return false;
    }
    
    const lastValidated = authData.lastValidated || 0;
    const timeSinceValidation = Date.now() - lastValidated;
    const needsValidation = timeSinceValidation > AUTH_CONFIG.VALIDATION_INTERVAL;
    
    console.log('⏱️ Validation check:', {
      lastValidated: lastValidated ? new Date(lastValidated).toISOString() : 'Never',
      timeSinceValidation: Math.round(timeSinceValidation / (1000 * 60)) + ' minutes ago',
      validationInterval: Math.round(AUTH_CONFIG.VALIDATION_INTERVAL / (1000 * 60)) + ' minutes',
      needsValidation
    });
    
    return needsValidation;
  };

  // Validate user against database with fallback logic
  const validateUserWithFallback = async (authData: AuthData): Promise<boolean> => {
    try {
      console.log('🔍 Validating user via apiService...');
      const result = await apiService.validateUser(authData.phone);
      const isValid = result.userExists && result.verified;
      console.log(`✅ User validation result: exists=${result.userExists}, verified=${result.verified}, valid=${isValid}`);
      if (isValid) {
        const updatedAuth = { ...authData, lastValidated: Date.now() };
        saveAuthData(updatedAuth);
      } else {
        console.log('❌ User validation failed - user not found or not verified');
        return false;
      }
      return isValid;
    } catch (error: any) {
      if (error.message && (error.message.includes('Network') || error.message.includes('server'))) {
        console.log('⚠️ Network/server error during validation, keeping user logged in:', error.message);
        return true;
      }
      return true;
    }
  };

  // Fetch detailed user data
  const fetchUserData = async (phone: string): Promise<UserData | null> => {
    try {
      console.log('📱 Fetching detailed user data via apiService for phone:', phone);
      const userData = await apiService.getUser(phone);
      if (userData.userExists && userData.name) {
        console.log('✅ User data fetched successfully');
        return {
          id: userData.id,
          name: userData.name,
          phone: userData.phone,
          email: userData.email || '',
          verified: userData.verified,
          created_at: userData.created_at
        };
      }
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
    }
    return null;
  };

  // Initialize authentication state
  const initializeAuth = async (): Promise<void> => {
    try {
      console.log('🔄 Initializing authentication...');
      console.log('🔍 Checking localStorage for auth data...');
      
      const storedAuth = getStoredAuthData();
      
      if (!storedAuth) {
        console.log('📱 No valid auth data found in localStorage');
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null
        });
        return;
      }

      console.log('✅ Found stored auth data:', {
        phone: storedAuth.phone,
        name: storedAuth.name,
        verified: storedAuth.verified,
        timestamp: new Date(storedAuth.timestamp).toISOString(),
        lastValidated: storedAuth.lastValidated ? new Date(storedAuth.lastValidated).toISOString() : 'Never'
      });

      // Check if validation is needed
      const needsValidation = shouldValidateUser(storedAuth);
      
      if (needsValidation) {
        console.log('🔍 Auth data needs validation (older than 1 hour)...');
        const isValid = await validateUserWithFallback(storedAuth);
        
        if (!isValid) {
          console.log('❌ Validation failed, clearing auth');
          localStorage.removeItem('gutzo_auth');
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            user: null
          });
          return;
        }
        console.log('✅ Validation passed, user is valid');
      } else {
        console.log('✅ Auth data is recent (< 1 hour), skipping validation');
      }

      // Create user object from stored auth
      const userData: UserData = {
        name: storedAuth.name || 'User', // Provide fallback for empty names
        phone: storedAuth.phone,
        verified: storedAuth.verified
      };

      console.log('👤 Creating user object from stored auth:', userData);

      // Set authenticated state immediately with stored data
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: userData
      });

      console.log('✅ User authenticated successfully with stored data');

      // Try to fetch additional user data in background (non-blocking)
      fetchUserData(storedAuth.phone).then(detailedUserData => {
        if (detailedUserData) {
          console.log('📊 Updated user data from database:', detailedUserData);
          setAuthState(prev => ({
            ...prev,
            user: detailedUserData
          }));
        }
      }).catch(error => {
        console.log('⚠️ Failed to fetch detailed user data, using stored data:', error.message);
      });

      console.log('✅ Authentication initialized successfully');
      
    } catch (error) {
      console.error('❌ Error initializing auth:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null
      });
    }
  };

  // Create user in database if they don't exist
  const createUserInDatabase = async (authData: AuthData): Promise<void> => {
    try {
      console.log('👤 Creating user in database via apiService...');
      await apiService.createUser({
        phone: authData.phone,
        name: authData.name || 'User',
        verified: authData.verified,
        email: (authData as any).email || null
      });
      console.log('✅ User created/updated in database');
    } catch (error) {
      console.error('❌ Error creating user in database:', error);
    }
  };

  // Login function
  const login = async (authData: AuthData): Promise<void> => {
    console.log('🔐 User logging in...');
    
    saveAuthData(authData);
    
    // Create user in database if they don't exist
    await createUserInDatabase(authData);
    
    const userData: UserData = {
      name: authData.name || 'User', // Provide fallback for empty names
      phone: authData.phone,
      verified: authData.verified
    };

    setAuthState({
      isAuthenticated: true,
      isLoading: false,
      user: userData
    });

    // Fetch detailed user data in background
    fetchUserData(authData.phone).then(detailedData => {
      if (detailedData) {
        setAuthState(prev => ({
          ...prev,
          user: detailedData
        }));
      }
    });

    console.log('✅ User logged in successfully');
  };

  // Logout function
  const logout = (): void => {
    console.log('🔓 User logging out...');
    
    localStorage.removeItem('gutzo_auth');
    
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      user: null
    });

    console.log('✅ User logged out successfully');
  };

  // Refresh user data
  const refreshUserData = async (): Promise<void> => {
    if (!authState.isAuthenticated || !authState.user) return;

    try {
      console.log('🔄 Refreshing user data...');
      const detailedData = await fetchUserData(authState.user.phone);
      
      if (detailedData) {
        setAuthState(prev => ({
          ...prev,
          user: detailedData
        }));
        console.log('✅ User data refreshed');
      }
    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
    }
  };

  // Check if validation should happen
  const shouldValidate = (): boolean => {
    const storedAuth = getStoredAuthData();
    return storedAuth ? shouldValidateUser(storedAuth) : false;
  };

  // Initialize on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const contextValue: AuthContextType = {
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    user: authState.user,
    login,
    logout,
    refreshUserData,
    shouldValidate
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};