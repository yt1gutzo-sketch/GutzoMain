import React, { useState } from 'react';
import { X, RefreshCw, Calendar, Coffee, Utensils, Cookie, Moon, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Product, Vendor } from '../types';

interface SubscriptionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  vendor: Vendor;
  onConfirmSubscription: (subscriptionData: SubscriptionData) => void;
}

export interface SubscriptionData {
  productId: string;
  frequency: 'Daily' | 'Weekly' | 'Custom';
  mealSlots: string[]; // Meal slots array
  customTimes: Record<string, string>; // Custom delivery times per slot
  quantity: number;
  duration: 'Trial Week' | '1 Month' | '3 Months' | 'Auto-renew';
  totalPrice: number;
  weeklyDays?: string[]; // For weekly frequency
  customDates?: Date[]; // For custom frequency
}

const FREQUENCY_OPTIONS = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Custom', label: 'Custom' }
] as const;

const MEAL_SLOTS = [
  { 
    value: 'Breakfast', 
    label: 'Breakfast', 
    time: '7–10 AM', 
    icon: Coffee,
    startHour: 7,
    endHour: 10,
    defaultTime: '8:30 AM'
  },
  { 
    value: 'Lunch', 
    label: 'Lunch', 
    time: '12–2 PM', 
    icon: Utensils,
    startHour: 12,
    endHour: 14,
    defaultTime: '1:00 PM'
  },
  { 
    value: 'Snacks', 
    label: 'Snacks', 
    time: '4–6 PM', 
    icon: Cookie,
    startHour: 16,
    endHour: 18,
    defaultTime: '5:00 PM'
  },
  { 
    value: 'Dinner', 
    label: 'Dinner', 
    time: '7–9 PM', 
    icon: Moon,
    startHour: 19,
    endHour: 21,
    defaultTime: '8:00 PM'
  }
];

const QUANTITY_OPTIONS = [1, 2, 3];
const DURATION_OPTIONS = [
  { value: 'Trial Week', label: 'Trial Week', days: 7 },
  { value: '1 Month', label: '1 Month', days: 30 },
  { value: '3 Months', label: '3 Months', days: 90 },
  { value: 'Auto-renew', label: 'Auto-renew', days: 30 }
] as const;

const WEEKDAYS = [
  { value: 'Mon', label: 'Mon', full: 'Monday' },
  { value: 'Tue', label: 'Tue', full: 'Tuesday' },
  { value: 'Wed', label: 'Wed', full: 'Wednesday' },
  { value: 'Thu', label: 'Thu', full: 'Thursday' },
  { value: 'Fri', label: 'Fri', full: 'Friday' },
  { value: 'Sat', label: 'Sat', full: 'Saturday' },
  { value: 'Sun', label: 'Sun', full: 'Sunday' }
];

// Generate time options for each slot
const generateTimeOptions = (startHour: number, endHour: number) => {
  const times = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === endHour && minute > 0) break; // Don't go past end hour
      
      const time12 = convertTo12Hour(hour, minute);
      times.push(time12);
    }
  }
  return times;
};

const convertTo12Hour = (hour: number, minute: number) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
};

const validateTimeInSlot = (time: string, startHour: number, endHour: number) => {
  const [timeStr, period] = time.split(' ');
  const [hourStr, minuteStr] = timeStr.split(':');
  let hour = parseInt(hourStr);
  const minute = parseInt(minuteStr);
  
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  
  const totalMinutes = hour * 60 + minute;
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  
  return totalMinutes >= startMinutes && totalMinutes <= endMinutes;
};

