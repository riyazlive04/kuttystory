import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { GenerationModule } from '../generation/generation.module';
import { BooksModule } from '../books/books.module';
import { PdfService } from '../pdf/pdf.service';

@Module({
  imports: [GenerationModule, BooksModule],
  // PdfService (deps: DatabaseService, StorageService — both @Global) lets admin
  // download the generated story for any book regardless of status.
  providers: [AdminService, PdfService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
