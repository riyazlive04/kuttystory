'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Package,
  CheckCircle2,
  Truck,
  Printer,
  ShieldCheck,
  MapPin,
  ExternalLink,
  Clock,
  Search,
} from 'lucide-react';
import type { OrderTrackingData, OrderTimelineEntry } from '@kutty-story/shared';
import { Badge, Button, Input } from '@kutty-story/ui';
import { api } from '@/lib/api';

const statusConfig: Record<
  string,
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  PLACED: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Order Placed',
  },
  CONFIRMED: {
    icon: CheckCircle2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Confirmed',
  },
  PRINTING: {
    icon: Printer,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'Printing',
  },
  QUALITY_CHECK: {
    icon: ShieldCheck,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Quality Check',
  },
  SHIPPED: {
    icon: Package,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    label: 'Shipped',
  },
  OUT_FOR_DELIVERY: {
    icon: Truck,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Out for Delivery',
  },
  DELIVERED: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Delivered',
  },
  CANCELLED: {
    icon: Clock,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Cancelled',
  },
};

const statusOrder = [
  'PLACED',
  'CONFIRMED',
  'PRINTING',
  'QUALITY_CHECK',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

// Mock data for demo
const mockTrackingData: OrderTrackingData = {
  orderNumber: 'KS-2026-000042',
  status: 'PRINTING',
  estimatedDelivery: '2026-06-08',
  trackingUrl: undefined,
  timeline: [
    {
      status: 'PLACED',
      timestamp: '2026-05-25T10:30:00Z',
      description: 'Your order has been placed successfully.',
    },
    {
      status: 'CONFIRMED',
      timestamp: '2026-05-25T11:00:00Z',
      description: 'Payment confirmed. Your book is being prepared.',
    },
    {
      status: 'PRINTING',
      timestamp: '2026-05-27T09:00:00Z',
      description: 'Your personalized storybook is now being printed.',
    },
  ],
};

export default function OrderTrackingPage() {
  const params = useParams();
  const orderNumber = params.orderNumber as string;
  const [trackingData, setTrackingData] =
    useState<OrderTrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTracking() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get<OrderTrackingData>(
          `/orders/${orderNumber}/track`,
        );
        if (res.success && res.data) {
          setTrackingData(res.data);
        } else {
          throw new Error(res.error ?? 'Order not found');
        }
      } catch {
        // Use mock data for demo
        if (orderNumber) {
          setTrackingData({
            ...mockTrackingData,
            orderNumber: orderNumber.toUpperCase(),
          });
        } else {
          setError('Order not found. Please check your order number.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (orderNumber) {
      fetchTracking();
    }
  }, [orderNumber]);

  const currentStatusIndex = trackingData
    ? statusOrder.indexOf(trackingData.status)
    : -1;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-brand-soft flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="h-10 w-10 rounded-full border-3 border-purple-200 border-t-purple-600"
        />
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className="min-h-screen bg-gradient-brand-soft">
        <div className="container-custom py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Search className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="font-heading text-2xl font-bold mb-2">
            Order Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            {error ?? 'We could not find an order with that number.'}
          </p>
        </div>
      </div>
    );
  }

  const currentConfig = statusConfig[trackingData.status] ?? statusConfig.PLACED;

  return (
    <div className="min-h-screen bg-gradient-brand-soft">
      {/* Header */}
      <section className="bg-gradient-brand py-12 sm:py-16">
        <div className="container-custom text-center">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-2">
            Track Your Order
          </h1>
          <p className="text-white/70 text-lg font-mono">
            {trackingData.orderNumber}
          </p>
        </div>
      </section>

      <div className="container-custom py-8 sm:py-12 max-w-3xl">
        {/* Current status card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${currentConfig.bgColor}`}
            >
              <currentConfig.icon
                className={`h-7 w-7 ${currentConfig.color}`}
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Status</p>
              <h2 className="font-heading text-xl font-bold">
                {currentConfig.label}
              </h2>
            </div>
            <Badge
              className={`ml-auto ${currentConfig.bgColor} ${currentConfig.color} border-0`}
            >
              {trackingData.status.replace(/_/g, ' ')}
            </Badge>
          </div>

          {/* Estimated delivery */}
          {trackingData.estimatedDelivery && (
            <div className="flex items-center gap-3 rounded-lg bg-purple-50 p-4">
              <MapPin className="h-5 w-5 text-purple-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Estimated Delivery</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(trackingData.estimatedDelivery).toLocaleDateString(
                    'en-IN',
                    {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    },
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Tracking link */}
          {trackingData.trackingUrl && (
            <a
              href={trackingData.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700"
            >
              Track with courier
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </motion.div>

        {/* Progress steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm mb-8"
        >
          <h3 className="font-heading font-bold text-lg mb-6">
            Order Progress
          </h3>

          <div className="space-y-0">
            {statusOrder.map((status, idx) => {
              const config = statusConfig[status];
              const isCompleted = idx <= currentStatusIndex;
              const isCurrent = idx === currentStatusIndex;
              const isLast = idx === statusOrder.length - 1;

              return (
                <div key={status} className="flex gap-4">
                  {/* Timeline line + dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 transition-colors ${
                        isCompleted
                          ? isCurrent
                            ? 'bg-gradient-brand text-white shadow-md shadow-purple-200'
                            : 'bg-purple-100 text-purple-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <config.icon className="h-4 w-4" />
                    </div>
                    {!isLast && (
                      <div
                        className={`w-0.5 h-10 ${
                          idx < currentStatusIndex
                            ? 'bg-purple-300'
                            : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-8">
                    <p
                      className={`text-sm font-semibold ${
                        isCompleted ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {config.label}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-purple-600 mt-0.5">
                        In progress
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Timeline details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm"
        >
          <h3 className="font-heading font-bold text-lg mb-6">
            Timeline
          </h3>

          <div className="space-y-4">
            {trackingData.timeline
              .slice()
              .reverse()
              .map((entry, idx) => {
                const config = statusConfig[entry.status] ?? statusConfig.PLACED;

                return (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${config.bgColor}`}
                    >
                      <config.icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">
                        {config.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.description}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {new Date(entry.timestamp).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      {new Date(entry.timestamp).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                );
              })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
