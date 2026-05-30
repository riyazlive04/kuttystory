'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  CreditCard,
  Truck,
  CheckCircle2,
  Clock,
  User,
  MapPin,
} from 'lucide-react';
import { adminApi } from '@/lib/api';

const STATUS_STEPS = [
  'PENDING_PAYMENT',
  'PAID',
  'AWAITING_APPROVAL',
  'IN_PRODUCTION',
  'SHIPPED',
  'DELIVERED',
] as const;

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-blue-100 text-blue-800',
  AWAITING_APPROVAL: 'bg-orange-100 text-orange-800',
  IN_PRODUCTION: 'bg-purple-100 text-purple-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
};

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  customer: { id: string; name: string; email: string; phone: string };
  items: Array<{
    id: string;
    bookId: string;
    format: string;
    quantity: number;
    unitPriceInr: number;
    totalPriceInr: number;
    book: { childNameInBook: string; storyTemplate: { title: string } };
  }>;
  subtotalInr: number;
  discountInr: number;
  taxInr: number;
  shippingInr: number;
  totalInr: number;
  shippingAddress: Record<string, string> | null;
  trackingNumber: string | null;
  razorpayPaymentId: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  timeline: Array<{ status: string; timestamp: string; description: string }>;
}

function formatCurrency(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(paise / 100);
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const orderId = params.id as string;

  useEffect(() => {
    adminApi
      .getOrder(orderId)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setIsLoading(false));
  }, [orderId]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return;
    setIsUpdating(true);
    try {
      await adminApi.updateOrderStatus(order.id, newStatus);
      // Refetch order
      const updated = await adminApi.getOrder(orderId);
      setOrder(updated);
    } catch {
      // Error handled silently
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium">Order not found</p>
        <button
          onClick={() => router.push('/orders')}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const currentStepIdx = STATUS_STEPS.indexOf(order.status as typeof STATUS_STEPS[number]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/orders')}
          className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Order {order.orderNumber}</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <span
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Status Update Buttons */}
      {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
        <div className="flex flex-wrap gap-2 rounded-lg border bg-white p-4">
          <p className="mr-2 text-sm font-medium self-center">Update Status:</p>
          {STATUS_STEPS.filter((_, i) => i > currentStepIdx).map((status) => (
            <button
              key={status}
              onClick={() => handleStatusUpdate(status)}
              disabled={isUpdating}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-brand-50 hover:border-brand-300 disabled:opacity-50"
            >
              {status.replace(/_/g, ' ')}
            </button>
          ))}
          <button
            onClick={() => handleStatusUpdate('CANCELLED')}
            disabled={isUpdating}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            CANCEL
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Package className="h-5 w-5" /> Items
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 rounded-lg border p-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Package className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.book.storyTemplate.title}</p>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      For: {item.book.childNameInBook} | Format: {item.format.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold">{formatCurrency(item.totalPriceInr)}</p>
                </div>
              ))}
            </div>

            {/* Price Summary */}
            <div className="mt-6 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Subtotal</span>
                <span>{formatCurrency(order.subtotalInr)}</span>
              </div>
              {order.discountInr > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discountInr)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Tax</span>
                <span>{formatCurrency(order.taxInr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Shipping</span>
                <span>{order.shippingInr === 0 ? 'Free' : formatCurrency(order.shippingInr)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(order.totalInr)}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Clock className="h-5 w-5" /> Timeline
            </h2>
            <div className="space-y-0">
              {order.timeline.map((entry, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100">
                      <CheckCircle2 className="h-4 w-4 text-brand-600" />
                    </div>
                    {idx < order.timeline.length - 1 && (
                      <div className="w-px flex-1 bg-[hsl(var(--border))]" />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className="font-medium">{entry.description}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(entry.timestamp).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <User className="h-5 w-5" /> Customer
            </h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{order.customer.name}</p>
              <p className="text-[hsl(var(--muted-foreground))]">{order.customer.email}</p>
              {order.customer.phone && (
                <p className="text-[hsl(var(--muted-foreground))]">{order.customer.phone}</p>
              )}
              <button
                onClick={() => router.push(`/customers?search=${order.customer.email}`)}
                className="mt-2 text-xs text-brand-600 hover:underline"
              >
                View customer profile
              </button>
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <CreditCard className="h-5 w-5" /> Payment
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Status</span>
                <span className={order.paidAt ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
                  {order.paidAt ? 'Paid' : 'Pending'}
                </span>
              </div>
              {order.razorpayPaymentId && (
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">Razorpay ID</span>
                  <span className="font-mono text-xs">{order.razorpayPaymentId}</span>
                </div>
              )}
              {order.paidAt && (
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">Paid At</span>
                  <span>{new Date(order.paidAt).toLocaleDateString('en-IN')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Shipping */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Truck className="h-5 w-5" /> Shipping
            </h2>
            {order.shippingAddress ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                  <div>
                    <p className="font-medium">{order.shippingAddress.fullName}</p>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      {order.shippingAddress.addressLine1}
                      {order.shippingAddress.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
                    </p>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                    </p>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      Phone: {order.shippingAddress.phone}
                    </p>
                  </div>
                </div>
                {order.trackingNumber && (
                  <div className="mt-3 rounded-lg bg-[hsl(var(--muted))] p-3">
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Tracking Number</p>
                    <p className="font-mono font-medium">{order.trackingNumber}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">No shipping address provided</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
