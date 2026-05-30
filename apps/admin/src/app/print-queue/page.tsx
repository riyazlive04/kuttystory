'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Printer,
  FileText,
  CheckCircle,
  Truck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { adminApi } from '@/lib/api';

const PRINT_STATUSES = [
  'ALL',
  'QUEUED',
  'PDF_GENERATING',
  'PDF_READY',
  'PRINTING',
  'BINDING',
  'QC_CHECK',
  'READY_TO_SHIP',
  'FAILED',
] as const;

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  QUEUED: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: FileText },
  PDF_GENERATING: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: RefreshCw },
  PDF_READY: { color: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: FileText },
  PRINTING: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Printer },
  BINDING: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Printer },
  QC_CHECK: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: CheckCircle },
  READY_TO_SHIP: { color: 'bg-green-100 text-green-800 border-green-200', icon: Truck },
  FAILED: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle },
};

interface PrintJob {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  pdfUrl: string | null;
  customerName: string;
  bookTitle: string;
  format: string;
  createdAt: string;
}

export default function PrintQueuePage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getPrintQueue({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setJobs(data.jobs);
    } catch {
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleGeneratePdf = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      await adminApi.generatePdf(jobId);
      await fetchJobs();
    } catch {
      // Error handled silently
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusUpdate = async (jobId: string, status: string) => {
    setActionLoading(jobId);
    try {
      const trackingNumber = trackingInputs[jobId];
      await adminApi.updatePrintJobStatus(jobId, status, trackingNumber || undefined);
      await fetchJobs();
    } catch {
      // Error handled silently
    } finally {
      setActionLoading(null);
    }
  };

  // Group jobs by status for kanban-style view
  const groupedJobs = PRINT_STATUSES.filter((s) => s !== 'ALL').reduce(
    (acc, status) => {
      acc[status] = jobs.filter((j) => j.status === status);
      return acc;
    },
    {} as Record<string, PrintJob[]>,
  );

  const isKanbanView = statusFilter === 'ALL';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Print Queue</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Manage print jobs from PDF generation to shipping
          </p>
        </div>
        <button
          onClick={fetchJobs}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {PRINT_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === status
                ? 'bg-brand-600 text-white'
                : 'border bg-white hover:bg-[hsl(var(--muted))]'
            }`}
          >
            {status === 'ALL' ? 'All' : status.replace(/_/g, ' ')}
            {status !== 'ALL' && (
              <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                {groupedJobs[status]?.length ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : isKanbanView ? (
        /* Kanban View */
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(Object.entries(groupedJobs) as Array<[string, PrintJob[]]>)
            .filter(([, items]) => items.length > 0)
            .map(([status, items]) => {
              const config = STATUS_CONFIG[status] || STATUS_CONFIG.QUEUED;
              const StatusIcon = config.icon;
              return (
                <div key={status} className="rounded-xl border bg-white shadow-sm">
                  <div className={`flex items-center gap-2 rounded-t-xl border-b px-4 py-3 ${config.color}`}>
                    <StatusIcon className="h-4 w-4" />
                    <span className="text-sm font-semibold">{status.replace(/_/g, ' ')}</span>
                    <span className="ml-auto rounded-full bg-white/50 px-2 py-0.5 text-xs font-bold">
                      {items.length}
                    </span>
                  </div>
                  <div className="max-h-96 space-y-2 overflow-y-auto p-3">
                    {items.map((job) => (
                      <PrintJobCard
                        key={job.id}
                        job={job}
                        isActionLoading={actionLoading === job.id}
                        trackingValue={trackingInputs[job.id] || ''}
                        onTrackingChange={(v) =>
                          setTrackingInputs((prev) => ({ ...prev, [job.id]: v }))
                        }
                        onGeneratePdf={() => handleGeneratePdf(job.id)}
                        onStatusUpdate={(s) => handleStatusUpdate(job.id, s)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          {Object.values(groupedJobs).every((items) => items.length === 0) && (
            <div className="col-span-full py-12 text-center text-[hsl(var(--muted-foreground))]">
              No print jobs in the queue
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="space-y-3">
          {jobs.length === 0 ? (
            <div className="py-12 text-center text-[hsl(var(--muted-foreground))]">
              No jobs with status {statusFilter.replace(/_/g, ' ')}
            </div>
          ) : (
            jobs.map((job) => (
              <PrintJobCard
                key={job.id}
                job={job}
                isActionLoading={actionLoading === job.id}
                trackingValue={trackingInputs[job.id] || ''}
                onTrackingChange={(v) =>
                  setTrackingInputs((prev) => ({ ...prev, [job.id]: v }))
                }
                onGeneratePdf={() => handleGeneratePdf(job.id)}
                onStatusUpdate={(s) => handleStatusUpdate(job.id, s)}
                horizontal
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function PrintJobCard({
  job,
  isActionLoading,
  trackingValue,
  onTrackingChange,
  onGeneratePdf,
  onStatusUpdate,
  horizontal = false,
}: {
  job: PrintJob;
  isActionLoading: boolean;
  trackingValue: string;
  onTrackingChange: (v: string) => void;
  onGeneratePdf: () => void;
  onStatusUpdate: (status: string) => void;
  horizontal?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-white p-3 shadow-sm ${horizontal ? 'flex items-center gap-4' : ''}`}
    >
      <div className={horizontal ? 'flex-1' : ''}>
        <p className="text-sm font-medium">{job.bookTitle}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {job.orderNumber} - {job.customerName}
        </p>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {job.format.replace(/_/g, ' ')} | {new Date(job.createdAt).toLocaleDateString('en-IN')}
        </p>
      </div>

      <div className={`flex flex-wrap gap-1.5 ${horizontal ? '' : 'mt-2'}`}>
        {job.status === 'QUEUED' && (
          <button
            onClick={onGeneratePdf}
            disabled={isActionLoading}
            className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Generate PDF
          </button>
        )}
        {job.status === 'PDF_READY' && (
          <>
            {job.pdfUrl && (
              <a
                href={job.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-cyan-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-cyan-700"
              >
                Download PDF
              </a>
            )}
            <button
              onClick={() => onStatusUpdate('PRINTING')}
              disabled={isActionLoading}
              className="rounded bg-purple-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              Mark Printing
            </button>
          </>
        )}
        {job.status === 'PRINTING' && (
          <button
            onClick={() => onStatusUpdate('BINDING')}
            disabled={isActionLoading}
            className="rounded bg-orange-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            Mark Binding
          </button>
        )}
        {job.status === 'BINDING' && (
          <button
            onClick={() => onStatusUpdate('QC_CHECK')}
            disabled={isActionLoading}
            className="rounded bg-yellow-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
          >
            Mark QC
          </button>
        )}
        {job.status === 'QC_CHECK' && (
          <button
            onClick={() => onStatusUpdate('READY_TO_SHIP')}
            disabled={isActionLoading}
            className="rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Mark Ready to Ship
          </button>
        )}
        {job.status === 'READY_TO_SHIP' && (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Tracking #"
              value={trackingValue}
              onChange={(e) => onTrackingChange(e.target.value)}
              className="w-32 rounded border px-2 py-1 text-xs outline-none focus:border-brand-500"
            />
            <button
              onClick={() => onStatusUpdate('SHIPPED')}
              disabled={isActionLoading || !trackingValue.trim()}
              className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Mark Shipped
            </button>
          </div>
        )}
        {job.status === 'FAILED' && (
          <button
            onClick={() => onStatusUpdate('QUEUED')}
            disabled={isActionLoading}
            className="rounded bg-gray-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
