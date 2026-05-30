import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

type Driver = 'local' | 'r2';

/**
 * Pluggable object storage.
 *
 * - `local` (default): writes under LOCAL_STORAGE_DIR and serves files at
 *   `${PUBLIC_BASE_URL}/files/<key>` (mounted in main.ts). Works on a single
 *   VPS with no external dependencies.
 * - `r2`: Cloudflare R2 (S3-compatible), enabled by STORAGE_DRIVER=r2.
 *
 * Switch drivers with the STORAGE_DRIVER env var — no code changes.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: Driver;
  private readonly localDir: string;
  private readonly publicBaseUrl: string;

  private s3?: S3Client;
  private bucket = '';
  private r2PublicUrl = '';

  constructor(private readonly config: ConfigService) {
    this.driver =
      this.config.get<string>('STORAGE_DRIVER') === 'r2' ? 'r2' : 'local';

    const port = this.config.get<string>('PORT') || '4000';
    this.publicBaseUrl =
      this.config.get<string>('PUBLIC_BASE_URL') || `http://localhost:${port}`;

    this.localDir =
      this.config.get<string>('LOCAL_STORAGE_DIR') ||
      path.join(process.cwd(), 'storage');

    if (this.driver === 'r2') {
      const accountId = this.config.get<string>('R2_ACCOUNT_ID') || '';
      this.s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: this.config.get<string>('R2_ACCESS_KEY_ID') || '',
          secretAccessKey:
            this.config.get<string>('R2_SECRET_ACCESS_KEY') || '',
        },
      });
      this.bucket = this.config.get<string>('R2_BUCKET_NAME') || 'kutty-story';
      this.r2PublicUrl =
        this.config.get<string>('R2_PUBLIC_URL') ||
        this.config.get<string>('R2_PUBLIC_CDN_URL') ||
        'https://cdn.kuttystory.com';
    } else {
      try {
        fs.mkdirSync(this.localDir, { recursive: true });
      } catch (err) {
        this.logger.error(`Failed to create storage dir ${this.localDir}: ${err}`);
      }
    }

    this.logger.log(`Storage driver: ${this.driver}`);
  }

  get storageDriver(): Driver {
    return this.driver;
  }

  get localBaseDir(): string {
    return this.localDir;
  }

  /** Reject keys that could escape the storage root. */
  private safeKey(key: string): string {
    const clean = key.replace(/^\/+/, '');
    if (clean.includes('..')) {
      throw new Error('Invalid storage key');
    }
    return clean;
  }

  getUrl(key: string): string {
    const k = this.safeKey(key);
    return this.driver === 'r2'
      ? `${this.r2PublicUrl}/${k}`
      : `${this.publicBaseUrl}/files/${k}`;
  }

  async save(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<{ key: string; url: string }> {
    const k = this.safeKey(key);

    if (this.driver === 'r2' && this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: k,
          Body: body,
          ContentType: contentType,
        }),
      );
    } else {
      const full = path.join(this.localDir, k);
      await fs.promises.mkdir(path.dirname(full), { recursive: true });
      await fs.promises.writeFile(full, body);
    }

    return { key: k, url: this.getUrl(k) };
  }

  async read(key: string): Promise<Buffer> {
    const k = this.safeKey(key);

    if (this.driver === 'r2' && this.s3) {
      const res = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: k }),
      );
      const chunks: Buffer[] = [];
      const stream = res.Body as NodeJS.ReadableStream;
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    }

    const full = path.join(this.localDir, k);
    return fs.promises.readFile(full);
  }

  async delete(key: string): Promise<void> {
    const k = this.safeKey(key);
    if (this.driver === 'r2' && this.s3) {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: k }),
      );
    } else {
      const full = path.join(this.localDir, k);
      await fs.promises.rm(full, { force: true });
    }
  }
}
