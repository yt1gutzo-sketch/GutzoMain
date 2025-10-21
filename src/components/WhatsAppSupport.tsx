import { MessageCircle } from "lucide-react";
import { Button } from "./ui/button";

export function WhatsAppSupport() {
  const handleSupportClick = () => {
    const message = "Hi Gutzo, I need help with ordering.";
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/918903589068?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 md:bottom-20 md:right-20 z-50 group">
      <Button
        onClick={handleSupportClick}
        className="bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 flex items-center justify-center"
        style={{ width: '56px', height: '56px' }}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
      
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
        Need help? Chat Gutzo
        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
}