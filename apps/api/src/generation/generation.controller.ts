import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  UseGuards,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { GenerationService } from './generation.service';
import { AuthGuard } from '../auth/auth.guard';
import { DatabaseService } from '../database/database.service';

@Controller('generation')
@UseGuards(AuthGuard)
export class GenerationController {
  constructor(
    private readonly generationService: GenerationService,
    private readonly db: DatabaseService,
  ) {}

  @Post('preview/:bookId')
  @Throttle({ default: { ttl: 86400000, limit: 5 } }) // 5 per user per day
  async triggerPreview(
    @Param('bookId') bookId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;

    // Verify book belongs to user
    const book = await this.db.book.findUnique({ where: { id: bookId } });
    if (!book || book.userId !== user.id) {
      throw new NotFoundException('Book not found');
    }

    const result = await this.generationService.queuePreviewGeneration(bookId);
    return { success: true, data: result };
  }

  @Post('full/:bookId')
  @Throttle({ default: { ttl: 86400000, limit: 10 } })
  async triggerFull(@Param('bookId') bookId: string, @Req() req: Request) {
    const user = (req as any).user;

    // The full 28-page book is gated behind a real account — guests must sign
    // up / sign in first (the preview is free, the full book is not).
    if (user.isGuest) {
      throw new UnauthorizedException(
        'Please sign up or sign in to generate the full book.',
      );
    }

    const book = await this.db.book.findUnique({ where: { id: bookId } });
    if (!book || book.userId !== user.id) {
      throw new NotFoundException('Book not found');
    }

    const result = await this.generationService.queueFullBookGeneration(bookId);
    return { success: true, data: result };
  }

  @Get('status/:bookId')
  async getStatus(@Param('bookId') bookId: string, @Req() req: Request) {
    const user = (req as any).user;

    // Verify book belongs to user
    const book = await this.db.book.findUnique({ where: { id: bookId } });
    if (!book || book.userId !== user.id) {
      throw new NotFoundException('Book not found');
    }

    // Get the latest job status by checking book status
    // and any active jobs in the queues
    return {
      success: true,
      data: {
        bookId,
        bookStatus: book.status,
        previewGeneratedAt: book.previewGeneratedAt,
        fullGeneratedAt: book.fullGeneratedAt,
      },
    };
  }
}
