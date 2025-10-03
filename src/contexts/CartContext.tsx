import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { Product, Vendor } from '../types';
import { toast } from 'sonner@2.0.3';
import { apiService } from '../utils/api';
import { useAuth } from './AuthContext';

export interface CartItem {
  id: string;
  productId: string;
  vendorId: string;
  name: string;
  price: number;
  quantity: number;
  vendor: {
    id: string;
    name: string;
    image: string;
  };
  product: {
    image?: string;
    description?: string;
    category?: string;
  };
}

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  // Optimistic update tracking
  optimisticUpdates: Map<string, {
    productId: string;
    previousQuantity: number;
    newQuantity: number;
    timestamp: number;
    retryCount: number;
  }>;
  isLoading: boolean;
  // Cart migration status
  migrationStatus: 'none' | 'pending' | 'completed' | 'failed';
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; vendor: Vendor; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { productId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'OPTIMISTIC_UPDATE'; payload: { productId: string; quantity: number; previousQuantity: number } }
  | { type: 'CONFIRM_UPDATE'; payload: { productId: string } }
  | { type: 'ROLLBACK_UPDATE'; payload: { productId: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_MIGRATION_STATUS'; payload: 'none' | 'pending' | 'completed' | 'failed' }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: Omit<CartState, 'optimisticUpdates' | 'migrationStatus'> }
  | { type: 'MERGE_CART'; payload: { items: CartItem[] } };

interface CartContextType extends CartState {
  addItem: (product: Product, vendor: Vendor, quantity: number) => void;
  addItemOptimistic: (product: Product, vendor: Vendor, quantity: number) => Promise<void>;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateQuantityOptimistic: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  clearGuestCart: () => void;
  getItemQuantity: (productId: string) => number;
  isItemInCart: (productId: string) => boolean;
  getVendorItems: (vendorId: string) => CartItem[];
  getCurrentVendor: () => { id: string; name: string } | null;
  hasItemsFromDifferentVendor: (vendorId: string) => boolean;
  // Guest cart system
  migrateGuestCartOnLogin: (userId: string) => Promise<void>;
  loadUserCartFromDB: (userId: string) => Promise<void>;
  // Force cart reload for authenticated user
  forceCartReload: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'OPTIMISTIC_UPDATE': {
      const { productId, quantity, previousQuantity } = action.payload;
      const updateId = `${productId}_${Date.now()}`;
      
      // Add to optimistic updates tracking
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      newOptimisticUpdates.set(updateId, {
        productId,
        previousQuantity,
        newQuantity: quantity,
        timestamp: Date.now(),
        retryCount: 0
      });

      // Apply the update immediately to the cart
      if (quantity <= 0) {
        const newItems = state.items.filter(item => item.productId !== productId);
        const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        return {
          ...state,
          items: newItems,
          totalItems,
          totalAmount,
          optimisticUpdates: newOptimisticUpdates
        };
      }

      const newItems = state.items.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      );

      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totalAmount,
        optimisticUpdates: newOptimisticUpdates
      };
    }

    case 'CONFIRM_UPDATE': {
      const { productId } = action.payload;
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      
      // Remove all optimistic updates for this product
      for (const [key, update] of newOptimisticUpdates.entries()) {
        if (update.productId === productId) {
          newOptimisticUpdates.delete(key);
        }
      }

      return {
        ...state,
        optimisticUpdates: newOptimisticUpdates
      };
    }

    case 'ROLLBACK_UPDATE': {
      const { productId } = action.payload;
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      
      // Find the most recent optimistic update for this product
      let mostRecentUpdate = null;
      let mostRecentKey = null;
      
      for (const [key, update] of newOptimisticUpdates.entries()) {
        if (update.productId === productId) {
          if (!mostRecentUpdate || update.timestamp > mostRecentUpdate.timestamp) {
            mostRecentUpdate = update;
            mostRecentKey = key;
          }
        }
      }

      if (mostRecentUpdate && mostRecentKey) {
        // Rollback to previous quantity
        const { previousQuantity } = mostRecentUpdate;
        
        // Remove the failed update
        newOptimisticUpdates.delete(mostRecentKey);

        if (previousQuantity <= 0) {
          const newItems = state.items.filter(item => item.productId !== productId);
          const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
          const totalAmount = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

          return {
            ...state,
            items: newItems,
            totalItems,
            totalAmount,
            optimisticUpdates: newOptimisticUpdates
          };
        }

        const newItems = state.items.map(item =>
          item.productId === productId
            ? { ...item, quantity: previousQuantity }
            : item
        );

        const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        return {
          ...state,
          items: newItems,
          totalItems,
          totalAmount,
          optimisticUpdates: newOptimisticUpdates
        };
      }

      return state;
    }

    case 'SET_LOADING': {
      return {
        ...state,
        isLoading: action.payload
      };
    }

    case 'SET_MIGRATION_STATUS': {
      return {
        ...state,
        migrationStatus: action.payload
      };
    }

    case 'ADD_ITEM': {
      const { product, vendor, quantity } = action.payload;
      const existingItem = state.items.find(item => item.productId === product.id);

      let newItems;
      if (existingItem) {
        newItems = state.items.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        const newItem: CartItem = {
          id: `${product.id}_${Date.now()}`,
          productId: product.id,
          vendorId: vendor.id,
          name: product.name,
          price: product.price,
          quantity,
          vendor: {
            id: vendor.id,
            name: vendor.name,
            image: vendor.image
          },
          product: {
            image: product.image,
            description: product.description,
            category: product.category
          }
        };
        newItems = [...state.items, newItem];
      }

      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totalAmount
      };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.productId !== action.payload.productId);
      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totalAmount
      };
    }

    case 'UPDATE_QUANTITY': {
      const { productId, quantity } = action.payload;
      
      if (quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: { productId } });
      }

      const newItems = state.items.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      );

      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totalAmount
      };
    }

    case 'MERGE_CART': {
      const { items: incomingItems } = action.payload;
      const mergedItems = [...state.items];

      // Merge rules: Same product → qty summed, Different products → added as separate items
      incomingItems.forEach(incomingItem => {
        const existingItemIndex = mergedItems.findIndex(
          item => item.productId === incomingItem.productId
        );

        if (existingItemIndex >= 0) {
          // Same product - sum quantities
          mergedItems[existingItemIndex] = {
            ...mergedItems[existingItemIndex],
            quantity: mergedItems[existingItemIndex].quantity + incomingItem.quantity
          };
        } else {
          // Different product - add as separate item
          mergedItems.push({
            ...incomingItem,
            id: `${incomingItem.productId}_${Date.now()}_merged`
          });
        }
      });

      const totalItems = mergedItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = mergedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return {
        ...state,
        items: mergedItems,
        totalItems,
        totalAmount
      };
    }

    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        totalItems: 0,
        totalAmount: 0,
        optimisticUpdates: new Map()
      };

    case 'LOAD_CART':
      return {
        ...action.payload,
        optimisticUpdates: new Map(),
        isLoading: false,
        migrationStatus: 'none'
      };

    default:
      return state;
  }
};

