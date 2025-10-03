import { useState, useEffect } from "react";
import { toast } from "sonner@2.0.3";
import { Vendor, Product } from "../types";
import { apiService } from "../utils/api";
import { processVendorData } from "../utils/vendors";

export const useVendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  const initializeApp = async () => {
    try {
      console.log("Testing API connection...");
      await apiService.testConnection();
      console.log("API connection successful, loading vendors...");
      await loadVendors();
    } catch (error) {
      console.error("Failed to initialize app:", error);
      toast.error("Failed to connect to Gutzo marketplace. Please try again later.");
      setVendors([]);
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      console.log("Starting to load vendors from database...");
      const data = await apiService.getVendors();
      console.log("Loaded vendors from API:", data?.length || 0);

      if (!data || !Array.isArray(data)) {
        console.log("No vendors received from API");
        setVendors([]);
        return;
      }

      const processedVendors: Vendor[] = data.map(processVendorData);
      
      // Load products for each vendor
      const vendorsWithProducts = await Promise.all(
        processedVendors.map(async (vendor) => {
          try {
            const products = await loadVendorProducts(vendor.id);
            return { ...vendor, products };
          } catch (error) {
            console.error(`Failed to load products for vendor ${vendor.name}:`, error);
            return { ...vendor, products: [] };
          }
        })
      );
      
      console.log("Vendors with products loaded:", vendorsWithProducts);
      
      // Debug each vendor's products for categories
      vendorsWithProducts.forEach(vendor => {
        const categories = vendor.products?.map(p => p.category).filter(Boolean) || [];
        console.log(`Vendor: ${vendor.name} - Categories: [${categories.join(', ')}]`);
      });
      
      setVendors(vendorsWithProducts);
      
    } catch (error) {
      console.error("Failed to load vendors:", error);
      toast.error(`Failed to load vendors: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const loadVendorProducts = async (vendorId: string): Promise<Product[]> => {
    try {
      console.log(`Loading products for vendor ${vendorId} from database...`);
      const products: Product[] = await apiService.getVendorProducts(vendorId);
      console.log(`Loaded ${products?.length || 0} products for vendor ${vendorId}`);
      
      if (!products || products.length === 0) {
        console.log(`No products found for vendor ${vendorId}`);
      }
      
      return products || [];
    } catch (error) {
      console.error(`Failed to load products for vendor ${vendorId}:`, error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      
      // Only show toast error if it's not a network issue during app initialization
      if (vendors.length > 0) {
        toast.error(`Failed to load menu. Please try again.`);
      }
      
      return [];
    }
  };

  useEffect(() => {
    initializeApp();
  }, []);

  return {
    vendors,
    loading,
    loadVendorProducts
  };
};