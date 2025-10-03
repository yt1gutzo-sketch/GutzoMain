import { X, MessageCircle, Bell, BellOff, RefreshCw, Check, Plus, Minus, ShoppingCart } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from "./ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useState, useEffect, useRef } from "react";
import { apiService } from "../utils/api";
import { toast } from "sonner@2.0.3";
import { Vendor, Product } from "../types";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { useProductSubscriptions } from "../hooks/useProductSubscriptions";
import { useCart } from "../contexts/CartContext";
import { SubscriptionPanel, SubscriptionData } from "./SubscriptionPanel";
import { InstantOrderPanel, InstantOrderData, CartItem } from "./InstantOrderPanel";
import { PaymentPanel, PaymentResult } from "./PaymentPanel";
import { PaymentSuccessPanel } from "./PaymentSuccessPanel";
import { CrossVendorModal } from "./CrossVendorModal";
import { VendorCartStrip } from "./VendorCartStrip";

// Quantity Selector Component
interface QuantitySelectorProps {
  productId: string;
  product: Product;
  vendor: Vendor;
  onShowCart?: () => void;
  onCrossVendorAttempt?: (product: Product, vendor: Vendor) => void;
}

function QuantitySelector({ productId, product, vendor, onShowCart, onCrossVendorAttempt }: QuantitySelectorProps) {
  const { addItem, getItemQuantity, updateQuantityOptimistic, hasItemsFromDifferentVendor } = useCart();
  const quantity = getItemQuantity(productId);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleIncrement = async () => {
    console.log('🔲 Add button clicked:', { 
      productId, 
      productName: product.name, 
      vendorName: vendor.name, 
      quantity 
    });
    
    if (quantity === 0) {
      // Check for cross-vendor scenario
      if (hasItemsFromDifferentVendor(vendor.id)) {
        console.log('🚫 Cross-vendor scenario detected');
        onCrossVendorAttempt?.(product, vendor);
        return;
      }
      
      console.log('➕ Adding new item to cart');
      triggerQuantityAnimation();
      
      try {
        addItem(product, vendor, 1);
        console.log('✅ Item added successfully');
        toast.success(`${product.name} added to cart!`);
      } catch (error) {
        console.error('❌ Error adding item to cart:', error);
        toast.error('Failed to add item to cart');
      }
    } else {
      // Use optimistic update for quantity changes
      console.log('📈 Updating quantity optimistically');
      triggerQuantityAnimation();
      
      try {
        await updateQuantityOptimistic(productId, quantity + 1);
        console.log('✅ Quantity updated successfully');
      } catch (error) {
        console.error('❌ Error updating quantity:', error);
        toast.error('Failed to update quantity');
      }
    }
  };

  const handleDecrement = async () => {
    if (quantity > 1) {
      triggerQuantityAnimation();
      await updateQuantityOptimistic(productId, quantity - 1);
    } else if (quantity === 1) {
      triggerQuantityAnimation();
      await updateQuantityOptimistic(productId, 0); // This will remove the item
    }
  };

  const triggerQuantityAnimation = () => {
    // Clear any existing timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    
    setIsAnimating(true);
    animationTimeoutRef.current = setTimeout(() => setIsAnimating(false), 200);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full">
      {/* Quantity Controls - Always visible */}
{quantity === 0 ? (
        // Show "Add" button when quantity is 0
        <Button
          onClick={handleIncrement}
          className="button-ripple w-full bg-gutzo-primary text-white hover:bg-gutzo-primary-hover rounded-full py-2 transition-all duration-200 active:scale-95"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      ) : (
        // Show quantity controls when quantity > 0
        <div className="flex items-center justify-between bg-gray-50 rounded-full p-1 transition-all duration-300">
          <button
            onClick={handleDecrement}
            className="button-ripple w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all duration-200"
          >
            <Minus className="h-4 w-4 text-gray-600 relative z-10" />
          </button>
          
          <span className={`px-3 font-medium text-gray-900 transition-all duration-200 ${isAnimating ? 'quantity-pulse' : ''}`}>
            {quantity}
          </span>
          
          <button
            onClick={handleIncrement}
            className="button-ripple w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-gutzo-primary/30 hover:text-gutzo-primary transition-all duration-200 active:scale-95"
          >
            <Plus className="h-4 w-4 text-gray-600 hover:text-gutzo-primary transition-colors relative z-10" />
          </button>
        </div>
      )}
    </div>
  );
}