const initialState: CartState = {
  items: [],
  totalItems: 0,
  totalAmount: 0,
  optimisticUpdates: new Map(),
  isLoading: false,
  migrationStatus: 'none'
};

// Guest cart storage keys
const GUEST_CART_KEY = 'gutzo_guest_cart';
const CART_MIGRATION_KEY = 'gutzo_cart_migrated';

// Helper function to transform API cart response to frontend format (with fresh product data)
const transformCartFromAPI = (apiCart: any): { items: CartItem[]; totalItems: number; totalAmount: number } => {
  console.log('🔄 Transforming cart from API (with fresh product data):', { apiCart });
  
  if (!apiCart || !apiCart.items) {
    console.log('📭 API cart is empty or invalid');
    return { items: [], totalItems: 0, totalAmount: 0 };
  }

  // Handle new lean cart structure with fresh product data from API
  const items: CartItem[] = apiCart.items.map((item: any, index: number) => {
    console.log(`🔄 Transforming cart item ${index + 1} with fresh product data:`, item);
    
    const transformedItem = {
      id: `${item.productId}_${Date.now()}_api`,
      productId: item.productId,
      vendorId: item.vendorId,
      // Fresh product data from products table
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      vendor: {
        id: item.vendorId,
        name: item.vendorName || item.vendor?.name || 'Unknown Vendor',
        image: item.vendor?.image || ''
      },
      product: {
        image: item.image,
        description: item.product?.description || '',
        category: item.category
      }
    };
    
    console.log(`✅ Transformed cart item ${index + 1} with fresh data:`, transformedItem);
    return transformedItem;
  });

  const result = {
    items,
    totalItems: apiCart.totalItems || items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: apiCart.totalAmount || items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  };
  
  console.log('✅ Final transformed cart with fresh product data:', result);
  return result;
};

