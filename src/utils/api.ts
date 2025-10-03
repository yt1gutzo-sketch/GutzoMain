import { supabase } from './supabase/client';

class ApiService {
  private async request(endpoint: string, options: { method?: string, body?: any, headers?: any } = {}) {
    const functionName = 'gutzo-api';
    const invokePath =  `${functionName}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    try {
      console.log(`Invoking function: ${invokePath} with method ${options.method || 'POST'}`);

      const { data, error } = await supabase.functions.invoke(invokePath, {
        method: options.method,
        body: options.body, // supabase.functions.invoke handles JSON stringification
        headers: options.headers,
      });

      if (error) {
        console.error(`API Error for ${invokePath}:`, error);
        throw new Error(error.message);
      }

      console.log(`API request successful for ${invokePath}`);
      return data;
    } catch (error: any) {
      console.error(`API request failed for ${invokePath}:`, error);

      if (error.message.includes('fetch')) {
        throw new Error('Network connection failed. Please check your internet connection.');
      }

      throw error;
    }
  }

  // Vendors
  async getVendors() {
    return this.request('/vendors', { method: 'GET' });
  }

  async getVendor(id: string) {
    return this.request(`/vendors/${id}`, { method: 'GET' });
  }

  async createVendor(vendorData: any) {
    return this.request('/vendors', {
      method: 'POST',
      body: vendorData,
    });
  }

  // Categories
  async getCategories() {
    return this.request('/categories', { method: 'GET' });
  }

  // Products
  async getVendorProducts(vendorId: string) {
    return this.request(`/vendors/${vendorId}/products`, { method: 'GET' });
  }

  async getAllProducts() {
    return this.request('/products', { method: 'GET' });
  }

  async getAvailableProducts() {
    return this.request('/products/available', { method: 'GET' });
  }

  async getProduct(productId: string) {
    return this.request(`/products/${productId}`, { method: 'GET' });
  }

  async getProductsByIds(productIds: string[]) {
    return this.request('/products/batch', {
      method: 'POST',
      body: { productIds },
    });
  }

  async createProduct(vendorId: string, productData: any) {
    return this.request(`/vendors/${vendorId}/products`, {
      method: 'POST',
      body: productData,
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health', { method: 'GET' });
  }

  // Test vendors endpoint directly for debugging
  async testConnection() {
    try {
      console.log('Testing API connection...');
      const health = await this.healthCheck();
      console.log('Health check result:', health);
      return health;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Email notifications
  async subscribeToNotifications(email: string) {
    return this.request('/notifications', {
      method: 'POST',
      body: { email },
    });
  }

  async getNotificationCount() {
    return this.request('/notifications/count', { method: 'GET' });
  }

  async getNotifications() {
    return this.request('/notifications', { method: 'GET' });
  }

  // Product Subscriptions
  async getProductSubscription(productId: string) {
    return this.request(`/products/${productId}/subscription`, { method: 'GET' });
  }

  async updateProductSubscription(productId: string, hasSubscription: boolean) {
    return this.request(`/products/${productId}/subscription`, {
      method: 'POST',
      body: { has_subscription: hasSubscription },
    });
  }

  async getAllSubscriptions() {
    return this.request('/subscriptions', { method: 'GET' });
  }

  // Cart Operations
  async getUserCart(userPhone: string) {
    const formattedPhone = userPhone.startsWith('+91') ? userPhone : `+91${userPhone}`;
    return this.request('/get-user-cart', {
      method: 'POST',
      body: { userPhone: formattedPhone },
    });
  }

  async saveUserCart(userPhone: string, items: any[]) {
    const formattedPhone = userPhone.startsWith('+91') ? userPhone : `+91${userPhone}`;
    return this.request('/save-user-cart', {
      method: 'POST',
      body: { userPhone: formattedPhone, items },
    });
  }

  async updateCartItem(productId: string, quantity: number, userPhone?: string, retryCount = 0): Promise<boolean> {
    const maxRetries = 3;
    try {
      if (userPhone) {
        const formattedPhone = userPhone.startsWith('+91') ? userPhone : `+91${userPhone}`;
        const result = await this.request('/update-cart-item', {
          method: 'POST',
          body: { userPhone: formattedPhone, productId, quantity },
        });
        console.log(`Cart item ${productId} updated to quantity ${quantity} for user ${formattedPhone}`);
        return result.success;
      } else {
        console.log(`Guest cart item ${productId} updated to quantity ${quantity}`);
        return true;
      }
    } catch (error) {
      console.error(`Cart update failed for ${productId}:`, error);
      if (retryCount < maxRetries) {
        console.log(`Retrying cart update for ${productId} (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        return this.updateCartItem(productId, quantity, userPhone, retryCount + 1);
      }
      return false;
    }
  }

  async clearUserCart(userPhone: string) {
    const formattedPhone = userPhone.startsWith('+91') ? userPhone : `+91${userPhone}`;
    return this.request('/clear-user-cart', {
      method: 'POST',
      body: { userPhone: formattedPhone },
    });
  }

  async syncCart(cartItems: any[], userPhone?: string): Promise<boolean> {
    try {
      if (userPhone && cartItems.length > 0) {
        const formattedPhone = userPhone.startsWith('+91') ? userPhone : `+91${userPhone}`;
        await this.saveUserCart(formattedPhone, cartItems);
        console.log('Cart synced successfully for user:', formattedPhone, cartItems);
        return true;
      } else {
        console.log('Guest cart synced successfully', cartItems);
        return true;
      }
    } catch (error) {
      console.error('Cart sync failed:', error);
      return false;
    }
  }
}

export const apiService = new ApiService();