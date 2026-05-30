import {
  Controller,
  Get,
  Put,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { SettingsService } from './settings.service';
import { AuthGuard } from '../auth/auth.guard';
import { Public, Roles } from '../auth/auth.guard';

@Controller('settings')
@UseGuards(AuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** Public feature flags only — secrets are never included here. */
  @Get()
  @Public()
  async getSettings() {
    const settings = await this.settingsService.getSettings();
    return { success: true, data: settings };
  }

  @Put()
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateSettings(
    @Body() body: { key: string; value: unknown },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const settings = await this.settingsService.updateSettings(
      body.key,
      body.value,
      user?.id,
    );
    return { success: true, data: settings };
  }

  /** Admin-only: persist several feature flags in one request (Save Changes). */
  @Put('bulk')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateSettingsBulk(
    @Body() body: { settings: Record<string, unknown> },
    @Req() req: Request,
  ) {
    if (!body || typeof body.settings !== 'object' || body.settings === null) {
      throw new BadRequestException('settings object is required');
    }
    const user = (req as any).user;
    const settings = await this.settingsService.updateManySettings(
      body.settings,
      user?.id,
    );
    return { success: true, data: settings };
  }

  /** Admin-only: which secrets are configured (booleans, never the values). */
  @Get('secrets/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getSecretStatus() {
    const status = await this.settingsService.getSecretStatus();
    return { success: true, data: status };
  }

  /** Admin-only: store/replace an encrypted API key. Never echoes the value. */
  @Put('secrets')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async setSecret(
    @Body() body: { key: string; value: string },
    @Req() req: Request,
  ) {
    if (!body || typeof body.key !== 'string') {
      throw new BadRequestException('key is required');
    }
    const user = (req as any).user;
    await this.settingsService.setSecret(body.key, body.value ?? '', user?.id);
    const status = await this.settingsService.getSecretStatus();
    return { success: true, data: status };
  }
}
