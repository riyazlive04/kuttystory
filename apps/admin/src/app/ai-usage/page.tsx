'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CpuIcon, IndianRupee, BookOpen, Calendar } from 'lucide-react';
import { StatsCard } from '@/components/stats-card';
import { adminApi } from '@/lib/api';

interface AiUsageData {
  totalCostInr: number;
  avgCostPerBook: number;
  dailyCosts: Array<{ date: string; cost: number; count: number }>;
  logs: Array<{
    id: string;
    model: string;
    provider: string;
    action: string;
    costInr: number;
    durationMs: number;
    createdAt: string;
  }>;
  total: number;
}

function formatCurrency(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

export default function AiUsagePage() {
  const [data, setData] = useState<AiUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await adminApi.getAiUsage({
        from: fromDate,
        to: toDate,
        page,
        limit,
      });
      setData(result);
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Usage</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Monitor AI generation costs and performance
        </p>
      </div>

      {/* Date Range Picker */}
      <div className="flex flex-wrap items-center gap-3">
        <Calendar className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
        <span className="text-sm text-[hsl(var(--muted-foreground))]">to</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
        <button
          onClick={() => {
            const d = new Date();
            setToDate(d.toISOString().split('T')[0]);
            d.setDate(d.getDate() - 7);
            setFromDate(d.toISOString().split('T')[0]);
            setPage(1);
          }}
          className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-[hsl(var(--muted))]"
        >
          Last 7 days
        </button>
        <button
          onClick={() => {
            const d = new Date();
            setToDate(d.toISOString().split('T')[0]);
            d.setDate(d.getDate() - 30);
            setFromDate(d.toISOString().split('T')[0]);
            setPage(1);
          }}
          className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-[hsl(var(--muted))]"
        >
          Last 30 days
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title="Total Cost"
          value={isLoading ? '--' : formatCurrency(data?.totalCostInr ?? 0)}
          icon={IndianRupee}
          description="For selected date range"
        />
        <StatsCard
          title="Avg Cost Per Book"
          value={isLoading ? '--' : formatCurrency(data?.avgCostPerBook ?? 0)}
          icon={BookOpen}
          description="Generation cost per book"
        />
        <StatsCard
          title="Total Generations"
          value={isLoading ? '--' : data?.total ?? 0}
          icon={CpuIcon}
          description="AI generation calls"
        />
      </div>

      {/* Daily Cost Chart */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Daily Costs</h2>
        <div className="h-72">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-[hsl(var(--muted-foreground))]">
              Loading chart...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.dailyCosts ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: number) => `${(v / 100).toFixed(0)}`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'cost' ? formatCurrency(value) : value,
                    name === 'cost' ? 'Cost' : 'Generations',
                  ]}
                  labelFormatter={(label: string) => `Date: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="#c026d3"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  yAxisId={0}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Generation Logs Table */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Recent Generation Logs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[hsl(var(--muted-foreground))]">
                <th className="pb-3 pr-4 font-medium">Provider</th>
                <th className="pb-3 pr-4 font-medium">Model</th>
                <th className="pb-3 pr-4 font-medium">Action</th>
                <th className="pb-3 pr-4 font-medium text-right">Cost</th>
                <th className="pb-3 pr-4 font-medium text-right">Duration</th>
                <th className="pb-3 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[hsl(var(--muted-foreground))]">
                    Loading...
                  </td>
                </tr>
              ) : (data?.logs ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[hsl(var(--muted-foreground))]">
                    No generation logs for this period
                  </td>
                </tr>
              ) : (
                (data?.logs ?? []).map((log) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-0.5 text-xs font-medium">
                        {log.provider}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{log.model}</td>
                    <td className="py-3 pr-4">{log.action}</td>
                    <td className="py-3 pr-4 text-right font-medium">
                      {formatCurrency(log.costInr)}
                    </td>
                    <td className="py-3 pr-4 text-right text-[hsl(var(--muted-foreground))]">
                      {(log.durationMs / 1000).toFixed(1)}s
                    </td>
                    <td className="py-3 text-[hsl(var(--muted-foreground))]">
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
