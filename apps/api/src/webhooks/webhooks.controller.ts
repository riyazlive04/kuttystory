import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { OrdersService } from '../orders/orders.service';
import { GenerationService } from '../generation/generation.service';
import { Public } from '../auth/auth.guard';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly ordersService: OrdersService,
    private readonly generationService: GenerationService,
  ) {}

  @Post('razorpay')
  @Public()
  async handleRazorpay(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const webhookSecret =
      this.config.get<string>('RAZORPAY_WEBHOOK_SECRET') || '';

    // Get raw body for signature verification
    const rawBody =
      typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body);

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      this.logger.warn('Razorpay webhook signature verification failed');
      throw new BadRequestException('Invalid signature');
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    this.logger.log(`Razorpay webhook event: ${event.event}`);

    try {
      switch (event.event) {
        case 'payment.captured': {
          const payment = event.payload?.payment?.entity;
          if (!payment) break;

          const razorpayOrderId = payment.order_id;
          const razorpayPaymentId = payment.id;

          // Find order by razorpayOrderId
          const order = await this.db.order.findUnique({
            where: { razorpayOrderId },
            include: { items: true },
          });

          if (order) {
            // Mark order as paid
            await this.ordersService.markPaid(order.id, razorpayPaymentId);

            // Queue full book generation for each book in the order
            for (const item of order.items) {
              await this.generationService.queueFullBookGeneration(
                item.bookId,
              );
            }

            this.logger.log(
              `Payment captured for order ${order.id}. Full generation queued.`,
            );
          } else {
            this.logger.warn(
              `Order not found for razorpayOrderId: ${razorpayOrderId}`,
            );
          }
          break;
        }

        case 'payment.failed': {
          const payment = event.payload?.payment?.entity;
          if (!payment) break;

          const razorpayOrderId = payment.order_id;
          this.logger.warn(
            `Payment failed for razorpay order: ${razorpayOrderId}`,
          );
          break;
        }

        case 'refund.processed': {
          const refund = event.payload?.refund?.entity;
          if (!refund) break;

          this.logger.log(`Refund processed: ${refund.id}`);
          break;
        }

        default:
          this.logger.log(`Unhandled Razorpay event: ${event.event}`);
      }
    } catch (error) {
      this.logger.error(`Error processing Razorpay webhook: ${error}`);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });
  }

  @Post('resend')
  @Public()
  async handleResend(@Req() req: Request, @Res() res: Response) {
    const event = req.body;
    this.logger.log(`Resend webhook event: ${event.type}`);

    try {
      switch (event.type) {
        case 'email.bounced': {
          const data = event.data;
          if (data?.email_id) {
            // Find and update the EmailLog entry by resendId
            await this.db.emailLog.updateMany({
              where: { resendId: data.email_id },
              data: {
                status: 'bounced',
              },
            });

            this.logger.warn(`Email bounced: ${data.to}`);
          }
          break;
        }

        case 'email.complained': {
          const data = event.data;
          if (data?.email_id) {
            await this.db.emailLog.updateMany({
              where: { resendId: data.email_id },
              data: {
                status: 'complained',
              },
            });

            this.logger.warn(`Spam complaint from: ${data.to}`);
          }
          break;
        }

        default:
          this.logger.log(`Unhandled Resend event: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error processing Resend webhook: ${error}`);
    }

    res.status(200).json({ received: true });
  }
}
