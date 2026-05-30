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
import { BooksService } from './books.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('books')
@UseGuards(AuthGuard)
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  async createDraft(
    @Req() req: Request,
    @Body()
    body: {
      storyTemplateId: string;
      childProfileId: string;
      language: 'ENGLISH' | 'TAMIL' | 'BILINGUAL';
    },
  ) {
    const user = (req as any).user;
    const book = await this.booksService.createDraft(
      user.id,
      body.storyTemplateId,
      body.childProfileId,
      body.language,
    );
    return { success: true, data: book };
  }

  @Get()
  async listBooks(@Req() req: Request) {
    const user = (req as any).user;
    const books = await this.booksService.findByUser(user.id);
    return { success: true, data: books };
  }

  @Get(':id')
  async getBook(@Param('id') id: string) {
    const book = await this.booksService.findById(id);
    return { success: true, data: book };
  }

  @Get(':id/pages')
  async getBookPages(@Param('id') id: string) {
    const pages = await this.booksService.getBookPages(id);
    return { success: true, data: pages };
  }

  @Post(':id/approve')
  async approveBook(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const book = await this.booksService.approveBook(id, user.id);
    return { success: true, data: book };
  }

  @Post(':id/pages/:pageId/regen')
  async requestPageRegen(@Param('pageId') pageId: string) {
    const page = await this.booksService.requestPageRegen(pageId);
    return { success: true, data: page };
  }
}
