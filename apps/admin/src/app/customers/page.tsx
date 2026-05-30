'use client';

import React, { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Users, ShoppingCart, Calendar } from 'lucide-react';
import { DataTable, type Column } from '@/components/data-table';
import { adminApi } from '@/lib/api';

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  orderCount: number;
  totalSpent: number;
  createdAt: string;
}

function formatCurrency(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(paise / 100);
}

export default function CustomersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [search, setSearch] = useState(initialSearch);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const limit = 20;

  const doSearch = useCallback(
    async (searchTerm: string, pageNum: number) => {
      if (!searchTerm.trim()) return;
      setIsLoading(true);
      setHasSearched(true);
      try {
        const data = await adminApi.searchCustomers({
          search: searchTerm.trim(),
          page: pageNum,
          limit,
        });
        setCustomers(data.customers);
        setTotal(data.total);
      } catch {
        setCustomers([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Auto-search if URL has search param
  React.useEffect(() => {
    if (initialSearch) {
      doSearch(initialSearch, 1);
    }
  }, [initialSearch, doSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    doSearch(search, 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    doSearch(search, newPage);
  };

  const columns: Column<CustomerRow>[] = [
    {
      key: 'name',
      label: 'Customer',
      render: (row) => (
        <div>
          <p className="font-medium">{row.name || 'No name'}</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row) => (
        <span className="text-[hsl(var(--muted-foreground))]">
          {row.phone || '--'}
        </span>
      ),
    },
    {
      key: 'orderCount',
      label: 'Orders',
      className: 'text-center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5">
          <ShoppingCart className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
          <span className="font-medium">{row.orderCount}</span>
        </div>
      ),
    },
    {
      key: 'totalSpent',
      label: 'Total Spent',
      className: 'text-right',
      render: (row) => (
        <span className="font-medium">{formatCurrency(row.totalSpent)}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Joined',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
          <Calendar className="h-3.5 w-3.5" />
          <span className="text-sm">
            {new Date(row.createdAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Search and manage customer accounts
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, phone number, or order number..."
            className="w-full rounded-lg border bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <button
          type="submit"
          disabled={!search.trim()}
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Search
        </button>
      </form>

      {/* Results */}
      {!hasSearched ? (
        <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
          <Users className="mx-auto h-12 w-12 text-[hsl(var(--muted-foreground))]" />
          <p className="mt-4 text-lg font-medium">Search for customers</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Enter an email address, phone number, or order number to find customers.
          </p>
        </div>
      ) : (
        <DataTable<CustomerRow>
          columns={columns}
          data={customers}
          total={total}
          page={page}
          limit={limit}
          onPageChange={handlePageChange}
          onRowClick={(row) => router.push(`/customers?search=${row.email}`)}
          isLoading={isLoading}
          emptyMessage="No customers found matching your search."
        />
      )}
    </div>
  );
}
