import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { DatabaseService } from '../database/database.service';
import { SettingsService } from '../settings/settings.service';
import { StorageService } from '../storage/storage.service';
import { OrdersService } from '../orders/orders.service';
import { generateBookPages, PREVIEW_PAGE_COUNT } from './page-orchestrator';

/**
 * Preview pipeline (Option-agnostic): generates the free first-few pages.
 * Shares the exact same fault-tolerant engine as the full book so the
 * personalization behaves identically for every page.
 */
@Processor('preview-generation')
export class PreviewGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(PreviewGenerationProcessor.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly settings: SettingsService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<{ bookId: string }>): Promise<void> {
    const { bookId } = job.data;
    this.logger.log(`Starting preview generation for book ${bookId}`);
    await generateBookPages({
      db: this.db,
      settings: this.settings,
      storage: this.storage,
      config: this.config,
      logger: this.logger,
      job,
      bookId,
      operation: 'preview-generation',
      previewLimit: PREVIEW_PAGE_COUNT,
      runningStatus: 'GENERATING_PREVIEW',
      successStatus: 'PREVIEW_READY',
      failureStatus: 'DRAFT',
      successTimestampField: 'previewGeneratedAt',
    });
  }
}

/**
 * Full-book pipeline: generates the complete 28-page book. The completion
 * barrier in the shared engine guarantees all pages are READY before the book
 * advances to PENDING_APPROVAL — which is the precondition both delivery
 * formats (PDF download / printed book) check before assembling output.
 */
@Processor('full-book-generation')
export class FullBookGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(FullBookGenerationProcessor.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly settings: SettingsService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly orders: OrdersService,
  ) {
    super();
  }

  async process(job: Job<{ bookId: string }>): Promise<void> {
    const { bookId } = job.data;
    this.logger.log(`Starting full book generation for book ${bookId}`);
    await generateBookPages({
      db: this.db,
      settings: this.settings,
      storage: this.storage,
      config: this.config,
      logger: this.logger,
      job,
      bookId,
      operation: 'full-book-generation',
      // No previewLimit → every page in the story (all 28).
      runningStatus: 'GENERATING_FULL',
      successStatus: 'PENDING_APPROVAL',
      failureStatus: 'PREVIEW_READY',
      successTimestampField: 'fullGeneratedAt',
      // Now that all 28 pages are verified, deliver the digital PDF for any
      // paid PDF_DOWNLOAD order on this book (re-trigger after completion).
      onComplete: () => this.orders.deliverPdfForBook(bookId),
    });
  }
}