export function SubscriptionPanel({ 
  isOpen, 
  onClose, 
  product, 
  vendor, 
  onConfirmSubscription 
}: SubscriptionPanelProps) {
  const [frequency, setFrequency] = useState<'Daily' | 'Weekly' | 'Custom'>('Daily');
  const [selectedMealSlots, setSelectedMealSlots] = useState<string[]>(['Lunch']); // Default to Lunch
  const [customTimes, setCustomTimes] = useState<Record<string, string>>({
    'Lunch': '1:00 PM' // Default time for Lunch
  });
  const [quantity, setQuantity] = useState<number>(1);
  const [duration, setDuration] = useState<'Trial Week' | '1 Month' | '3 Months' | 'Auto-renew'>('Auto-renew');
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);

  if (!isOpen || !product) return null;

  // Calculation Functions
  const calculateDeliveryCount = () => {
    const durationDays = DURATION_OPTIONS.find(d => d.value === duration)?.days || 30;
    
    switch (frequency) {
      case 'Daily':
        return durationDays;
      case 'Weekly':
        const weeksInDuration = Math.ceil(durationDays / 7);
        return selectedWeekdays.length * weeksInDuration;
      case 'Custom':
        const monthsInDuration = duration === 'Trial Week' ? 1 : duration === '1 Month' || duration === 'Auto-renew' ? 1 : 3;
        return selectedDates.length * monthsInDuration;
      default:
        return 0;
    }
  };

  const calculateTotalMeals = () => {
    const deliveryCount = calculateDeliveryCount();
    return deliveryCount * selectedMealSlots.length * quantity;
  };

  const calculateTotalPrice = () => {
    const totalMeals = calculateTotalMeals();
    return Math.round(product.price * totalMeals * 0.85); // 15% subscription discount
  };

  const getPerDeliveryPrice = () => {
    return selectedMealSlots.length * quantity * product.price;
  };

  const getDeliveryPattern = () => {
    // Create detailed slot display with custom times
    const slotsWithTimes = selectedMealSlots.map(slot => {
      const customTime = customTimes[slot];
      if (customTime) {
        return `${slot} (${customTime})`;
      }
      const slotConfig = MEAL_SLOTS.find(s => s.value === slot);
      return `${slot} (${slotConfig?.defaultTime || ''})`;
    });
    
    const slotsText = slotsWithTimes.join(', ');
    
    switch (frequency) {
      case 'Daily':
        return `${slotsText}, Every day`;
      case 'Weekly':
        const daysText = selectedWeekdays.length > 0 ? selectedWeekdays.join('–') : 'Select days';
        return `${slotsText}, ${daysText}`;
      case 'Custom':
        return `${slotsText}, ${selectedDates.length} selected dates`;
      default:
        return '';
    }
  };

  const getCalculationBreakdown = () => {
    const deliveryCount = calculateDeliveryCount();
    const slots = selectedMealSlots.length;
    
    switch (frequency) {
      case 'Daily':
        return `${slots} slot${slots > 1 ? 's' : ''} × ${deliveryCount} days × ${quantity} bowl${quantity > 1 ? 's' : ''} × ₹${product.price} = ₹${calculateTotalPrice().toLocaleString()}`;
      case 'Weekly':
        const durationDays = DURATION_OPTIONS.find(d => d.value === duration)?.days || 30;
        const weeks = Math.ceil(durationDays / 7);
        return `${slots} slot${slots > 1 ? 's' : ''} × ${selectedWeekdays.length} day${selectedWeekdays.length > 1 ? 's' : ''}/week × ${weeks} week${weeks > 1 ? 's' : ''} × ${quantity} bowl${quantity > 1 ? 's' : ''} × ₹${product.price} = ₹${calculateTotalPrice().toLocaleString()}`;
      case 'Custom':
        const monthsInDuration = duration === 'Trial Week' ? 1 : duration === '1 Month' || duration === 'Auto-renew' ? 1 : 3;
        return `${slots} slot${slots > 1 ? 's' : ''} × ${selectedDates.length} date${selectedDates.length > 1 ? 's' : ''} × ${monthsInDuration} month${monthsInDuration > 1 ? 's' : ''} × ${quantity} bowl${quantity > 1 ? 's' : ''} × ₹${product.price} = ₹${calculateTotalPrice().toLocaleString()}`;
      default:
        return '';
    }
  };

  // Helper Functions
  const toggleMealSlot = (slot: string) => {
    setSelectedMealSlots(prev => {
      if (prev.includes(slot)) {
        // Remove slot and its custom time
        const newCustomTimes = { ...customTimes };
        delete newCustomTimes[slot];
        setCustomTimes(newCustomTimes);
        return prev.filter(s => s !== slot);
      } else {
        // Add slot with default time
        const slotConfig = MEAL_SLOTS.find(s => s.value === slot);
        if (slotConfig) {
          setCustomTimes(prev => ({
            ...prev,
            [slot]: slotConfig.defaultTime
          }));
        }
        return [...prev, slot];
      }
    });
  };

  const updateCustomTime = (slot: string, time: string) => {
    const slotConfig = MEAL_SLOTS.find(s => s.value === slot);
    if (slotConfig && validateTimeInSlot(time, slotConfig.startHour, slotConfig.endHour)) {
      setCustomTimes(prev => ({
        ...prev,
        [slot]: time
      }));
    }
  };

  const toggleWeekday = (day: string) => {
    setSelectedWeekdays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const formatDate = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  const handleConfirm = () => {
    const subscriptionData: SubscriptionData = {
      productId: product.id,
      frequency,
      mealSlots: selectedMealSlots,
      customTimes,
      quantity,
      duration,
      totalPrice: calculateTotalPrice(),
      weeklyDays: frequency === 'Weekly' ? selectedWeekdays : undefined,
      customDates: frequency === 'Custom' ? selectedDates : undefined
    };
    
    onConfirmSubscription(subscriptionData);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[55]"
        onClick={onClose}
      />
      
      {/* Panel - Consistent width with other panels */}
      <div className="fixed top-0 right-0 h-full w-full md:w-[40%] md:min-w-[400px] md:max-w-[600px] xl:min-w-[480px] bg-white shadow-2xl z-[60] transform transition-transform duration-300 product-details-panel">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gutzo-highlight/15 to-gutzo-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gutzo-primary/15 rounded-full">
                <RefreshCw className="h-5 w-5 text-gutzo-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Subscribe & Save</h2>
                <p className="text-sm text-gray-600">{product.name} from {vendor.name}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* 1. Frequency Options */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Frequency</h3>
              <div className="grid grid-cols-3 gap-3">
                {FREQUENCY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFrequency(option.value)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      frequency === option.value
                        ? 'border-gutzo-primary bg-gutzo-primary/5 text-gutzo-primary'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                  </button>
                ))}
              </div>

              {/* Weekly Days Selection */}
              {frequency === 'Weekly' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-700 mb-3">Select delivery days:</p>
                  <div className="grid grid-cols-7 gap-2">
                    {WEEKDAYS.map((day) => (
                      <button
                        key={day.value}
                        onClick={() => toggleWeekday(day.value)}
                        className={`py-2 px-1 rounded-lg text-sm font-medium transition-all ${
                          selectedWeekdays.includes(day.value)
                            ? 'bg-gutzo-primary text-white'
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-gutzo-primary/50'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Date Selection */}
              {frequency === 'Custom' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-700 mb-3">Select specific dates:</p>
                  <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal border-2 hover:border-gutzo-primary/30"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {selectedDates.length > 0 
                          ? `${selectedDates.length} date${selectedDates.length > 1 ? 's' : ''} selected`
                          : 'Choose dates'
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="multiple"
                        selected={selectedDates}
                        onSelect={(dates) => {
                          if (Array.isArray(dates)) {
                            setSelectedDates(dates.filter(Boolean) as Date[]);
                          }
                        }}
                        className="rounded-md border"
                        disabled={(date) => date < new Date()}
                        classNames={{
                          day_selected: "bg-gutzo-primary text-white hover:bg-gutzo-primary-hover"
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {selectedDates.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {selectedDates.slice(0, 8).map((date, index) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-gutzo-primary/10 text-gutzo-primary">
                          {formatDate(date)}
                        </Badge>
                      ))}
                      {selectedDates.length > 8 && (
                        <Badge variant="secondary" className="text-xs bg-gray-100">
                          +{selectedDates.length - 8} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Meal Slots Selection with Time Picker */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Meal Slots</h3>
              <div className="space-y-3">
                {MEAL_SLOTS.map((slot) => {
                  const IconComponent = slot.icon;
                  const isSelected = selectedMealSlots.includes(slot.value);
                  
                  return (
                    <div key={slot.value}>
                      {/* Slot Selection Button */}
                      <button
                        onClick={() => toggleMealSlot(slot.value)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-gutzo-primary bg-gutzo-primary/5 text-gutzo-primary'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <IconComponent className={`h-5 w-5 ${
                              isSelected ? 'text-gutzo-primary' : 'text-gray-500'
                            }`} />
                            <div>
                              <div className="font-medium">{slot.label}</div>
                              <div className="text-xs text-gray-500">{slot.time}</div>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="text-sm text-gutzo-primary">
                              {customTimes[slot.value] || slot.defaultTime}
                            </div>
                          )}
                        </div>
                      </button>

                      {/* Time Picker Sub-option */}
                      {isSelected && (
                        <div className="mt-2 ml-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">⏱ Set delivery time:</span>
                            <Select
                              value={customTimes[slot.value] || slot.defaultTime}
                              onValueChange={(time) => updateCustomTime(slot.value, time)}
                            >
                              <SelectTrigger className="w-32 h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {generateTimeOptions(slot.startHour, slot.endHour).map((time) => (
                                  <SelectItem key={time} value={time} className="text-sm">
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Quantity Selection */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Quantity (per delivery)</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {QUANTITY_OPTIONS.map((qty) => (
                  <button
                    key={qty}
                    onClick={() => setQuantity(qty)}
                    className={`p-4 rounded-xl border-2 text-center font-medium transition-all ${
                      quantity === qty
                        ? 'border-gutzo-primary bg-gutzo-primary/5 text-gutzo-primary'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {qty} bowl{qty > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
              
              {/* Mini Total Instantly */}
              <div className="bg-gutzo-primary/10 rounded-lg p-3">
                <p className="text-sm font-medium text-gutzo-selected">
                  {selectedMealSlots.length} slot{selectedMealSlots.length > 1 ? 's' : ''} × {quantity} bowl{quantity > 1 ? 's' : ''} × ₹{product.price} = ₹{getPerDeliveryPrice().toLocaleString()} per delivery
                </p>
              </div>
            </div>

            {/* 4. Duration Selection */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Duration</h3>
              <div className="grid grid-cols-2 gap-3">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDuration(option.value)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      duration === option.value
                        ? 'border-gutzo-primary bg-gutzo-primary/5 text-gutzo-primary'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    {option.value === 'Auto-renew' && (
                      <div className="text-xs text-gray-500 mt-1">Cancel anytime</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Subscription Summary */}
            <div className="bg-gradient-to-br from-gutzo-highlight/15 to-gutzo-primary/10 rounded-xl p-5 border border-gutzo-primary/20">
              <h3 className="font-medium text-gray-900 mb-4">Subscription Summary</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery pattern:</span>
                  <span className="font-medium text-gray-900 text-right flex-1 ml-3">
                    {getDeliveryPattern()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium text-gray-900">{duration}</span>
                </div>
                
                <div className="bg-white/60 rounded-lg p-3 my-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">Calculation breakdown:</p>
                  <p className="text-xs text-gray-900 leading-relaxed">{getCalculationBreakdown()}</p>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gutzo-primary/20">
                  <span className="font-medium text-gray-900">Total Amount:</span>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gutzo-selected">
                      ₹{calculateTotalPrice().toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-4 text-center">
                Pause or skip anytime in profile.
              </p>
            </div>

            {/* 6. Benefits Section */}
            <div className="bg-gutzo-selected/8 rounded-xl p-5">
              <h3 className="font-medium text-gutzo-selected mb-3">Benefits</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Save 15% on subscription</li>
                <li>• Pause/skip anytime</li>
                <li>• Fresh meals guaranteed</li>
              </ul>
            </div>
          </div>

          {/* 7. CTA Buttons */}
          <div className="p-6 border-t border-gray-200 bg-gray-50/50 space-y-3">
            <Button
              onClick={handleConfirm}
              className="w-full bg-gradient-to-r from-gutzo-primary to-gutzo-primary-hover text-white font-medium py-3 rounded-xl hover:shadow-lg transition-all"
              disabled={
                selectedMealSlots.length === 0 ||
                (frequency === 'Weekly' && selectedWeekdays.length === 0) ||
                (frequency === 'Custom' && selectedDates.length === 0)
              }
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Confirm Subscription
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full text-gray-600 border-gray-300 hover:bg-gray-50 py-3 rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}