interface ResponsiveProductDetailsProps {
  vendor: Vendor | null;
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string;
  loadProducts?: (vendorId: string) => Promise<Product[]>;
  onShowProfile?: (content: 'profile' | 'orders' | 'address') => void;
  onPaymentSuccess?: (paymentData: any) => void;
  onShowCart?: () => void;
}

export function ResponsiveProductDetails({
  vendor,
  isOpen,
  onClose,
  selectedCategory,
  loadProducts,
  onShowProfile,
  onPaymentSuccess,
  onShowCart
}: ResponsiveProductDetailsProps) {
  const [menuItems, setMenuItems] = useState<Product[]>(vendor?.products || []);
  const { isMobile } = useResponsiveLayout();
  const [selectedVendorCategory, setSelectedVendorCategory] = useState("all");
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Subscription state
  const { getProductSubscription, toggleProductSubscription, getSubscriptionStatus } = useProductSubscriptions();
  const [productSubscriptions, setProductSubscriptions] = useState<Map<string, boolean>>(new Map());
  const [userSubscriptions, setUserSubscriptions] = useState<Map<string, boolean>>(new Map());
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  
  // Panel states
  const [showSubscriptionPanel, setShowSubscriptionPanel] = useState(false);
  const [showInstantOrderPanel, setShowInstantOrderPanel] = useState(false);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [showPaymentSuccessPanel, setShowPaymentSuccessPanel] = useState(false);
  const [selectedProductForSubscription, setSelectedProductForSubscription] = useState<Product | null>(null);
  const [selectedProductForInstantOrder, setSelectedProductForInstantOrder] = useState<Product | null>(null);
  const [pendingSubscriptionData, setPendingSubscriptionData] = useState<SubscriptionData | null>(null);
  const [pendingInstantOrderData, setPendingInstantOrderData] = useState<InstantOrderData | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  
  // Cross-vendor modal state
  const [showCrossVendorModal, setShowCrossVendorModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<{ product: Product; vendor: Vendor } | null>(null);
  
  // Cart context
  const { getCurrentVendor, clearCart, addItem } = useCart();

  // Load menu items when vendor changes
  useEffect(() => {
    if (!vendor) {
      setMenuItems([]);
      return;
    }

    // Always start with vendor's existing products for instant display
    if (vendor.products) {
      setMenuItems(vendor.products);
    }

    // Then update with API data in background if available
    if (loadProducts) {
      loadProducts(vendor.id)
        .then(setMenuItems)
        .catch(error => {
          console.error("Failed to load menu items:", error);
          toast.error("Failed to load menu items");
        });
    }
  }, [vendor, loadProducts]);

  // Disabled subscription loading for now to avoid API errors
  useEffect(() => {
    setSubscriptionLoading(false);
    // Clear any existing subscription data to avoid inconsistent state
    setProductSubscriptions(new Map());
    setUserSubscriptions(new Map());
  }, [vendor, menuItems]);

  const categoryMatches = (productCategory: string, selectedCategory: string): boolean => {
    if (!productCategory) return false;
    return productCategory.trim().toLowerCase() === selectedCategory.trim().toLowerCase();
  };

  const globallyFilteredItems = selectedCategory === "All" 
    ? menuItems 
    : menuItems.filter(item => categoryMatches(item.category || '', selectedCategory));
  
  const vendorCategories = [...new Set(globallyFilteredItems.map(item => item.category?.trim() || 'Other'))].sort();
  
  const hasActiveFilters = selectedCategory !== "All";
  const originalItemCount = menuItems.length;
  const filteredItemCount = globallyFilteredItems.length;

  useEffect(() => {
    setSelectedVendorCategory("all");
  }, [menuItems, selectedCategory]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [selectedVendorCategory]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus the panel when opened (for desktop)
      if (!isMobile && panelRef.current) {
        panelRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isMobile]);

  const getDietTags = (item: Product): string[] => {
    return item.diet_tags || item.tags || [];
  };

  const handleInstantOrder = (item: Product) => {
    if (!vendor || !item.available) {
      if (!item.available) {
        toast.error(`${item.name} is currently sold out`);
      }
      return;
    }
    
    setSelectedProductForInstantOrder(item);
    setShowInstantOrderPanel(true);
  };

  const handleSubscribeClick = (item: Product) => {
    setSelectedProductForSubscription(item);
    setShowSubscriptionPanel(true);
  };

  const handleConfirmSubscription = (subscriptionData: SubscriptionData) => {
    // Store subscription data and navigate to payment
    setPendingSubscriptionData(subscriptionData);
    setShowSubscriptionPanel(false);
    setShowPaymentPanel(true);
  };

  const handlePaymentBack = () => {
    setShowPaymentPanel(false);
    if (pendingSubscriptionData) {
      setShowSubscriptionPanel(true);
    } else if (pendingInstantOrderData) {
      setShowInstantOrderPanel(true);
    }
  };

  const handlePaymentSuccess = async (paymentResult: PaymentResult) => {
    try {
      // Here you would make an API call to create the subscription with payment info
      console.log('Creating subscription with payment:', {
        subscription: pendingSubscriptionData,
        payment: paymentResult
      });
      
      // Store payment result
      setPaymentResult(paymentResult);
      
      // Update local state to show as subscribed
      if (pendingSubscriptionData) {
        setUserSubscriptions(prev => new Map(prev.set(pendingSubscriptionData.productId, true)));
      }
      
      // Close all panels
      setShowPaymentPanel(false);
      setShowPaymentSuccessPanel(false);
      
      // Prepare payment data for the main modal
      const paymentData = {
        amount: paymentResult.amount,
        items: pendingInstantOrderData?.cartItems?.length || 1,
        vendor: vendor?.name,
        orderType: pendingSubscriptionData ? 'Subscription' : 'Instant Delivery',
        quantity: pendingInstantOrderData?.cartItems?.reduce((total, item) => total + item.quantity, 0)?.toString() || '1',
        estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000).toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        })
      };
      
      // Trigger the main payment success modal
      if (onPaymentSuccess) {
        onPaymentSuccess(paymentData);
      }
      
      // Clean up state
      setSelectedProductForSubscription(null);
      setSelectedProductForInstantOrder(null);
      setPendingSubscriptionData(null);
      setPendingInstantOrderData(null);
      
    } catch (error) {
      console.error('Failed to create subscription:', error);
      toast.error('Failed to create subscription. Please try again.');
    }
  };

  const handleInstantOrderConfirm = (orderData: InstantOrderData) => {
    setPendingInstantOrderData(orderData);
    setShowInstantOrderPanel(false);
    setShowPaymentPanel(true);
  };

  const handlePaymentSuccessClose = () => {
    setShowPaymentSuccessPanel(false);
    setSelectedProductForSubscription(null);
    setSelectedProductForInstantOrder(null);
    setPendingSubscriptionData(null);
    setPendingInstantOrderData(null);
    setPaymentResult(null);
    // Show success message
    if (pendingSubscriptionData) {
      const productName = selectedProductForSubscription?.name;
      toast.success(`Successfully subscribed to ${productName}!`);
    } else if (pendingInstantOrderData && pendingInstantOrderData.cartItems) {
      const itemCount = pendingInstantOrderData.cartItems.length;
      const itemText = itemCount === 1 ? 'item' : 'items';
      toast.success(`Successfully ordered ${itemCount} ${itemText}!`);
    }
  };

  const handleViewOrders = () => {
    // Close all panels first
    setShowPaymentSuccessPanel(false);
    setSelectedProductForSubscription(null);
    setSelectedProductForInstantOrder(null);
    setPendingSubscriptionData(null);
    setPendingInstantOrderData(null);
    setPaymentResult(null);
    onClose();
    
    // Open profile panel with orders tab
    if (onShowProfile) {
      onShowProfile('orders');
    }
  };

  const handleSubscriptionToggle = async (item: Product) => {
    try {
      // First get current subscription status
      const currentSubscription = await getProductSubscription(item.id);
      const currentStatus = currentSubscription?.has_subscription ?? false;
      
      // Toggle the subscription
      const updatedSubscription = await toggleProductSubscription(item.id, currentStatus);
      
      // Update local state
      if (updatedSubscription) {
        setProductSubscriptions(prev => new Map(prev.set(item.id, updatedSubscription.has_subscription)));
      }
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
    }
  };

  // Cross-vendor modal handlers
  const handleCrossVendorAttempt = (product: Product, vendor: Vendor) => {
    setPendingProduct({ product, vendor });
    setShowCrossVendorModal(true);
  };

  const handleKeepCart = () => {
    setShowCrossVendorModal(false);
    setPendingProduct(null);
  };

  const handleStartFresh = () => {
    if (pendingProduct) {
      clearCart();
      setTimeout(() => {
        addItem(pendingProduct.product, pendingProduct.vendor, 1);
      }, 0);
    }
    setShowCrossVendorModal(false);
    setPendingProduct(null);
  };

  if (!vendor) return null;

  // Shared content component
  const ContentComponent = ({ className = "" }: { className?: string }) => (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="border-b flex-shrink-0 p-4 lg:p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 
            id="product-details-title"
            className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-[#E7600E] to-[#026254] bg-clip-text text-transparent"
          >
            {vendor.name} Delicious Menu
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="shrink-0 hover:bg-gray-100 focus-ring"
            aria-label="Close menu"
          >
            <X className="h-4 w-4 lg:h-5 lg:w-5" />
          </Button>
        </div>
        <p 
          id="product-details-description"
          className="text-gray-600 text-sm lg:text-base"
        >
          🍽️ Satisfy your cravings with fresh meals from {vendor.name} • Order now for payment
        </p>
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <span className="text-xs bg-gutzo-primary/10 text-gutzo-primary px-2 py-1 rounded-full font-medium">
              🔍 Filtered: {filteredItemCount} of {originalItemCount} items
            </span>
            <span className="text-xs bg-gutzo-selected/10 text-gutzo-selected px-2 py-1 rounded-full font-medium">
              {selectedCategory}
            </span>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex flex-col flex-1 min-h-0">
        {globallyFilteredItems.length > 0 ? (
          <Tabs value={selectedVendorCategory} onValueChange={setSelectedVendorCategory} className="flex flex-col flex-1 min-h-0">
            {/* Category Tabs */}
            <div className="px-4 lg:px-6 pt-4 pb-2 border-b bg-gray-50 flex-shrink-0">
              <div className="overflow-x-auto scrollbar-hide">
                <TabsList className="flex gap-2 bg-transparent p-0 h-auto min-w-max">
                  <TabsTrigger 
                    value="all" 
                    className="px-4 py-2 data-[state=active]:bg-[#E7600E] data-[state=active]:text-white border border-gray-200 rounded-full whitespace-nowrap text-sm"
                  >
                    All ({globallyFilteredItems.length})
                  </TabsTrigger>
                  {vendorCategories.map((category) => {
                    const categoryCount = globallyFilteredItems.filter(item => (item.category?.trim() || 'Other') === category).length;
                    return (
                      <TabsTrigger 
                        key={category}
                        value={category}
                        className="px-4 py-2 data-[state=active]:bg-[#E7600E] data-[state=active]:text-white border border-gray-200 rounded-full whitespace-nowrap text-sm"
                      >
                        {category} ({categoryCount})
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>
            </div>

            {/* Tab Content */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto min-h-0 scrollbar-hide"
              style={{ 
                maxHeight: isMobile ? 'calc(80vh - 200px)' : 'auto',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <TabsContent value="all" className="m-0 p-4 lg:p-6 h-full">
                <MenuItemsList 
                  items={globallyFilteredItems} 
                  vendor={vendor} 
                  onWhatsAppOrder={handleInstantOrder}
                  onSubscribeClick={handleSubscribeClick}
                  onSubscriptionToggle={handleSubscriptionToggle}
                  getSubscriptionStatus={getSubscriptionStatus}
                  getDietTags={getDietTags}
                  subscriptionLoading={subscriptionLoading}
                  productSubscriptions={productSubscriptions}
                  userSubscriptions={userSubscriptions}
                  onShowCart={onShowCart}
                  onCrossVendorAttempt={handleCrossVendorAttempt}
                />
              </TabsContent>
              
              {vendorCategories.map((category) => (
                <TabsContent key={category} value={category} className="m-0 p-4 lg:p-6 h-full">
                  <MenuItemsList 
                    items={globallyFilteredItems.filter(item => (item.category?.trim() || 'Other') === category)} 
                    vendor={vendor} 
                    onWhatsAppOrder={handleInstantOrder}
                    onSubscribeClick={handleSubscribeClick}
                    onSubscriptionToggle={handleSubscriptionToggle}
                    getSubscriptionStatus={getSubscriptionStatus}
                    getDietTags={getDietTags}
                    subscriptionLoading={subscriptionLoading}
                    productSubscriptions={productSubscriptions}
                    userSubscriptions={userSubscriptions}
                    onShowCart={onShowCart}
                    onCrossVendorAttempt={handleCrossVendorAttempt}
                  />
                </TabsContent>
              ))}
            </div>
          </Tabs>
        ) : (
          <div className="flex-1 flex items-center justify-center min-h-0">
            <div className="p-4 text-center">
              {hasActiveFilters ? (
                <>
                  <p className="text-gray-500 mb-2">No menu items match your filters</p>
                  <p className="text-gray-400 text-sm mb-4">
                    {vendor.name} doesn't have items in the {selectedCategory} category
                  </p>
                  <div className="bg-gutzo-highlight/20 rounded-lg p-4 max-w-sm mx-auto">
                    <p className="text-sm text-gutzo-selected">
                      💡 <strong>Tip:</strong> Try different filter combinations or clear filters to see all available items from {vendor.name}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-500 mb-2">No menu items available</p>
                  <p className="text-gray-400 text-sm">Check back later for delicious offerings!</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Mobile: Bottom Sheet
  if (isMobile) {
    return (
      <>
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="max-h-[80vh] flex flex-col mobile-safe-area mobile-product-scroll">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{vendor.name} Menu</DrawerTitle>
              <DrawerDescription>Browse and order items from {vendor.name}</DrawerDescription>
            </DrawerHeader>
            <ContentComponent />
          </DrawerContent>
        </Drawer>

        {/* Subscription Panel for Mobile */}
        <SubscriptionPanel
          isOpen={showSubscriptionPanel}
          onClose={() => {
            setShowSubscriptionPanel(false);
            setSelectedProductForSubscription(null);
          }}
          product={selectedProductForSubscription}
          vendor={vendor}
          onConfirmSubscription={handleConfirmSubscription}
        />

        {/* Instant Order Panel for Mobile */}
        <InstantOrderPanel
          isOpen={showInstantOrderPanel}
          onClose={() => {
            setShowInstantOrderPanel(false);
            setSelectedProductForInstantOrder(null);
          }}
          product={selectedProductForInstantOrder}
          vendor={vendor}
          onConfirmOrder={handleInstantOrderConfirm}
        />

        {/* Payment Panel for Mobile */}
        <PaymentPanel
          isOpen={showPaymentPanel}
          onClose={() => {
            setShowPaymentPanel(false);
            setSelectedProductForSubscription(null);
            setSelectedProductForInstantOrder(null);
            setPendingSubscriptionData(null);
            setPendingInstantOrderData(null);
          }}
          onBack={handlePaymentBack}
          subscriptionData={pendingSubscriptionData}
          instantOrderData={pendingInstantOrderData}
          product={selectedProductForSubscription || selectedProductForInstantOrder}
          vendor={vendor}
          onPaymentSuccess={handlePaymentSuccess}
        />

        {/* Payment Success Panel for Mobile */}
        <PaymentSuccessPanel
          isOpen={showPaymentSuccessPanel}
          onClose={handlePaymentSuccessClose}
          subscriptionData={pendingSubscriptionData}
          instantOrderData={pendingInstantOrderData}
          product={selectedProductForSubscription || selectedProductForInstantOrder}
          vendor={vendor}
          paymentResult={paymentResult}
          onViewOrders={handleViewOrders}
        />

        {/* Cross Vendor Modal for Mobile */}
        <CrossVendorModal
          isOpen={showCrossVendorModal}
          onClose={handleKeepCart}
          currentVendorName={getCurrentVendor()?.name || ''}
          newVendorName={vendor.name}
          onKeepCart={handleKeepCart}
          onStartFresh={handleStartFresh}
        />
      </>
    );
  }

  // Desktop: Right Side Panel
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 product-details-backdrop"
          onClick={onClose}
          aria-label="Close product details"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onClose();
            }
          }}
        />
      )}
      
      {/* Side Panel */}
      <div 
        ref={panelRef}
        className={`fixed top-0 right-0 h-full w-[95%] max-w-lg lg:w-[50%] lg:max-w-[600px] bg-white product-details-panel z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-details-title"
        aria-describedby="product-details-description"
        tabIndex={-1}
      >
        <ContentComponent className="h-full" />
      </div>

      {/* Subscription Panel */}
      <SubscriptionPanel
        isOpen={showSubscriptionPanel}
        onClose={() => {
          setShowSubscriptionPanel(false);
          setSelectedProductForSubscription(null);
        }}
        product={selectedProductForSubscription}
        vendor={vendor}
        onConfirmSubscription={handleConfirmSubscription}
      />

      {/* Instant Order Panel */}
      <InstantOrderPanel
        isOpen={showInstantOrderPanel}
        onClose={() => {
          setShowInstantOrderPanel(false);
          setSelectedProductForInstantOrder(null);
        }}
        product={selectedProductForInstantOrder}
        vendor={vendor}
        onConfirmOrder={handleInstantOrderConfirm}
      />

      {/* Payment Panel */}
      <PaymentPanel
        isOpen={showPaymentPanel}
        onClose={() => {
          setShowPaymentPanel(false);
          setSelectedProductForSubscription(null);
          setSelectedProductForInstantOrder(null);
          setPendingSubscriptionData(null);
          setPendingInstantOrderData(null);
        }}
        onBack={handlePaymentBack}
        subscriptionData={pendingSubscriptionData}
        instantOrderData={pendingInstantOrderData}
        product={selectedProductForSubscription || selectedProductForInstantOrder}
        vendor={vendor}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Payment Success Panel */}
      <PaymentSuccessPanel
        isOpen={showPaymentSuccessPanel}
        onClose={handlePaymentSuccessClose}
        subscriptionData={pendingSubscriptionData}
        instantOrderData={pendingInstantOrderData}
        product={selectedProductForSubscription || selectedProductForInstantOrder}
        vendor={vendor}
        paymentResult={paymentResult}
        onViewOrders={handleViewOrders}
      />

      {/* Cross Vendor Modal */}
      <CrossVendorModal
        isOpen={showCrossVendorModal}
        onClose={handleKeepCart}
        currentVendorName={getCurrentVendor()?.name || ''}
        newVendorName={vendor.name}
        onKeepCart={handleKeepCart}
        onStartFresh={handleStartFresh}
      />
    </>
  );
}

// Individual Item Card Component
interface ItemCardProps {
  item: Product;
  vendor: Vendor;
  onSubscribeClick: (item: Product) => void;
  getDietTags: (item: Product) => string[];
  subscriptionLoading: boolean;
  userSubscriptions: Map<string, boolean>;
  onShowCart?: () => void;
  onCrossVendorAttempt?: (product: Product, vendor: Vendor) => void;
}

function ItemCard({ 
  item, 
  vendor, 
  onSubscribeClick, 
  getDietTags, 
  subscriptionLoading, 
  userSubscriptions, 
  onShowCart,
  onCrossVendorAttempt 
}: ItemCardProps) {

  return (
    <div 
      className={`flex gap-4 lg:gap-6 p-4 lg:p-6 bg-white rounded-xl lg:rounded-2xl border border-gray-200 transition-all duration-300 hover:shadow-md hover:border-gutzo-primary/20 group ${
        !item.available ? 'opacity-75 bg-gray-50' : ''
      }`}
    >
      <div className="w-20 h-20 lg:w-24 lg:h-24 flex-shrink-0 relative overflow-hidden rounded-xl lg:rounded-2xl">
        <ImageWithFallback
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover"
        />
        {!item.available && (
          <div className="absolute inset-0 bg-gray-900/50 z-10 flex items-center justify-center">
            <span className="text-white text-xs font-medium px-2 py-1 bg-red-500 rounded">
              Sold Out
            </span>
          </div>
        )}
        {item.available && (
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-2 h-2 bg-[#026254] rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <h4 className={`font-semibold text-base lg:text-lg transition-colors leading-tight ${item.available ? 'text-gray-900' : 'text-gray-500'}`}>
              {item.name}
            </h4>
            {item.available && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-[#E7600E] font-medium">Fresh & Ready</span>
                <div className="w-1 h-1 bg-[#026254] rounded-full"></div>
              </div>
            )}
          </div>
          {!item.available && (
            <Badge variant="outline" className="text-xs text-gray-500 border-gray-300 bg-gray-50/80 shrink-0">
              Sold out
            </Badge>
          )}
        </div>
        
        {item.description && (
          <p className={`text-sm mb-3 leading-relaxed ${item.available ? 'text-gray-600' : 'text-gray-500'}`}>
            {item.description}
          </p>
        )}
        
        {/* Diet Tags */}
        {getDietTags(item).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {getDietTags(item).slice(0, 3).map((tag, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className={`text-xs ${item.available ? 'bg-[#D9E86F]/20 text-[#026254]' : 'bg-gray-100 text-gray-500'}`}
              >
                {tag}
              </Badge>
            ))}
            {getDietTags(item).length > 3 && (
              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                +{getDietTags(item).length - 3} more
              </Badge>
            )}
          </div>
        )}



        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`font-bold text-lg ${item.available ? 'text-[#026254]' : 'text-gray-500'}`}>
              ₹{item.price}
            </span>
            {item.available && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                per bowl
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Subscribe Button */}
            {item.available && (
              <Button
                onClick={() => onSubscribeClick(item)}
                disabled={subscriptionLoading || userSubscriptions.get(item.id)}
                variant="outline"
                className={`text-xs px-3 py-2 h-auto rounded-full transition-all duration-300 ${
                  !item.available
                    ? 'bg-gray-150 text-gray-500 border-gray-300 cursor-not-allowed hover:bg-gray-150 hover:scale-100'
                    : userSubscriptions.get(item.id)
                    ? 'bg-gutzo-selected/10 text-gutzo-selected border-gutzo-selected cursor-default hover:scale-100'
                    : 'bg-white text-gutzo-primary border-gutzo-primary hover:bg-gutzo-primary/5 hover:shadow-lg'
                }`}
                size="sm"
              >
                {userSubscriptions.get(item.id) ? (
                  <>
                    <Check className="h-3 w-3" />
                    <span className="font-medium">
                      Subscribed ✅
                    </span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3" />
                    <span className="font-medium">
                      {subscriptionLoading ? 'Loading...' : 'Subscribe'}
                    </span>
                  </>
                )}
              </Button>
            )}

            {/* Quantity Selector */}
            {!item.available ? (
              <Button
                disabled
                className="bg-gray-150 text-gray-500 cursor-not-allowed w-full rounded-full px-3 lg:px-4 py-2"
                size="sm"
              >
                <span className="text-sm font-medium">Sold out</span>
              </Button>
            ) : (
              <QuantitySelector
                productId={item.id}
                product={item}
                vendor={vendor}
                onCrossVendorAttempt={onCrossVendorAttempt}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Menu Items List Component - Same as before but with responsive enhancements
interface MenuItemsListProps {
  items: Product[];
  vendor: Vendor;
  onWhatsAppOrder: (item: Product) => void;
  onSubscribeClick: (item: Product) => void;
  onSubscriptionToggle: (item: Product) => void;
  getSubscriptionStatus: (productId: string) => boolean;
  getDietTags: (item: Product) => string[];
  subscriptionLoading: boolean;
  productSubscriptions: Map<string, boolean>;
  userSubscriptions: Map<string, boolean>;
  onShowCart?: () => void;
  onCrossVendorAttempt?: (product: Product, vendor: Vendor) => void;
}

function MenuItemsList({
  items,
  vendor,
  onWhatsAppOrder,
  onSubscribeClick,
  onSubscriptionToggle,
  getSubscriptionStatus,
  getDietTags,
  subscriptionLoading,
  productSubscriptions,
  userSubscriptions,
  onShowCart,
  onCrossVendorAttempt
}: MenuItemsListProps) {

  
  return (
    <div className="space-y-4 lg:space-y-6">
      {items.map((item) => (
        <ItemCard 
          key={item.id}
          item={item}
          vendor={vendor}
          onSubscribeClick={onSubscribeClick}
          getDietTags={getDietTags}
          subscriptionLoading={subscriptionLoading}
          userSubscriptions={userSubscriptions}
          onShowCart={onShowCart}
          onCrossVendorAttempt={onCrossVendorAttempt}
        />
      ))}
      

    </div>
  );
}