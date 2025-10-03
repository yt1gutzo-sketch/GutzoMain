import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner@2.0.3";
import { apiService } from "../utils/api";
import { UtensilsCrossed, IndianRupee, Tag, Image as ImageIcon, Plus, X, Clock } from "lucide-react";

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  diet_tags: string[];
  available: boolean;
}

interface ProductManagementFormProps {
  vendorId: string;
  onSuccess?: (productData: any) => void;
  onCancel?: () => void;
}

export function ProductManagementForm({ vendorId, onSuccess, onCancel }: ProductManagementFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    price: 0,
    image_url: "",
    category: "",
    diet_tags: [],
    available: true
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [customDietTag, setCustomDietTag] = useState("");

  // No predefined categories - let vendors create categories through their products
  // Categories will be dynamically extracted from existing products

  const dietTags = [
    "Vegan",
    "Vegetarian", 
    "High-Protein",
    "Low-Cal",
    "Keto",
    "Gluten-Free",
    "Organic",
    "Raw",
    "Detox",
    "Post-Workout",
    "Immunity-Boost",
    "Probiotic",
    "High-Fiber"
  ];

  const sampleImages = [
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1553909489-cd47e0ef937f?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400&h=300&fit=crop"
  ];

  const handleInputChange = (field: keyof ProductFormData, value: string | number | string[] | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, image_url: url }));
    setImagePreview(url);
  };

  const handleDietTagToggle = (tag: string) => {
    const isSelected = formData.diet_tags.includes(tag);
    const newTags = isSelected 
      ? formData.diet_tags.filter(t => t !== tag)
      : [...formData.diet_tags, tag];
    
    handleInputChange("diet_tags", newTags);
  };



  const addCustomDietTag = () => {
    if (customDietTag.trim() && !formData.diet_tags.includes(customDietTag.trim())) {
      handleDietTagToggle(customDietTag.trim());
      setCustomDietTag("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    
    if (!formData.price || formData.price <= 0) {
      toast.error("Valid price is required");
      return;
    }

    if (!formData.category.trim()) {
      toast.error("Category is required");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const productData = await apiService.createProduct(vendorId, formData);
      toast.success("Product added successfully!");
      
      if (onSuccess) {
        onSuccess(productData);
      }
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        price: 0,
        image_url: "",
        category: "",
        diet_tags: [],
        available: true
      });
      setImagePreview("");
      
    } catch (error) {
      console.error("Failed to add product:", error);
      toast.error("Failed to add product. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl text-gutzo-primary">
          <UtensilsCrossed className="h-6 w-6" />
          Add New Product
        </CardTitle>
        <CardDescription>
          Add a delicious item to your menu
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              Product Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., Mediterranean Bowl"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe the ingredients, taste, and what makes this item special..."
              rows={3}
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price" className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              Price (₹) *
            </Label>
            <Input
              id="price"
              type="number"
              min="1"
              value={formData.price}
              onChange={(e) => handleInputChange("price", parseFloat(e.target.value) || 0)}
              placeholder="e.g., 280"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Category *
            </Label>
            
            {/* Direct Category Input - No predefined categories */}
            <Input
              value={formData.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
              placeholder="Enter product category (e.g., Smoothies, Fruit Bowls, Toppings)"
              required
            />
            <p className="text-xs text-gray-500">
              Enter a category name. This will become available as a filter option when customers browse your products.
            </p>
          </div>

          {/* Availability - Temporarily hidden until database schema supports it */}
          <div className="space-y-2 hidden">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Availability
            </Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="available"
                checked={formData.available}
                onCheckedChange={(checked) => handleInputChange("available", checked as boolean)}
              />
              <Label htmlFor="available" className="cursor-pointer">
                Available today
              </Label>
            </div>
            <p className="text-xs text-gray-500">
              Unchecked items will be shown as "Not Available Today" and cannot be ordered
            </p>
          </div>

          {/* Diet Tags */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Diet Tags
            </Label>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {dietTags.map((tag) => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={tag}
                    checked={formData.diet_tags.includes(tag)}
                    onCheckedChange={() => handleDietTagToggle(tag)}
                  />
                  <Label htmlFor={tag} className="text-sm cursor-pointer">
                    {tag}
                  </Label>
                </div>
              ))}
            </div>

            {/* Custom Diet Tag */}
            <div className="flex gap-2">
              <Input
                value={customDietTag}
                onChange={(e) => setCustomDietTag(e.target.value)}
                placeholder="Add custom diet tag..."
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addCustomDietTag}
                variant="outline"
                size="sm"
                disabled={!customDietTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Selected Tags */}
            {formData.diet_tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.diet_tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary"
                    className="bg-gutzo-highlight/20 text-gutzo-selected border-gutzo-highlight/50"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleDietTagToggle(tag)}
                      className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Product Image */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Product Image
            </Label>
            
            <Input
              value={formData.image_url}
              onChange={(e) => handleImageUrlChange(e.target.value)}
              placeholder="Enter image URL"
            />
            
            {/* Sample Images */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Or choose from sample images:</p>
              <div className="grid grid-cols-4 gap-2">
                {sampleImages.map((url, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleImageUrlChange(url)}
                    className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-gutzo-primary transition-colors"
                  >
                    <img 
                      src={url} 
                      alt={`Sample ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <img 
                  src={imagePreview} 
                  alt="Product preview" 
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div>
                  <p className="font-medium">Image Preview</p>
                  <p className="text-sm text-gray-500">This is how your product image will appear</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gutzo-primary hover:bg-gutzo-primary-hover text-white"
            >
              {isSubmitting ? "Adding Product..." : "Add Product"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}