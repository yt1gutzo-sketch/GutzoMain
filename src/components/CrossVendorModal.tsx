import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";

interface CrossVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVendorName: string;
  newVendorName: string;
  onKeepCart: () => void;
  onStartFresh: () => void;
}

export function CrossVendorModal({
  isOpen,
  onClose,
  currentVendorName,
  newVendorName,
  onKeepCart,
  onStartFresh
}: CrossVendorModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-auto bg-white rounded-2xl shadow-xl border-0 p-6">
        <DialogHeader className="text-center space-y-3">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Items already in cart
          </DialogTitle>
          <p className="text-sm text-gray-600 leading-relaxed">
            Your cart contains items from {currentVendorName}. Would you like to reset 
            your cart for adding items from {newVendorName}?
          </p>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-6">
          <Button
            onClick={onStartFresh}
            className="w-full bg-gutzo-selected text-white hover:bg-gutzo-selected-hover border-0 rounded-xl py-3 font-medium"
          >
            YES, START AFRESH
          </Button>
          <Button
            onClick={onKeepCart}
            variant="outline"
            className="w-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl py-3 font-medium"
          >
            NO
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}