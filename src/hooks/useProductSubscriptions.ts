import { useState, useCallback } from "react";
import { toast } from "sonner@2.0.3";
import { ProductSubscription } from "../types";
import { apiService } from "../utils/api";

export const useProductSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<Map<string, ProductSubscription>>(new Map());
  const [loading, setLoading] = useState(false);

  const getProductSubscription = useCallback(async (productId: string) => {
    try {
      setLoading(true);
      console.log(`Fetching subscription status for product: ${productId}`);
      
      const subscription = await apiService.getProductSubscription(productId);
      
      if (subscription) {
        setSubscriptions(prev => new Map(prev.set(productId, subscription)));
        return subscription;
      }
      
      // Return default if no subscription found
      const defaultSubscription: ProductSubscription = {
        id: '',
        product_id: productId,
        has_subscription: false
      };
      
      setSubscriptions(prev => new Map(prev.set(productId, defaultSubscription)));
      return defaultSubscription;
      
    } catch (error) {
      console.error(`Failed to fetch subscription for product ${productId}:`, error);
      // Don't show toast error for subscription checks
      
      const defaultSubscription: ProductSubscription = {
        id: '',
        product_id: productId,
        has_subscription: false
      };
      
      setSubscriptions(prev => new Map(prev.set(productId, defaultSubscription)));
      return defaultSubscription;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleProductSubscription = useCallback(async (productId: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      const newStatus = !currentStatus;
      
      console.log(`Toggling subscription for product ${productId}: ${currentStatus} → ${newStatus}`);
      
      const updatedSubscription = await apiService.updateProductSubscription(productId, newStatus);
      
      if (updatedSubscription) {
        setSubscriptions(prev => new Map(prev.set(productId, updatedSubscription)));
        
        toast.success(
          newStatus 
            ? "✅ Subscription enabled for this product!" 
            : "❌ Subscription disabled for this product"
        );
        
        return updatedSubscription;
      }
      
    } catch (error) {
      console.error(`Failed to toggle subscription for product ${productId}:`, error);
      toast.error(`Failed to update subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSubscriptionStatus = useCallback((productId: string): boolean => {
    const subscription = subscriptions.get(productId);
    return subscription?.has_subscription ?? false;
  }, [subscriptions]);

  const loadAllSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading all product subscriptions...');
      
      const allSubscriptions = await apiService.getAllSubscriptions();
      
      if (allSubscriptions && Array.isArray(allSubscriptions)) {
        const newSubscriptionsMap = new Map<string, ProductSubscription>();
        
        allSubscriptions.forEach((sub: ProductSubscription) => {
          newSubscriptionsMap.set(sub.product_id, sub);
        });
        
        setSubscriptions(newSubscriptionsMap);
        console.log(`Loaded ${allSubscriptions.length} product subscriptions`);
      }
      
    } catch (error) {
      console.error('Failed to load all subscriptions:', error);
      // Don't show error toast for batch loading
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    subscriptions,
    loading,
    getProductSubscription,
    toggleProductSubscription,
    getSubscriptionStatus,
    loadAllSubscriptions
  };
};