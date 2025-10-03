import { Badge } from "./ui/badge";
import { Product } from "../types";

interface ProductCategoryFilterProps {
  products: Product[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  showCounts?: boolean;
}

export function ProductCategoryFilter({ 
  products, 
  selectedCategory, 
  onCategoryChange,
  showCounts = true 
}: ProductCategoryFilterProps) {
  // Get unique categories from products
  const categories = [...new Set(products.map(product => product.category || 'Other'))].sort();

  if (categories.length <= 1) {
    return null; // Don't show filter if there's only one category
  }

  const getCategoryCount = (category: string) => {
    return products.filter(product => (product.category || 'Other') === category).length;
  };

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
      <Badge
        variant={selectedCategory === "all" ? "default" : "secondary"}
        className={`cursor-pointer whitespace-nowrap px-3 py-2 ${
          selectedCategory === "all" 
            ? "bg-[#E7600E] hover:bg-[#D14808] text-white" 
            : "hover:bg-gray-200"
        }`}
        onClick={() => onCategoryChange("all")}
      >
        All {showCounts && `(${products.length})`}
      </Badge>
      
      {categories.map((category) => (
        <Badge
          key={category}
          variant={selectedCategory === category ? "default" : "secondary"}
          className={`cursor-pointer whitespace-nowrap px-3 py-2 ${
            selectedCategory === category 
              ? "bg-[#E7600E] hover:bg-[#D14808] text-white" 
              : "hover:bg-gray-200"
          }`}
          onClick={() => onCategoryChange(category)}
        >
          {category} {showCounts && `(${getCategoryCount(category)})`}
        </Badge>
      ))}
    </div>
  );
}