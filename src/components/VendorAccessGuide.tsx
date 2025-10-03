import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  Store, 
  ArrowRight, 
  User, 
  Plus, 
  CheckCircle, 
  Phone, 
  MapPin,
  UtensilsCrossed,
  Star,
  Smartphone
} from "lucide-react";

interface VendorAccessGuideProps {
  onAccessDashboard?: () => void;
}

export function VendorAccessGuide({ onAccessDashboard }: VendorAccessGuideProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-gutzo-primary/10 rounded-full">
            <Store className="h-8 w-8 text-gutzo-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gutzo-primary">Vendor Management System</h1>
        </div>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Join Gutzo marketplace and reach health-conscious customers in Coimbatore. 
          Our simple management system lets you register your business and add products without any manual database entry.
        </p>
      </div>

      {/* Access Button */}
      <div className="bg-gradient-to-r from-gutzo-primary/10 to-gutzo-selected/10 rounded-xl p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Ready to Get Started?</h2>
        <p className="text-gray-600 mb-4">
          Access the vendor dashboard to register your business and start adding your healthy meal options
        </p>
        {onAccessDashboard && (
          <Button 
            onClick={onAccessDashboard}
            className="bg-gutzo-primary hover:bg-gutzo-primary-hover text-white text-lg px-8 py-3"
          >
            <Store className="h-5 w-5 mr-2" />
            Access Vendor Dashboard
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        )}
      </div>

      {/* How It Works */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Register Business */}
        <Card className="border-2 border-transparent hover:border-gutzo-primary/30 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gutzo-primary/10 rounded-lg">
                <User className="h-6 w-6 text-gutzo-primary" />
              </div>
              <div>
                <CardTitle className="text-gutzo-primary">Step 1: Register Your Business</CardTitle>
                <CardDescription>Create your vendor profile</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Provide your business details including name, description, location, and WhatsApp contact number.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-gutzo-selected" />
                <span>Business name and description</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-gutzo-selected" />
                <span>Location in Coimbatore</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-gutzo-selected" />
                <span>WhatsApp contact number</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-gutzo-selected" />
                <span>Business logo (optional)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Add Products */}
        <Card className="border-2 border-transparent hover:border-gutzo-primary/30 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gutzo-selected/10 rounded-lg">
                <Plus className="h-6 w-6 text-gutzo-selected" />
              </div>
              <div>
                <CardTitle className="text-gutzo-selected">Step 2: Add Your Products</CardTitle>
                <CardDescription>Build your healthy menu</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Add your healthy meal options with detailed descriptions, pricing, and dietary tags.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-gutzo-selected" />
                <span>Product name and description</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-gutzo-selected" />
                <span>Pricing in rupees</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-gutzo-selected" />
                <span>Category (Smoothies, Bowls, etc.)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-gutzo-selected" />
                <span>Diet tags (Vegan, Keto, etc.)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Why Choose Gutzo?</CardTitle>
          <CardDescription className="text-center">
            Everything you need to reach health-conscious customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center space-y-2">
              <div className="p-3 bg-gutzo-highlight/20 rounded-full w-fit mx-auto">
                <Smartphone className="h-6 w-6 text-gutzo-selected" />
              </div>
              <h3 className="font-medium">WhatsApp Orders</h3>
              <p className="text-sm text-gray-600">
                Customers order directly via WhatsApp - no commission fees
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="p-3 bg-gutzo-highlight/20 rounded-full w-fit mx-auto">
                <Star className="h-6 w-6 text-gutzo-selected" />
              </div>
              <h3 className="font-medium">Rating System</h3>
              <p className="text-sm text-gray-600">
                Build your reputation with customer reviews
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="p-3 bg-gutzo-highlight/20 rounded-full w-fit mx-auto">
                <MapPin className="h-6 w-6 text-gutzo-selected" />
              </div>
              <h3 className="font-medium">Local Focus</h3>
              <p className="text-sm text-gray-600">
                Connect with customers in Coimbatore
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="p-3 bg-gutzo-highlight/20 rounded-full w-fit mx-auto">
                <UtensilsCrossed className="h-6 w-6 text-gutzo-selected" />
              </div>
              <h3 className="font-medium">Health Focus</h3>
              <p className="text-sm text-gray-600">
                Reach customers looking for healthy options
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements */}
      <Card className="bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Phone className="h-5 w-5" />
            Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-amber-800 mb-2">Essential Requirements:</h4>
              <ul className="space-y-1 text-sm text-amber-700">
                <li>• Valid WhatsApp business number</li>
                <li>• Food business in Coimbatore</li>
                <li>• Focus on healthy meal options</li>
                <li>• Ability to fulfill orders via WhatsApp</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-amber-800 mb-2">Recommended:</h4>
              <ul className="space-y-1 text-sm text-amber-700">
                <li>• High-quality food photos</li>
                <li>• Clear product descriptions</li>
                <li>• Competitive pricing</li>
                <li>• Multiple dietary options</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <div className="text-center bg-gray-50 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Ready to Join Gutzo Marketplace?
        </h2>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Start reaching health-conscious customers today. No setup fees, no monthly charges - 
          just a direct connection between you and your customers.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4">
          <Badge variant="secondary" className="bg-gutzo-selected/10 text-gutzo-selected border-gutzo-selected/20">
            No Commission Fees
          </Badge>
          <Badge variant="secondary" className="bg-gutzo-primary/10 text-gutzo-primary border-gutzo-primary/20">
            Direct WhatsApp Orders
          </Badge>
          <Badge variant="secondary" className="bg-gutzo-highlight/20 text-gutzo-selected border-gutzo-highlight/50">
            Easy Setup
          </Badge>
        </div>
      </div>
    </div>
  );
}