import { X, CheckCircle, Download, MessageCircle, Package, ArrowRight, Clock, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import exampleImage from 'figma:asset/fcb24fa41bbe22449e0b736155687dc6b7080088.png';

interface PaymentDetails {
  paymentId: string;
  subscriptionId: string;
  method: string;
  amount: number;
  date: string;
}

interface OrderSummary {
  items: number;
  vendor: string;
  orderType: string;
  quantity: string;
  estimatedDelivery: string;
}

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentDetails: PaymentDetails;
  orderSummary: OrderSummary;
  onViewOrders?: () => void;
  onContinueExploring?: () => void;
}

export function PaymentSuccessModal({
  isOpen,
  onClose,
  paymentDetails,
  orderSummary,
  onViewOrders,
  onContinueExploring
}: PaymentSuccessModalProps) {
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [showMainContent, setShowMainContent] = useState(false);

  // Animation sequence when modal opens
  useEffect(() => {
    if (isOpen) {
      // Show success banner first
      const bannerTimer = setTimeout(() => {
        setShowSuccessBanner(true);
      }, 300);

      // Show main content after banner
      const contentTimer = setTimeout(() => {
        setShowMainContent(true);
      }, 800);

      return () => {
        clearTimeout(bannerTimer);
        clearTimeout(contentTimer);
      };
    } else {
      setShowSuccessBanner(false);
      setShowMainContent(false);
    }
  }, [isOpen]);

  // Handle modal close
  const handleClose = () => {
    setShowSuccessBanner(false);
    setShowMainContent(false);
    setTimeout(onClose, 200);
  };

  const handleContinueExploring = () => {
    handleClose();
    if (onContinueExploring) {
      onContinueExploring();
    }
  };

  const handleViewOrders = () => {
    handleClose();
    if (onViewOrders) {
      onViewOrders();
    }
  };

  const handleDownloadReceipt = () => {
    // Mock receipt download
    console.log('📄 Downloading receipt for payment:', paymentDetails.paymentId);
    // In real implementation, this would trigger a download
  };

  const handleContactSupport = () => {
    // Mock contact support
    console.log('📞 Contacting support for order:', paymentDetails.subscriptionId);
    // In real implementation, this would open support chat/WhatsApp
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl transform transition-all duration-300 scale-100">
        
        {/* Success Banner */}
        <div className={`relative overflow-hidden transition-all duration-500 ${
          showSuccessBanner ? 'h-16 opacity-100' : 'h-0 opacity-0'
        }`}>
          <div className="bg-gradient-to-r from-gutzo-selected to-gutzo-selected/90 p-4 flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-white" />
              <div>
                <p className="font-medium text-sm">Payment Successful!</p>
                <p className="text-xs opacity-90">Your subscription is now active</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className={`transition-all duration-500 ${
          showMainContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="max-h-[calc(90vh-4rem)] overflow-y-auto">
            
            {/* Hero Visual Section - Delivery Illustration */}
            <div className="relative bg-gradient-to-br from-gutzo-primary/10 via-orange-50 to-gutzo-highlight/20 px-6 pt-6 pb-4">
              <div className="text-center space-y-4">
                {/* Animated Delivery Illustration */}
                <div className="relative w-32 h-32 mx-auto mb-4">
                  {/* Background Circle */}
                  <div className="absolute inset-0 bg-white/80 rounded-full shadow-lg"></div>
                  
                  {/* Delivery Person on Bike - CSS Illustration */}
                  <div className="absolute inset-4 flex items-center justify-center">
                    <div className="relative">
                      {/* Bike */}
                      <div className="flex items-center space-x-1">
                        {/* Back Wheel */}
                        <div className="w-4 h-4 border-2 border-gutzo-primary rounded-full animate-spin"></div>
                        {/* Bike Body */}
                        <div className="w-6 h-3 bg-gutzo-primary rounded-sm relative">
                          {/* Delivery Box */}
                          <div className="absolute -top-2 -right-1 w-3 h-3 bg-gutzo-selected rounded-sm">
                            <div className="absolute inset-0.5 bg-white rounded-sm flex items-center justify-center">
                              <div className="w-1 h-1 bg-gutzo-primary rounded-full"></div>
                            </div>
                          </div>
                        </div>
                        {/* Front Wheel */}
                        <div className="w-4 h-4 border-2 border-gutzo-primary rounded-full animate-spin"></div>
                      </div>
                      
                      {/* Delivery Person */}
                      <div className="absolute -top-3 left-2">
                        {/* Head */}
                        <div className="w-2 h-2 bg-orange-300 rounded-full"></div>
                        {/* Body */}
                        <div className="w-1 h-3 bg-orange-400 rounded-sm mx-auto"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Motion Lines */}
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <div className="space-y-1">
                      <div className="w-6 h-0.5 bg-gutzo-primary/30 rounded animate-pulse"></div>
                      <div className="w-4 h-0.5 bg-gutzo-primary/20 rounded animate-pulse delay-75"></div>
                      <div className="w-3 h-0.5 bg-gutzo-primary/10 rounded animate-pulse delay-150"></div>
                    </div>
                  </div>
                </div>

                {/* Order Status & Timer */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Your Order is On the Way! 🍽️</h2>
                  <p className="text-sm text-gray-600 mb-3">
                    Arriving in <span className="font-medium text-gutzo-primary">{orderSummary.estimatedDelivery}</span>
                  </p>
                  
                  {/* Live Timer */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 mx-4">
                    <div className="flex items-center justify-center space-x-2">
                      <Clock className="h-4 w-4 text-gutzo-primary animate-pulse" />
                      <span className="text-sm font-medium text-gray-800">
                        Preparing your healthy meal...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Progress Steps */}
            <div className="px-6 py-4 bg-white">
              <div className="space-y-4">
                {/* Step 1: Order Confirmed */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gutzo-selected rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">Order Confirmed</p>
                    <p className="text-xs text-gutzo-selected">Payment successful • Just now</p>
                  </div>
                </div>

                {/* Step 2: Being Prepared */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center animate-pulse">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">Being Prepared</p>
                    <p className="text-xs text-orange-600">Your fresh meal is being prepared</p>
                  </div>
                </div>

                {/* Step 3: Out for Delivery */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-500 text-sm">Out for Delivery</p>
                    <p className="text-xs text-gray-400">Will be on the way soon</p>
                  </div>
                </div>

                {/* Step 4: Delivered */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-500 text-sm">Delivered</p>
                    <p className="text-xs text-gray-400">Enjoy your meal!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Details Card */}
            <div className="px-6 pb-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 text-sm">Order Details</h3>
                  <span className="text-xs text-gray-500">#{paymentDetails.subscriptionId.slice(-6)}</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{orderSummary.items} items from</span>
                    <span className="font-medium text-gray-900">{orderSummary.vendor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order type:</span>
                    <span className="font-medium text-gray-900">{orderSummary.orderType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total paid:</span>
                    <span className="font-medium text-gutzo-primary">₹{paymentDetails.amount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="px-6 pb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 text-sm mb-1">Delivery Address</h4>
                    <p className="text-sm text-blue-800">
                      Your order will be delivered to your saved address
                    </p>
                    <div className="flex items-center text-xs text-blue-700 mt-2">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>Expected by {orderSummary.estimatedDelivery} today</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 pb-6 space-y-3">
              {/* Primary Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleViewOrders}
                  className="bg-gutzo-selected hover:bg-gutzo-selected-hover text-white h-12 flex items-center justify-center space-x-2"
                >
                  <Package className="h-4 w-4" />
                  <span className="text-sm">View Order</span>
                </Button>
                <Button
                  onClick={handleContactSupport}
                  variant="outline"
                  className="flex items-center justify-center space-x-2 h-12 border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-sm">Call Support</span>
                </Button>
              </div>

              {/* Secondary Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleDownloadReceipt}
                  variant="outline"
                  className="flex items-center justify-center space-x-2 h-10 border-gray-300 text-gray-600"
                >
                  <Download className="h-4 w-4" />
                  <span className="text-sm">Receipt</span>
                </Button>
                <Button
                  onClick={handleContinueExploring}
                  variant="outline"
                  className="flex items-center justify-center space-x-2 h-10 border-gutzo-primary text-gutzo-primary hover:bg-gutzo-primary/5"
                >
                  <span className="text-sm">Order Again</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Thank You Message */}
            <div className="text-center pb-6 px-6">
              <div className="bg-gutzo-highlight/20 rounded-lg p-3">
                <p className="text-sm text-gray-700 font-medium">
                  🌱 Thank you for choosing healthy with Gutzo!
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Your support helps us bring fresh, nutritious meals to Coimbra
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}