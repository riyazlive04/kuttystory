import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { EncryptionService } from './encryption.service';

@Module({
  providers: [SettingsService, EncryptionService],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