// Helper function to transform frontend cart to API format (lean structure)
const transformCartToAPI = (cartItems: CartItem[]) => {
  console.log('🔄 Transforming cart to lean API format:', cartItems);
  
  const leanCartItems = cartItems.map(item => ({
    productId: item.productId,
    vendorId: item.vendorId,
    quantity: item.quantity
    // Note: We no longer store name, price, image, etc. in cart table
    // These will be fetched fresh from products table when needed
  }));
  
  console.log('✅ Transformed to lean cart format:', leanCartItems);
  return leanCartItems;
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { isAuthenticated, user } = useAuth();

  // Load appropriate cart on mount and auth state changes
  useEffect(() => {
    const loadInitialCart = async () => {
      console.log('🛒 Loading initial cart state...', { isAuthenticated, user: user?.phone });

      if (isAuthenticated && user) {
        // User is logged in - check if cart migration is needed
        await handleAuthenticatedCartLoad(user.phone);
      } else {
        // User is not logged in - load guest cart
        loadGuestCart();
      }
    };

    loadInitialCart();
  }, [isAuthenticated, user?.phone]);

  // Handle cart loading for authenticated users - enhanced for immediate sync
  const handleAuthenticatedCartLoad = async (userPhone: string) => {
    try {
      const hasGuestCart = localStorage.getItem(GUEST_CART_KEY);
      const migrationKey = `${CART_MIGRATION_KEY}_${userPhone}`;
      const hasMigrated = localStorage.getItem(migrationKey);

      console.log('🔍 Checking cart migration status:', {
        hasGuestCart: !!hasGuestCart,
        hasMigrated: !!hasMigrated,
        userPhone,
        guestCartContent: hasGuestCart ? JSON.parse(hasGuestCart) : null
      });

      if (hasGuestCart && !hasMigrated) {
        console.log('🚀 Starting cart migration process...');
        await migrateGuestCartOnLogin(userPhone);
        
        // Mark migration as completed
        localStorage.setItem(migrationKey, 'completed');
        
        // Clear guest cart after successful migration
        console.log('🧹 Clearing guest cart after successful migration');
        localStorage.removeItem(GUEST_CART_KEY);
      } else {
        console.log('📥 Loading user cart from database...');
        await loadUserCartFromDB(userPhone);
      }
    } catch (error) {
      console.error('❌ Error handling authenticated cart load:', error);
      // Fallback to guest cart if user cart fails
      console.log('🔄 Falling back to guest cart due to error');
      loadGuestCart();
    }
  };

  // Load guest cart from localStorage
  const loadGuestCart = () => {
    console.log('👤 Loading guest cart from localStorage...');
    const savedGuestCart = localStorage.getItem(GUEST_CART_KEY);
    
    if (savedGuestCart) {
      try {
        const cartData = JSON.parse(savedGuestCart);
        console.log('✅ Guest cart loaded:', { items: cartData.items?.length || 0 });
        dispatch({ type: 'LOAD_CART', payload: cartData });
      } catch (error) {
        console.error('❌ Error loading guest cart:', error);
        localStorage.removeItem(GUEST_CART_KEY);
      }
    } else {
      console.log('📝 No guest cart found, starting with empty cart');
    }
  };

  // Save cart to appropriate storage
  useEffect(() => {
    const saveCart = () => {
      const { optimisticUpdates, migrationStatus, ...cartToSave } = state;
      
      if (isAuthenticated && user) {
        // For authenticated users, we don't save to localStorage
        // Cart is managed in the database
        console.log('🔒 User authenticated - cart managed in database');
        return;
      } else {
        // For guests, save to localStorage
        if (state.items.length > 0 || localStorage.getItem(GUEST_CART_KEY)) {
          localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cartToSave));
          console.log('💾 Guest cart saved to localStorage:', { items: state.items.length });
        }
      }
    };

    saveCart();
  }, [state, isAuthenticated, user]);

  // Clear guest cart (used on logout)
  const clearGuestCart = useCallback(() => {
    console.log('🧹 Clearing guest cart from localStorage...');
    localStorage.removeItem(GUEST_CART_KEY);
    // Also clear migration flags
    const migrationKeys = Object.keys(localStorage).filter(key => 
      key.startsWith(CART_MIGRATION_KEY)
    );
    migrationKeys.forEach(key => localStorage.removeItem(key));
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  // Clear cart with API sync for authenticated users
  const clearCart = useCallback(async () => {
    console.log('🧹 Clearing cart...', { isAuthenticated, userPhone: user?.phone });
    
    // Clear local state immediately
    dispatch({ type: 'CLEAR_CART' });
    
    // If user is authenticated, also clear from database
    if (isAuthenticated && user) {
      try {
        await apiService.clearUserCart(user.phone);
        console.log('✅ Cart cleared from database successfully');
      } catch (error) {
        console.error('❌ Error clearing cart from database:', error);
        // Don't rollback local clear - user still wants cart cleared locally
        toast.error('Cart cleared locally, but database sync failed');
      }
    } else {
      // For guests, also clear localStorage
      clearGuestCart();
    }
  }, [isAuthenticated, user, clearGuestCart]);

  // Track previous authentication state to detect actual logout events
  const prevAuthStateRef = useRef(isAuthenticated);
  
  // Handle logout - clear guest cart only on actual logout (auth state change from true to false)
  useEffect(() => {
    const wasAuthenticated = prevAuthStateRef.current;
    const isNowAuthenticated = isAuthenticated;
    
    // Update the ref for next comparison
    prevAuthStateRef.current = isAuthenticated;
    
    // Only clear cart if user was authenticated and is now not authenticated (actual logout)
    if (wasAuthenticated && !isNowAuthenticated && state.items.length > 0) {
      console.log('👋 User logged out (auth state changed from true to false) - clearing cart...');
      clearGuestCart();
    }
  }, [isAuthenticated, clearGuestCart, state.items.length]);

  // Save authenticated user's cart to database when cart changes
  useEffect(() => {
    const saveAuthenticatedCart = async () => {
      if (isAuthenticated && user && state.items.length > 0 && state.migrationStatus !== 'pending') {
        await saveCartToDB(user.phone, state.items);
      }
    };

    // Debounce cart saves to avoid too many API calls
    const timeoutId = setTimeout(saveAuthenticatedCart, 1000);
    return () => clearTimeout(timeoutId);
  }, [state.items, state.migrationStatus, isAuthenticated, user]);

  // Migrate guest cart on login - enhanced for immediate sync
  const migrateGuestCartOnLogin = useCallback(async (userId: string) => {
    console.log('🔄 Starting guest cart migration for user:', userId);
    dispatch({ type: 'SET_MIGRATION_STATUS', payload: 'pending' });

    try {
      const guestCartData = localStorage.getItem(GUEST_CART_KEY);
      if (!guestCartData) {
        console.log('📭 No guest cart to migrate');
        dispatch({ type: 'SET_MIGRATION_STATUS', payload: 'completed' });
        await loadUserCartFromDB(userId);
        return;
      }

      const guestCart = JSON.parse(guestCartData);
      console.log('📦 Guest cart found:', { 
        items: guestCart.items?.length || 0,
        guestCartStructure: guestCart
      });

      // Validate guest cart structure
      if (!guestCart.items || !Array.isArray(guestCart.items) || guestCart.items.length === 0) {
        console.log('📭 Guest cart is empty or invalid, loading user cart...');
        dispatch({ type: 'SET_MIGRATION_STATUS', payload: 'completed' });
        await loadUserCartFromDB(userId);
        return;
      }

      // Check if user has existing cart in database using apiService
      let existingCartData = { items: [], totalItems: 0, totalAmount: 0 };
      try {
        const existingCartResponse = await apiService.getUserCart(userId);
        existingCartData = transformCartFromAPI(existingCartResponse);
        console.log('🔍 Existing user cart check:', {
          hasExistingCart: existingCartData.items.length > 0,
          existingItems: existingCartData.items.length
        });
      } catch (error) {
        console.log('📭 No existing user cart found (expected for new users)');
        existingCartData = { items: [], totalItems: 0, totalAmount: 0 };
      }

      // Prepare the final cart to migrate
      let finalCartToMigrate = guestCart;

      if (existingCartData.items && existingCartData.items.length > 0) {
        console.log('🔗 Existing user cart found, merging carts...', {
          guestItems: guestCart.items.length,
          existingItems: existingCartData.items.length
        });
        
        // Merge carts manually to get the final result
        const mergedItems = [...existingCartData.items];
        
        guestCart.items.forEach((guestItem: any) => {
          const existingIndex = mergedItems.findIndex((item: any) => item.productId === guestItem.productId);
          
          if (existingIndex >= 0) {
            // Same product - sum quantities
            mergedItems[existingIndex] = {
              ...mergedItems[existingIndex],
              quantity: mergedItems[existingIndex].quantity + guestItem.quantity
            };
          } else {
            // Different product - add as separate item
            mergedItems.push({
              ...guestItem,
              id: `${guestItem.productId}_${Date.now()}_merged`
            });
          }
        });

        const totalItems = mergedItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
        const totalAmount = mergedItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

        finalCartToMigrate = {
          items: mergedItems,
          totalItems,
          totalAmount
        };
        
        console.log('✅ Carts merged, final cart:', { items: finalCartToMigrate.items.length });
        toast.success('Cart merged successfully! 🛒');
      } else {
        console.log('📝 No existing user cart, migrating guest cart as-is...');
        toast.success('Welcome back! Your cart has been restored. 🛒');
      }

      // Apply the migrated cart immediately
      dispatch({ type: 'LOAD_CART', payload: finalCartToMigrate });
      
      // Save to database immediately 
      console.log('💾 Saving migrated cart to database...');
      if (finalCartToMigrate.items && finalCartToMigrate.items.length > 0) {
        try {
          await saveCartToDB(userId, finalCartToMigrate.items);
          console.log('✅ Migrated cart saved to database');
        } catch (saveError) {
          console.error('❌ Error saving migrated cart:', saveError);
        }
      }

      dispatch({ type: 'SET_MIGRATION_STATUS', payload: 'completed' });
      console.log('✅ Cart migration completed successfully');

    } catch (error) {
      console.error('❌ Error migrating guest cart:', error);
      dispatch({ type: 'SET_MIGRATION_STATUS', payload: 'failed' });
      toast.error('Cart migration failed, but you can continue shopping');
      
      // Fallback - load guest cart anyway
      try {
        const fallbackGuestCartData = localStorage.getItem(GUEST_CART_KEY);
        if (fallbackGuestCartData) {
          const fallbackGuestCart = JSON.parse(fallbackGuestCartData);
          if (fallbackGuestCart.items && fallbackGuestCart.items.length > 0) {
            console.log('🔄 Loading guest cart as fallback...');
            dispatch({ type: 'LOAD_CART', payload: fallbackGuestCart });
          }
        }
      } catch (fallbackError) {
        console.error('❌ Fallback guest cart load failed:', fallbackError);
        // Final fallback - just start fresh
        await loadUserCartFromDB(userId);
      }
    }
  }, []);

  // Load user cart from database
  const loadUserCartFromDB = useCallback(async (userId: string) => {
    console.log('📥 Loading user cart from database for:', userId);
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const cartResponse = await apiService.getUserCart(userId);
      const cartData = transformCartFromAPI(cartResponse);
      console.log('✅ User cart loaded from database:', { 
        items: cartData.items?.length || 0,
        cartData 
      });
      
      if (cartData.items && cartData.items.length > 0) {
        dispatch({ type: 'LOAD_CART', payload: cartData });
      } else {
        console.log('📭 User cart is empty, starting fresh');
        dispatch({ type: 'CLEAR_CART' });
      }
    } catch (error) {
      console.error('❌ Error loading user cart from database:', error);
      console.log('📭 No user cart found in database or API error, starting with empty cart');
      dispatch({ type: 'CLEAR_CART' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Save cart to database (helper function)
  const saveCartToDB = async (userId: string, items: CartItem[]) => {
    try {
      console.log('💾 Saving cart to database...', { userId, items: items.length });
      const apiItems = transformCartToAPI(items);
      await apiService.saveUserCart(userId, apiItems);
      console.log('✅ Cart saved to database successfully');
    } catch (error) {
      console.error('❌ Error saving cart to database:', error);
    }
  };

  // Force cart reload for authenticated user
  const forceCartReload = useCallback(async () => {
    if (isAuthenticated && user) {
      console.log('🔄 Forcing cart reload for authenticated user:', user.phone);
      await handleAuthenticatedCartLoad(user.phone);
    } else {
      console.log('🔄 Forcing guest cart reload');
      loadGuestCart();
    }
  }, [isAuthenticated, user]);

  const addItem = (product: Product, vendor: Vendor, quantity: number = 1) => {
    dispatch({ type: 'ADD_ITEM', payload: { product, vendor, quantity } });
  };

  const removeItem = (productId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { productId } });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity } });
  };

  // Optimistic quantity update with background sync
  const updateQuantityOptimistic = useCallback(async (productId: string, quantity: number) => {
    const currentItem = state.items.find(item => item.productId === productId);
    const previousQuantity = currentItem ? currentItem.quantity : 0;

    console.log('🔄 Optimistic quantity update:', { productId, quantity, previousQuantity });

    // Apply optimistic update immediately
    dispatch({ 
      type: 'OPTIMISTIC_UPDATE', 
      payload: { productId, quantity, previousQuantity } 
    });

    // Only sync with API if user is authenticated
    if (isAuthenticated && user) {
      try {
        const success = await apiService.updateCartItem(productId, quantity, user.phone);
        
        if (success) {
          console.log('✅ Cart item update synced with API successfully');
          dispatch({ type: 'CONFIRM_UPDATE', payload: { productId } });
        } else {
          console.error('❌ Cart item update failed on API');
          dispatch({ type: 'ROLLBACK_UPDATE', payload: { productId } });
          toast.error('Failed to update cart. Please try again.');
        }
      } catch (error) {
        console.error('❌ API sync failed for cart update:', error);
        dispatch({ type: 'ROLLBACK_UPDATE', payload: { productId } });
        toast.error('Cart update failed. Please check your connection.');
      }
    } else {
      // For guest users, confirm immediately (no API sync needed)
      dispatch({ type: 'CONFIRM_UPDATE', payload: { productId } });
    }
  }, [isAuthenticated, user, state.items]);

  // Optimistic item addition with background sync
  const addItemOptimistic = useCallback(async (product: Product, vendor: Vendor, quantity: number = 1) => {
    console.log('🔄 Adding item optimistically:', { productId: product.id, quantity });

    // Apply optimistic addition immediately
    dispatch({ type: 'ADD_ITEM', payload: { product, vendor, quantity } });

    // Only sync with API if user is authenticated
    if (isAuthenticated && user) {
      try {
        const currentQuantity = state.items.find(item => item.productId === product.id)?.quantity || 0;
        const newQuantity = currentQuantity + quantity;
        
        const success = await apiService.updateCartItem(product.id, newQuantity, user.phone);
        
        if (success) {
          console.log('✅ Cart item addition synced with API successfully');
        } else {
          console.error('❌ Cart item addition failed on API, rolling back');
          dispatch({ type: 'UPDATE_QUANTITY', payload: { productId: product.id, quantity: currentQuantity } });
          toast.error('Failed to add item to cart. Please try again.');
        }
      } catch (error) {
        console.error('❌ API sync failed for cart addition:', error);
        const currentQuantity = state.items.find(item => item.productId === product.id)?.quantity || 0;
        const rollbackQuantity = Math.max(0, currentQuantity - quantity);
        dispatch({ type: 'UPDATE_QUANTITY', payload: { productId: product.id, quantity: rollbackQuantity } });
        toast.error('Failed to add item. Please check your connection.');
      }
    }
  }, [isAuthenticated, user, state.items]);

  // Handle remove item with API sync for authenticated users
  const handleRemoveItem = useCallback(async (productId: string) => {
    console.log('🗑️ Removing item:', { productId });

    // Remove immediately from local state
    dispatch({ type: 'REMOVE_ITEM', payload: { productId } });

    // Only sync with API if user is authenticated
    if (isAuthenticated && user) {
      try {
        const success = await apiService.updateCartItem(productId, 0, user.phone);
        if (!success) {
          console.error('❌ Failed to remove item from database');
          toast.error('Failed to remove item. Please try again.');
        }
      } catch (error) {
        console.error('❌ API sync failed for item removal:', error);
        toast.error('Failed to remove item. Please check your connection.');
      }
    }
  }, [isAuthenticated, user]);

  // Handle clear cart with API sync for authenticated users
  const handleClearCart = useCallback(async () => {
    console.log('🧹 Clearing all cart items...');

    // Clear immediately from local state
    dispatch({ type: 'CLEAR_CART' });

    // Only sync with API if user is authenticated
    if (isAuthenticated && user) {
      try {
        await apiService.clearUserCart(user.phone);
        console.log('✅ Cart cleared from database successfully');
      } catch (error) {
        console.error('❌ Error clearing cart from database:', error);
        toast.error('Cart cleared locally, but database sync failed');
      }
    }
  }, [isAuthenticated, user]);

  const getItemQuantity = (productId: string): number => {
    const item = state.items.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  };

  const isItemInCart = (productId: string): boolean => {
    return state.items.some(item => item.productId === productId);
  };

  const getVendorItems = (vendorId: string): CartItem[] => {
    return state.items.filter(item => item.vendorId === vendorId);
  };

  const getCurrentVendor = (): { id: string; name: string } | null => {
    if (state.items.length === 0) return null;
    const firstItem = state.items[0];
    return {
      id: firstItem.vendorId,
      name: firstItem.vendor.name
    };
  };

  const hasItemsFromDifferentVendor = (vendorId: string): boolean => {
    return state.items.some(item => item.vendorId !== vendorId);
  };

  const value: CartContextType = {
    ...state,
    addItem,
    addItemOptimistic,
    removeItem: handleRemoveItem,
    updateQuantity,
    updateQuantityOptimistic,
    clearCart: handleClearCart,
    clearGuestCart,
    getItemQuantity,
    isItemInCart,
    getVendorItems,
    getCurrentVendor,
    hasItemsFromDifferentVendor,
    migrateGuestCartOnLogin,
    loadUserCartFromDB,
    forceCartReload
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};