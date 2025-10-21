import React, { useState, useEffect, useRef } from 'react';
import { Package, RefreshCw, Calendar, Clock, MapPin, Phone, MessageCircle, AlertCircle, CheckCircle, XCircle, Pause, Play, Edit, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/api';

// Types for orders
export interface InstantOrder {
  id: string;
  vendorName: string;
  vendorPhone: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
  status: 'placed' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  orderDate: Date;
  estimatedDelivery?: Date;
  whatsappOrderId?: string;
}

export interface SubscriptionOrder {
  id: string;
  subscriptionId: string;
  vendorName: string;
  vendorPhone: string;
  productName: string;
  productImage: string;
  mealSlots: string[];
  customTimes: Record<string, string>;
  frequency: 'Daily' | 'Weekly' | 'Custom';
  quantity: number;
  duration: string;
  totalPrice: number;
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  startDate: Date;
  endDate?: Date;
  nextDelivery?: Date;
  deliveriesCompleted: number;
  totalDeliveries: number;
  paymentId: string;
  weeklyDays?: string[];
  customDates?: Date[];
}

interface OrdersPanelProps {
  className?: string;
  onViewOrderDetails?: (orderData: any) => void;
  recentOrderData?: {
    paymentDetails: {
      paymentId: string;
      subscriptionId: string;
      method: string;
      amount: number;
      date: string;
    };
    orderSummary: {
      items: number;
      vendor: string;
      orderType: string;
      quantity: string;
      estimatedDelivery: string;
    };
  } | null;
}

export function OrdersPanel({ className = "", onViewOrderDetails, recentOrderData }: OrdersPanelProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const highlightedOrderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.phone) {
      fetchOrders(user.phone);
    }
  }, [user, recentOrderData]);

  const fetchOrders = async (phone: string) => {
    setLoading(true);
    try {
      const resp = await apiService.getOrders(phone);
      setOrders(resp.orders || []);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Set highlighted order and clear it after a delay (optional, can be re-added if needed)

  // Removed localStorage logic. Orders are now fetched from backend.


  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 bg-gray-50 rounded-xl animate-pulse">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-gray-300 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!loading && orders.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-16">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">No Orders Yet</h3>
          <p className="text-gray-600 text-sm mb-6">
            Your order history will appear here once you place your first order.
          </p>
          <div className="space-y-3">
            <Button 
              className="w-full bg-gutzo-primary hover:bg-gutzo-primary-hover text-white"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              🛒 Order More Delicious Meals
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <h2 className="text-xl font-bold mb-4">Your Orders</h2>
      {loading ? (
        <div>Loading orders...</div>
      ) : orders.length === 0 ? (
        <div>No orders found.</div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="border rounded-lg p-4 bg-white shadow">
              <div className="font-semibold">Order #{order.order_number}</div>
              <div>Status: {order.status}</div>
              <div>Total: ₹{order.total_amount}</div>
              <div>Placed: {new Date(order.created_at).toLocaleString()}</div>
              <div>Items:
                <ul className="ml-4 list-disc">
                  {order.items.map((item: any) => (
                    <li key={item.id}>{item.product_name} x {item.quantity} - ₹{item.total_price}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}