import { ShoppingCart } from "lucide-react";
import { Button } from "./ui/button";
import { useCart } from "../contexts/CartContext";
import { useState, useEffect } from "react";

interface VendorCartStripProps {
  vendorId: string;
  vendorName: string;
  onViewCart: () => void;
  isDrawerOpen?: boolean;
  isCartOpen?: boolean;
}

export function VendorCartStrip({ vendorId, vendorName, onViewCart, isDrawerOpen = false, isCartOpen = false }: VendorCartStripProps) {
  const { getVendorItems } = useCart();
  const vendorItems = getVendorItems(vendorId);
  const itemCount = vendorItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = vendorItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const [prevItemCount, setPrevItemCount] = useState(itemCount);
  const [prevTotalAmount, setPrevTotalAmount] = useState(totalAmount);
  const [isAnimating, setIsAnimating] = useState(false);

  // Trigger animation when numbers change
  useEffect(() => {
    if (itemCount !== prevItemCount || totalAmount !== prevTotalAmount) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 250);
      setPrevItemCount(itemCount);
      setPrevTotalAmount(totalAmount);
      return () => clearTimeout(timer);
    }
  }, [itemCount, totalAmount, prevItemCount, prevTotalAmount]);

  if (itemCount === 0 || isCartOpen) return null;

  return (
    <div className={`fixed bottom-0 z-50 bg-gutzo-selected text-white shadow-lg border-t border-gutzo-selected-hover cart-strip-enter cart-strip-transition
      ${/* Mobile: Always full width and centered */ ''}
      w-full left-0 right-0
      ${/* Desktop: Dynamic positioning */ ''}
      ${isDrawerOpen 
        ? 'lg:right-0 lg:w-[40%] lg:min-w-[400px] lg:max-w-[600px] xl:min-w-[480px] lg:left-auto' 
        : 'lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:w-full lg:max-w-4xl lg:right-auto'
      }`}>
      <div className={`transition-all duration-500 ease-in-out px-4 py-3 ${
        isDrawerOpen 
          ? 'max-w-[90%] lg:max-w-[85%] mx-auto' 
          : 'max-w-[85%] lg:max-w-[75%] mx-auto'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div>
              <div className={`font-medium transition-all duration-300 ease-out ${isAnimating ? 'number-change' : ''}`}>
                {itemCount} item{itemCount !== 1 ? 's' : ''} added
              </div>
              <div className="text-xs text-white/80 transition-all duration-300 ease-out">
                from {vendorName}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className={`font-bold transition-all duration-300 ease-out ${isAnimating ? 'number-change' : ''}`}>₹{totalAmount}</div>
              <div className="text-xs text-white/80 transition-all duration-300 ease-out">Total</div>
            </div>
            <Button
              onClick={onViewCart}
              className="bg-white text-gutzo-selected hover:bg-gray-100 font-medium px-6 py-2 rounded-lg"
            >
              VIEW CART
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}