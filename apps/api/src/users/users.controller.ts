import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/children')
  async getChildren(@Req() req: Request) {
    const user = (req as any).user;
    const profiles = await this.usersService.getChildProfiles(user.id);
    return { success: true, data: profiles };
  }

  @Post('me/children')
  async createChild(
    @Req() req: Request,
    @Body()
    body: {
      name: string;
      nickname?: string;
      gender: 'BOY' | 'GIRL' | 'PREFER_NOT_TO_SAY';
      ageYears: number;
      skinTone?: string;
      hairColor?: string;
      hasGlasses?: boolean;
      referencePhotoUrls?: string[];
    },
  ) {
    const user = (req as any).user;
    const profile = await this.usersService.createChildProfile(user.id, body);
    return { success: true, data: profile };
  }

  @Put('me/children/:id')
  async updateChild(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const user = (req as any).user;
    const profile = await this.usersService.updateChildProfile(
      id,
      user.id,
      body as any,
    );
    return { success: true, data: profile };
  }

  @Put('me/contact')
  async updateContact(
    @Req() req: Request,
    @Body() body: { name?: string; phone?: string; email?: string },
  ) {
    const user = (req as any).user;
    const updated = await this.usersService.updateContact(user.id, body);
    return {
      success: true,
      data: {
        id: updated?.id,
        name: updated?.name ?? null,
        phone: updated?.phone ?? null,
        email: updated?.email ?? null,
      },
    };
  }

  @Get('me/export')
  async exportData(@Req() req: Request) {
    const user = (req as any).user;
    const data = await this.usersService.exportUserData(user.id);
    return { success: true, data };
  }

  @Delete('me')
  async deleteAccount(@Req() req: Request) {
    const user = (req as any).user;
    await this.usersService.deleteUser(user.id);
    return { success: true, message: 'Account deleted' };
  }
}
