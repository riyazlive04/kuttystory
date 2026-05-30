import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrintService } from './print.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/auth.guard';

@Controller('print-jobs')
@UseGuards(AuthGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class PrintController {
  constructor(private readonly printService: PrintService) {}

  @Post(':orderItemId/generate-pdf')
  async generatePdf(@Param('orderItemId') orderItemId: string) {
    const printJob = await this.printService.generatePrintPdf(orderItemId);
    return { success: true, data: printJob };
  }

  @Get()
  async listPrintQueue(@Query('status') status?: string) {
    const jobs = await this.printService.getPrintQueue(
      status ? { status } : undefined,
    );
    return { success: true, data: jobs };
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string },
  ) {
    const printJob = await this.printService.updatePrintJobStatus(
      id,
      body.status,
      body.notes,
    );
    return { success: true, data: printJob };
  }
}
