import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { SettingsModule } from '../settings/settings.module';
import { EmailModule } from '../email/email.module';
import { PdfService } from '../pdf/pdf.service';

@Module({
  // Register the full-book queue so OrdersService can enqueue generation at
  // order time (no dependency on GenerationModule → avoids a circular import).
  imports: [
    SettingsModule,
    EmailModule,
    BullModule.registerQueue({ name: 'full-book-generation' }),
  ],
  providers: [OrdersService, PdfService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
