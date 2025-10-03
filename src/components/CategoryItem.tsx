import { ImageWithFallback } from "./figma/ImageWithFallback";
import { categoryIcons, categoryFallbackIcons } from "../constants/categoryIcons";
import { Category } from "../types";

interface CategoryItemProps {
  category: string | Category;
  isSelected: boolean;
  onClick: () => void;
}

export function CategoryItem({ category, isSelected, onClick }: CategoryItemProps) {
  // Handle both string categories (like "All") and database Category objects
  const categoryName = typeof category === 'string' ? category : category.name;
  const categoryImage = typeof category === 'string' 
    ? categoryIcons[category] 
    : category.image_url;
    
  return (
    <div 
      className="flex-shrink-0 flex flex-col items-center cursor-pointer group transition-all duration-200 min-w-[60px] md:min-w-[80px] py-2"
      onClick={onClick}
    >
      {/* Responsive circular image container */}
      <div className={`relative w-14 h-14 md:w-20 md:h-20 mb-2 md:mb-3 rounded-full overflow-hidden swiggy-category-image shadow-md border-2 border-white ${
        isSelected 
          ? 'ring-2 md:ring-3 ring-gutzo-selected scale-105 shadow-lg ring-offset-1 md:ring-offset-2' 
          : 'group-hover:scale-105 group-hover:shadow-lg'
      }`}>
        {categoryImage ? (
          <ImageWithFallback
            src={categoryImage}
            alt={categoryName}
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-full">
            {categoryFallbackIcons[categoryName] || categoryFallbackIcons["All"]}
          </div>
        )}
        
        {/* Subtle overlay for selected state */}
        {isSelected && (
          <div className="absolute inset-0 bg-gutzo-selected/10 rounded-full"></div>
        )}
      </div>
      
      {/* Responsive category name */}
      <span className={`text-xs md:text-sm font-medium text-center leading-tight transition-colors duration-200 max-w-[60px] md:max-w-[80px] ${
        isSelected 
          ? 'text-gutzo-selected' 
          : 'text-gray-800 group-hover:text-gutzo-primary'
      }`}>
        {categoryName}
      </span>
    </div>
  );
}