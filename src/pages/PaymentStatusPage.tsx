import React, { useEffect, useState, useRef } from 'react';
import { apiService } from '../utils/api';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';


export default function PaymentStatusPage() {
  const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [message, setMessage] = useState<string>('Processing your payment...');
  const [orderId, setOrderId] = useState<string>('');
  const [orderSaved, setOrderSaved] = useState(false);
  const savingOrderRef = useRef(false);
  const { items, totalAmount, getCurrentVendor, clearCart } = useCart();
  const { user } = useAuth();


  useEffect(() => {
    console.log('PhonePe payment status response1:');
    // PhonePe redirects ba
    // ck with merchantTransactionId in query or we used our own orderId
    const params = new URLSearchParams(window.location.search);
    const txnId = params.get('transactionId') || params.get('merchantTransactionId') || params.get('orderId');
    const fallback = sessionStorage.getItem('last_order_id') || '';
    const id = txnId || fallback;
    setOrderId(id || '');

    if (!id) {
      setStatus('failed');
      setMessage('Missing order identifier.');
      return;
    }

    let cancelled = false;
    let startTime = Date.now();
    async function poll() {
      try {
        const res = await apiService.getPhonePePaymentStatus(id);
        const result = res?.data || res; // handle either shape
        console.log('PhonePe payment status response:', result);
        const code = result?.code || result?.data?.code;
        const state = result?.state || result?.data?.state;
        // Treat code SUCCESS or state COMPLETED/SUCCESS as payment success
        if (code === 'SUCCESS' || state === 'COMPLETED' || state === 'SUCCESS') {
          if (!cancelled) {
            setStatus('success');
            setMessage('Payment successful! Saving order...');
            // Save order only once
            if (!orderSaved && !savingOrderRef.current) {
              savingOrderRef.current = true;
              (async () => {
                try {
                  // Prepare order payload
                  const vendor = getCurrentVendor();
                  const payload = {
                    orderId: id,
                    userPhone: user?.phone,
                    items,
                    totalAmount,
                    vendorId: vendor?.id,
                    // Add more fields as needed (address, paymentId, etc.)
                  };
                  const resp = await apiService.saveOrder(payload);
                  if (resp?.success) {
                    setOrderSaved(true);
                    setMessage('Order saved! Redirecting...');
                    // Optionally clear cart after order
                    await clearCart();
                  } else {
                    const errorMsg = resp?.error || resp?.details || 'Order save failed. Please contact support.';
                    setMessage(`Order save failed: ${errorMsg}`);
                    console.error('Order save failed:', resp);
                  }
                } catch (err: any) {
                  setMessage(`Order save failed: ${err?.message || err}`);
                  console.error('Order save exception:', err);
                }
                setTimeout(() => {
                  window.location.href = '/';
                }, 2500);
              })();
            }
          }
          return;
        }
        if ((code && code !== 'PAYMENT_PENDING') && (state && state !== 'PENDING')) {
          if (!cancelled) {
            setStatus('failed');
            setMessage('Payment failed or cancelled.');
          }
          return;
        }
      } catch (e: any) {
        // keep pending and retry
      }
      // Stop polling after 2 minutes
      if (!cancelled && Date.now() - startTime < 2 * 60 * 1000) {
        setTimeout(poll, 1500);
      } else if (!cancelled) {
        setStatus('pending');
        setMessage('Payment is still processing. Please check again later or contact support if not updated.');
      }
    }
    poll();
    return () => { cancelled = true; };
  }, [user, items, totalAmount, getCurrentVendor, clearCart, orderSaved]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-4">
          {status === 'pending' && (
            <div className="w-10 h-10 border-4 border-gutzo-primary border-t-transparent rounded-full animate-spin mx-auto" />
          )}
          {status === 'success' && (
            <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto">✓</div>
          )}
          {status === 'failed' && (
            <div className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto">✕</div>
          )}
        </div>
        <h1 className="text-xl font-semibold mb-2">Payment Status</h1>
        <p className="text-gray-600 mb-4">{message}</p>
        {orderId && <p className="text-xs text-gray-400">Order ID: {orderId}</p>}
      </div>
    </div>
  );
}
