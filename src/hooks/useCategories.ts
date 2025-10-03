import { useState, useEffect } from "react";
import { toast } from "sonner@2.0.3";
import { Category } from "../types";
import { apiService } from "../utils/api";

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = async () => {
    try {
      console.log("Loading categories from database...");
      const data = await apiService.getCategories();
      console.log("Loaded categories from API:", data?.length || 0);

      if (!data || !Array.isArray(data)) {
        console.log("No categories received from API");
        setCategories([]);
        return;
      }

      setCategories(data);
      console.log("Categories loaded successfully:", data);
      
    } catch (error) {
      console.error("Failed to load categories:", error);
      toast.error(`Failed to load categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return {
    categories,
    loading
  };
};