import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AdminService {
  constructor(private readonly db: DatabaseService) {}

  async getDashboardStats() {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const paidStatuses = ['PAID', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED'];

    // Orders today
    const ordersToday = await this.db.order.count({
      where: { createdAt: { gte: startOfToday } },
    });

    // Revenue today (sum of totalInr for paid orders)
    const revenueTodayResult = await this.db.order.aggregate({
      where: {
        createdAt: { gte: startOfToday },
        status: { in: paidStatuses as any },
      },
      _sum: { totalInr: true },
    });
    const revenueToday = revenueTodayResult._sum.totalInr || 0;

    // Orders this week
    const ordersThisWeek = await this.db.order.count({
      where: { createdAt: { gte: startOfWeek } },
    });

    // Revenue this week
    const revenueThisWeekResult = await this.db.order.aggregate({
      where: {
        createdAt: { gte: startOfWeek },
        status: { in: paidStatuses as any },
      },
      _sum: { totalInr: true },
    });
    const revenueThisWeek = revenueThisWeekResult._sum.totalInr || 0;

    // Average AI cost per book (aggregate costCents grouped by bookId)
    const aiCostResult = await this.db.aiUsageLog.aggregate({
      _sum: { costCents: true },
      _count: true,
    });
    const totalBooks = await this.db.book.count({
      where: { totalImageGenCostCents: { gt: 0 } },
    });
    const avgAiCostPerBook =
      totalBooks > 0 ? (aiCostResult._sum.costCents || 0) / totalBooks : 0;

    // Pending print jobs
    const pendingPrintJobs = await this.db.printJob.count({
      where: {
        status: {
          in: [
            'QUEUED',
            'PDF_GENERATING',
            'PDF_READY',
            'PRINTING',
            'BINDING',
            'QC_CHECK',
          ],
        },
      },
    });

    return {
      ordersToday,
      revenueToday,
      ordersThisWeek,
      revenueThisWeek,
      avgAiCostPerBook,
      pendingPrintJobs,
    };
  }

  async getAllOrders(filters: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters.status) {
      where.status = filters.status;
    }

    const [orders, total] = await Promise.all([
      this.db.order.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          items: {
            include: { book: true },
          },
        },
      }),
      this.db.order.count({ where: where as any }),
    ]);

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStoryTemplates() {
    const templates = await this.db.storyTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { pages: true },
        },
      },
    });

    return templates.map((t) => ({
      ...t,
      pageCount: t._count.pages,
    }));
  }

  async createStoryTemplate(data: {
    slug: string;
    title: string;
    description: string;
    theme: string;
    ageMin: number;
    ageMax: number;
    artStyle: string;
    basePriceInr: number;
    premiumPriceInr: number;
    giftPriceInr: number;
    coverImageUrl?: string;
  }) {
    return this.db.storyTemplate.create({
      data: data as any,
    });
  }

  async updateStoryTemplate(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      theme: string;
      ageMin: number;
      ageMax: number;
      artStyle: string;
      basePriceInr: number;
      premiumPriceInr: number;
      giftPriceInr: number;
      coverImageUrl: string;
      previewVideoUrl: string;
    }>,
  ) {
    return this.db.storyTemplate.update({
      where: { id },
      data: data as any,
    });
  }

  async toggleStoryActive(id: string, isActive: boolean) {
    return this.db.storyTemplate.update({
      where: { id },
      data: { isActive },
    });
  }

  async searchCustomers(query: string) {
    if (!query || query.length < 2) {
      return [];
    }

    // Search by email, phone, or name
    const users = await this.db.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: {
          select: { orders: true },
        },
      },
      take: 20,
    });

    // Also search by order number
    const ordersByNumber = await this.db.order.findMany({
      where: {
        orderNumber: { contains: query, mode: 'insensitive' },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
          },
        },
      },
      take: 10,
    });

    // Merge unique users from order search
    const userMap = new Map(users.map((u) => [u.id, u]));
    for (const order of ordersByNumber) {
      if (!userMap.has(order.user.id)) {
        userMap.set(order.user.id, {
          ...order.user,
          _count: { orders: 0 },
        });
      }
    }

    return Array.from(userMap.values());
  }

  /**
   * Leads = anyone who generated a preview (a Book past DRAFT), whether or not
   * they ordered. Each row carries the captured contact details so the sales
   * team can follow up. Book has `userId` but no back-relation on User, so we
   * fetch the users in a second query and join in memory.
   */
  async getLeads(params: { page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where = { status: { not: 'DRAFT' as const } };

    const [books, total] = await Promise.all([
      this.db.book.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          child: { select: { name: true } },
          story: { select: { title: true, slug: true } },
          orderItem: { select: { id: true } },
        },
      }),
      this.db.book.count({ where: where as any }),
    ]);

    const userIds = Array.from(new Set(books.map((b) => b.userId)));
    const users = await this.db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, phone: true },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    const leads = books.map((b) => {
      const u = userById.get(b.userId);
      return {
        bookId: b.id,
        name: u?.name ?? null,
        email: u?.email ?? null,
        phone: u?.phone ?? null,
        childName: b.child?.name ?? null,
        story: b.story?.title ?? null,
        status: b.status,
        ordered: !!b.orderItem,
        createdAt: b.createdAt,
      };
    });

    return { leads, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Hard-delete an order (used to clear out test orders). */
  async deleteOrder(orderId: string) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    // PrintJob references orderItemId with no FK cascade, so clear those first.
    const orderItemIds = order.items.map((it) => it.id);
    if (orderItemIds.length) {
      await this.db.printJob.deleteMany({
        where: { orderItemId: { in: orderItemIds } },
      });
    }
    // OrderItems cascade-delete with the order; the Book is left intact.
    await this.db.order.delete({ where: { id: orderId } });
    return { id: orderId };
  }

  /**
   * Delete a lead (Book) and its generated pages — for clearing out test
   * previews. Refuses if the book already has an order (delete the order first),
   * so real customer books can't be removed by accident. BookPages cascade-
   * delete with the book; the child profile is left intact.
   */
  async deleteBook(bookId: string) {
    const book = await this.db.book.findUnique({
      where: { id: bookId },
      include: { orderItem: { select: { id: true } } },
    });
    if (!book) {
      throw new NotFoundException('Book not found');
    }
    if (book.orderItem) {
      throw new BadRequestException(
        'This book has an order. Delete the order first, then the lead.',
      );
    }
    await this.db.book.delete({ where: { id: bookId } });
    return { id: bookId };
  }

  async getAiUsageReport(startDate: Date, endDate: Date) {
    const logs = await this.db.aiUsageLog.groupBy({
      by: ['operation', 'provider'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        costCents: true,
        inputTokens: true,
        outputTokens: true,
        latencyMs: true,
        imageCount: true,
      },
      _count: true,
      _avg: {
        costCents: true,
        latencyMs: true,
      },
    });

    const totalCost = await this.db.aiUsageLog.aggregate({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { costCents: true },
      _count: true,
    });

    return {
      breakdown: logs,
      summary: {
        totalCostCents: totalCost._sum.costCents || 0,
        totalGenerations: totalCost._count || 0,
        dateRange: { startDate, endDate },
      },
    };
  }

  async triggerRegeneration(bookPageId: string) {
    const page = await this.db.bookPage.findUnique({
      where: { id: bookPageId },
    });
    if (!page) {
      throw new NotFoundException('Book page not found');
    }

    // Admin override: bypass cost limit check, just set to REGEN_REQUESTED
    return this.db.bookPage.update({
      where: { id: bookPageId },
      data: { status: 'REGEN_REQUESTED' },
    });
  }

  async issueRefund(orderId: string, reason: string) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Placeholder: In production, call Razorpay refund API
    // const razorpay = new Razorpay({ ... });
    // await razorpay.payments.refund(order.razorpayPaymentId, { amount, notes: { reason } });

    return this.db.order.update({
      where: { id: orderId },
      data: {
        status: 'REFUNDED',
        notes: `Refund reason: ${reason}`,
      },
    });
  }
}
