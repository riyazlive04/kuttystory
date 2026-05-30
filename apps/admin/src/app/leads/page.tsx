'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, Phone, Mail, Download, Loader2, Trash2 } from 'lucide-react';
import { DataTable, type Column } from '@/components/data-table';
import { adminApi } from '@/lib/api';

interface LeadRow {
  bookId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  childName: string | null;
  story: string | null;
  status: string;
  ordered: boolean;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  GENERATING_PREVIEW: 'Generating preview',
  PREVIEW_READY: 'Preview ready',
  GENERATING_FULL: 'Generating full book',
  PENDING_APPROVAL: 'Full book ready',
  APPROVED: 'Approved',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const limit = 20;

  const handleDownload = async (bookId: string) => {
    setDownloadingId(bookId);
    try {
      await adminApi.downloadBookPdf(bookId);
    } catch {
      // best-effort; a real preview/order should always have at least 1 page
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (bookId: string) => {
    if (
      !window.confirm(
        'Delete this lead and its generated pages? This cannot be undone. (Books that already have an order cannot be deleted here.)',
      )
    ) {
      return;
    }
    setDeletingId(bookId);
    try {
      await adminApi.deleteBook(bookId);
      setLeads((prev) => prev.filter((l) => l.bookId !== bookId));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : 'Could not delete this lead.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getLeads({ page, limit });
      setLeads(data.leads);
      setTotal(data.total);
    } catch {
      setLeads([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const columns: Column<LeadRow>[] = [
    {
      key: 'name',
      label: 'Contact',
      render: (row) => (
        <div>
          <p className="font-medium">{row.name || 'No name'}</p>
          {row.email && (
            <p className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
              <Mail className="h-3 w-3" />
              {row.email}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row) =>
        row.phone ? (
          <a
            href={`tel:${row.phone}`}
            className="flex items-center gap-1.5 font-medium text-brand-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="h-3.5 w-3.5" />
            {row.phone}
          </a>
        ) : (
          <span className="text-[hsl(var(--muted-foreground))]">--</span>
        ),
    },
    {
      key: 'childName',
      label: 'Child',
      render: (row) => <span>{row.childName || '--'}</span>,
    },
    {
      key: 'story',
      label: 'Story',
      render: (row) => (
        <span className="text-[hsl(var(--muted-foreground))]">
          {row.story || '--'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Stage',
      render: (row) =>
        row.ordered ? (
          <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Ordered
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            {STATUS_LABELS[row.status] || row.status.replace(/_/g, ' ')}
          </span>
        ),
    },
    {
      key: 'createdAt',
      label: 'Previewed',
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
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Download generated story (PDF)"
            disabled={downloadingId === row.bookId}
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(row.bookId);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50 disabled:opacity-50"
          >
            {downloadingId === row.bookId ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            PDF
          </button>
          <button
            type="button"
            title="Delete this lead"
            disabled={deletingId === row.bookId || row.ordered}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.bookId);
            }}
            className="inline-flex items-center justify-center rounded-lg border border-red-200 p-1.5 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deletingId === row.bookId ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          People who generated a preview. Follow up to turn previews into orders.
        </p>
      </div>

      <DataTable<LeadRow>
        columns={columns}
        data={leads}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No preview leads yet."
      />
    </div>
  );
}
