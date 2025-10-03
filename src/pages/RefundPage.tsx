import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ArrowLeft, Clock, Shield, RefreshCw } from "lucide-react";
import { useRouter } from "../components/Router";
import { useEffect } from "react";

export function RefundPage() {
  const { navigate } = useRouter();

  // Ensure page starts at top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gutzo
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gutzo-primary" style={{ fontFamily: 'Poppins' }}>
                Gutzo
              </h1>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Refund Policy</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Poppins' }}>
            Refund Policy
          </h1>
          <p className="text-gray-600 text-lg">
            Last updated: 05/09/2025
          </p>
        </div>



        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              This refund and cancellation policy outlines how you can cancel or seek a refund for a product / service that you have purchased through the Platform. Under this policy:
            </p>
            <p>
              Cancellations will only be considered if the request is made 1 days of placing the order. However, cancellation requests may not be entertained if the orders have been communicated to such sellers / merchant(s) listed on the Platform and they have initiated the process of shipping them, or the product is out for delivery. In such an event, you may choose to reject the product at the doorstep.
            </p>
            <p>
              Gutzo does not accept cancellation requests for perishable items like flowers, eatables, etc. However, the refund / replacement can be made if the user establishes that the quality of the product delivered is not good.
            </p>
            <p>
              In case of receipt of damaged or defective items, please report to our customer service team. The request would be entertained once the seller/ merchant listed on the Platform, has checked and determined the same at its own end. This should be reported within 1 days of receipt of products. In case you feel that the product received is not as shown on the site or as per your expectations, you must bring it to the notice of our customer service within 1 days of receiving the product. The customer service team after looking into your complaint will take an appropriate decision.
            </p>
            <p>
              In case of complaints regarding the products that come with a warranty from the manufacturers, please refer the issue to them.
            </p>
            <p>
              In case of any refunds approved by Gutzo, it will take 7 days for the refund to be processed to you.
            </p>
          </div>
        </div>


      </main>
    </div>
  );
}