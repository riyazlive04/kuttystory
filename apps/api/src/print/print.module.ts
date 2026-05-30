import { Module } from '@nestjs/common';
import { PrintService } from './print.service';
import { PrintController } from './print.controller';

// StorageService is provided by the @Global StorageModule, so no import needed.
@Module({
  providers: [PrintService],
  controllers: [PrintController],
  exports: [PrintService],
})
export class PrintModule {}
