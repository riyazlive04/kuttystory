import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class UploadService {
  private s3: S3Client;
  private bucket: string;
  private publicCdnUrl: string;

  constructor(private readonly config: ConfigService) {
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
    this.publicCdnUrl =
      this.config.get<string>('R2_PUBLIC_CDN_URL') ||
      'https://cdn.kuttystory.com';
  }

  async getSignedUploadUrl(
    key: string,
    contentType: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }

  async getSignedDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3.send(command);
  }

  getPublicUrl(key: string): string {
    return `${this.publicCdnUrl}/${key}`;
  }
}
