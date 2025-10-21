import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { toast } from "sonner@2.0.3";
import { apiService } from "../utils/api";
import { Store, Phone, MapPin, Star, Upload, Image as ImageIcon } from "lucide-react";

interface VendorFormData {
  name: string;
  description: string;
  location: string;
  rating: number;
  logo_url: string;
  contact_whatsapp: string;
}

interface VendorRegistrationFormProps {
  onSuccess?: (vendorData: any) => void;
  onCancel?: () => void;
}

export function VendorRegistrationForm({ onSuccess, onCancel }: VendorRegistrationFormProps) {
  const [formData, setFormData] = useState<VendorFormData>({
    name: "",
    description: "",
    location: "",
    rating: 4.5,
    logo_url: "",
    contact_whatsapp: ""
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");

  const handleInputChange = (field: keyof VendorFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, logo_url: url }));
    setLogoPreview(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Business name is required");
      return;
    }
    
    if (!formData.contact_whatsapp.trim()) {
      toast.error("WhatsApp contact number is required");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const vendorData = await apiService.createVendor(formData);
      toast.success("Vendor registered successfully!");
      
      if (onSuccess) {
        onSuccess(vendorData);
      }
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        location: "",
        rating: 4.5,
        logo_url: "",
        contact_whatsapp: ""
      });
      setLogoPreview("");
      
    } catch (error) {
      console.error("Failed to register vendor:", error);
      toast.error("Failed to register vendor. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sampleLogos = [
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=200&fit=crop"
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl text-gutzo-primary">
          <Store className="h-6 w-6" />
          Register Your Business
        </CardTitle>
        <CardDescription>
          Join Gutzo marketplace and start reaching health-conscious customers in Coimbatore
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Business Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., Green Bowl Kitchen"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Business Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe your business, specialties, and what makes you unique..."
              rows={3}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              placeholder="e.g., Gandhipuram, Coimbatore"
            />
          </div>

          {/* WhatsApp Contact */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              WhatsApp Number *
            </Label>
            <Input
              id="whatsapp"
              value={formData.contact_whatsapp}
              onChange={(e) => handleInputChange("contact_whatsapp", e.target.value)}
              placeholder="e.g., +918903589068"
              required
            />
            <p className="text-sm text-gray-500">
              Include country code. Customers will contact you via WhatsApp for orders.
            </p>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label htmlFor="rating" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Initial Rating
            </Label>
            <Input
              id="rating"
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={formData.rating}
              onChange={(e) => handleInputChange("rating", parseFloat(e.target.value))}
            />
            <p className="text-sm text-gray-500">
              This will be updated based on customer feedback over time.
            </p>
          </div>

          {/* Logo URL */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Business Logo
            </Label>
            
            <Input
              value={formData.logo_url}
              onChange={(e) => handleLogoUrlChange(e.target.value)}
              placeholder="Enter logo image URL"
            />
            
            {/* Sample Logos */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Or choose from sample images:</p>
              <div className="flex flex-wrap gap-2">
                {sampleLogos.map((url, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleLogoUrlChange(url)}
                    className="w-16 h-16 rounded-lg overflow-hidden border-2 border-transparent hover:border-gutzo-primary transition-colors"
                  >
                    <img 
                      src={url} 
                      alt={`Sample logo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Logo Preview */}
            {logoPreview && (
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <img 
                  src={logoPreview} 
                  alt="Logo preview" 
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div>
                  <p className="font-medium">Logo Preview</p>
                  <p className="text-sm text-gray-500">This is how your logo will appear</p>
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
              {isSubmitting ? "Registering..." : "Register Business"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}