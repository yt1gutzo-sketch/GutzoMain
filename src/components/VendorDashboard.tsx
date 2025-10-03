import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { VendorRegistrationForm } from "./VendorRegistrationForm";
import { ProductManagementForm } from "./ProductManagementForm";
import { VendorOnboardingGuide } from "./VendorOnboardingGuide";
import { apiService } from "../utils/api";
import { toast } from "sonner@2.0.3";
import { 
  Store, 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  MapPin,
  Phone,
  Star,
  IndianRupee
} from "lucide-react";
import { Vendor, Product } from "../types";

export function VendorDashboard() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorProducts, setVendorProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("vendors");

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    if (selectedVendor) {
      loadVendorProducts(selectedVendor.id);
    }
  }, [selectedVendor]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const data = await apiService.getVendors();
      setVendors(data || []);
    } catch (error) {
      console.error("Failed to load vendors:", error);
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  const loadVendorProducts = async (vendorId: string) => {
    try {
      setProductsLoading(true);
      const products = await apiService.getVendorProducts(vendorId);
      setVendorProducts(products || []);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error("Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  };

  const handleVendorCreated = (newVendor: Vendor) => {
    setVendors(prev => [newVendor, ...prev]);
    setSelectedVendor(newVendor);
    setActiveTab("products");
    toast.success("Vendor created! Now add some products to your menu.");
  };

  const handleProductCreated = (newProduct: Product) => {
    setVendorProducts(prev => [newProduct, ...prev]);
    toast.success("Product added successfully!");
  };

  const handleVendorSelect = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setActiveTab("products");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="bg-gutzo-primary/10 border border-gutzo-primary/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Store className="h-5 w-5 text-gutzo-primary" />
              <h2 className="text-lg font-semibold text-gutzo-primary">For Food Vendors Only</h2>
            </div>
            <p className="text-gutzo-primary/80 text-sm">
              This area is exclusively for food vendors who want to list their healthy meal options on Gutzo marketplace. 
              If you're a customer looking to order food, please go back to the main marketplace.
            </p>
          </div>
          
          <h1 className="text-3xl font-bold text-gutzo-primary mb-2">Vendor Management</h1>
          <p className="text-gray-600">
            Register your business and manage your menu items for the Gutzo marketplace
          </p>
        </div>

        <VendorOnboardingGuide 
          hasVendors={vendors.length > 0}
          selectedVendorHasProducts={vendorProducts.length > 0}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-2">
            <TabsTrigger value="vendors" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Manage Vendors
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Manage Products
            </TabsTrigger>
          </TabsList>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vendor Registration Form */}
              <div>
                <VendorRegistrationForm onSuccess={handleVendorCreated} />
              </div>

              {/* Existing Vendors List */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Store className="h-5 w-5" />
                      Existing Vendors
                    </CardTitle>
                    <CardDescription>
                      Click on a vendor to manage their products
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-16 bg-gray-200 rounded-lg"></div>
                          </div>
                        ))}
                      </div>
                    ) : vendors.length > 0 ? (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {vendors.map((vendor) => (
                          <div
                            key={vendor.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors hover:border-gutzo-primary ${
                              selectedVendor?.id === vendor.id 
                                ? 'border-gutzo-primary bg-gutzo-primary/5' 
                                : 'border-gray-200'
                            }`}
                            onClick={() => handleVendorSelect(vendor)}
                          >
                            <div className="flex items-start gap-3">
                              {vendor.logo_url && (
                                <img 
                                  src={vendor.logo_url} 
                                  alt={vendor.name}
                                  className="w-12 h-12 rounded-lg object-cover"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-lg">{vendor.name}</h3>
                                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {vendor.location}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    {vendor.rating}
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVendorSelect(vendor);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Store className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No vendors yet</p>
                        <p className="text-sm">Register your first business to get started</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            {selectedVendor ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Management Form */}
                <div>
                  <ProductManagementForm 
                    vendorId={selectedVendor.id}
                    onSuccess={handleProductCreated}
                  />
                </div>

                {/* Existing Products List */}
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Products for {selectedVendor.name}
                      </CardTitle>
                      <CardDescription>
                        Manage your menu items and pricing
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {productsLoading ? (
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                              <div className="h-20 bg-gray-200 rounded-lg"></div>
                            </div>
                          ))}
                        </div>
                      ) : vendorProducts.length > 0 ? (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {vendorProducts.map((product) => (
                            <div
                              key={product.id}
                              className="p-4 border border-gray-200 rounded-lg"
                            >
                              <div className="flex items-start gap-3">
                                {product.image_url && (
                                  <img 
                                    src={product.image_url} 
                                    alt={product.name}
                                    className="w-16 h-16 rounded-lg object-cover"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium">{product.name}</h4>
                                  {product.description && (
                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                      {product.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-1 text-gutzo-selected font-semibold">
                                      <IndianRupee className="h-4 w-4" />
                                      {product.price}
                                    </div>
                                    {product.category && (
                                      <Badge variant="secondary" className="text-xs">
                                        {product.category}
                                      </Badge>
                                    )}
                                  </div>
                                  {product.diet_tags && product.diet_tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {product.diet_tags.slice(0, 3).map((tag) => (
                                        <Badge 
                                          key={tag} 
                                          variant="secondary" 
                                          className="text-xs bg-gutzo-highlight/20 text-gutzo-selected"
                                        >
                                          {tag}
                                        </Badge>
                                      ))}
                                      {product.diet_tags.length > 3 && (
                                        <Badge variant="secondary" className="text-xs">
                                          +{product.diet_tags.length - 3} more
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No products yet</p>
                          <p className="text-sm">Add your first menu item to get started</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Store className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a vendor to manage products
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Choose a vendor from the vendors tab or register a new one
                  </p>
                  <Button 
                    onClick={() => setActiveTab("vendors")}
                    className="bg-gutzo-primary hover:bg-gutzo-primary-hover text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Register New Vendor
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}