import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class GenerationService {
  constructor(
    @InjectQueue('preview-generation')
    private readonly previewQueue: Queue,
    @InjectQueue('full-book-generation')
    private readonly fullBookQueue: Queue,
  ) {}

  async queuePreviewGeneration(bookId: string) {
    const job = await this.previewQueue.add(
      'generate-preview',
      { bookId },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
    return { jobId: job.id, queue: 'preview-generation' };
  }

  async queueFullBookGeneration(bookId: string) {
    const job = await this.fullBookQueue.add(
      'generate-full-book',
      { bookId },
      {
        // Stable id → BullMQ refuses a second concurrent full-book job for the
        // same book (e.g. order-trigger + payment webhook). Removed on
        // completion/failure so a later re-order or regen can run again; the
        // real history lives in the DB (book/page status + aiUsageLog).
        jobId: `full-book:${bookId}`,
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
    return { jobId: job.id, queue: 'full-book-generation' };
  }

  async getJobStatus(jobId: string) {
    // Check both queues
    let job = await this.previewQueue.getJob(jobId);
    let queueName = 'preview-generation';

    if (!job) {
      job = await this.fullBookQueue.getJob(jobId);
      queueName = 'full-book-generation';
    }

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      jobId: job.id,
      queue: queueName,
      state,
      progress,
      data: job.data,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
    };
  }
}
