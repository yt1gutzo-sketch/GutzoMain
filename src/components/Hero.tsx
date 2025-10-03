import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface HeroProps {
  onScrollToListings: () => void;
}

export function Hero({ onScrollToListings }: HeroProps) {
  const heroImageUrl = "https://images.unsplash.com/photo-1614648692330-eb129aeb6880?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwY29sb3JmdWwlMjBtZWFsJTIwYm93bCUyMG92ZXJoZWFkfGVufDF8fHx8MTc1NjI5MzEwMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

  return (
    <section className="relative min-h-[240px] lg:min-h-[280px] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <ImageWithFallback 
          src={heroImageUrl}
          alt="Healthy colorful meal bowls"
          className="w-full h-full object-cover"
        />
      </div>
      

      
      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Poppins' }}>
          Healthy Meals, Delivered Fresh
        </h1>
        <p className="text-base lg:text-lg text-white/90 mb-4 max-w-2xl mx-auto">
          Browse verified healthy kitchens. Order on WhatsApp.
        </p>
        <Button 
          onClick={onScrollToListings}
          className="bg-[#E7600E] hover:bg-[#D14808] text-white px-8 py-3 text-lg font-semibold rounded-lg transition-colors duration-200"
          style={{ minHeight: '44px' }}
        >
          Explore Healthy Options
        </Button>
      </div>
    </section>
  );
}