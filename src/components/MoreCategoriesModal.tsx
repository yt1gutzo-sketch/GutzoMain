import { useState } from "react";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Search, X, CheckCircle } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { categoryIcons, categoryFallbackIcons } from "../constants/categoryIcons";

interface MoreCategoriesModalProps {
  availableCategories: string[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

export function MoreCategoriesModal({ 
  availableCategories, 
  selectedCategory, 
  onCategorySelect 
}: MoreCategoriesModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = availableCategories.filter(category =>
    !searchQuery.trim() || 
    category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-3 w-3 text-gray-400" />
          </button>
        )}
      </div>

      {/* All Categories */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">All Categories</h4>
          <div className="grid grid-cols-2 gap-2">
            {filteredCategories.map((category) => (
              <Badge
                key={category}
                variant="secondary"
                className={`cursor-pointer justify-start p-3 h-auto transition-all duration-200 ${
                  selectedCategory === category
                    ? "bg-gutzo-selected text-white border-gutzo-selected"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
                }`}
                onClick={() => onCategorySelect(category)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                    {categoryIcons[category] ? (
                      <ImageWithFallback
                        src={categoryIcons[category]}
                        alt={category}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center scale-50">
                        {categoryFallbackIcons[category] || categoryFallbackIcons["All"]}
                      </div>
                    )}
                  </div>
                  <span className="text-sm">{category}</span>
                  {selectedCategory === category && (
                    <CheckCircle className="h-3 w-3 ml-auto" />
                  )}
                </div>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {filteredCategories.length === 0 && searchQuery.trim() && (
        <div className="text-center py-8 text-sm text-gray-500">
          No categories found for "{searchQuery}"
        </div>
      )}
    </div>
  );
}