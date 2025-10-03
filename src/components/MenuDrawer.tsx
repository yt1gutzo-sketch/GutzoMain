import { X, MessageCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from "./ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useState, useEffect, useRef } from "react";
import { apiService } from "../utils/api";
import { toast } from "sonner@2.0.3";
import { Vendor, Product } from "../types";
import { normalizeCategory } from "../utils/vendors";

interface MenuDrawerProps {
  vendor: Vendor | null;
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string;
  loadProducts?: (vendorId: string) => Promise<Product[]>;
}

export function MenuDrawer({ vendor, isOpen, onClose, selectedCategory, loadProducts }: MenuDrawerProps) {
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVendorCategory, setSelectedVendorCategory] = useState<string>("all");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (vendor && isOpen) {
      loadMenuItems();
    }
  }, [vendor, isOpen]);

  const loadMenuItems = async () => {
    if (!vendor) return;
    
    setLoading(true);
    try {
      // Use the provided loadProducts function if available, otherwise fall back to API service
      const items = loadProducts 
        ? await loadProducts(vendor.id)
        : await apiService.getVendorProducts(vendor.id);
      console.log('Loaded menu items:', items);
      setMenuItems(items || []);
    } catch (error) {
      console.error("Failed to load menu items:", error);
      toast.error("Failed to load menu items");
    } finally {
      setLoading(false);
    }
  };

  // Exact category matching only
  const categoryMatches = (productCategory: string, selectedCategory: string): boolean => {
    if (!productCategory) return false;
    
    // Only exact match (case insensitive)
    return productCategory.trim().toLowerCase() === selectedCategory.trim().toLowerCase();
  };

  // Apply category filtering if a specific category is selected
  const globallyFilteredItems = selectedCategory === "All" 
    ? menuItems 
    : menuItems.filter(item => {
        return categoryMatches(item.category || '', selectedCategory);
      });
  
  // Get unique exact categories from globally filtered items (only show categories that have matching items)
  const vendorCategories = [...new Set(globallyFilteredItems.map(item => item.category?.trim() || 'Other'))].sort();
  
  // Apply additional vendor-specific category filtering on top of global filters
  const finalFilteredItems = selectedVendorCategory === "all" 
    ? globallyFilteredItems 
    : globallyFilteredItems.filter(item => (item.category?.trim() || 'Other') === selectedVendorCategory);

  // Show filter status indicator
  const hasActiveFilters = selectedCategory !== "All";
  const originalItemCount = menuItems.length;
  const filteredItemCount = globallyFilteredItems.length;

  // Reset selected vendor category when menu items change or when global filters change
  useEffect(() => {
    setSelectedVendorCategory("all");
  }, [menuItems, selectedCategory]);

  // Scroll to top when category changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [selectedVendorCategory]);

  const getDietTags = (item: Product): string[] => {
    return item.diet_tags || item.tags || [];
  };

  const handleWhatsAppOrder = (item: Product) => {
    if (!vendor || !item.available) {
      if (!item.available) {
        toast.error(`${item.name} is currently sold out`);
      }
      return;
    }
    
    const message = `Hi ${vendor.name}, I'd like to order ${item.name} (₹${item.price}) via Gutzo marketplace`;
    const encodedMessage = encodeURIComponent(message);
    // Remove any special characters from phone number and ensure it starts with country code
    const phoneNumber = vendor.contact_whatsapp.replace(/[^\d+]/g, '');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  if (!vendor) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[85vh] flex flex-col">
        <DrawerHeader className="border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-xl font-semibold">{vendor.name} Menu</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
          <DrawerDescription className="text-gray-600">
            Browse and order items from {vendor.name} via WhatsApp
          </DrawerDescription>
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <span className="text-xs bg-gutzo-primary/10 text-gutzo-primary px-2 py-1 rounded-full font-medium">
                🔍 Filtered: {filteredItemCount} of {originalItemCount} items
              </span>
              <span className="text-xs bg-gutzo-selected/10 text-gutzo-selected px-2 py-1 rounded-full font-medium">
                {selectedCategory}
              </span>
            </div>
          )}
        </DrawerHeader>
        
        <div className="flex flex-col flex-1 min-h-0">
          {loading ? (
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-white rounded-lg border border-gray-200 animate-pulse">
                    <div className="w-20 h-20 bg-gray-300 rounded-lg flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="h-6 bg-gray-300 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2 w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : globallyFilteredItems.length > 0 ? (
            <Tabs value={selectedVendorCategory} onValueChange={setSelectedVendorCategory} className="flex flex-col flex-1 min-h-0">
              {/* Category Tabs - Only show categories that have matching items after global filtering */}
              <div className="px-4 pt-4 pb-2 border-b bg-gray-50 flex-shrink-0">
                <div className="overflow-x-auto scrollbar-hide">
                  <TabsList className="flex gap-2 bg-transparent p-0 h-auto min-w-max">
                    <TabsTrigger 
                      value="all" 
                      className="px-4 py-2 data-[state=active]:bg-[#E7600E] data-[state=active]:text-white border border-gray-200 rounded-full whitespace-nowrap"
                    >
                      All ({globallyFilteredItems.length})
                    </TabsTrigger>
                    {vendorCategories.map((category) => {
                      const categoryCount = globallyFilteredItems.filter(item => (item.category?.trim() || 'Other') === category).length;
                      return (
                        <TabsTrigger 
                          key={category}
                          value={category}
                          className="px-4 py-2 data-[state=active]:bg-[#E7600E] data-[state=active]:text-white border border-gray-200 rounded-full whitespace-nowrap"
                        >
                          {category} ({categoryCount})
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>
              </div>

              {/* Tab Content */}
              <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
                <TabsContent value="all" className="m-0 p-4 h-full">
                  <MenuItemsList 
                    items={globallyFilteredItems} 
                    vendor={vendor} 
                    onWhatsAppOrder={handleWhatsAppOrder}
                    getDietTags={getDietTags}
                  />
                </TabsContent>
                
                {vendorCategories.map((category) => (
                  <TabsContent key={category} value={category} className="m-0 p-4 h-full">
                    <MenuItemsList 
                      items={globallyFilteredItems.filter(item => (item.category?.trim() || 'Other') === category)} 
                      vendor={vendor} 
                      onWhatsAppOrder={handleWhatsAppOrder}
                      getDietTags={getDietTags}
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
      </DrawerContent>
    </Drawer>
  );
}

// Menu Items List Component
interface MenuItemsListProps {
  items: Product[];
  vendor: Vendor;
  onWhatsAppOrder: (item: Product) => void;
  getDietTags: (item: Product) => string[];
}

function MenuItemsList({ items, vendor, onWhatsAppOrder, getDietTags }: MenuItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No items in this category</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {items.map((item) => (
        <div 
          key={item.id} 
          className={`flex gap-4 p-4 bg-white rounded-lg border transition-all duration-200 ${
            item.available 
              ? 'border-gray-200 hover:border-[#E7600E]/30' 
              : 'border-gray-100 bg-gray-50/30 opacity-75'
          }`}
        >
          <div className="w-20 h-20 flex-shrink-0 relative">
            <ImageWithFallback
              src={item.image_url || ''}
              alt={item.name}
              className={`w-full h-full rounded-lg object-cover transition-all duration-200 ${
                item.available ? '' : 'opacity-60 grayscale'
              }`}
            />
            {!item.available && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">
                <span className="text-xs font-medium text-gray-600 bg-white/90 px-2 py-1 rounded shadow-sm">
                  Out of stock
                </span>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <h4 className={`font-medium text-base lg:text-lg transition-colors ${item.available ? '' : 'text-gray-500'}`}>
                {item.name}
              </h4>
              {!item.available && (
                <Badge variant="outline" className="text-xs text-gray-500 border-gray-300 bg-gray-50/80">
                  Sold out
                </Badge>
              )}
            </div>
            
            {item.description && (
              <p className={`text-sm mb-2 line-clamp-2 transition-colors ${item.available ? 'text-gray-600' : 'text-gray-450'}`}>
                {item.description}
              </p>
            )}
            
            <div className="flex flex-wrap gap-1 mb-2">
              {getDietTags(item).map((tag) => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className={`text-xs ${
                    item.available 
                      ? 'bg-[#D9E86F]/20 text-[#026254] border-[#D9E86F]/50' 
                      : 'bg-gray-100 text-gray-400 border-gray-200'
                  }`}
                >
                  {tag}
                </Badge>
              ))}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`font-semibold text-base lg:text-lg transition-colors ${item.available ? 'text-[#026254]' : 'text-gray-450'}`}>
                  ₹{item.price}
                </span>
                {item.category && (
                  <span className={`text-xs px-2 py-1 rounded-full transition-colors ${
                    item.available 
                      ? 'text-gray-500 bg-gray-100' 
                      : 'text-gray-450 bg-gray-75'
                  }`}>
                    {item.category}
                  </span>
                )}
              </div>
              
              <Button
                onClick={() => onWhatsAppOrder(item)}
                disabled={!item.available}
                className={`flex items-center gap-2 rounded-full px-3 lg:px-4 transition-all duration-200 ${
                  item.available
                    ? 'bg-[#E7600E] hover:bg-[#D14808] text-white'
                    : 'bg-gray-150 text-gray-500 cursor-not-allowed hover:bg-gray-150'
                }`}
                size="sm"
              >
                <MessageCircle className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="text-xs lg:text-sm">
                  {item.available ? 'Order' : 'Sold out'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}