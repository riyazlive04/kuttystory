import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { PdfService } from '../pdf/pdf.service';
import { BookIncompleteError } from '../common/book-completion';
import Razorpay from 'razorpay';

// Book statuses for which full generation is already running or finished —
// re-triggering would be wasteful, so we skip.
const FULL_GEN_SKIP_STATUSES = [
  'GENERATING_FULL',
  'PENDING_APPROVAL',
  'APPROVED',
  'PRINTING',
  'SHIPPED',
  'DELIVERED',
];

/** Pricing in paise per format */
const FORMAT_PRICING: Record<string, number> = {
  PDF_DOWNLOAD: 89900, // 899 INR
  PRINTED_BOOK: 129900, // 1299 INR
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private razorpay: Razorpay;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly pdf: PdfService,
    @InjectQueue('full-book-generation')
    private readonly fullBookQueue: Queue,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.config.get<string>('RAZORPAY_KEY_ID') || '',
      key_secret: this.config.get<string>('RAZORPAY_KEY_SECRET') || '',
    });
  }

  /**
   * Enqueue full 28-page generation for a book — called when an order is placed
   * (PDF or print). This is the ONLY time the full book is generated: the create
   * flow only produces the 5-page preview. Idempotent: skips if generation is
   * already running/done (status guard) and BullMQ dedups on the stable jobId,
   * so an order + payment webhook can't double-run.
   */
  async triggerFullGeneration(bookId: string): Promise<void> {
    const book = await this.db.book.findUnique({ where: { id: bookId } });
    if (!book) return;
    if (FULL_GEN_SKIP_STATUSES.includes(book.status)) {
      this.logger.log(
        `Full generation not queued for ${bookId}: status is ${book.status}.`,
      );
      return;
    }
    await this.fullBookQueue.add(
      'generate-full-book',
      { bookId },
      {
        jobId: `full-book:${bookId}`,
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
    this.logger.log(`Full generation queued for book ${bookId} (order placed).`);
  }

  /**
   * Generate the book PDF and email it to the customer. Best-effort: never
   * throws into the order flow. No-op (with a log) when email isn't configured.
   */
  async deliverBookPdfByEmail(
    bookId: string,
    to: string,
    name: string,
    orderNumber: string,
  ): Promise<void> {
    if (!to) return;
    if (!this.email.isConfigured) {
      this.logger.warn(
        `PDF email skipped for ${orderNumber}: RESEND_API_KEY not configured. The team must send the PDF manually.`,
      );
      return;
    }
    try {
      // buildBookPdf enforces the strict assembly barrier: if the 28 pages
      // aren't all generated yet, it throws BookIncompleteError. That's the
      // expected case at order-creation time (full generation runs after
      // payment) — we skip + log here and let the full-book pipeline re-deliver
      // via deliverPdfForBook() once every page is verified READY.
      const { buffer, fileName } = await this.pdf.buildBookPdf(bookId);
      await this.email.sendBookPdf(to, name || 'there', orderNumber, buffer, fileName);
      this.logger.log(`PDF emailed for ${orderNumber} (book ${bookId}).`);
    } catch (err) {
      if (err instanceof BookIncompleteError) {
        this.logger.log(
          `PDF delivery deferred for ${orderNumber}: ${err.readyCount}/${err.expectedCount} pages ready. ` +
            `Will send once full generation completes.`,
        );
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to email PDF for ${orderNumber}: ${message}`);
    }
  }

  /**
   * Re-deliver the digital PDF for a book once it is fully generated. Called by
   * the full-book pipeline's completion hook. No-op unless there is a paid
   * PDF_DOWNLOAD order for the book.
   */
  async deliverPdfForBook(bookId: string): Promise<void> {
    const item = await this.db.orderItem.findUnique({
      where: { bookId },
      include: { order: true },
    });
    if (!item?.order) return;
    if (item.format !== 'PDF_DOWNLOAD') return;
    // Payment is collected offline, so PDF orders sit at PENDING_PAYMENT rather
    // than PAID. Deliver the PDF for any live order; only skip ones that were
    // cancelled or refunded.
    if (['CANCELLED', 'REFUNDED'].includes(item.order.status)) return;

    const addr = item.order.shippingAddress as {
      email?: string;
      fullName?: string;
    };
    await this.deliverBookPdfByEmail(
      bookId,
      (addr?.email || '').trim(),
      addr?.fullName || '',
      item.order.orderNumber,
    );
  }

  async getOrderCount(): Promise<number> {
    return this.db.order.count();
  }

  private async generateOrderNumber(): Promise<string> {
    const count = await this.getOrderCount();
    const year = new Date().getFullYear();
    const sequence = String(count + 1).padStart(6, '0');
    return `KS-${year}-${sequence}`;
  }

  async createOrder(
    userId: string,
    bookId: string,
    format: string,
    shippingAddress: Record<string, unknown>,
  ) {
    const book = await this.db.book.findUnique({
      where: { id: bookId },
      include: { story: true },
    });
    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // A book can belong to only one order (OrderItem.bookId is unique). If this
    // book was already ordered, return that order (idempotent) instead of a
    // 500 — and, for PDF, re-send the download so the customer still gets it.
    const existingItem = await this.db.orderItem.findUnique({
      where: { bookId },
      include: {
        order: { include: { items: { include: { book: true } } } },
      },
    });
    if (existingItem?.order) {
      // Ensure the full book gets generated even if a prior attempt failed
      // (status guard inside makes this a no-op when it's already running/done).
      void this.triggerFullGeneration(bookId);
      if (format === 'PDF_DOWNLOAD') {
        const a = shippingAddress as { fullName?: string; email?: string };
        void this.deliverBookPdfByEmail(
          bookId,
          (a?.email || '').trim(),
          a?.fullName || '',
          existingItem.order.orderNumber,
        );
      }
      return existingItem.order;
    }

    // "Map later": a guest checking out gives us their name/phone via the
    // shipping form — stamp it onto the guest account so admin has someone to
    // contact. Real accounts keep their existing details untouched.
    const addr = shippingAddress as {
      fullName?: string;
      phone?: string;
      email?: string;
    };
    if (addr?.fullName) {
      await this.db.user.updateMany({
        where: { id: userId, isGuest: true },
        data: { name: addr.fullName, phone: addr.phone || null },
      });
    }

    const unitPrice = FORMAT_PRICING[format] || FORMAT_PRICING.SOFTCOVER;
    const shippingInr = 0; // Free shipping
    const taxRate = 0.18; // 18% GST
    const subtotalInr = unitPrice;
    const taxInr = Math.round(subtotalInr * taxRate);
    const totalInr = subtotalInr + taxInr + shippingInr;

    const orderNumber = await this.generateOrderNumber();

    const order = await this.db.order.create({
      data: {
        orderNumber,
        userId,
        status: 'PENDING_PAYMENT',
        subtotalInr,
        taxInr,
        shippingInr,
        totalInr,
        shippingAddress: shippingAddress as any,
        items: {
          create: {
            bookId,
            format: format as any,
            quantity: 1,
            priceInr: unitPrice,
          },
        },
      },
      include: {
        items: {
          include: { book: true },
        },
      },
    });

    // Generate the full 28-page book now that it's been ordered (both PDF and
    // print need all pages). The create flow only made the 5-page preview.
    void this.triggerFullGeneration(bookId);

    // PDF orders are fulfilled by email. The first attempt usually finds the
    // book still generating and defers (BookIncompleteError) — the full-book
    // pipeline's onComplete hook re-sends once all 28 pages are verified.
    if (format === 'PDF_DOWNLOAD') {
      const email = (addr?.email || '').trim();
      void this.deliverBookPdfByEmail(
        bookId,
        email,
        addr?.fullName || '',
        orderNumber,
      );
    }

    return order;
  }

  async findById(id: string) {
    const order = await this.db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { book: true },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async findByUser(userId: string) {
    return this.db.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { book: true },
        },
      },
    });
  }

  async findByOrderNumber(orderNumber: string) {
    const order = await this.db.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: { book: true },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async updateStatus(id: string, status: string) {
    return this.db.order.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async markPaid(orderId: string, razorpayPaymentId: string) {
    return this.db.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        razorpayPaymentId,
      },
    });
  }

  async markShipped(
    orderId: string,
    trackingNumber: string,
    courier: string,
  ) {
    return this.db.order.update({
      where: { id: orderId },
      data: {
        status: 'SHIPPED',
        shippedAt: new Date(),
        trackingNumber,
        courier,
      },
    });
  }

  async getTrackingTimeline(orderId: string) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const timeline: Array<{
      status: string;
      timestamp: Date;
      description: string;
    }> = [];

    timeline.push({
      status: 'CREATED',
      timestamp: order.createdAt,
      description: 'Order placed',
    });

    if (order.paidAt) {
      timeline.push({
        status: 'PAID',
        timestamp: order.paidAt,
        description: 'Payment confirmed',
      });
    }

    if (order.shippedAt) {
      timeline.push({
        status: 'SHIPPED',
        timestamp: order.shippedAt,
        description: `Shipped${order.courier ? ` via ${order.courier}` : ''}${order.trackingNumber ? ` - Tracking: ${order.trackingNumber}` : ''}`,
      });
    }

    if (order.deliveredAt) {
      timeline.push({
        status: 'DELIVERED',
        timestamp: order.deliveredAt,
        description: 'Delivered',
      });
    }

    if (order.status === 'CANCELLED') {
      timeline.push({
        status: 'CANCELLED',
        timestamp: order.updatedAt,
        description: 'Order cancelled',
      });
    }

    if (order.status === 'REFUNDED') {
      timeline.push({
        status: 'REFUNDED',
        timestamp: order.updatedAt,
        description: 'Refund issued',
      });
    }

    return timeline;
  }

  async createRazorpayOrder(orderId: string) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const razorpayOrder = await this.razorpay.orders.create({
      amount: order.totalInr,
      currency: 'INR',
      receipt: orderId,
      notes: {
        orderId,
        orderNumber: order.orderNumber,
      },
    });

    await this.db.order.update({
      where: { id: orderId },
      data: { razorpayOrderId: razorpayOrder.id },
    });

    return razorpayOrder;
  }
}
