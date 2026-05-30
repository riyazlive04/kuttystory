'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  total = 0,
  page = 1,
  limit = 20,
  onPageChange,
  onSort,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No data found.',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const totalPages = Math.ceil(total / limit);

  const handleSort = (key: string) => {
    const newOrder = sortKey === key && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortOrder(newOrder);
    onSort?.(key, newOrder);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[hsl(var(--muted))]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))] ${
                    col.sortable ? 'cursor-pointer select-none hover:text-[hsl(var(--foreground))]' : ''
                  } ${col.className || ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortOrder === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={(row as { id?: string }).id || idx}
                  className={`border-b transition-colors hover:bg-[hsl(var(--muted)/0.5)] ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                      {col.render
                        ? col.render(row)
                        : ((row as Record<string, unknown>)[col.key] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t bg-[hsl(var(--muted)/0.3)] px-4 py-3">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-[hsl(var(--muted))] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-[hsl(var(--muted))] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
