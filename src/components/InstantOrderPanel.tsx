import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingCart, Clock, MapPin, ArrowLeft, CreditCard, Smartphone, Wallet, CheckCircle } from 'lucide-react';
import { toast } from "sonner@2.0.3";
import { Button } from './ui/button';
// ...existing code...
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Product, Vendor } from '../types';
import { apiService } from '../utils/api';

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

interface InstantOrderPanelProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems?: CartItem[];
  product?: Product | null;
  vendor?: Vendor | null;
  onConfirmOrder?: (orderData: InstantOrderData) => void;
  onProceedToPayment?: (orderData: InstantOrderData) => void;
  onPaymentSuccess?: (paymentData: any) => void;
  onAddAddress?: () => void;
}

export interface InstantOrderData {
  cartItems: CartItem[];
  totalPrice: number;
  estimatedDelivery: Date;
  specialInstructions?: string;
  vendor?: Vendor | null;
}

export function InstantOrderPanel({
  isOpen,
  onClose,
  cartItems: initialCartItems,
  product,
  vendor,
  onConfirmOrder,
  onProceedToPayment,
  onPaymentSuccess,
  onAddAddress
}: InstantOrderPanelProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [syncedItems, setSyncedItems] = useState<CartItem[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  // apiService is now imported above
  // Sync prices from backend when cartItems change or panel opens
  useEffect(() => {
    let cancelled = false;
    async function syncPrices() {
      if (!isOpen || cartItems.length === 0) {
        setSyncedItems(cartItems);
        return;
      }
      setLoadingPrices(true);
      try {
        const productIds = cartItems.map(item => item.productId);
        const result = await apiService.getProductsByIds(productIds);
        const products = result.products || result;
        const priceMap: Record<string, number> = {};
        products.forEach((prod: any) => {
          priceMap[prod.id] = prod.price;
        });
        const updated = cartItems.map(item => ({
          ...item,
          price: priceMap[item.productId] !== undefined ? priceMap[item.productId] : item.price
        }));
        if (!cancelled) setSyncedItems(updated);
      } catch (err) {
        if (!cancelled) setSyncedItems(cartItems);
      } finally {
        if (!cancelled) setLoadingPrices(false);
      }
    }
    syncPrices();
    return () => { cancelled = true; };
  }, [isOpen, cartItems]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('upi');
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [upiId, setUpiId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // GST rules (aligned with cart):
  // - Item prices include 5% GST
  // - Delivery fee is flat ₹50 including 18% GST
  // - Platform fee is flat ₹10 including 18% GST
  const ITEMS_GST_RATE = 0.05; // 5%
  const FEES_GST_RATE = 0.18; // 18%
  const DELIVERY_FEE = 50;
  const PLATFORM_FEE = 10;

  // Digital wallet options
  const digitalWallets = [
    { id: 'paytm', name: 'Paytm', icon: '💰', color: 'bg-blue-500' },
    { id: 'amazonpay', name: 'Amazon Pay', icon: '📦', color: 'bg-orange-500' },
    { id: 'mobikwik', name: 'MobiKwik', icon: '💳', color: 'bg-red-500' },
    { id: 'freecharge', name: 'FreeCharge', icon: '⚡', color: 'bg-green-500' },
    { id: 'phonepe', name: 'PhonePe', icon: '📱', color: 'bg-purple-500' },
    { id: 'googlepay', name: 'Google Pay', icon: '🎯', color: 'bg-blue-600' }
  ];

  // Initialize cart when data changes
  useEffect(() => {
    if (isOpen) {
      if (initialCartItems && initialCartItems.length > 0) {
        // Use cart items from CartContext
        setCartItems(initialCartItems);
        // Get vendor from first cart item
        const firstItem = initialCartItems[0];
        setCurrentVendor({
          id: firstItem.vendorId,
          name: firstItem.vendor.name,
          image: firstItem.vendor.image,
          products: []
        } as Vendor);
      } else if (product && vendor) {
        // Single product order
        setCartItems([{ 
          id: product.id,
          productId: product.id,
          vendorId: vendor.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          vendor: {
            id: vendor.id,
            name: vendor.name,
            image: vendor.image
          },
          product: {
            image: product.image_url,
            description: product.description,
            category: product.category
          }
        }]);
        setCurrentVendor(vendor);
      }
    }
  }, [initialCartItems, product, vendor, isOpen]);


  // Address selection logic
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [showAddressPanel, setShowAddressPanel] = useState(false);
  const [userPhone, setUserPhone] = useState('');

  useEffect(() => {
    let phone = '';
    try {
      const authData = localStorage.getItem('gutzo_auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        phone = parsed.phone || '';
      }
    } catch {}
    const formatted = phone && phone.startsWith('+91') ? phone : (phone ? `+91${phone}` : '');
    setUserPhone(formatted);
    if (formatted) {
      import('../utils/addressApi').then(({ AddressApi }) => {
        AddressApi.getUserAddresses(formatted).then(res => {
          if (res.success && res.data) {
            setAddresses(res.data);
            setSelectedAddress(res.data.find(a => a.is_default) || res.data[0]);
          }
        });
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const displayVendor = currentVendor || vendor;
  const totalPrice = syncedItems.length > 0 ? syncedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) : cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const estimatedDelivery = new Date(Date.now() + 45 * 60 * 1000); // 45 minutes from now

  // Included GST computations
  const deliveryFee = DELIVERY_FEE;
  const platformFee = PLATFORM_FEE;
  const includedGstItems = totalPrice - (totalPrice / (1 + ITEMS_GST_RATE));
  const includedGstDelivery = deliveryFee - (deliveryFee / (1 + FEES_GST_RATE));
  const includedGstPlatform = platformFee - (platformFee / (1 + FEES_GST_RATE));
  const includedGstFees = includedGstDelivery + includedGstPlatform;
  const totalAmount = totalPrice + deliveryFee + platformFee; // All GST-inclusive

  const handleQuantityChange = (productId: string, delta: number) => {
    setCartItems(prevItems => 
      prevItems.map(item => {
        if (item.productId === productId || item.id === productId) {
          const newQuantity = Math.max(1, Math.min(10, item.quantity + delta));
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.productId !== productId && item.id !== productId));
  };

  const handleConfirm = async () => {
    if (selectedPaymentMethod === 'wallet' && !selectedWallet) {
      toast.error('Please select a wallet to continue');
      return;
    }
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const orderData: InstantOrderData = {
        cartItems,
        totalPrice,
        estimatedDelivery,
        specialInstructions: specialInstructions.trim() || undefined,
        vendor: displayVendor
      };
      let paymentMethodName = selectedPaymentMethod;
      if (selectedPaymentMethod === 'wallet' && selectedWallet) {
        const walletName = digitalWallets.find(w => w.id === selectedWallet)?.name;
        paymentMethodName = walletName || 'Digital Wallet';
      } else if (selectedPaymentMethod === 'upi') {
        paymentMethodName = upiId ? `UPI (${upiId})` : 'UPI';
      } else if (selectedPaymentMethod === 'card') {
        paymentMethodName = 'Credit/Debit Card';
      }
      const paymentSuccessData = {
        paymentDetails: {
          paymentId: `PAY_${Date.now()}`,
          subscriptionId: `ORD_${Date.now()}`,
          method: paymentMethodName,
          amount: totalPrice + 5,
          date: new Date().toLocaleDateString('en-IN')
        },
        orderSummary: {
          items: cartItems.length,
          vendor: displayVendor?.name || 'Unknown Vendor',
          orderType: 'Instant Delivery',
          quantity: cartItems.reduce((sum, item) => sum + item.quantity, 0) + ' items',
          estimatedDelivery: estimatedDelivery.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        }
      };
      onClose();
      if (onPaymentSuccess) {
        onPaymentSuccess(paymentSuccessData);
      }
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getDietTags = (item: CartItem): string[] => {
    // product.tags does not exist on CartItem.product, so return empty array
    return [];
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[55]"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[95%] max-w-lg lg:w-[50%] lg:max-w-[600px] bg-white shadow-2xl z-[60] transform transition-transform duration-300 product-details-panel">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gutzo-primary/15 to-gutzo-highlight/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gutzo-primary/15 rounded-full">
                <ShoppingCart className="h-5 w-5 text-gutzo-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Review Order</h2>
                <p className="text-sm text-gray-600">Confirm your items before payment</p>
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
                  {selectedAddress ? (
                    <div className="text-sm text-gray-700">
                      <p className="font-medium">{selectedAddress.type === 'home' ? 'Home' : selectedAddress.type}</p>
                      <p>{selectedAddress.street}{selectedAddress.area ? `, ${selectedAddress.area}` : ""}</p>
                      <p>{selectedAddress.full_address}</p>
                      <p className="text-xs text-gray-600 mt-1">{selectedAddress.landmark ? selectedAddress.landmark : userPhone}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500">No address selected.</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gutzo-primary border-gutzo-primary hover:bg-gutzo-primary/5 text-xs"
                  onClick={() => setShowAddressPanel(true)}
                >
                  Change
                </Button>
              </div>
            </div>
            {showAddressPanel && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                  <h4 className="font-medium text-gray-900 mb-4">Select Delivery Address</h4>
                  <div className="space-y-3">
                    {addresses.length > 0 ? (
                      addresses.map((address) => (
                        <div key={address.id} className={`border rounded-lg p-3 cursor-pointer transition-all ${selectedAddress?.id === address.id ? 'border-gutzo-primary bg-gutzo-primary/5' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => { setSelectedAddress(address); setShowAddressPanel(false); }}>
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-gutzo-primary" />
                            <div className="flex-1">
                              <p className="font-medium">{address.type === 'home' ? 'Home' : address.type}</p>
                              <p className="text-sm">{address.street}{address.area ? `, ${address.area}` : ""}</p>
                              <p className="text-xs text-gray-600">{address.full_address}</p>
                            </div>
                            {selectedAddress?.id === address.id && <span className="text-xs text-gutzo-primary font-semibold">Selected</span>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8">
                        <p className="text-gray-500 mb-4">No addresses found. Please add a delivery address.</p>
                        <Button
                          className="w-full bg-gutzo-primary text-white font-medium rounded-lg"
                          onClick={() => {
                            setShowAddressPanel(false);
                            if (onAddAddress) onAddAddress();
                          }}
                        >
                          Add Address
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button className="mt-4 w-full" onClick={() => setShowAddressPanel(false)}>Close</Button>
                </div>
              </div>
            )}

            {/* Cart Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Your Order ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})</h4>
                <div className="text-sm text-gray-600">
                  From <span className="font-medium">{displayVendor?.name}</span>
                </div>
              </div>

              {/* Cart Items List */}
              {loadingPrices ? (
                <div className="text-center py-8 text-gray-500">Updating prices...</div>
              ) : (
                <div className="space-y-3">
                  {(syncedItems.length > 0 ? syncedItems : cartItems).map((item) => (
                    <Card key={item.id || item.productId} className="overflow-hidden border border-gray-200">
                      <CardContent className="p-0">
                        <div className="flex gap-4 p-4">
                          <div className="w-16 h-16 flex-shrink-0 relative overflow-hidden rounded-xl">
                            <ImageWithFallback
                              src={item.product?.image || ''}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 leading-tight text-sm">
                                  {item.name}
                                </h3>
                                <p className="text-xs text-gray-600">{item.vendor?.name || displayVendor?.name}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-gutzo-selected">
                                  ₹{item.price.toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-500">per bowl</div>
                              </div>
                            </div>
                            {/* Diet Tags */}
                            {getDietTags(item).length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {getDietTags(item).slice(0, 2).map((tag, index) => (
                                  <Badge 
                                    key={index} 
                                    variant="secondary" 
                                    className="text-xs bg-gutzo-highlight/20 text-gutzo-selected"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {/* Quantity Controls */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuantityChange(item.productId || item.id, -1)}
                                  disabled={item.quantity <= 1}
                                  className="h-8 w-8 p-0 rounded-full border-2"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="font-semibold text-sm min-w-[1.5rem] text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuantityChange(item.productId || item.id, 1)}
                                  disabled={item.quantity >= 10}
                                  className="h-8 w-8 p-0 rounded-full border-2"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">
                                  ₹{(item.price * item.quantity).toFixed(2)}
                                </span>
                                {(syncedItems.length > 1 ? syncedItems : cartItems).length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveItem(item.productId || item.id)}
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            {/* GST info per item (included @5%) */}
                            <div className="mt-1 text-right">
                              {(() => {
                                const itemTotal = item.price * item.quantity;
                                const includedGstItem = itemTotal - (itemTotal / (1 + ITEMS_GST_RATE));
                                return (
                                  <span className="text-xs text-gray-500">Incl. GST ({(ITEMS_GST_RATE * 100).toFixed(0)}%): ₹{includedGstItem.toFixed(2)}</span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Delivery Information */}


            {/* Special Instructions */}



            {/* Only one payment button at the bottom for PhonePe integration */}

            {/* Order Summary */}
            <div className="bg-gradient-to-br from-gutzo-highlight/15 to-gutzo-primary/10 rounded-xl p-5 border border-gutzo-primary/20">
              <h4 className="font-medium text-gray-900 mb-4">Order Summary</h4>
              
              <div className="space-y-3 text-sm">
                {(syncedItems.length > 0 ? syncedItems : cartItems).map((item) => (
                  <div key={item.id || item.productId} className="flex justify-between">
                    <span className="text-gray-600">{item.name} × {item.quantity}</span>
                    <span className="font-medium text-gray-900">₹{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery fee (incl. 18% GST)</span>
                  <span className="font-medium text-gray-900">₹{deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform fee (incl. 18% GST)</span>
                  <span className="font-medium text-gray-900">₹{platformFee.toFixed(2)}</span>
                </div>

                <Separator className="my-3" />

                <div className="flex justify-between text-xs text-gray-500">
                  <span>GST included in items @5%</span>
                  <span>₹{includedGstItems.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>GST included in fees @18%</span>
                  <span>₹{includedGstFees.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="font-medium text-gray-900">Total Amount:</span>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gutzo-selected">
                      ₹{totalAmount.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">Includes all charges</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Button */}
          <div className="p-6 border-t border-gray-200 bg-gray-50/50">
            <Button
              onClick={async () => {
                if (cartItems.length === 0 || isProcessing) return;
                const orderId = `ORD_${Date.now()}`;
                const customerId = userPhone || 'guest';
                const amount = totalAmount * 100; // in paise
                const redirectUrl = window.location.origin + '/payment-status';
                try {
                  // Persist order id for status page
                  try { sessionStorage.setItem('last_order_id', orderId); } catch {}
                  const data = await apiService.createPhonePePayment({ amount, orderId, customerId, redirectUrl });
                  console.log('PhonePe payment API response:', data);
                  if (data && data.data && data.data.redirectUrl) {
                    window.location.href = data.data.redirectUrl;
                  } else {
                    alert('Failed to initiate PhonePe payment.');
                  }
                } catch (err) {
                  let message = 'Unknown error';
                  if (err instanceof Error) message = err.message;
                  alert('Error initiating payment: ' + message);
                }
              }}
              disabled={cartItems.length === 0 || isProcessing}
              className="w-full bg-gradient-to-r from-gutzo-primary to-gutzo-primary-hover text-white font-medium py-4 rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing Payment...
                </div>
              ) : cartItems.length > 0 ? (
                <div className="flex items-center justify-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Pay with PhonePe - ₹{totalAmount.toFixed(2)}
                </div>
              ) : (
                'Add items to proceed'
              )}
            </Button>
            <p className="text-xs text-gray-500 text-center mt-3">
              By proceeding, you agree to our Terms & Conditions
            </p>
          </div>
        </div>
      </div>
    </>
  );
}