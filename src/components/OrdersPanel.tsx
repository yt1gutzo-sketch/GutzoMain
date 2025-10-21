import React, { useState, useEffect, useRef } from 'react';
import { Package, RefreshCw, Calendar, Clock, MapPin, Phone, MessageCircle, AlertCircle, CheckCircle, XCircle, Pause, Play, Edit, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner@2.0.3';

// Types for orders
export interface InstantOrder {
  id: string;
  vendorName: string;
  vendorPhone: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
  status: 'placed' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  orderDate: Date;
  estimatedDelivery?: Date;
  whatsappOrderId?: string;
}

export interface SubscriptionOrder {
  id: string;
  subscriptionId: string;
  vendorName: string;
  vendorPhone: string;
  productName: string;
  productImage: string;
  mealSlots: string[];
  customTimes: Record<string, string>;
  frequency: 'Daily' | 'Weekly' | 'Custom';
  quantity: number;
  duration: string;
  totalPrice: number;
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  startDate: Date;
  endDate?: Date;
  nextDelivery?: Date;
  deliveriesCompleted: number;
  totalDeliveries: number;
  paymentId: string;
  weeklyDays?: string[];
  customDates?: Date[];
}

interface OrdersPanelProps {
  className?: string;
  onViewOrderDetails?: (orderData: any) => void;
  recentOrderData?: {
    paymentDetails: {
      paymentId: string;
      subscriptionId: string;
      method: string;
      amount: number;
      date: string;
    };
    orderSummary: {
      items: number;
      vendor: string;
      orderType: string;
      quantity: string;
      estimatedDelivery: string;
    };
  } | null;
}

export function OrdersPanel({ className = "", onViewOrderDetails, recentOrderData }: OrdersPanelProps) {
  const [instantOrders, setInstantOrders] = useState<InstantOrder[]>([]);
  const [subscriptionOrders, setSubscriptionOrders] = useState<SubscriptionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'instant' | 'subscriptions'>('subscriptions');
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const highlightedOrderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadOrders();
  }, [recentOrderData]);

  // Set highlighted order and clear it after a delay
  useEffect(() => {
    if (recentOrderData) {
      const orderId = recentOrderData.paymentDetails.subscriptionId;
      setHighlightedOrderId(orderId);
      
      // Scroll to the highlighted order after a short delay
      setTimeout(() => {
        if (highlightedOrderRef.current) {
          highlightedOrderRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 500);
      
      // Clear highlight after 5 seconds
      const timer = setTimeout(() => {
        setHighlightedOrderId(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [recentOrderData]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // Load orders from localStorage (in real app, this would be from Supabase)
      const storedInstantOrders = localStorage.getItem('gutzo_instant_orders');
      const storedSubscriptionOrders = localStorage.getItem('gutzo_subscription_orders');

      let instantOrdersList: InstantOrder[] = [];
      let subscriptionOrdersList: SubscriptionOrder[] = [];

      if (storedInstantOrders) {
        const orders = JSON.parse(storedInstantOrders).map((order: any) => ({
          ...order,
          orderDate: new Date(order.orderDate),
          estimatedDelivery: order.estimatedDelivery ? new Date(order.estimatedDelivery) : undefined
        }));
        instantOrdersList = orders;
      }

      if (storedSubscriptionOrders) {
        const orders = JSON.parse(storedSubscriptionOrders).map((order: any) => ({
          ...order,
          startDate: new Date(order.startDate),
          endDate: order.endDate ? new Date(order.endDate) : undefined,
          nextDelivery: order.nextDelivery ? new Date(order.nextDelivery) : undefined,
          customDates: order.customDates ? order.customDates.map((date: string) => new Date(date)) : undefined
        }));
        subscriptionOrdersList = orders;
      }

      // If there's recent order data, add it to the appropriate list and save to localStorage
      if (recentOrderData) {
        const isSubscription = recentOrderData.orderSummary.orderType.toLowerCase().includes('subscription');
        const orderId = recentOrderData.paymentDetails.subscriptionId;
        
        if (isSubscription) {
          // Check if this subscription order already exists
          const orderExists = subscriptionOrdersList.some(order => order.id === orderId);
          
          if (!orderExists) {
            // Create a subscription order from the recent order data
            const newSubscriptionOrder: SubscriptionOrder = {
              id: orderId,
              subscriptionId: orderId,
              vendorName: recentOrderData.orderSummary.vendor,
              vendorPhone: '+919790312308', // Mock phone number
              productName: 'Healthy Bowl', // Mock product name
              productImage: 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop', // Mock image
              mealSlots: ['Lunch'],
              customTimes: { 'Lunch': recentOrderData.orderSummary.estimatedDelivery },
              frequency: 'Daily',
              quantity: parseInt(recentOrderData.orderSummary.quantity) || 1,
              duration: '1 Month',
              totalPrice: recentOrderData.paymentDetails.amount,
              status: 'active',
              startDate: new Date(),
              nextDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
              deliveriesCompleted: 0,
              totalDeliveries: 30,
              paymentId: recentOrderData.paymentDetails.paymentId,
              weeklyDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            };
            
            // Add to the beginning of the list (most recent first)
            subscriptionOrdersList = [newSubscriptionOrder, ...subscriptionOrdersList];
            
            // Save updated list to localStorage
            localStorage.setItem('gutzo_subscription_orders', JSON.stringify(subscriptionOrdersList));
          }
          
          // Set active tab to subscriptions
          setActiveTab('subscriptions');
        } else {
          // Check if this instant order already exists
          const orderExists = instantOrdersList.some(order => order.id === orderId);
          
          if (!orderExists) {
            // Create an instant order from the recent order data
            const newInstantOrder: InstantOrder = {
              id: orderId,
              vendorName: recentOrderData.orderSummary.vendor,
              vendorPhone: '+919790312308', // Mock phone number
              productName: 'Healthy Bowl', // Mock product name
              productImage: 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop', // Mock image
              quantity: parseInt(recentOrderData.orderSummary.quantity) || 1,
              price: Math.floor(recentOrderData.paymentDetails.amount / (parseInt(recentOrderData.orderSummary.quantity) || 1)),
              status: 'preparing',
              orderDate: new Date(),
              estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
              whatsappOrderId: recentOrderData.paymentDetails.paymentId
            };
            
            // Add to the beginning of the list (most recent first)
            instantOrdersList = [newInstantOrder, ...instantOrdersList];
            
            // Save updated list to localStorage
            localStorage.setItem('gutzo_instant_orders', JSON.stringify(instantOrdersList));
          }
          
          // Set active tab to instant orders
          setActiveTab('instant');
        }
      }

      setInstantOrders(instantOrdersList);
      setSubscriptionOrders(subscriptionOrdersList);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'confirmed':
      case 'delivered':
        return 'bg-gutzo-selected/10 text-gutzo-selected';
      case 'preparing':
      case 'ready':
        return 'bg-gutzo-primary/10 text-gutzo-primary';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'completed':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'confirmed':
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'preparing':
      case 'ready':
        return <Clock className="h-4 w-4" />;
      case 'paused':
        return <Pause className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'completed':
        return <Package className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatMealSlots = (mealSlots: string[], customTimes: Record<string, string>) => {
    return mealSlots.map(slot => {
      const time = customTimes[slot];
      return time ? `${slot} (${time})` : slot;
    }).join(', ');
  };

  const getFrequencyDisplay = (order: SubscriptionOrder) => {
    switch (order.frequency) {
      case 'Daily':
        return 'Every day';
      case 'Weekly':
        return order.weeklyDays?.join(', ') || 'Weekly';
      case 'Custom':
        return `${order.customDates?.length || 0} selected dates`;
      default:
        return order.frequency;
    }
  };

  const handleContactVendor = (vendorPhone: string, orderType: 'instant' | 'subscription', orderId: string) => {
    const message = orderType === 'instant' 
      ? `Hi! I have a question about my instant order ${orderId}. Can you help me?`
      : `Hi! I have a question about my subscription ${orderId}. Can you help me?`;
    
    const whatsappUrl = `https://wa.me/${vendorPhone.replace(/[^\\d+]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCallSupport = () => {
    // Gutzo support phone number
    const supportPhone = '+918903589068'; // Replace with actual support number
    const callUrl = `tel:${supportPhone}`;
    window.location.href = callUrl;
    toast.success('Calling Gutzo Support...');
  };

  const handleViewOrderDetails = (order: SubscriptionOrder | InstantOrder) => {
    // Convert order to payment success modal format
    const orderData = {
      paymentDetails: {
        paymentId: `PAY_${order.id.slice(-6)}`,
        subscriptionId: order.id,
        method: 'Wallet',
        amount: 'totalPrice' in order ? order.totalPrice : (order.quantity * order.price),
        date: ('startDate' in order ? order.startDate : order.orderDate).toLocaleDateString('en-IN')
      },
      orderSummary: {
        items: 'quantity' in order ? order.quantity : 1,
        vendor: order.vendorName,
        orderType: 'totalPrice' in order ? 'Subscription' : 'Instant Delivery',
        quantity: 'quantity' in order ? order.quantity.toString() : '1',
        estimatedDelivery: 'nextDelivery' in order && order.nextDelivery 
          ? order.nextDelivery.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
          : 'estimatedDelivery' in order && order.estimatedDelivery
          ? order.estimatedDelivery.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
          : '05:30 pm'
      }
    };

    if (onViewOrderDetails) {
      onViewOrderDetails(orderData);
    }
  };

  const handlePauseSubscription = async (subscriptionId: string) => {
    try {
      // In real app, make API call to pause subscription
      setSubscriptionOrders(prev => 
        prev.map(order => 
          order.id === subscriptionId 
            ? { ...order, status: 'paused' as const }
            : order
        )
      );
      
      // Update localStorage
      const updatedOrders = subscriptionOrders.map(order => 
        order.id === subscriptionId 
          ? { ...order, status: 'paused' as const }
          : order
      );
      localStorage.setItem('gutzo_subscription_orders', JSON.stringify(updatedOrders));
      
      toast.success('Subscription paused successfully');
    } catch (error) {
      console.error('Error pausing subscription:', error);
      toast.error('Failed to pause subscription');
    }
  };

  const handleResumeSubscription = async (subscriptionId: string) => {
    try {
      // In real app, make API call to resume subscription
      setSubscriptionOrders(prev => 
        prev.map(order => 
          order.id === subscriptionId 
            ? { ...order, status: 'active' as const }
            : order
        )
      );
      
      // Update localStorage
      const updatedOrders = subscriptionOrders.map(order => 
        order.id === subscriptionId 
          ? { ...order, status: 'active' as const }
          : order
      );
      localStorage.setItem('gutzo_subscription_orders', JSON.stringify(updatedOrders));
      
      toast.success('Subscription resumed successfully');
    } catch (error) {
      console.error('Error resuming subscription:', error);
      toast.error('Failed to resume subscription');
    }
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 bg-gray-50 rounded-xl animate-pulse">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-gray-300 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (instantOrders.length === 0 && subscriptionOrders.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-16">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">No Orders Yet</h3>
          <p className="text-gray-600 text-sm mb-6">
            Your order history will appear here once you place your first order.
          </p>
          <div className="space-y-3">
            <Button 
              className="w-full bg-gutzo-primary hover:bg-gutzo-primary-hover text-white"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              🛒 Order More Delicious Meals
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'instant' | 'subscriptions')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Subscriptions ({subscriptionOrders.length})
          </TabsTrigger>
          <TabsTrigger value="instant" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Instant Orders ({instantOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4 mt-6">
          {subscriptionOrders.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h4 className="font-medium text-gray-900 mb-2">No Subscriptions</h4>
              <p className="text-gray-600 text-sm">
                Set up a subscription for regular meal deliveries
              </p>
            </div>
          ) : (
            subscriptionOrders.map((order, index) => {
              const isRecentOrder = recentOrderData && order.id === recentOrderData.paymentDetails.subscriptionId;
              const isHighlighted = order.id === highlightedOrderId;
              const shouldHighlight = isRecentOrder || isHighlighted;
              return (
                <Card 
                  key={order.id} 
                  ref={shouldHighlight ? highlightedOrderRef : null}
                  className={`overflow-hidden transition-all duration-500 ${shouldHighlight ? 'ring-2 ring-gutzo-primary shadow-lg border-gutzo-primary/20' : ''}`}
                >
                  <CardHeader className="pb-3">
                    {shouldHighlight && (
                      <div className="mb-3 bg-gutzo-primary/10 border border-gutzo-primary/20 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gutzo-primary rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-gutzo-primary">
                            {isRecentOrder ? 'Just Ordered!' : 'Your Order'}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                          <ImageWithFallback
                            src={order.productImage}
                            alt={order.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <CardTitle className="text-base">{order.productName}</CardTitle>
                          <p className="text-sm text-gray-600">{order.vendorName}</p>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(order.status)} border-0`}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Subscription Details */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Meal Slots:</span>
                          <p className="font-medium">{formatMealSlots(order.mealSlots, order.customTimes)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Frequency:</span>
                          <p className="font-medium">{getFrequencyDisplay(order)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Quantity:</span>
                          <p className="font-medium">{order.quantity} bowl{order.quantity > 1 ? 's' : ''}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Duration:</span>
                          <p className="font-medium">{order.duration}</p>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Progress:</span>
                          <p className="font-medium">
                            {order.deliveriesCompleted} of {order.totalDeliveries} deliveries
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-gutzo-selected h-2 rounded-full transition-all"
                              style={{ width: `${(order.deliveriesCompleted / order.totalDeliveries) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Amount:</span>
                          <p className="font-bold text-gutzo-selected">₹{order.totalPrice.toLocaleString()}</p>
                        </div>
                      </div>

                      {order.nextDelivery && order.status === 'active' && (
                        <div className="flex items-center gap-2 text-sm bg-gutzo-primary/10 text-gutzo-primary p-3 rounded-lg">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Next delivery: {order.nextDelivery.toLocaleDateString('en-IN', { 
                              weekday: 'long',
                              day: 'numeric',
                              month: 'short'
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      {/* Top Row - Primary Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={handleCallSupport}
                          className="bg-gutzo-primary hover:bg-gutzo-primary-hover text-white h-10 flex items-center justify-center space-x-2"
                        >
                          <Phone className="h-4 w-4" />
                          <span className="text-sm">Call Support</span>
                        </Button>
                        <Button
                          onClick={() => handleViewOrderDetails(order)}
                          variant="outline"
                          className="h-10 flex items-center justify-center space-x-2 border-gutzo-selected text-gutzo-selected hover:bg-gutzo-selected/5"
                        >
                          <Package className="h-4 w-4" />
                          <span className="text-sm">View Details</span>
                        </Button>
                      </div>
                      
                      {/* Bottom Row - Secondary Actions */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleContactVendor(order.vendorPhone, 'subscription', order.id)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Contact Vendor
                        </Button>
                        
                        {order.status === 'active' && (
                          <Button
                            onClick={() => handlePauseSubscription(order.id)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                        )}
                        
                        {order.status === 'paused' && (
                          <Button
                            onClick={() => handleResumeSubscription(order.id)}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-gutzo-selected border-gutzo-selected/30 hover:bg-gutzo-selected/5"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Instant Orders Tab */}
        <TabsContent value="instant" className="space-y-4 mt-6">
          {instantOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h4 className="font-medium text-gray-900 mb-2">No Instant Orders</h4>
              <p className="text-gray-600 text-sm">
                Your WhatsApp orders will appear here
              </p>
            </div>
          ) : (
            instantOrders.map((order) => {
              const isRecentOrder = recentOrderData && order.id === recentOrderData.paymentDetails.subscriptionId;
              const isHighlighted = order.id === highlightedOrderId;
              const shouldHighlight = isRecentOrder || isHighlighted;
              return (
                <Card 
                  key={order.id} 
                  ref={shouldHighlight ? highlightedOrderRef : null}
                  className={`overflow-hidden transition-all duration-500 ${shouldHighlight ? 'ring-2 ring-gutzo-primary shadow-lg border-gutzo-primary/20' : ''}`}
                >
                  {shouldHighlight && (
                    <div className="bg-gutzo-primary/10 border-b border-gutzo-primary/20 p-2">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-2 h-2 bg-gutzo-primary rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-gutzo-primary">
                          {isRecentOrder ? 'Just Ordered!' : 'Your Order'}
                        </span>
                      </div>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <ImageWithFallback
                          src={order.productImage}
                          alt={order.productName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">{order.productName}</h4>
                            <p className="text-sm text-gray-600">{order.vendorName}</p>
                          </div>
                          <Badge className={`${getStatusColor(order.status)} border-0`}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(order.status)}
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-gray-600">Quantity:</span>
                            <p className="font-medium">{order.quantity} × ₹{order.price}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Total:</span>
                            <p className="font-bold text-gutzo-selected">₹{(order.quantity * order.price).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Order Date:</span>
                            <p className="font-medium">
                              {order.orderDate.toLocaleDateString('en-IN', { 
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          {order.estimatedDelivery && (
                            <div>
                              <span className="text-gray-600">Est. Delivery:</span>
                              <p className="font-medium">
                                {order.estimatedDelivery.toLocaleDateString('en-IN', { 
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="space-y-2">
                          {/* Primary Actions */}
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={handleCallSupport}
                              className="bg-gutzo-primary hover:bg-gutzo-primary-hover text-white h-10 flex items-center justify-center space-x-2"
                            >
                              <Phone className="h-4 w-4" />
                              <span className="text-sm">Call Support</span>
                            </Button>
                            <Button
                              onClick={() => handleViewOrderDetails(order)}
                              variant="outline"
                              className="h-10 flex items-center justify-center space-x-2 border-gutzo-selected text-gutzo-selected hover:bg-gutzo-selected/5"
                            >
                              <Package className="h-4 w-4" />
                              <span className="text-sm">View Details</span>
                            </Button>
                          </div>
                          
                          {/* Secondary Action */}
                          <Button
                            onClick={() => handleContactVendor(order.vendorPhone, 'instant', order.id)}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Contact Vendor
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}