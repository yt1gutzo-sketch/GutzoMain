import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { CheckCircle, Circle, Store, Package, MessageCircle } from "lucide-react";

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed?: boolean;
}

interface VendorOnboardingGuideProps {
  hasVendors: boolean;
  selectedVendorHasProducts: boolean;
}

export function VendorOnboardingGuide({ hasVendors, selectedVendorHasProducts }: VendorOnboardingGuideProps) {
  const steps: Step[] = [
    {
      id: 1,
      title: "Register Your Business",
      description: "Add your business details, logo, and contact information",
      icon: <Store className="h-5 w-5" />,
      completed: hasVendors
    },
    {
      id: 2,
      title: "Add Your Menu Items",
      description: "Upload products with images, prices, and categories",
      icon: <Package className="h-5 w-5" />,
      completed: hasVendors && selectedVendorHasProducts
    },
    {
      id: 3,
      title: "Start Receiving Orders",
      description: "Customers will contact you directly via WhatsApp",
      icon: <MessageCircle className="h-5 w-5" />,
      completed: false
    }
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Getting Started Guide</CardTitle>
        <CardDescription>
          Follow these simple steps to set up your business on Gutzo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                step.completed 
                  ? 'bg-gutzo-selected text-white' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {step.completed ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {step.icon}
                  <h4 className={`font-medium ${step.completed ? 'text-gutzo-selected' : 'text-gray-900'}`}>
                    {step.title}
                  </h4>
                  {step.completed && (
                    <Badge className="bg-gutzo-selected text-white">
                      Completed
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-gutzo-highlight/10 rounded-lg">
          <div className="flex items-start gap-2">
            <MessageCircle className="h-5 w-5 text-gutzo-selected mt-0.5" />
            <div>
              <h5 className="font-medium text-gutzo-selected mb-1">Zero Commission Model</h5>
              <p className="text-sm text-gray-700">
                Gutzo connects you directly with customers. No commissions, no middlemen. 
                Customers contact you via WhatsApp for orders, and you handle payment and delivery directly.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}