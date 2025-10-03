import { InstantOrder, SubscriptionOrder } from '../components/OrdersPanel';
import { SubscriptionData } from '../components/SubscriptionPanel';
import { PaymentResult } from '../components/PaymentPanel';
import { Product, Vendor } from '../types';

export function saveInstantOrder(
  product: Product,
  vendor: Vendor,
  quantity: number = 1
): InstantOrder {
  const order: InstantOrder = {
    id: `INS_${Date.now()}`,
    vendorName: vendor.name,
    vendorPhone: vendor.contact_whatsapp,
    productName: product.name,
    productImage: product.image_url || '',
    quantity,
    price: product.price,
    status: 'placed',
    orderDate: new Date(),
    estimatedDelivery: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    whatsappOrderId: `WA_${Date.now()}`
  };

  // Get existing orders
  const existingOrders = getInstantOrders();
  
  // Add new order to the beginning
  const updatedOrders = [order, ...existingOrders];
  
  // Save to localStorage
  localStorage.setItem('gutzo_instant_orders', JSON.stringify(updatedOrders));
  
  return order;
}

export function saveSubscriptionOrder(
  subscriptionData: SubscriptionData,
  paymentResult: PaymentResult,
  product: Product,
  vendor: Vendor
): SubscriptionOrder {
  // Calculate total deliveries based on frequency and duration
  const calculateTotalDeliveries = () => {
    const slots = subscriptionData.mealSlots.length;
    
    switch (subscriptionData.duration) {
      case 'Trial Week':
        return subscriptionData.frequency === 'Daily' ? 7 * slots : 
               subscriptionData.frequency === 'Weekly' ? 1 * slots :
               (subscriptionData.customDates?.length || 1) * slots;
      case '1 Month':
        return subscriptionData.frequency === 'Daily' ? 30 * slots :
               subscriptionData.frequency === 'Weekly' ? 4 * slots :
               (subscriptionData.customDates?.length || 4) * slots;
      case '3 Months':
        return subscriptionData.frequency === 'Daily' ? 90 * slots :
               subscriptionData.frequency === 'Weekly' ? 12 * slots :
               (subscriptionData.customDates?.length || 12) * slots;
      case 'Auto-renew':
        return subscriptionData.frequency === 'Daily' ? 30 * slots : // Show as monthly for auto-renew
               subscriptionData.frequency === 'Weekly' ? 4 * slots :
               (subscriptionData.customDates?.length || 4) * slots;
      default:
        return 30 * slots;
    }
  };

  // Calculate next delivery date
  const getNextDeliveryDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  // Calculate end date
  const getEndDate = () => {
    if (subscriptionData.duration === 'Auto-renew') return undefined;
    
    const startDate = new Date();
    switch (subscriptionData.duration) {
      case 'Trial Week':
        return new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      case '1 Month':
        return new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      case '3 Months':
        return new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  };

  const order: SubscriptionOrder = {
    id: paymentResult.subscriptionId,
    subscriptionId: paymentResult.subscriptionId,
    vendorName: vendor.name,
    vendorPhone: vendor.contact_whatsapp,
    productName: product.name,
    productImage: product.image_url || '',
    mealSlots: subscriptionData.mealSlots,
    customTimes: subscriptionData.customTimes,
    frequency: subscriptionData.frequency,
    quantity: subscriptionData.quantity,
    duration: subscriptionData.duration,
    totalPrice: subscriptionData.totalPrice,
    status: 'active',
    startDate: new Date(),
    endDate: getEndDate(),
    nextDelivery: getNextDeliveryDate(),
    deliveriesCompleted: 0,
    totalDeliveries: calculateTotalDeliveries(),
    paymentId: paymentResult.paymentId,
    weeklyDays: subscriptionData.weeklyDays,
    customDates: subscriptionData.customDates
  };

  // Get existing orders
  const existingOrders = getSubscriptionOrders();
  
  // Add new order to the beginning
  const updatedOrders = [order, ...existingOrders];
  
  // Save to localStorage
  localStorage.setItem('gutzo_subscription_orders', JSON.stringify(updatedOrders));
  
  return order;
}

export function getInstantOrders(): InstantOrder[] {
  try {
    const orders = localStorage.getItem('gutzo_instant_orders');
    if (!orders) return [];
    
    return JSON.parse(orders).map((order: any) => ({
      ...order,
      orderDate: new Date(order.orderDate),
      estimatedDelivery: order.estimatedDelivery ? new Date(order.estimatedDelivery) : undefined
    }));
  } catch (error) {
    console.error('Error getting instant orders:', error);
    return [];
  }
}

export function getSubscriptionOrders(): SubscriptionOrder[] {
  try {
    const orders = localStorage.getItem('gutzo_subscription_orders');
    if (!orders) return [];
    
    return JSON.parse(orders).map((order: any) => ({
      ...order,
      startDate: new Date(order.startDate),
      endDate: order.endDate ? new Date(order.endDate) : undefined,
      nextDelivery: order.nextDelivery ? new Date(order.nextDelivery) : undefined,
      customDates: order.customDates ? order.customDates.map((date: string) => new Date(date)) : undefined
    }));
  } catch (error) {
    console.error('Error getting subscription orders:', error);
    return [];
  }
}

export function updateInstantOrderStatus(orderId: string, status: InstantOrder['status']): boolean {
  try {
    const orders = getInstantOrders();
    const updatedOrders = orders.map(order => 
      order.id === orderId ? { ...order, status } : order
    );
    
    localStorage.setItem('gutzo_instant_orders', JSON.stringify(updatedOrders));
    return true;
  } catch (error) {
    console.error('Error updating instant order status:', error);
    return false;
  }
}

export function updateSubscriptionOrderStatus(orderId: string, status: SubscriptionOrder['status']): boolean {
  try {
    const orders = getSubscriptionOrders();
    const updatedOrders = orders.map(order => 
      order.id === orderId ? { ...order, status } : order
    );
    
    localStorage.setItem('gutzo_subscription_orders', JSON.stringify(updatedOrders));
    return true;
  } catch (error) {
    console.error('Error updating subscription order status:', error);
    return false;
  }
}

export function getTotalOrdersCount(): number {
  return getInstantOrders().length + getSubscriptionOrders().length;
}

export function getActiveSubscriptionsCount(): number {
  return getSubscriptionOrders().filter(order => order.status === 'active').length;
}