import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * AES-256-GCM encryption for application secrets (provider API keys).
 *
 * The master key is resolved, in order of preference:
 *   1. `APP_ENCRYPTION_KEY` env var (64 hex chars / 32 bytes) — use this in production.
 *   2. A locally generated key persisted to `.encryption-key` (gitignored) so the
 *      key survives restarts in dev. A warning is logged in this case.
 *
 * Ciphertext layout (base64): [12-byte IV][16-byte auth tag][ciphertext].
 * Plaintext secrets never touch the database or any API response.
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer;
  private static readonly IV_LENGTH = 12;
  private static readonly TAG_LENGTH = 16;

  constructor() {
    this.key = this.resolveKey();
  }

  private resolveKey(): Buffer {
    const fromEnv = process.env.APP_ENCRYPTION_KEY;
    if (fromEnv) {
      const buf = this.parseKey(fromEnv);
      if (buf.length !== 32) {
        throw new Error(
          'APP_ENCRYPTION_KEY must decode to exactly 32 bytes (use 64 hex chars or 44-char base64).',
        );
      }
      return buf;
    }

    // Dev fallback: persist a generated key so secrets stay decryptable across restarts.
    const keyPath = path.join(process.cwd(), '.encryption-key');
    try {
      if (fs.existsSync(keyPath)) {
        const hex = fs.readFileSync(keyPath, 'utf8').trim();
        const buf = Buffer.from(hex, 'hex');
        if (buf.length === 32) return buf;
      }
    } catch {
      // fall through to regenerate
    }

    const generated = crypto.randomBytes(32);
    try {
      fs.writeFileSync(keyPath, generated.toString('hex'), { mode: 0o600 });
    } catch (err) {
      this.logger.warn(
        `Could not persist encryption key to ${keyPath}: ${err}. Secrets will not survive a restart.`,
      );
    }
    this.logger.warn(
      'APP_ENCRYPTION_KEY is not set. Using a locally generated key. ' +
        'Set APP_ENCRYPTION_KEY (64 hex chars) in production so secrets remain decryptable.',
    );
    return generated;
  }

  private parseKey(value: string): Buffer {
    if (/^[0-9a-fA-F]{64}$/.test(value)) {
      return Buffer.from(value, 'hex');
    }
    return Buffer.from(value, 'base64');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(EncryptionService.IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decrypt(payload: string): string {
    const data = Buffer.from(payload, 'base64');
    const iv = data.subarray(0, EncryptionService.IV_LENGTH);
    const tag = data.subarray(
      EncryptionService.IV_LENGTH,
      EncryptionService.IV_LENGTH + EncryptionService.TAG_LENGTH,
    );
    const ciphertext = data.subarray(
      EncryptionService.IV_LENGTH + EncryptionService.TAG_LENGTH,
    );
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }
}
