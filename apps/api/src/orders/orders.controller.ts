import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { SettingsService } from '../settings/settings.service';
import { AuthGuard, Public } from '../auth/auth.guard';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly settings: SettingsService,
  ) {}

  @Post('create')
  async createOrder(
    @Req() req: Request,
    @Body()
    body: {
      bookId: string;
      format: string;
      shippingAddress: Record<string, unknown>;
    },
  ) {
    const user = (req as any).user;
    const order = await this.ordersService.createOrder(
      user.id,
      body.bookId,
      body.format,
      body.shippingAddress,
    );

    // Online payment only creates a Razorpay order when the admin has enabled
    // it. In offline mode the order is recorded as PENDING_PAYMENT and the team
    // collects payment manually, so we must NOT call Razorpay (keys are unset).
    const settings = await this.settings.getSettings();
    if (settings.paymentEnabled === true) {
      const razorpayOrder = await this.ordersService.createRazorpayOrder(
        order.id,
      );
      return {
        success: true,
        data: {
          order,
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
        },
      };
    }

    return { success: true, data: { order } };
  }

  @Get()
  async listOrders(@Req() req: Request) {
    const user = (req as any).user;
    const orders = await this.ordersService.findByUser(user.id);
    return { success: true, data: orders };
  }

  @Get('track/:orderNumber')
  @Public()
  async trackOrder(@Param('orderNumber') orderNumber: string) {
    const order = await this.ordersService.findByOrderNumber(orderNumber);
    const timeline = await this.ordersService.getTrackingTimeline(order.id);
    return {
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        timeline,
        items: order.items,
      },
    };
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    const order = await this.ordersService.findById(id);
    return { success: true, data: order };
  }
}
