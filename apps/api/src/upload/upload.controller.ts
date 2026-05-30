import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { StorageService } from '../storage/storage.service';
import { AuthGuard } from '../auth/auth.guard';
import * as crypto from 'crypto';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

@Controller('upload')
@UseGuards(AuthGuard)
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Primary upload path: receives the file and stores it via the configured
   * storage driver (local disk or R2). Returns the storage key + public URL.
   */
  @Post('photo')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } }),
  )
  async uploadPhoto(@UploadedFile() file: UploadedImage) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new BadRequestException('File too large (max 10 MB)');
    }

    const ext = EXT_BY_MIME[file.mimetype] || 'jpg';
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const key = `uploads/${new Date().toISOString().slice(0, 10)}/${uniqueId}.${ext}`;

    const { url } = await this.storage.save(key, file.buffer, file.mimetype);

    return { success: true, data: { key, url } };
  }

  /**
   * R2-only: presigned PUT URL for direct browser→R2 uploads. Kept for
   * deployments using STORAGE_DRIVER=r2 that prefer direct uploads.
   */
  @Post('signed-url')
  async getSignedUrl(@Body() body: { fileName: string; contentType: string }) {
    if (!ALLOWED_MIME_TYPES.includes(body.contentType)) {
      throw new BadRequestException(
        `Invalid content type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    const ext = body.fileName.split('.').pop() || 'jpg';
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const key = `uploads/${new Date().toISOString().slice(0, 10)}/${uniqueId}.${ext}`;

    const signedUrl = await this.uploadService.getSignedUploadUrl(
      key,
      body.contentType,
    );

    return {
      success: true,
      data: {
        signedUrl,
        key,
        publicUrl: this.uploadService.getPublicUrl(key),
      },
    };
  }
}
