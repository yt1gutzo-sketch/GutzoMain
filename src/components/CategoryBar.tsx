import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { CategoryItem } from "./CategoryItem";
import { MoreCategoriesModal } from "./MoreCategoriesModal";

// Healthy food category mapping with emojis
const healthyCategoryMap: Record<string, { emoji: string; label: string }> = {
  "All": { emoji: "🍽️", label: "All Meals" },
  "Fresh": { emoji: "🥗", label: "Fresh" },
  "Protein": { emoji: "💪", label: "Protein" },
  "Balanced": { emoji: "🍱", label: "Balanced" },
  "Low-Cal": { emoji: "⚡", label: "Low-Cal" },
  "Glow": { emoji: "✨", label: "Glow" },
  "Specials": { emoji: "🌟", label: "Specials" },
  // Fallback mapping for existing categories
  "Bowls": { emoji: "🥗", label: "Fresh" },
  "Salads": { emoji: "🥗", label: "Fresh" },
  "Fruit Bowls": { emoji: "🥗", label: "Fresh" },
  "Vegetarian": { emoji: "🍱", label: "Balanced" },
  "Meals": { emoji: "🍱", label: "Balanced" },
  "Smoothies": { emoji: "⚡", label: "Low-Cal" },
  "Beverages": { emoji: "⚡", label: "Low-Cal" },
  "Juices": { emoji: "✨", label: "Glow" },
  "Fresh Juices": { emoji: "✨", label: "Glow" },
  "Fruit Juices": { emoji: "✨", label: "Glow" },
  "Desserts": { emoji: "🌟", label: "Specials" },
  "Snacks": { emoji: "🌟", label: "Specials" }
};

interface FilterPillProps {
  category: string;
  isSelected: boolean;
  onClick: () => void;
  isMobile?: boolean;
}

function FilterPill({ category, isSelected, onClick, isMobile = false }: FilterPillProps) {
  const categoryInfo = healthyCategoryMap[category] || { emoji: "🍽️", label: category };
  
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all duration-200 
        ${isMobile ? 'flex-shrink-0 text-sm' : 'text-sm md:text-base'}
        ${isSelected 
          ? 'bg-gutzo-selected text-white shadow-md transform scale-105' 
          : 'bg-white text-gray-700 border border-gray-200 hover:border-gutzo-primary hover:bg-gutzo-primary/5 hover:text-gutzo-primary'
        }
        focus:outline-none focus:ring-2 focus:ring-gutzo-primary focus:ring-offset-2
        active:scale-95 button-ripple
      `}
      style={{ scrollSnapAlign: isMobile ? 'start' : 'none' }}
    >
      <span className="text-lg leading-none">{categoryInfo.emoji}</span>
      <span className="whitespace-nowrap">{categoryInfo.label}</span>
    </button>
  );
}

interface CategoryBarProps {
  selectedCategory: string;
  availableCategories: string[]; // Categories extracted directly from product category names
  onCategoryChange: (category: string) => void;
}

export function CategoryBar({ 
  selectedCategory, 
  availableCategories,
  onCategoryChange
}: CategoryBarProps) {
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [isMoreModalOpen, setIsMoreModalOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Map existing categories to healthy filter categories
  const mapToHealthyCategory = (category: string): string => {
    const mapping = healthyCategoryMap[category];
    if (mapping && mapping.label !== category) {
      return mapping.label;
    }
    return category;
  };

  // Create the core healthy categories with "All" first
  const coreHealthyCategories = ["All", "Fresh", "Protein", "Balanced", "Low-Cal", "Glow", "Specials"];
  
  // Map available categories to healthy categories and merge with core ones
  const mappedCategories = availableCategories
    .filter(cat => cat !== "All") // Remove "All" to avoid duplicates
    .map(mapToHealthyCategory);
  
  // Combine core categories with any unique mapped categories, ensuring "All" is first
  const uniqueCategories = ["All", ...new Set([...coreHealthyCategories.slice(1), ...mappedCategories])];
  const allCategories = uniqueCategories.slice(0, 7); // Limit to 7 for clean design
  
  console.log('Healthy filter categories:', allCategories);

  // Check scroll state
  const checkScrollState = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScrollState();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollState);
      return () => container.removeEventListener('scroll', checkScrollState);
    }
  }, [allCategories]);

  useEffect(() => {
    const handleResize = () => checkScrollState();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      // Scroll less distance on mobile due to smaller items
      const scrollDistance = window.innerWidth < 768 ? -200 : -280;
      scrollContainerRef.current.scrollBy({ left: scrollDistance, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      // Scroll less distance on mobile due to smaller items
      const scrollDistance = window.innerWidth < 768 ? 200 : 280;
      scrollContainerRef.current.scrollBy({ left: scrollDistance, behavior: 'smooth' });
    }
  };

  const handleMoreCategorySelect = (category: string) => {
    onCategoryChange(category);
    setIsMoreModalOpen(false);
  };

  // Handle category selection - map healthy category back to original if needed
  const handleCategorySelect = (healthyCategory: string) => {
    if (healthyCategory === "All") {
      onCategoryChange("All");
      return;
    }
    
    // Find the first original category that maps to this healthy category
    const originalCategory = availableCategories.find(cat => 
      mapToHealthyCategory(cat) === healthyCategory
    );
    
    // Use the original category if found, otherwise use the healthy category name
    onCategoryChange(originalCategory || healthyCategory);
  };

  // Determine which healthy category is currently selected
  const getSelectedHealthyCategory = (): string => {
    if (selectedCategory === "All") return "All";
    return mapToHealthyCategory(selectedCategory);
  };

  if (allCategories.length === 0) return null;

  return (
    <div className="sticky top-16 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-1">Find Your Perfect Meal</h3>
            <p className="text-sm text-gray-600">Quick filters to discover healthy options</p>
          </div>
        </div>

        {/* Filter Pills Container */}
        <div className="relative">
          {/* Left Gradient Fade - Mobile */}
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none md:hidden"></div>
          
          {/* Right Gradient Fade - Mobile */}
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none md:hidden"></div>

          {/* Desktop Grid - Hidden on Mobile */}
          <div className="hidden md:flex md:flex-wrap md:gap-3 md:justify-start">
            {allCategories.map((categoryName) => (
              <FilterPill
                key={categoryName}
                category={categoryName}
                isSelected={getSelectedHealthyCategory() === categoryName}
                onClick={() => handleCategorySelect(categoryName)}
              />
            ))}
          </div>

          {/* Mobile Horizontal Scroll */}
          <div 
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth px-1 py-2 md:hidden"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {allCategories.map((categoryName) => (
              <FilterPill
                key={categoryName}
                category={categoryName}
                isSelected={getSelectedHealthyCategory() === categoryName}
                onClick={() => handleCategorySelect(categoryName)}
                isMobile={true}
              />
            ))}
          </div>
        </div>

        {/* Empty State Helper */}
        {selectedCategory !== "All" && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <span>Showing {getSelectedHealthyCategory()} meals</span>
            <button
              onClick={() => handleCategorySelect("All")}
              className="text-gutzo-primary hover:text-gutzo-primary-hover font-medium underline"
            >
              Clear filter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}