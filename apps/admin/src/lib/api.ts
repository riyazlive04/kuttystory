// ──────────────────────────────────────────────────────────────
// Admin API client for Kutty Story
// ──────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class AdminApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    return url.toString();
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;
    const url = this.buildUrl(path, params);

    const response = await fetch(url, {
      ...fetchOptions,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>(path, { method: 'GET', params });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  /** Fetch a binary file (with auth) and trigger a browser download. */
  async download(path: string, fallbackName = 'download'): Promise<void> {
    const res = await fetch(this.buildUrl(path), {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ message: 'Download failed' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') || '';
    const match = cd.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] || fallbackName;

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  }
}

export const api = new AdminApiClient(API_BASE_URL);

// ─── Response envelope ───────────────────────────────────────────────────────
// Every API endpoint wraps its payload as { success, data }. These helpers
// unwrap that envelope and map the backend shape to what each page expects.

interface Envelope<T> {
  success: boolean;
  data: T;
  error?: string;
}

interface RawOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalInr: number;
  subtotalInr: number;
  discountInr: number;
  taxInr: number;
  shippingInr: number;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  trackingNumber: string | null;
  courier: string | null;
  razorpayPaymentId: string | null;
  shippingAddress: Record<string, string> | null;
  user?: { id: string; name: string | null; email: string; phone: string | null };
  items?: Array<{
    id: string;
    bookId: string;
    format: string;
    quantity: number;
    priceInr: number;
    book?: {
      child?: { name: string };
      story?: { title: string };
    };
  }>;
}

interface RawTemplate {
  id: string;
  slug: string;
  title: string;
  theme: string;
  ageMin: number;
  ageMax: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  _count?: { books?: number; pages?: number };
}

interface RawCustomer {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
  _count?: { orders?: number };
}

// ─── Typed endpoint helpers ──────────────────────────────────────────────────

export const adminApi = {
  // Dashboard
  getDashboardStats: async () => {
    const res = await api.get<Envelope<{
      ordersToday: number;
      revenueToday: number;
      ordersThisWeek: number;
      revenueThisWeek: number;
      avgAiCostPerBook: number;
      pendingPrintJobs: number;
    }>>('/admin/dashboard');
    const d = res.data;
    return {
      todayOrders: d?.ordersToday ?? 0,
      todayRevenue: d?.revenueToday ?? 0,
      pendingPrintJobs: d?.pendingPrintJobs ?? 0,
      activeStories: 0,
      revenueChart: [] as Array<{ date: string; revenue: number }>,
      recentOrders: [] as Array<{
        id: string;
        orderNumber: string;
        customerName: string;
        total: number;
        status: string;
        createdAt: string;
      }>,
      aiCostAvg7d: d?.avgAiCostPerBook ?? 0,
    };
  },

  // Orders
  getOrders: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const res = await api.get<Envelope<{ orders: RawOrder[]; total: number }>>(
      '/admin/orders',
      params,
    );
    const orders = (res.data?.orders ?? []).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.user?.name || '—',
      customerEmail: o.user?.email || '',
      status: o.status,
      totalInr: o.totalInr,
      createdAt: o.createdAt,
      itemCount: o.items?.length ?? 0,
    }));
    return {
      orders,
      total: res.data?.total ?? orders.length,
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
    };
  },

  getOrder: async (id: string) => {
    const res = await api.get<Envelope<RawOrder | null>>(`/admin/orders/${id}`);
    const o = res.data;
    if (!o) {
      throw new Error('Order not found');
    }
    const timeline: Array<{ status: string; timestamp: string; description: string }> = [
      { status: 'CREATED', timestamp: o.createdAt, description: 'Order placed' },
    ];
    if (o.paidAt) {
      timeline.push({ status: 'PAID', timestamp: o.paidAt, description: 'Payment confirmed' });
    }
    if (o.shippedAt) {
      timeline.push({
        status: 'SHIPPED',
        timestamp: o.shippedAt,
        description: `Shipped${o.courier ? ` via ${o.courier}` : ''}`,
      });
    }
    if (o.deliveredAt) {
      timeline.push({ status: 'DELIVERED', timestamp: o.deliveredAt, description: 'Delivered' });
    }
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      customer: {
        id: o.user?.id || '',
        name: o.user?.name || '—',
        email: o.user?.email || '',
        phone: o.user?.phone || '',
      },
      items: (o.items ?? []).map((it) => ({
        id: it.id,
        bookId: it.bookId,
        format: it.format,
        quantity: it.quantity,
        unitPriceInr: it.priceInr,
        totalPriceInr: (it.priceInr || 0) * (it.quantity || 1),
        book: {
          childNameInBook: it.book?.child?.name || '—',
          storyTemplate: { title: it.book?.story?.title || 'Storybook' },
        },
      })),
      subtotalInr: o.subtotalInr,
      discountInr: o.discountInr,
      taxInr: o.taxInr,
      shippingInr: o.shippingInr,
      totalInr: o.totalInr,
      shippingAddress: o.shippingAddress ?? null,
      trackingNumber: o.trackingNumber ?? null,
      razorpayPaymentId: o.razorpayPaymentId ?? null,
      paidAt: o.paidAt ?? null,
      shippedAt: o.shippedAt ?? null,
      deliveredAt: o.deliveredAt ?? null,
      createdAt: o.createdAt,
      timeline,
    };
  },

  updateOrderStatus: (id: string, status: string) =>
    api.patch(`/admin/orders/${id}/status`, { status }),

  deleteOrder: (id: string) => api.delete(`/admin/orders/${id}`),

  // Leads (people who generated a preview — for sales follow-up)
  getLeads: async (params?: { page?: number; limit?: number }) => {
    const res = await api.get<Envelope<{
      leads: Array<{
        bookId: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        childName: string | null;
        story: string | null;
        status: string;
        ordered: boolean;
        createdAt: string;
      }>;
      total: number;
    }>>('/admin/leads', params);
    return {
      leads: res.data?.leads ?? [],
      total: res.data?.total ?? 0,
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
    };
  },

  // Download the generated story PDF for any book (preview / pdf / print).
  downloadBookPdf: (bookId: string) =>
    api.download(`/admin/books/${bookId}/pdf`, `story-${bookId}.pdf`),

  // Delete a lead (book + generated pages). Fails if the book has an order.
  deleteBook: (bookId: string) => api.delete(`/admin/books/${bookId}`),

  // Print Queue (no backend endpoint yet — resolves to empty so the page renders)
  getPrintQueue: async (_params?: { status?: string }) => {
    return { jobs: [] as Array<{
      id: string;
      orderId: string;
      orderNumber: string;
      status: string;
      pdfUrl: string | null;
      customerName: string;
      bookTitle: string;
      format: string;
      createdAt: string;
    }> };
  },

  generatePdf: (jobId: string) => api.post(`/admin/print-queue/${jobId}/generate-pdf`),

  updatePrintJobStatus: (jobId: string, status: string, trackingNumber?: string) =>
    api.patch(`/admin/print-queue/${jobId}/status`, { status, trackingNumber }),

  // Stories
  getStoryTemplates: async (_params?: { page?: number; limit?: number }) => {
    const res = await api.get<Envelope<RawTemplate[]>>('/admin/stories');
    const arr = Array.isArray(res.data) ? res.data : [];
    const templates = arr.map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      theme: t.theme,
      ageMin: t.ageMin,
      ageMax: t.ageMax,
      isActive: t.isActive,
      isFeatured: t.isFeatured,
      createdAt: t.createdAt,
      _count: { books: t._count?.books ?? 0 },
    }));
    return { templates, total: templates.length };
  },

  getStoryTemplate: async (id: string) => {
    const res = await api.get<Envelope<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      theme: string;
      ageMin: number;
      ageMax: number;
      artStyle: string;
      coverImageUrl: string | null;
      isActive: boolean;
      isFeatured: boolean;
      basePriceInr: number;
      premiumPriceInr: number;
      giftPriceInr: number;
      pages: Array<{
        id: string;
        pageNumber: number;
        textTemplate: string;
        illustrationPrompt: string;
        negativePrompt: string | null;
        styleTokens: Record<string, unknown> | null;
        isCoverPage: boolean;
        isPreviewPage: boolean;
      }>;
    }>>(`/admin/stories/${id}`);
    return res.data;
  },

  updateStoryTemplate: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/stories/${id}`, data),

  createStoryTemplate: (data: Record<string, unknown>) =>
    api.post('/admin/stories', data),

  toggleStoryActive: (id: string, isActive: boolean) =>
    api.put(`/admin/stories/${id}/toggle-active`, { isActive }),

  // Customers
  searchCustomers: async (params: { search: string; page?: number; limit?: number }) => {
    const res = await api.get<Envelope<RawCustomer[]>>('/admin/customers/search', {
      q: params.search,
    });
    const arr = Array.isArray(res.data) ? res.data : [];
    const customers = arr.map((u) => ({
      id: u.id,
      name: u.name || '',
      email: u.email,
      phone: u.phone ?? null,
      orderCount: u._count?.orders ?? 0,
      totalSpent: 0,
      createdAt: u.createdAt,
    }));
    return { customers, total: customers.length };
  },

  // AI Usage
  getAiUsage: async (params?: { from?: string; to?: string; page?: number; limit?: number }) => {
    const res = await api.get<Envelope<{
      breakdown: unknown[];
      summary: { totalCostCents: number; totalGenerations: number };
    }>>('/admin/ai-usage', { startDate: params?.from, endDate: params?.to });
    const s = res.data?.summary;
    return {
      totalCostInr: s?.totalCostCents ?? 0,
      avgCostPerBook: 0,
      dailyCosts: [] as Array<{ date: string; cost: number; count: number }>,
      logs: [] as Array<{
        id: string;
        model: string;
        provider: string;
        action: string;
        costInr: number;
        durationMs: number;
        createdAt: string;
      }>,
      total: s?.totalGenerations ?? 0,
    };
  },
};
