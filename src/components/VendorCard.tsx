import { Star, Clock } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Vendor } from "../types";

interface VendorCardProps {
  vendor: Vendor;
  onClick: (vendor: Vendor) => void;
}

export function VendorCard({ vendor, onClick }: VendorCardProps) {
  const availableCount = vendor.products?.filter(p => p.available).length || 0;
  const totalCount = vendor.products?.length || 0;
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden group"
      onClick={() => onClick(vendor)}
    >
      <div className="relative h-48 overflow-hidden">
        <ImageWithFallback
          src={vendor.image || ""}
          alt={`${vendor.name} logo`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          onError={(e) => {
            console.log(`Image failed to load for ${vendor.name}:`, {
              src: vendor.image,
              error: e
            });
          }}
        />
        <div className="absolute top-3 right-3 flex items-center bg-white px-2 py-1 rounded-full shadow-md">
          <Star className="h-3.5 w-3.5 text-yellow-400 fill-current" />
          <span className="ml-1 text-xs font-medium">{vendor.rating}</span>
        </div>
        
        {/* Availability indicator badge */}
        {totalCount > 0 && (
          <div className="absolute bottom-3 left-3">
            <div className={`px-2 py-1 rounded-full text-xs font-medium shadow-sm ${
              availableCount === totalCount 
                ? 'bg-gutzo-selected text-white' 
                : availableCount > 0 
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-600'
            }`}>
              {availableCount === totalCount 
                ? 'All Available' 
                : availableCount > 0
                  ? `${availableCount} Available`
                  : 'Few Available'
              }
            </div>
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-base md:text-lg mb-1.5 line-clamp-1">{vendor.name}</h3>
        <p className="text-gray-600 text-sm mb-1 line-clamp-2">{vendor.description}</p>
        <p className="text-gray-500 text-xs mb-3">{vendor.location}</p>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center text-gray-600">
            <Clock className="h-3.5 w-3.5 mr-1" />
            <span>{vendor.deliveryTime || '30-45 min'}</span>
          </div>
          
          {/* Product Availability Summary */}
          {totalCount > 0 && (
            <div className="text-gray-500">
              <span className="font-medium text-gutzo-selected">
                {availableCount}
              </span>
              <span className="mx-1">/</span>
              <span className="font-medium">{totalCount}</span>
              <span className="ml-1">items</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}