import React, { useEffect } from 'react';
import { X, CheckCircle, Calendar, Clock, Download, MessageCircle, Package } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Product, Vendor } from '../types';
import { SubscriptionData } from './SubscriptionPanel';
import { InstantOrderData, CartItem } from './InstantOrderPanel';
import { PaymentResult } from './PaymentPanel';
import { saveSubscriptionOrder, saveInstantOrder } from '../utils/orders';

interface PaymentSuccessPanelProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionData?: SubscriptionData | null;
  instantOrderData?: InstantOrderData | null;
  product: Product | null;
  vendor: Vendor | null;
  paymentResult: PaymentResult | null;
  onViewOrders?: () => void;
}

export function PaymentSuccessPanel({
  isOpen,
  onClose,
  subscriptionData,
  instantOrderData,
  product,
  vendor,
  paymentResult,
  onViewOrders
}: PaymentSuccessPanelProps) {

  const isSubscription = !!subscriptionData;

  // Save the order when the panel opens
  useEffect(() => {
    if (isOpen && product && vendor && paymentResult) {
      try {
        if (isSubscription && subscriptionData) {
          saveSubscriptionOrder(subscriptionData, paymentResult, product, vendor);
        } else if (instantOrderData) {
          // Create an instant order and save it - handling multiple cart items
          const instantOrder = {
            id: paymentResult.subscriptionId, // Using subscriptionId as orderId for instant orders
            vendorName: vendor.name,
            vendorPhone: vendor.contact_whatsapp,
            cartItems: instantOrderData.cartItems.map(cartItem => ({
              productName: cartItem.product.name,
              productImage: cartItem.product.image_url || '',
              quantity: cartItem.quantity,
              price: cartItem.product.price,
              total: cartItem.product.price * cartItem.quantity
            })),
            totalPrice: instantOrderData.totalPrice,
            status: 'confirmed' as const,
            orderDate: new Date(),
            estimatedDelivery: instantOrderData.estimatedDelivery,
            whatsappOrderId: undefined
          };
          
          // Get existing orders and add new one
          const existingOrders = JSON.parse(localStorage.getItem('gutzo_instant_orders') || '[]');
          const updatedOrders = [instantOrder, ...existingOrders];
          localStorage.setItem('gutzo_instant_orders', JSON.stringify(updatedOrders));
        }
      } catch (error) {
        console.error('Error saving order:', error);
      }
    }
  }, [isOpen, subscriptionData, instantOrderData, product, vendor, paymentResult, isSubscription]);

  if (!isOpen || (!subscriptionData && !instantOrderData) || !product || !vendor || !paymentResult) return null;

  const formatMealSlots = () => {
    if (!subscriptionData.mealSlots.length) return '';
    return subscriptionData.mealSlots
      .map(slot => {
        const customTime = subscriptionData.customTimes?.[slot];
        return customTime ? `${slot} (${customTime})` : slot;
      })
      .join(', ');
  };

  const getFrequencyDisplay = () => {
    switch (subscriptionData.frequency) {
      case 'Daily':
        return 'Every day';
      case 'Weekly':
        return subscriptionData.weeklyDays?.join('–') || 'Weekly';
      case 'Custom':
        return `${subscriptionData.customDates?.length || 0} selected dates`;
      default:
        return subscriptionData.frequency;
    }
  };

  const getNextDeliveryDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString('en-IN', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const handleDownloadReceipt = () => {
    // Mock download functionality
    console.log('Downloading receipt for:', paymentResult.paymentId);
  };

  const handleContactSupport = () => {
    const message = `Hi! I have a question about my subscription ${paymentResult.subscriptionId}. Can you help me?`;
    const whatsappUrl = `https://wa.me/919876543210?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[75]"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full md:w-[40%] md:min-w-[400px] md:max-w-[600px] xl:min-w-[480px] bg-white shadow-2xl z-[80] transform transition-transform duration-300 product-details-panel">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gutzo-selected/15 to-gutzo-highlight/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gutzo-selected/15 rounded-full">
                <CheckCircle className="h-6 w-6 text-gutzo-selected" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Payment Successful!</h2>
                <p className="text-sm text-gray-600">Your subscription is now active</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Success Message */}
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gutzo-selected/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-gutzo-selected" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {isSubscription ? 'Subscription Activated!' : 'Order Confirmed!'}
              </h3>
              <p className="text-gray-600 text-sm">
                {isSubscription 
                  ? 'Your healthy meal subscription is now active and ready to go.'
                  : 'Your order has been confirmed and will be prepared shortly.'
                }
              </p>
            </div>

            {/* Payment Details */}
            <div className="bg-gradient-to-br from-gutzo-selected/10 to-gutzo-highlight/15 rounded-xl p-5 border border-gutzo-selected/20">
              <h4 className="font-medium text-gray-900 mb-4">Payment Details</h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment ID:</span>
                  <span className="font-mono text-gray-900">{paymentResult.paymentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Subscription ID:</span>
                  <span className="font-mono text-gray-900">{paymentResult.subscriptionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium text-gray-900 capitalize">{paymentResult.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-bold text-gutzo-selected">₹{paymentResult.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Date:</span>
                  <span className="font-medium text-gray-900">{new Date().toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h4 className="font-medium text-gray-900 mb-4">
                {isSubscription ? 'Subscription Summary' : 'Order Summary'}
              </h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{isSubscription ? 'Product:' : 'Items:'}</span>
                  <span className="font-medium text-gray-900">
                    {isSubscription ? product.name : `${instantOrderData!.cartItems.length} item${instantOrderData!.cartItems.length > 1 ? 's' : ''}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vendor:</span>
                  <span className="font-medium text-gray-900">{vendor.name}</span>
                </div>
                
                {isSubscription ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Meal slots:</span>
                      <span className="font-medium text-gray-900 text-right flex-1 ml-3">
                        {formatMealSlots()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Frequency:</span>
                      <span className="font-medium text-gray-900">{getFrequencyDisplay()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium text-gray-900">{subscriptionData!.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="font-medium text-gray-900">{subscriptionData!.quantity} bowl{subscriptionData!.quantity > 1 ? 's' : ''}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order type:</span>
                      <span className="font-medium text-gray-900">Instant Delivery</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="font-medium text-gray-900">{instantOrderData!.quantity} bowl{instantOrderData!.quantity > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated delivery:</span>
                      <span className="font-medium text-gray-900">
                        {instantOrderData!.estimatedDelivery.toLocaleTimeString('en-IN', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </span>
                    </div>
                    {instantOrderData!.specialInstructions && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Special instructions:</span>
                        <span className="font-medium text-gray-900 text-right flex-1 ml-3">
                          {instantOrderData!.specialInstructions}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Delivery Info */}
            <div className="bg-gradient-to-r from-gutzo-primary/10 to-gutzo-highlight/15 rounded-xl p-5 border border-gutzo-primary/20">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gutzo-primary/15 rounded-full">
                  <Calendar className="h-5 w-5 text-gutzo-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-2">
                    {isSubscription ? 'Next Delivery' : 'Delivery Details'}
                  </h4>
                  {isSubscription ? (
                    <>
                      <p className="text-sm text-gray-700 mb-2">
                        Your first meal delivery is scheduled for <span className="font-medium">{getNextDeliveryDate()}</span>
                      </p>
                      {subscriptionData!.mealSlots.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>
                            First delivery: {subscriptionData!.mealSlots[0]} 
                            {subscriptionData!.customTimes?.[subscriptionData!.mealSlots[0]] && 
                              ` at ${subscriptionData!.customTimes[subscriptionData!.mealSlots[0]]}`
                            }
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-700 mb-2">
                        Your order will be delivered today by <span className="font-medium">
                          {instantOrderData!.estimatedDelivery.toLocaleTimeString('en-IN', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </span>
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>Average delivery time: 30-45 minutes</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="bg-gutzo-highlight/15 rounded-xl p-5">
              <h4 className="font-medium text-gray-900 mb-4">What's Next?</h4>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-gutzo-selected/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                    <CheckCircle className="w-3 h-3 text-gutzo-selected" />
                  </div>
                  <span>You'll receive a confirmation WhatsApp message shortly</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-gutzo-selected/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                    <CheckCircle className="w-3 h-3 text-gutzo-selected" />
                  </div>
                  <span>Track your {isSubscription ? 'deliveries' : 'order'} in your profile section</span>
                </li>
                {isSubscription ? (
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-gutzo-selected/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                      <CheckCircle className="w-3 h-3 text-gutzo-selected" />
                    </div>
                    <span>Pause, skip, or modify your subscription anytime</span>
                  </li>
                ) : (
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-gutzo-selected/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                      <CheckCircle className="w-3 h-3 text-gutzo-selected" />
                    </div>
                    <span>Your meal is being prepared with fresh ingredients</span>
                  </li>
                )}
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-gutzo-selected/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                    <CheckCircle className="w-3 h-3 text-gutzo-selected" />
                  </div>
                  <span>Get support via WhatsApp for any questions</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 border-t border-gray-200 bg-gray-50/50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleDownloadReceipt}
                variant="outline"
                className="w-full text-gray-700 border-gray-300 hover:bg-gray-50 py-3 rounded-xl"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Receipt
              </Button>
              <Button
                onClick={handleContactSupport}
                variant="outline"
                className="w-full text-gutzo-primary border-gutzo-primary/30 hover:bg-gutzo-primary/5 py-3 rounded-xl"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => {
                  onClose();
                  if (onViewOrders) {
                    onViewOrders();
                  }
                }}
                variant="outline"
                className="w-full text-gutzo-selected border-gutzo-selected/30 hover:bg-gutzo-selected/5 py-3 rounded-xl"
              >
                <Package className="w-4 h-4 mr-2" />
                View My Orders
              </Button>
              
              <Button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-gutzo-primary to-gutzo-primary-hover text-white font-medium py-3 rounded-xl hover:shadow-lg transition-all"
              >
                Continue Exploring
              </Button>
            </div>
            
            <p className="text-xs text-gray-500 text-center">
              Thank you for choosing Gutzo for your healthy meal journey! 🌿
            </p>
          </div>
        </div>
      </div>
    </>
  );
}