'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  IndianRupee,
  Printer,
  BookOpen,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { StatsCard } from '@/components/stats-card';
import { adminApi } from '@/lib/api';

interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  pendingPrintJobs: number;
  activeStories: number;
  revenueChart: Array<{ date: string; revenue: number }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
  aiCostAvg7d: number;
}

// Placeholder data for initial rendering
const PLACEHOLDER_CHART = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toISOString().split('T')[0],
  revenue: Math.floor(Math.random() * 50000) + 10000,
}));

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

function formatCurrency(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(paise / 100);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getDashboardStats()
      .then(setStats)
      .catch(() => {
        // Use placeholder on error
        setStats({
          todayOrders: 0,
          todayRevenue: 0,
          pendingPrintJobs: 0,
          activeStories: 0,
          revenueChart: PLACEHOLDER_CHART,
          recentOrders: [],
          aiCostAvg7d: 0,
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const chartData = stats?.revenueChart ?? PLACEHOLDER_CHART;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Overview of your store performance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/orders"
          className="rounded-xl transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <StatsCard
            title="Today's Orders"
            value={isLoading ? '--' : stats?.todayOrders ?? 0}
            icon={ShoppingCart}
          />
        </Link>
        <Link
          href="/orders"
          className="rounded-xl transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <StatsCard
            title="Today's Revenue"
            value={isLoading ? '--' : formatCurrency(stats?.todayRevenue ?? 0)}
            icon={IndianRupee}
          />
        </Link>
        <Link
          href="/print-queue"
          className="rounded-xl transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <StatsCard
            title="Pending Print Jobs"
            value={isLoading ? '--' : stats?.pendingPrintJobs ?? 0}
            icon={Printer}
          />
        </Link>
        <Link
          href="/stories"
          className="rounded-xl transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <StatsCard
            title="Active Stories"
            value={isLoading ? '--' : stats?.activeStories ?? 0}
            icon={BookOpen}
          />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Revenue (Last 14 Days)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c026d3" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#c026d3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: number) => `${(v / 100).toLocaleString('en-IN')}`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  labelFormatter={(label: string) => `Date: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#c026d3"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Cost Widget */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">AI Generation Costs</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">7-Day Rolling Average</p>
              <p className="text-3xl font-bold text-brand-600">
                {isLoading ? '--' : formatCurrency(stats?.aiCostAvg7d ?? 0)}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">per book generation</p>
            </div>
            <div className="rounded-lg bg-[hsl(var(--muted))] p-4">
              <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Budget Limit</p>
              <p className="text-sm font-semibold">INR 40.00 / book</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all"
                  style={{
                    width: `${Math.min(((stats?.aiCostAvg7d ?? 0) / 40_00) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[hsl(var(--muted-foreground))]">
                <th className="pb-3 pr-4 font-medium">Order</th>
                <th className="pb-3 pr-4 font-medium">Customer</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium text-right">Total</th>
                <th className="pb-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[hsl(var(--muted-foreground))]">
                    Loading...
                  </td>
                </tr>
              ) : (stats?.recentOrders ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[hsl(var(--muted-foreground))]">
                    No orders yet
                  </td>
                </tr>
              ) : (
                (stats?.recentOrders ?? []).map((order) => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{order.orderNumber}</td>
                    <td className="py-3 pr-4">{order.customerName}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right font-medium">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="py-3 text-[hsl(var(--muted-foreground))]">
                      {new Date(order.createdAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
