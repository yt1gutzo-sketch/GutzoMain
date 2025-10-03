import React, { useState } from 'react';
import { X, CreditCard, Smartphone, Wallet, Shield, ArrowLeft, CheckCircle, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Product, Vendor } from '../types';
import { SubscriptionData } from './SubscriptionPanel';
import { InstantOrderData, CartItem } from './InstantOrderPanel';

interface PaymentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  subscriptionData?: SubscriptionData | null;
  instantOrderData?: InstantOrderData | null;
  product: Product | null;
  vendor: Vendor | null;
  onPaymentSuccess: (paymentData: PaymentResult) => void;
}

export interface PaymentResult {
  subscriptionId: string;
  paymentId: string;
  amount: number;
  paymentMethod: string;
  status: 'success' | 'failed';
}

const PAYMENT_METHODS = [
  {
    id: 'upi',
    name: 'UPI',
    description: 'Pay using PhonePe, GPay, Paytm',
    icon: Smartphone,
    popular: true
  },
  {
    id: 'card',
    name: 'Credit/Debit Card',
    description: 'Visa, Mastercard, RuPay',
    icon: CreditCard,
    popular: false
  },
  {
    id: 'wallet',
    name: 'Digital Wallets',
    description: 'Paytm, Amazon Pay, Mobikwik',
    icon: Wallet,
    popular: false
  }
];

