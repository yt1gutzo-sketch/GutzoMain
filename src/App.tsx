import { useState, useRef, useEffect } from "react";
import { Header } from "./components/Header";
import { CategoryBar } from "./components/CategoryBar";
import { VendorCard } from "./components/VendorCard";
import { ResponsiveProductDetails } from "./components/ResponsiveProductDetailsFixed";
import { VendorSkeleton } from "./components/VendorSkeleton";
import { VendorCartStrip } from "./components/VendorCartStrip";
import { ComingSoon } from "./components/ComingSoon";
import { Footer } from "./components/Footer";
import { WhatsAppSupport } from "./components/WhatsAppSupport";
import { LocationGate } from "./components/LocationGate";
import { LoginPanel } from "./components/auth/LoginPanel";
import { ProfilePanel } from "./components/auth/ProfilePanel";
import { PaymentSuccessModal } from "./components/PaymentSuccessModal";
import { LocationProvider, useLocation } from "./contexts/LocationContext";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { RouterProvider, useRouter } from "./components/Router";
import { CartPanel } from "./components/CartPanel";
import { InstantOrderPanel } from "./components/InstantOrderPanel";
import { TermsPage } from "./pages/TermsPage";
import { RefundPage } from "./pages/RefundPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import PaymentStatusPage from "./pages/PaymentStatusPage";
import { Toaster } from "./components/ui/sonner";
import { Loader2, MapPin, Plus } from "lucide-react";
import { Vendor } from "./types";
import { useVendors } from "./hooks/useVendors";
import { filterVendors, extractCategoriesFromVendors } from "./utils/vendors";
import { useCart } from "./contexts/CartContext";
import { AddressModal } from "./components/auth/AddressModal";
import { AddressListPanel } from "./components/AddressListPanel";
import { Button } from "./components/ui/button";

