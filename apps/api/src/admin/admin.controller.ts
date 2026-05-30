import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Res,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/auth.guard';
import { GenerationService } from '../generation/generation.service';
import { DatabaseService } from '../database/database.service';
import { PdfService } from '../pdf/pdf.service';

@Controller('admin')
@UseGuards(AuthGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly generationService: GenerationService,
    private readonly db: DatabaseService,
    private readonly pdf: PdfService,
  ) {}

  /**
   * Download the generated story as a PDF for ANY book — preview (5 pages),
   * PDF order, or print order. Assembles whatever pages exist so far (no
   * completion barrier), so admins can review/save partial previews too.
   */
  @Get('books/:bookId/pdf')
  async downloadBookPdf(
    @Param('bookId') bookId: string,
    @Res() res: Response,
  ) {
    const book = await this.db.book.findUnique({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundException('Book not found');
    }
    const { buffer, fileName } = await this.pdf.buildBookPdf(bookId, {
      requireComplete: false,
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  @Get('dashboard')
  async getDashboard() {
    const stats = await this.adminService.getDashboardStats();
    return { success: true, data: stats };
  }

  @Get('orders')
  async getAllOrders(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.adminService.getAllOrders({
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { success: true, data: result };
  }

  @Get('leads')
  async getLeads(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.adminService.getLeads({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { success: true, data: result };
  }

  @Delete('orders/:id')
  async deleteOrder(@Param('id') id: string) {
    const result = await this.adminService.deleteOrder(id);
    return { success: true, data: result };
  }

  /** Delete a lead (book + its generated pages). Refuses if it has an order. */
  @Delete('books/:bookId')
  async deleteBook(@Param('bookId') bookId: string) {
    const result = await this.adminService.deleteBook(bookId);
    return { success: true, data: result };
  }

  @Get('orders/:id')
  async getOrderDetail(@Param('id') id: string) {
    const order = await this.db.order.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        items: {
          include: { book: { include: { pages: true, child: true } } },
        },
      },
    });
    return { success: true, data: order };
  }

  @Get('stories')
  async getStoryTemplates() {
    const templates = await this.adminService.getStoryTemplates();
    return { success: true, data: templates };
  }

  @Post('stories')
  async createStoryTemplate(
    @Body()
    body: {
      slug: string;
      title: string;
      description: string;
      theme: string;
      ageMin: number;
      ageMax: number;
      artStyle: string;
      basePriceInr: number;
      premiumPriceInr: number;
      giftPriceInr: number;
      coverImageUrl?: string;
    },
  ) {
    const template = await this.adminService.createStoryTemplate(body);
    return { success: true, data: template };
  }

  @Put('stories/:id')
  async updateStoryTemplate(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const template = await this.adminService.updateStoryTemplate(
      id,
      body as any,
    );
    return { success: true, data: template };
  }

  @Put('stories/:id/toggle-active')
  async toggleStoryActive(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    const template = await this.adminService.toggleStoryActive(
      id,
      body.isActive,
    );
    return { success: true, data: template };
  }

  @Get('customers/search')
  async searchCustomers(@Query('q') query: string) {
    const customers = await this.adminService.searchCustomers(query);
    return { success: true, data: customers };
  }

  @Get('ai-usage')
  async getAiUsage(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const report = await this.adminService.getAiUsageReport(
      new Date(startDate),
      new Date(endDate),
    );
    return { success: true, data: report };
  }

  @Post('books/:bookPageId/regen')
  async forceRegen(@Param('bookPageId') bookPageId: string) {
    const page = await this.adminService.triggerRegeneration(bookPageId);
    return { success: true, data: page };
  }

  @Post('orders/:id/refund')
  async issueRefund(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    const order = await this.adminService.issueRefund(id, body.reason);
    return { success: true, data: order };
  }
}
