import { X, MessageCircle, Bell, BellOff, RefreshCw, Check } from "lucide-react";
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
import { SubscriptionPanel, SubscriptionData } from "./SubscriptionPanel";
import { InstantOrderPanel, InstantOrderData } from "./InstantOrderPanel";
import { PaymentPanel, PaymentResult } from "./PaymentPanel";
import { PaymentSuccessPanel } from "./PaymentSuccessPanel";


interface ResponsiveProductDetailsProps {
  vendor: Vendor | null;
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string;
  loadProducts?: (vendorId: string) => Promise<Product[]>;
  onShowProfile?: (content: 'profile' | 'orders' | 'address') => void;
}

export function ResponsiveProductDetails({ 
  vendor, 
  isOpen, 
  onClose, 
  selectedCategory, 
  loadProducts,
  onShowProfile 
}: ResponsiveProductDetailsProps) {
  const { isMobile } = useResponsiveLayout();
  const { getProductSubscription, toggleProductSubscription, getSubscriptionStatus, loading: subscriptionLoading } = useProductSubscriptions();
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [productSubscriptions, setProductSubscriptions] = useState<Map<string, boolean>>(new Map());
  const [userSubscriptions, setUserSubscriptions] = useState<Map<string, boolean>>(new Map()); // Track user's subscriptions
  const [loading, setLoading] = useState(false);
  const [selectedVendorCategory, setSelectedVendorCategory] = useState<string>("all");
  const [showSubscriptionPanel, setShowSubscriptionPanel] = useState(false);
  const [showInstantOrderPanel, setShowInstantOrderPanel] = useState(false);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [showPaymentSuccessPanel, setShowPaymentSuccessPanel] = useState(false);
  const [selectedProductForSubscription, setSelectedProductForSubscription] = useState<Product | null>(null);
  const [selectedProductForInstantOrder, setSelectedProductForInstantOrder] = useState<Product | null>(null);
  const [pendingSubscriptionData, setPendingSubscriptionData] = useState<SubscriptionData | null>(null);
  const [pendingInstantOrderData, setPendingInstantOrderData] = useState<InstantOrderData | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (vendor && isOpen) {
      loadMenuItems();
    }
  }, [vendor, isOpen]);

  const loadMenuItems = async () => {
    if (!vendor) return;
    
    setLoading(true);
    try {
      const items = loadProducts 
        ? await loadProducts(vendor.id)
        : await apiService.getVendorProducts(vendor.id);
      console.log('Loaded menu items:', items);
      setMenuItems(items || []);
      
      // Load subscription availability for each product
      if (items && items.length > 0) {
        console.log('Loading subscription availability for products...');
        const subscriptionMap = new Map<string, boolean>();
        
        await Promise.all(items.map(async (item) => {
          try {
            const subscription = await getProductSubscription(item.id);
            // For now, enable subscription for all products for testing
            subscriptionMap.set(item.id, true); // subscription?.has_subscription ?? true
          } catch (error) {
            console.warn(`Failed to load subscription status for product ${item.id}:`, error);
            subscriptionMap.set(item.id, true); // Default to true for testing
          }
        }));
        
        setProductSubscriptions(subscriptionMap);
        console.log('Product subscription availability loaded:', subscriptionMap.size, 'products');
      }
    } catch (error) {
      console.error("Failed to load menu items:", error);
      toast.error("Failed to load menu items");
    } finally {
      setLoading(false);
    }
  };

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

    const phoneNumber = vendor.contact_whatsapp.replace(/[^\d+]/g, '');

    
    // Save the instant order
    try {
      saveInstantOrder(item, vendor, 1);
      toast.success(`Order saved! Opening WhatsApp to complete...`);
    } catch (error) {
      console.error('Error saving instant order:', error);
    }
    
    window.open(whatsappUrl, '_blank');
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
      
      // Navigate to success screen
      setShowPaymentPanel(false);
      setShowPaymentSuccessPanel(true);
      
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
    const productName = selectedProductForSubscription?.name || selectedProductForInstantOrder?.name;
    const orderType = selectedProductForSubscription ? 'subscription' : 'order';
    toast.success(`Successfully ${orderType === 'subscription' ? 'subscribed to' : 'ordered'} ${productName}!`);
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
          🍽️ Satisfy your cravings with fresh meals from {vendor.name} • Order via WhatsApp
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
        {loading ? (
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4 lg:gap-6 p-4 lg:p-6 bg-white rounded-xl lg:rounded-2xl border border-gray-200 animate-pulse">
                  <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gray-300 rounded-xl lg:rounded-2xl flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="h-6 lg:h-7 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 lg:h-5 bg-gray-200 rounded mb-2 w-3/4"></div>
                    <div className="h-4 lg:h-5 bg-gray-200 rounded mb-3 w-1/2"></div>
                    <div className="h-8 lg:h-10 bg-gray-300 rounded-full w-24 lg:w-32"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : globallyFilteredItems.length > 0 ? (
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
                  onWhatsAppOrder={handleWhatsAppOrder}
                  onSubscribeClick={handleSubscribeClick}
                  onSubscriptionToggle={handleSubscriptionToggle}
                  getSubscriptionStatus={getSubscriptionStatus}
                  getDietTags={getDietTags}
                  subscriptionLoading={subscriptionLoading}
                  productSubscriptions={productSubscriptions}
                  userSubscriptions={userSubscriptions}
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
        className={`fixed top-0 right-0 h-full w-[40%] min-w-[400px] max-w-[600px] xl:min-w-[480px] bg-white product-details-panel z-50 ${
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
    </>
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
}

function MenuItemsList({ items, vendor, onWhatsAppOrder, onSubscribeClick, onSubscriptionToggle, getSubscriptionStatus, getDietTags, subscriptionLoading, productSubscriptions, userSubscriptions }: MenuItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No items in this category</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:gap-6 pb-4">
      {items.map((item) => (
        <div 
          key={item.id} 
          className={`group flex gap-4 lg:gap-6 p-4 lg:p-6 bg-white rounded-xl lg:rounded-2xl border transition-all duration-300 hover:shadow-lg ${
            item.available 
              ? 'border-gray-200 hover:border-[#E7600E]/30 hover:shadow-[#E7600E]/10' 
              : 'border-gray-100 bg-gray-50/30 opacity-75'
          }`}
        >
          <div className="w-20 h-20 lg:w-24 lg:h-24 flex-shrink-0 relative overflow-hidden rounded-xl lg:rounded-2xl">
            <ImageWithFallback
              src={item.image_url || ''}
              alt={item.name}
              className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-110 ${
                item.available ? '' : 'opacity-60 grayscale'
              }`}
            />
            {!item.available && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl lg:rounded-2xl backdrop-blur-sm">
                <span className="text-xs font-medium text-gray-700 bg-white/95 px-3 py-1.5 rounded-full shadow-sm">
                  Out of stock
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
              <p className={`text-sm lg:text-base mb-3 line-clamp-2 transition-colors leading-relaxed ${item.available ? 'text-gray-700' : 'text-gray-450'}`}>
                {item.description}
              </p>
            )}
            
            <div className="flex flex-wrap gap-2 mb-4">
              {getDietTags(item).map((tag) => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className={`text-xs font-medium px-2.5 py-1 rounded-full transition-all duration-200 ${
                    item.available 
                      ? 'bg-[#D9E86F]/30 text-[#026254] border-[#D9E86F]/60 hover:bg-[#D9E86F]/40' 
                      : 'bg-gray-100 text-gray-400 border-gray-200'
                  }`}
                >
                  {tag}
                </Badge>
              ))}
              {item.available && (
                <Badge 
                  variant="secondary" 
                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#E7600E]/10 text-[#E7600E] border-[#E7600E]/20"
                >
                  ⚡ Popular
                </Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-lg lg:text-xl transition-colors ${item.available ? 'text-[#026254]' : 'text-gray-450'}`}>
                    ₹{item.price}
                  </span>
                  {item.available && (
                    <span className="text-xs text-gray-500 line-through">
                      ₹{Math.round(item.price * 1.2)}
                    </span>
                  )}
                </div>
                {item.category && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors w-fit ${
                    item.available 
                      ? 'text-gray-600 bg-gray-100/80' 
                      : 'text-gray-450 bg-gray-75'
                  }`}>
                    {item.category}
                  </span>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                {/* Subscribe Button - Only show if product has subscription enabled */}
                {productSubscriptions.get(item.id) === true && (
                  <Button
                    onClick={() => userSubscriptions.get(item.id) ? undefined : onSubscribeClick(item)}
                    disabled={subscriptionLoading || !item.available || userSubscriptions.get(item.id)}
                    variant="outline"
                    className={`flex items-center justify-center gap-2 rounded-full px-3 lg:px-4 py-1.5 transition-all duration-300 transform hover:scale-105 border-2 w-full text-xs ${
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

                {/* Order Now Button */}
                <Button
                  onClick={() => onWhatsAppOrder(item)}
                  disabled={!item.available}
                  className={`flex items-center justify-center gap-2 rounded-full px-3 lg:px-4 py-2 transition-all duration-300 transform hover:scale-105 w-full ${
                    item.available
                      ? 'bg-gradient-to-r from-[#E7600E] to-[#F77B1C] hover:from-[#D14808] hover:to-[#E7600E] text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-150 text-gray-500 cursor-not-allowed hover:bg-gray-150 hover:scale-100'
                  }`}
                  size="sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {item.available ? 'Order Now' : 'Sold out'}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}