function AppContent() {
  const { vendors, loading, loadVendorProducts } = useVendors();
  const { isInCoimbatore, isLoading: locationLoading } = useLocation();
  const { currentRoute } = useRouter();
  const { getCurrentVendor, getVendorItems, clearCart, items } = useCart();
  const { isAuthenticated, isLoading: authLoading, user, login, logout } = useAuth();
  
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [showLocationGate, setShowLocationGate] = useState(false);
  const [showLoginPanel, setShowLoginPanel] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [profilePanelContent, setProfilePanelContent] = useState<'profile' | 'orders' | 'address'>('profile');
  const [profileOrderData, setProfileOrderData] = useState<any>(null);
  const [showCartPanel, setShowCartPanel] = useState(false);
  const [showCheckoutPanel, setShowCheckoutPanel] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
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
  } | null>(null);

  // Address management states
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddressPanel, setShowAddressPanel] = useState(false);
  useEffect(() => {
    console.log('AppContent: showAddressPanel changed:', showAddressPanel);
  }, [showAddressPanel]);

  // Authentication is now handled by AuthContext
  // The old manual validation logic has been replaced with a robust AuthContext system

  // Check if we should show the location gate for non-Coimbatore users
  useEffect(() => {
    //if (!locationLoading && !isInCoimbatore) {
    if(false){
    // Show location gate after a short delay to let user see their location
      const timer = setTimeout(() => {
        setShowLocationGate(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [locationLoading, isInCoimbatore]);

  const listingsRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // Extract categories ONLY from vendor product data - no separate category creation
  const availableCategories = extractCategoriesFromVendors(vendors);
  
  // Debug logging for development
  console.log('Categories extracted from products:', { 
    categories: availableCategories, 
    selectedCategory
  });
  
  const filteredVendors = filterVendors(vendors, selectedCategory);

  const handleCategoryChange = (category: string) => {
    console.log('Category changed to:', category);
    setSelectedCategory(category);
  };

  const handleVendorClick = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsMenuDrawerOpen(true);
  };



  const clearFilters = () => {
    console.log('Clearing all filters');
    setSelectedCategory("All");
  };

  const handleLocationApproved = () => {
    setShowLocationGate(false);
    console.log('User approved access outside Coimbatore');
  };

  const handleAuthComplete = async (authData: any) => {
    try {
      // Login through AuthContext
      await login(authData);
      setShowLoginPanel(false);
      
      // Cart migration is handled automatically by CartContext
      // No need for manual monitoring or redirection
      console.log('✅ Authentication completed successfully');
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      // Keep the login panel open if authentication fails
    }
  };

  const handleShowLogin = () => {
    setShowLoginPanel(true);
  };

  const handleCloseAuth = () => {
    setShowLoginPanel(false);
  };

  const handleShowProfile = (content: 'profile' | 'orders' | 'address') => {
    setProfilePanelContent(content);
    setShowProfilePanel(true);
    // Clear order data if not viewing orders
    if (content !== 'orders') {
      setProfileOrderData(null);
    }
  };

  // Track if we came from checkout for address add
  const [returnToCheckout, setReturnToCheckout] = useState(false);

  const handleCloseProfile = () => {
    setShowProfilePanel(false);
    setProfileOrderData(null);
    if (returnToCheckout) {
      setTimeout(() => {
        setShowCheckoutPanel(true);
        setReturnToCheckout(false);
      }, 250);
    }
  };

  const handleShowCart = () => {
    setShowCartPanel(true);
  };

  const handleCloseCart = () => {
    setShowCartPanel(false);
  };

  const handleShowCheckout = () => {
    setShowCartPanel(false); // Close cart panel
    setShowCheckoutPanel(true); // Open checkout panel
  };

  const handleCloseCheckout = () => {
    setShowCheckoutPanel(false);
  };

  const handleProceedToPayment = (orderData: any) => {
    setCheckoutData(orderData);
    setShowCheckoutPanel(false);
  };

  const handleClosePayment = () => {
    setCheckoutData(null);
  };

  const handleBackToCheckout = () => {
    setShowCheckoutPanel(true);
  };

  const handleLogout = () => {
    logout();
    setShowProfilePanel(false);
  };

  // Payment Success Handlers
  const handlePaymentSuccess = (paymentData: any) => {
    console.log('💳 Payment successful, showing success modal:', paymentData);
    
    // Clear cart after successful payment
    clearCart();
    
    // Generate mock payment data for demo
    const mockPaymentData = {
      paymentDetails: {
        paymentId: `PAY_${Date.now()}`,
        subscriptionId: `ORD_${Date.now()}`,
        method: 'Wallet',
        amount: paymentData?.amount || 565,
        date: new Date().toLocaleDateString('en-IN')
      },
      orderSummary: {
        items: paymentData?.items || 3,
        vendor: paymentData?.vendor || selectedVendor?.name || 'the fruit bowl co',
        orderType: paymentData?.orderType || 'Instant Delivery',
        quantity: paymentData?.quantity || 'bowl',
        estimatedDelivery: paymentData?.estimatedDelivery || '05:30 pm'
      }
    };

    setPaymentSuccessData(mockPaymentData);
    setShowPaymentSuccess(true);
    
    // Close any open panels
    setIsMenuDrawerOpen(false);
    setShowCheckoutPanel(false);
    setShowCartPanel(false);
    setCheckoutData(null);
  };

  const handleClosePaymentSuccess = () => {
    setShowPaymentSuccess(false);
    setPaymentSuccessData(null);
  };

  const handleContinueExploringFromSuccess = () => {
    setShowPaymentSuccess(false);
    setPaymentSuccessData(null);
    setSelectedVendor(null);
    setIsMenuDrawerOpen(false);
  };

  const handleViewOrdersFromSuccess = () => {
    // Always pass the order data to highlight the specific order
    // The OrdersPanel will handle duplicate prevention internally
    if (paymentSuccessData) {
      setProfileOrderData(paymentSuccessData);
    }
    
    setShowPaymentSuccess(false);
    setPaymentSuccessData(null);
    handleShowProfile('orders');
  };

  const handleViewOrderDetailsFromProfile = (orderData: any) => {
    setPaymentSuccessData(orderData);
    setShowPaymentSuccess(true);
    setShowProfilePanel(false);
  };

  // Address management handlers
  const handleAddressAdded = async (address: any) => {
    console.log('✅ Address added successfully:', address);
    setShowAddressModal(false);
    // Refresh addresses if needed
  };

  const handleAddressSelected = (address: any) => {
    console.log('✅ Address selected for delivery:', address);
    setShowAddressPanel(false);
    // Update delivery address context if needed
  };

  const handleShowAddressList = () => {
    if (isAuthenticated) {
      console.log('handleShowAddressList: setting showAddressPanel to true');
      setShowAddressPanel(true);
    } else {
      handleShowLogin();
    }
  };



  // Show loading screen during authentication initialization
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gutzo-primary mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Gutzo</h3>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Route-based rendering

  if (currentRoute === '/T&C') {
    return (
      <div style={{ minHeight: '100vh' }}>
        <TermsPage />
      </div>
    );
  }

  if (currentRoute === '/refund_policy') {
    return (
      <div style={{ minHeight: '100vh' }}>
        <RefundPage />
      </div>
    );
  }

  if (currentRoute === '/privacy_policy') {
    return (
      <div style={{ minHeight: '100vh' }}>
        <PrivacyPage />
      </div>
    );
  }

  if (currentRoute === '/payment-status') {
    return (
      <div style={{ minHeight: '100vh' }}>
        <PaymentStatusPage />
      </div>
    );
  }



  // Show location gate if user is outside Coimbatore and gate should be shown
  if (showLocationGate && !isInCoimbatore) {
    return <LocationGate onLocationApproved={handleLocationApproved} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onShowLogin={handleShowLogin}
        onLogout={handleLogout}
        onShowProfile={handleShowProfile}
        onShowCart={handleShowCart}
        onShowAddressList={handleShowAddressList}
      />

      <div ref={filterRef}>
        <CategoryBar
          selectedCategory={selectedCategory}
          availableCategories={availableCategories}
          onCategoryChange={handleCategoryChange}
        />
      </div>

      {/* Vendor Listings */}
      <main
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8"
        ref={listingsRef}
      >
        {/* Section Header */}
        {!loading && filteredVendors.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                {selectedCategory === "All" 
                  ? `${filteredVendors.length} restaurants to explore` 
                  : `${filteredVendors.length} ${selectedCategory} restaurants`
                }
              </h2>
            </div>
            <p className="text-gray-600 text-sm">
              Fresh and healthy meals delivered to your doorstep
            </p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5 xl:gap-6">
            {[...Array(8)].map((_, i) => (
              <VendorSkeleton key={i} />
            ))}
          </div>
        ) : filteredVendors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5 xl:gap-6">
            {filteredVendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                onClick={handleVendorClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {selectedCategory !== "All" 
                  ? "No vendors match your category" 
                  : "No vendors available yet"
                }
              </h3>
              <p className="text-gray-600 mb-4">
                {selectedCategory !== "All"
                  ? `No vendors found serving ${selectedCategory}`
                  : "We're working on bringing healthy meal vendors to your area"
                }
              </p>
            </div>
            
            {selectedCategory !== "All" && (
              <button
                onClick={clearFilters}
                className="text-gutzo-primary hover:text-gutzo-primary-hover font-medium mb-4 inline-block"
              >
                Clear category filter
              </button>
            )}
            
            <div className="bg-gutzo-highlight/20 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-sm text-gutzo-selected">
                💡 <strong>Tip:</strong> {selectedCategory !== "All" 
                  ? "Try different categories or clear filters to see all available vendors"
                  : "Check back soon for more healthy meal vendors in your area!"
                }
              </p>
            </div>
          </div>
        )}
      </main>

      <ComingSoon />
      <Footer />

      <WhatsAppSupport />


      <ResponsiveProductDetails
        vendor={selectedVendor}
        isOpen={isMenuDrawerOpen}
        onClose={() => setIsMenuDrawerOpen(false)}
        selectedCategory={selectedCategory}
        loadProducts={loadVendorProducts}
        onShowProfile={handleShowProfile}
        onPaymentSuccess={handlePaymentSuccess}
        onShowCart={handleShowCart}
      />

      <Toaster position="top-center" />

      {/* Login Panel - Swiggy Style */}
      <LoginPanel 
        isOpen={showLoginPanel}
        onClose={handleCloseAuth}
        onAuthComplete={handleAuthComplete}
      />

      {/* Profile Panel */}
      <ProfilePanel 
        isOpen={showProfilePanel}
        onClose={handleCloseProfile}
        onLogout={handleLogout}
        content={profilePanelContent}
        userInfo={user ? {
          name: user.name,
          phone: user.phone,
          email: user.email
        } : null}
        onViewOrderDetails={handleViewOrderDetailsFromProfile}
        recentOrderData={profileOrderData}
      />

      {/* Cart Panel */}
      <CartPanel
        isOpen={showCartPanel}
        onClose={handleCloseCart}
        isAuthenticated={isAuthenticated}
        onShowLogin={handleShowLogin}
        onShowCheckout={handleShowCheckout}
      />

      {/* Checkout Panel */}
      <InstantOrderPanel
        isOpen={showCheckoutPanel}
        onClose={handleCloseCheckout}
        cartItems={items}
        onPaymentSuccess={handlePaymentSuccess}
        onAddAddress={() => {
          setShowCheckoutPanel(false);
          setReturnToCheckout(true);
          setTimeout(() => {
            setProfilePanelContent('address');
            setShowProfilePanel(true);
          }, 250);
        }}
      />

      {/* Payment Success Modal */}
      {paymentSuccessData && (
        <PaymentSuccessModal
          isOpen={showPaymentSuccess}
          onClose={handleClosePaymentSuccess}
          paymentDetails={paymentSuccessData.paymentDetails}
          orderSummary={paymentSuccessData.orderSummary}
          onViewOrders={handleViewOrdersFromSuccess}
          onContinueExploring={handleContinueExploringFromSuccess}
        />
      )}

      {/* Address Management Modals */}
      <AddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSave={handleAddressAdded}
      />

      <AddressListPanel
        isOpen={showAddressPanel}
        onClose={() => setShowAddressPanel(false)}
        onSelectAddress={handleAddressSelected}
      />

      {/* Vendor Cart Strip */}
      {(() => {
        const currentVendor = getCurrentVendor();
        if (currentVendor) {
          return (
            <VendorCartStrip
              vendorId={currentVendor.id}
              vendorName={currentVendor.name}
              onViewCart={handleShowCart}
              isDrawerOpen={isMenuDrawerOpen}
              isCartOpen={showCartPanel}
            />
          );
        }
        return null;
      })()}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <LocationProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </LocationProvider>
      </RouterProvider>
    </AuthProvider>
  );
}