import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { OrdersModule } from '../orders/orders.module';
import { GenerationModule } from '../generation/generation.module';

@Module({
  imports: [OrdersModule, GenerationModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
