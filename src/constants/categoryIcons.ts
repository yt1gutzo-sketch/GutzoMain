import { Apple, Utensils, Coffee, Grape, Leaf } from "lucide-react";

// Category icon mapping with high-quality Swiggy-style food images
export const categoryIcons: Record<string, string> = {
  "All": "https://images.unsplash.com/photo-1592503469196-3a7880cc2d05?w=200&h=200&fit=crop&crop=center",
  "Bowls": "https://images.unsplash.com/photo-1553492447-b83652073b07?w=200&h=200&fit=crop&crop=center",
  "Beverages": "https://images.unsplash.com/photo-1623002071634-54590669fe3d?w=200&h=200&fit=crop&crop=center",
  "Smoothies": "https://images.unsplash.com/photo-1623002071634-54590669fe3d?w=200&h=200&fit=crop&crop=center",
  "Salads": "https://images.unsplash.com/photo-1734772451376-0dd8003cb8f2?w=200&h=200&fit=crop&crop=center",
  "Fruit Juices": "https://images.unsplash.com/photo-1694019835724-c8a1b92e37c7?w=200&h=200&fit=crop&crop=center",
  "Wraps": "https://images.unsplash.com/photo-1627308595181-555c07449ff3?w=200&h=200&fit=crop&crop=center",
  "Pasta": "https://images.unsplash.com/photo-1638890763825-e20495f6b819?w=200&h=200&fit=crop&crop=center",
  // Additional healthy categories
  "Fruit Bowls": "https://images.unsplash.com/photo-1553492447-b83652073b07?w=200&h=200&fit=crop&crop=center",
  "Meals": "https://images.unsplash.com/photo-1592503469196-3a7880cc2d05?w=200&h=200&fit=crop&crop=center",
  "Fruits": "https://images.unsplash.com/photo-1694019835724-c8a1b92e37c7?w=200&h=200&fit=crop&crop=center",
  "Juices": "https://images.unsplash.com/photo-1694019835724-c8a1b92e37c7?w=200&h=200&fit=crop&crop=center",
  "Fresh Juices": "https://images.unsplash.com/photo-1694019835724-c8a1b92e37c7?w=200&h=200&fit=crop&crop=center",
  "Toppings": "https://images.unsplash.com/photo-1671981200629-014c03829abb?w=200&h=200&fit=crop&crop=center",
  "Vegetarian": "https://images.unsplash.com/photo-1734772451376-0dd8003cb8f2?w=200&h=200&fit=crop&crop=center",
  "Protein": "https://images.unsplash.com/photo-1553492447-b83652073b07?w=200&h=200&fit=crop&crop=center",
  "Desserts": "https://images.unsplash.com/photo-1671981200629-014c03829abb?w=200&h=200&fit=crop&crop=center",
  "Snacks": "https://images.unsplash.com/photo-1671981200629-014c03829abb?w=200&h=200&fit=crop&crop=center"
};

// Fallback icons for categories without images
export const categoryFallbackIcons: Record<string, React.ReactNode> = {
  "All": <Utensils className="w-8 h-8 text-gutzo-primary" />,
  "Bowls": <Utensils className="w-8 h-8 text-blue-500" />,
  "Beverages": <Coffee className="w-8 h-8 text-green-500" />,
  "Salads": <Leaf className="w-8 h-8 text-green-600" />,
  "Wraps": <Utensils className="w-8 h-8 text-orange-500" />,
  "Desserts": <Apple className="w-8 h-8 text-pink-500" />,
  "Pasta": <Utensils className="w-8 h-8 text-red-500" />,
  // Legacy categories
  "Fruit Bowls": <Apple className="w-8 h-8 text-orange-500" />,
  "Smoothies": <Coffee className="w-8 h-8 text-green-500" />,
  "Meals": <Utensils className="w-8 h-8 text-blue-500" />,
  "Fruits": <Grape className="w-8 h-8 text-purple-500" />,
  "Toppings": <Leaf className="w-8 h-8 text-green-600" />,
  "Vegetarian": <Leaf className="w-8 h-8 text-green-700" />,
  "Protein": <Utensils className="w-8 h-8 text-red-500" />
};