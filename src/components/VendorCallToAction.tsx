import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Store, Plus, TrendingUp, Users } from "lucide-react";

interface VendorCallToActionProps {
  onVendorDashboardClick: () => void;
}

export function VendorCallToAction({ onVendorDashboardClick }: VendorCallToActionProps) {
  return (
    <Card className="bg-gradient-to-r from-gutzo-primary to-gutzo-primary-hover text-white border-0 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Store className="h-6 w-6" />
              <h3 className="text-xl font-semibold">Are you a food vendor?</h3>
            </div>
            <p className="text-white/90 mb-4">
              Join Gutzo marketplace and reach health-conscious customers in Coimbatore. 
              Easy setup, no commissions, direct WhatsApp orders.
            </p>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="text-sm">Easy Registration</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Zero Commission</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">Direct Customer Contact</span>
              </div>
            </div>
          </div>
          
          <div className="ml-6">
            <Button
              onClick={onVendorDashboardClick}
              className="bg-white text-gutzo-primary hover:bg-gray-100 font-semibold px-6 py-3"
              size="lg"
            >
              <Store className="h-5 w-5 mr-2" />
              Register Your Business
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}