'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, Trash2 } from 'lucide-react';
import { DataTable, type Column } from '@/components/data-table';
import { adminApi } from '@/lib/api';

const ORDER_STATUSES = [
  'ALL',
  'PENDING_PAYMENT',
  'PAID',
  'AWAITING_APPROVAL',
  'IN_PRODUCTION',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
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

interface OrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalInr: number;
  createdAt: string;
  itemCount: number;
}

function formatCurrency(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(paise / 100);
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const limit = 20;

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getOrders({
        page,
        limit,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search || undefined,
        sortBy,
        sortOrder,
      });
      setOrders(data.orders);
      setTotal(data.total);
    } catch {
      setOrders([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, search, sortBy, sortOrder]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  };

  const handleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (row: OrderRow) => {
    const ok = window.confirm(
      `Delete order ${row.orderNumber}? This permanently removes the order (use for test orders only).`,
    );
    if (!ok) return;
    setDeletingId(row.id);
    try {
      await adminApi.deleteOrder(row.id);
      await fetchOrders();
    } catch {
      window.alert('Could not delete the order. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: Column<OrderRow>[] = [
    {
      key: 'select',
      label: '',
      className: 'w-10',
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            handleSelect(row.id);
          }}
          className="rounded border-gray-300"
        />
      ),
    },
    {
      key: 'orderNumber',
      label: 'Order',
      sortable: true,
      render: (row) => <span className="font-medium">{row.orderNumber}</span>,
    },
    {
      key: 'customerName',
      label: 'Customer',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium">{row.customerName}</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{row.customerEmail}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
            STATUS_COLORS[row.status] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {row.status.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'itemCount',
      label: 'Items',
      className: 'text-center',
      render: (row) => <span className="text-center">{row.itemCount}</span>,
    },
    {
      key: 'totalInr',
      label: 'Total',
      sortable: true,
      className: 'text-right',
      render: (row) => (
        <span className="font-medium">{formatCurrency(row.totalInr)}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
      sortable: true,
      render: (row) => (
        <span className="text-[hsl(var(--muted-foreground))]">
          {new Date(row.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'w-10 text-right',
      render: (row) => (
        <button
          title="Delete order"
          disabled={deletingId === row.id}
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(row);
          }}
          className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Manage and track all customer orders
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Search by order number, customer name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'All Statuses' : s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              {selectedIds.size} selected
            </span>
            <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">
              Bulk Update Status
            </button>
          </div>
        )}
      </div>

      {/* Select All */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={orders.length > 0 && selectedIds.size === orders.length}
          onChange={handleSelectAll}
          className="rounded border-gray-300"
        />
        <span className="text-xs text-[hsl(var(--muted-foreground))]">Select all on page</span>
      </div>

      {/* Table */}
      <DataTable<OrderRow>
        columns={columns}
        data={orders}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onSort={(key, order) => {
          setSortBy(key);
          setSortOrder(order);
        }}
        onRowClick={(row) => router.push(`/orders/${row.id}`)}
        isLoading={isLoading}
        emptyMessage="No orders found matching your filters."
      />
    </div>
  );
}
