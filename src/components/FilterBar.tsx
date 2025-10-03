import { Badge } from "./ui/badge";
import { Circle, CheckCircle } from "lucide-react";

interface FilterBarProps {
  selectedCategory: string;
  availableCategories: string[];
  onCategoryChange: (category: string) => void;
}

export function FilterBar({ 
  selectedCategory, 
  availableCategories,
  onCategoryChange
}: FilterBarProps) {
  return (
    <div className="sticky top-16 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col space-y-4">
          {/* Categories Section */}
          {availableCategories.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-medium text-gray-700">Categories</h3>
                <span className="text-xs text-gray-500">(choose one)</span>
              </div>

              {/* Two-row scrollable categories grid */}
              <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-hide max-h-[104px]">
                {availableCategories.map((category) => (
                  <Badge
                    key={category}
                    variant="secondary"
                    className={`cursor-pointer whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                      selectedCategory === category
                        ? "bg-[#026254] text-white border-[#026254] hover:bg-[#014A40]"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
                    }`}
                    style={{ 
                      minHeight: '44px', 
                      minWidth: '80px',
                      maxWidth: '160px'
                    }}
                    onClick={() => onCategoryChange(category)}
                  >
                    {selectedCategory === category ? (
                      <CheckCircle className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <Circle className="h-3 w-3 flex-shrink-0" />
                    )}
                    <span className="truncate">{category}</span>
                  </Badge>
                ))}
              </div>


            </div>
          )}
        </div>
      </div>
    </div>
  );
}