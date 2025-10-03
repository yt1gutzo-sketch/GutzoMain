# Product Availability System - Gutzo Marketplace

## Overview
The Gutzo marketplace implements a comprehensive product availability system that shows all products (available and unavailable) with unavailable items displayed in a disabled state. This system provides graceful fallbacks to handle both database-supported and mock data scenarios.

## System Components

### 1. Data Layer
- **Product Interface**: Includes `available: boolean` field in the Product type
- **Mock Data**: Contains realistic availability distributions (approximately 70% available, 30% unavailable)
- **Database Fallback**: Server gracefully handles missing `available` column with smart defaults

### 2. Backend Implementation
- **Graceful Fallback**: If database lacks `available` column, uses deterministic algorithm based on product name hash
- **Consistent Availability**: Same products maintain consistent availability across requests
- **Realistic Distribution**: Approximately 30% products unavailable (realistic scenario)

### 3. Frontend Features

#### VendorCard Enhancements
- **Availability Badges**: Shows "All Available", "X Available", or "Limited Stock" indicators
- **Visual Summary**: Displays available/total product counts (e.g., "5/8 items")
- **Status Colors**: 
  - Green for all available
  - Orange for partial availability
  - Red for limited stock

#### MenuDrawer Features
- **Disabled State Rendering**: Unavailable products shown with:
  - Grayscale + opacity effects on images
  - "N/A" overlay on product images
  - "Not Available Today" badges
  - Disabled order buttons
  - Grayed-out text and tags

#### User Experience
- **Clear Visual Feedback**: Unavailable items are clearly distinguishable
- **Informative Messages**: Toast notifications explain why orders can't be placed
- **Accessibility**: Screen reader friendly with appropriate ARIA labels
- **Consistent UX**: Same disabled styling patterns across all components

## Implementation Details

### Database Schema Support
```sql
-- When available column exists in products table
ALTER TABLE products ADD COLUMN available BOOLEAN DEFAULT true;
```

### Fallback Algorithm
When database doesn't have `available` column:
```typescript
// Deterministic availability based on product name hash
const nameHash = product.name.split('').reduce((hash, char) => {
  return ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff;
}, 0);
// 30% unavailable rate
const available = Math.abs(nameHash) % 10 > 2;
```

### Visual States
1. **Available Products**: Normal rendering with full colors
2. **Unavailable Products**: 
   - 50% opacity + grayscale filter on images
   - "N/A" red overlay badge
   - Gray text colors
   - Disabled interaction buttons
   - "Not Available Today" status badge

## Configuration

### Availability Rate
The fallback system uses a 70/30 split (70% available). To modify:
```typescript
// Change the threshold in server/index.tsx
const available = Math.abs(nameHash) % 10 > X; // X=2 for 30% unavailable
```

### Visual Styling
All availability styles use Gutzo brand colors:
- Available: `text-gutzo-selected` (#026254)
- Unavailable: `text-gray-400`
- Warning: `text-orange-700`

## User Flow

1. **Vendor List**: Shows availability summary on vendor cards
2. **Menu Browse**: All products visible, unavailable ones clearly marked
3. **Order Attempt**: Disabled buttons + informative error messages
4. **WhatsApp Integration**: Only available products can be ordered

## Testing Scenarios

### With Database Support
- Products with `available: true` → Normal rendering
- Products with `available: false` → Disabled state rendering

### Without Database Support (Fallback)
- Consistent pseudo-random availability per product
- Mix of available/unavailable items for demonstration
- Graceful degradation with no errors

## Benefits

1. **Complete Transparency**: Users see all offerings, not just available ones
2. **Informed Decisions**: Clear availability status helps users choose alternatives
3. **Vendor Benefits**: Showcases full menu even when items temporarily unavailable
4. **Future-Proof**: Ready for real-time inventory integration
5. **Accessible**: Screen reader and keyboard navigation friendly

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live availability changes
2. **Inventory Management**: Vendor dashboard for managing availability
3. **Waitlist Feature**: Allow users to request notification when items become available
4. **Availability Schedule**: Support for time-based availability (breakfast/lunch items)
5. **Quantity Limits**: Show remaining quantity for limited items

## Technical Notes

- No breaking changes to existing API contracts
- Maintains backward compatibility
- Graceful error handling throughout
- Performance optimized with minimal re-renders
- Mobile-responsive design patterns maintained