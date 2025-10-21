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
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
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
          {orders.map(order => {
            const expanded = expandedOrderIds.has(order.id);
            return (
              <div
                key={order.id}
                className={`border rounded-xl p-4 bg-white shadow transition-all duration-200 ${
                  order.status === 'delivered'
                    ? 'border-gutzo-primary bg-gutzo-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`p-3 rounded-lg ${
                      order.status === 'delivered'
                        ? 'bg-gutzo-primary text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-semibold text-gray-900">
                          Order #{order.order_number}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          order.status === 'delivered' || order.status === 'confirmed'
                            ? 'bg-gutzo-primary text-white'
                            : order.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <div className="text-gray-600 mb-1">
                        <span className="font-medium">Vendor:</span> {order.vendor_name || order.vendorName || '-'}
                      </div>
                      <div className="text-gray-600 mb-1">
                        <span className="font-medium">Placed:</span> {new Date(order.created_at).toLocaleString()}
                      </div>
                      <div className="text-gray-900 font-semibold mb-1">
                        <span className="font-medium">Total:</span> ₹{order.total_amount !== undefined && order.total_amount !== null ? Number(order.total_amount).toFixed(2) : ''}
                      </div>
                      {/* Inline expandable order details */}
                      {expanded && (
                        <div className="mb-2 mt-2 border rounded-lg bg-gray-50 p-3">
                          <div className="flex justify-between text-gray-700">
                            <span>Items ({order.items?.length || 0})</span>
                            <span>
                              ₹{order.subtotal !== undefined && order.subtotal !== null ? Number(order.subtotal).toFixed(2) : ''}
                            </span>
                          </div>
                          {order.delivery_fee > 0 && (
                            <div className="flex justify-between text-gray-700">
                              <span>Delivery Fee (incl. 18% GST)</span>
                              <span>₹{Number(order.delivery_fee).toFixed(2)}</span>
                            </div>
                          )}
                          {order.platform_fee > 0 && (
                            <div className="flex justify-between text-gray-700">
                              <span>Platform Fee (incl. 18% GST)</span>
                              <span>₹{Number(order.platform_fee).toFixed(2)}</span>
                            </div>
                          )}
                          {order.gst_items > 0 && (
                            <div className="flex justify-between text-gray-500 text-xs">
                              <span>GST included in items @5%</span>
                              <span>₹{Number(order.gst_items).toFixed(2)}</span>
                            </div>
                          )}
                          {order.gst_fees > 0 && (
                            <div className="flex justify-between text-gray-500 text-xs">
                              <span>GST included in fees @18%</span>
                              <span>₹{Number(order.gst_fees).toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold text-gray-900 border-t pt-2 mt-2">
                            <span>Total</span>
                            <span>₹{order.total_amount !== undefined && order.total_amount !== null ? Number(order.total_amount).toFixed(2) : ''}</span>
                          </div>
                          {order.payment_id && (
                            <div className="flex justify-between text-gray-600 text-xs mt-2">
                              <span>Transaction ID:</span>
                              <span className="font-mono">{order.payment_id}</span>
                            </div>
                          )}
                          <div className="text-gray-600 mb-1 mt-2">
                            <span className="font-medium">Placed:</span> {new Date(order.created_at).toLocaleString()}
                          </div>
                          <div className="text-gray-600 mb-1">
                            <span className="font-medium">Items:</span>
                            <ul className="ml-4 list-disc">
                              {order.items.map((item: any) => (
                                <li key={item.id} className="text-gray-700">
                                  {item.product_name} x {item.quantity} - ₹{item.total_price}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col items-end space-y-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gutzo-primary text-gutzo-primary hover:bg-gutzo-primary/10"
                      onClick={() => {
                        setExpandedOrderIds(prev => {
                          const next = new Set(prev);
                          if (expanded) {
                            next.delete(order.id);
                          } else {
                            next.add(order.id);
                          }
                          return next;
                        });
                      }}
                    >
                      <span className="text-xs">{expanded ? 'Hide Details' : 'View Details'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

                  // <Button
                  //   variant="outline"
                  //   size="sm"
                  //   className="border-gutzo-primary text-gutzo-primary hover:bg-gutzo-primary/10"
                  //   onClick={() => {/* TODO: Contact vendor logic */}}
                  // >
                  //   <MessageCircle className="h-4 w-4 mr-1" />
                  //   <span className="text-xs">Contact Vendor</span>
                  // </Button>