export function PaymentPanel({
  isOpen,
  onClose,
  onBack,
  subscriptionData,
  instantOrderData,
  product,
  vendor,
  onPaymentSuccess
}: PaymentPanelProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUPIInput, setShowUPIInput] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });

  if (!isOpen || (!subscriptionData && !instantOrderData) || !product || !vendor) return null;

  const isSubscription = !!subscriptionData;
  const orderAmount = isSubscription ? subscriptionData!.totalPrice : (instantOrderData!.totalPrice + 5); // +5 for packaging

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

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Mock successful payment
      const paymentResult: PaymentResult = {
        subscriptionId: isSubscription ? `SUB_${Date.now()}` : `ORD_${Date.now()}`,
        paymentId: `PAY_${Date.now()}`,
        amount: orderAmount,
        paymentMethod: selectedPaymentMethod,
        status: 'success'
      };

      onPaymentSuccess(paymentResult);
    } catch (error) {
      console.error('Payment failed:', error);
      // Handle payment failure
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardInputChange = (field: string, value: string) => {
    setCardDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[65]"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[95%] max-w-lg lg:w-[50%] lg:max-w-[600px] bg-white shadow-2xl z-[70] transform transition-transform duration-300 product-details-panel">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gutzo-highlight/15 to-gutzo-primary/10">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gutzo-primary/15 rounded-full">
                  <Shield className="h-5 w-5 text-gutzo-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Secure Payment</h2>
                  <p className="text-sm text-gray-600">Complete your {isSubscription ? 'subscription' : 'order'}</p>
                </div>
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
            
            {/* Delivery Address */}
            <div className="bg-gradient-to-r from-gutzo-primary/10 to-gutzo-highlight/15 rounded-xl p-4 border border-gutzo-primary/20">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gutzo-primary/15 rounded-full">
                  <MapPin className="h-5 w-5 text-gutzo-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-2">Delivery Address</h4>
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">Home</p>
                    <p>123 Main Street, Sector 4</p>
                    <p>Coimbatore, Tamil Nadu 641001</p>
                    <p className="text-xs text-gray-600 mt-1">+91 98765 43210</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gutzo-primary border-gutzo-primary hover:bg-gutzo-primary/5 text-xs"
                >
                  Change
                </Button>
              </div>
            </div>

            {/* Items Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Your Order ({isSubscription ? '1 subscription' : `${instantOrderData!.cartItems.length} ${instantOrderData!.cartItems.length === 1 ? 'item' : 'items'}`})</h4>
                <div className="text-sm text-gray-600">
                  From <span className="font-medium">{vendor.name}</span>
                </div>
              </div>

              {isSubscription ? (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 flex-shrink-0 relative overflow-hidden rounded-xl">
                      <ImageWithFallback
                        src={product?.image || ''}
                        alt={product?.name || ''}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Meal slots: {formatMealSlots()}</p>
                        <p>Frequency: {getFrequencyDisplay()}</p>
                        <p>Duration: {subscriptionData!.duration}</p>
                        <p>Quantity: {subscriptionData!.quantity} bowl{subscriptionData!.quantity > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gutzo-selected">₹{product.price}</div>
                      <div className="text-xs text-gray-500">per bowl</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {instantOrderData!.cartItems.map((cartItem) => (
                    <div key={cartItem.product.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 flex-shrink-0 relative overflow-hidden rounded-xl">
                          <ImageWithFallback
                            src={cartItem.product?.image || ''}
                            alt={cartItem.product?.name || ''}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{cartItem.product.name}</h3>
                          <p className="text-xs text-gray-600">{vendor.name}</p>
                          <div className="mt-2 text-sm">
                            <span className="text-gray-600">Quantity: </span>
                            <span className="font-medium">{cartItem.quantity}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gutzo-selected">₹{(cartItem.product.price * cartItem.quantity).toLocaleString()}</div>
                          <div className="text-xs text-gray-500">₹{cartItem.product.price} × {cartItem.quantity}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Methods */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Choose Payment Method</h3>
              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => {
                  const IconComponent = method.icon;
                  const isSelected = selectedPaymentMethod === method.id;
                  
                  return (
                    <button
                      key={method.id}
                      onClick={() => {
                        setSelectedPaymentMethod(method.id);
                        setShowUPIInput(method.id === 'upi');
                      }}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-gutzo-primary bg-gutzo-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <IconComponent className={`h-6 w-6 ${
                            isSelected ? 'text-gutzo-primary' : 'text-gray-500'
                          }`} />
                          <div>
                            <div className={`font-medium ${
                              isSelected ? 'text-gutzo-primary' : 'text-gray-900'
                            }`}>
                              {method.name}
                              {method.popular && (
                                <Badge variant="secondary" className="ml-2 text-xs bg-gutzo-highlight/20 text-gutzo-selected">
                                  Popular
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {method.description}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-gutzo-primary" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* UPI Input */}
            {selectedPaymentMethod === 'upi' && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-3">Enter UPI ID</h4>
                <Input
                  type="text"
                  placeholder="yourname@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="mb-2"
                />
                <p className="text-xs text-gray-500">
                  You will be redirected to your UPI app to complete the payment
                </p>
              </div>
            )}

            {/* Card Details */}
            {selectedPaymentMethod === 'card' && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <h4 className="font-medium text-gray-900">Enter Card Details</h4>
                
                <div>
                  <Input
                    type="text"
                    placeholder="Card Number"
                    value={cardDetails.number}
                    onChange={(e) => handleCardInputChange('number', formatCardNumber(e.target.value))}
                    maxLength={19}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="text"
                    placeholder="MM/YY"
                    value={cardDetails.expiry}
                    onChange={(e) => handleCardInputChange('expiry', formatExpiry(e.target.value))}
                    maxLength={5}
                  />
                  <Input
                    type="text"
                    placeholder="CVV"
                    value={cardDetails.cvv}
                    onChange={(e) => handleCardInputChange('cvv', e.target.value.replace(/\D/g, '').substring(0, 4))}
                    maxLength={4}
                  />
                </div>
                
                <div>
                  <Input
                    type="text"
                    placeholder="Cardholder Name"
                    value={cardDetails.name}
                    onChange={(e) => handleCardInputChange('name', e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Shield className="h-4 w-4" />
                  <span>Your card details are encrypted and secure</span>
                </div>
              </div>
            )}

            {/* Wallet Selection */}
            {selectedPaymentMethod === 'wallet' && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-3">Select Wallet</h4>
                <div className="grid grid-cols-2 gap-2">
                  {['Paytm', 'Amazon Pay', 'Mobikwik', 'Freecharge'].map((wallet) => (
                    <button
                      key={wallet}
                      className="p-3 border border-gray-200 rounded-lg hover:border-gutzo-primary/50 transition-all text-sm"
                    >
                      {wallet}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-gradient-to-br from-gutzo-highlight/15 to-gutzo-primary/10 rounded-xl p-5 border border-gutzo-primary/20">
              <h3 className="font-medium text-gray-900 mb-4">Order Summary</h3>
              
              <div className="space-y-3 text-sm">
                {isSubscription ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subscription plan:</span>
                      <span className="font-medium text-gray-900">{subscriptionData!.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base price:</span>
                      <span className="font-medium text-gray-900">₹{(product.price * subscriptionData!.quantity).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subscription discount (15%):</span>
                      <span className="font-medium text-gutzo-selected">-₹{Math.round((product.price * subscriptionData!.quantity) * 0.15).toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Item total:</span>
                      <span className="font-medium text-gray-900">₹{instantOrderData!.totalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Packaging fee:</span>
                      <span className="font-medium text-gray-900">₹5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery fee:</span>
                      <span className="font-medium text-gutzo-selected">FREE</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Est. delivery:</span>
                      <span className="font-medium text-gray-900">
                        {instantOrderData!.estimatedDelivery.toLocaleTimeString('en-IN', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </span>
                    </div>
                  </>
                )}

                <Separator className="my-3" />

                <div className="flex justify-between items-center pt-2">
                  <span className="font-medium text-gray-900">Total Amount:</span>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gutzo-selected">
                      ₹{orderAmount.toLocaleString()}
                    </div>
                    <div className="text-xs text-gutzo-selected">
                      {isSubscription ? '15% subscription discount applied' : 'Includes all charges'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Note */}
            <div className="bg-gutzo-selected/8 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-gutzo-selected mt-0.5" />
                <div>
                  <h4 className="font-medium text-gutzo-selected mb-2">Secure Payment</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• 256-bit SSL encryption</li>
                    <li>• PCI DSS compliant</li>
                    <li>• No card details stored</li>
                    <li>• 100% secure transactions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <div className="p-6 border-t border-gray-200 bg-gray-50/50">
            <Button
              onClick={handlePayment}
              disabled={
                isProcessing ||
                (selectedPaymentMethod === 'upi' && !upiId.trim()) ||
                (selectedPaymentMethod === 'card' && (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name))
              }
              className="w-full bg-gradient-to-r from-gutzo-primary to-gutzo-primary-hover text-white font-medium py-4 rounded-xl hover:shadow-lg transition-all"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing Payment...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4" />
                  Place Order - ₹{orderAmount.toLocaleString()}
                </div>
              )}
            </Button>
            
            <p className="text-xs text-gray-500 text-center mt-3">
              By proceeding, you agree to our Terms & Conditions and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </>
  );
}