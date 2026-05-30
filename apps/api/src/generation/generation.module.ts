import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GenerationService } from './generation.service';
import { GenerationController } from './generation.controller';
import { PreviewGenerationProcessor } from './generation.processor';
import { FullBookGenerationProcessor } from './generation.processor';
import { SettingsModule } from '../settings/settings.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'preview-generation' },
      { name: 'full-book-generation' },
    ),
    SettingsModule,
    // OrdersService is used by the full-book completion hook to re-deliver the
    // PDF once all 28 pages are verified.
    OrdersModule,
  ],
  providers: [
    GenerationService,
    PreviewGenerationProcessor,
    FullBookGenerationProcessor,
  ],
  controllers: [GenerationController],
  exports: [GenerationService],
})
export class GenerationModule {}
