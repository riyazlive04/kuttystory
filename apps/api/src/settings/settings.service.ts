import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@kutty-story/database';
import { DatabaseService } from '../database/database.service';
import { EncryptionService } from './encryption.service';

const DEFAULT_SETTINGS = {
  paymentEnabled: false,
  razorpayLive: false,
  tamilEnabled: false,
  bilingualEnabled: false,
  maintenanceMode: false,
  freeShippingThreshold: 0,
  maxPreviewsPerDay: 5,
  // AI image generation (non-secret flags; the API keys live in app_secrets, encrypted)
  imageGenEnabled: false,
  imageProvider: 'gemini' as 'gemini' | 'openai' | 'fal',
};

/** Secret keys that may be stored — anything not listed is rejected. */
export const SECRET_KEYS = ['geminiApiKey', 'openaiApiKey', 'falApiKey'] as const;
export type SecretKey = (typeof SECRET_KEYS)[number];

@Injectable()
export class SettingsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  // ─── Non-secret feature flags (public-readable) ────────────────────────────

  async getSettings(): Promise<Record<string, unknown>> {
    let record = await this.db.siteSettings.findUnique({
      where: { id: 'default' },
    });

    if (!record) {
      record = await this.db.siteSettings.create({
        data: {
          id: 'default',
          settings: DEFAULT_SETTINGS as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return {
      ...DEFAULT_SETTINGS,
      ...(record.settings as Record<string, unknown>),
    };
  }

  async updateSettings(
    key: string,
    value: unknown,
    userId?: string,
  ): Promise<Record<string, unknown>> {
    // Secrets must never be written into the public settings blob.
    if ((SECRET_KEYS as readonly string[]).includes(key)) {
      throw new BadRequestException(
        'API keys must be set via the secrets endpoint, not feature flags.',
      );
    }

    const current = await this.getSettings();
    const updated = { ...current, [key]: value };

    await this.db.siteSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        settings: updated as unknown as Prisma.InputJsonValue,
        updatedBy: userId || null,
      },
      update: {
        settings: updated as unknown as Prisma.InputJsonValue,
        updatedBy: userId || null,
      },
    });

    return updated;
  }

  /** Persist several feature flags at once (e.g. from a Save Changes button). */
  async updateManySettings(
    partial: Record<string, unknown>,
    userId?: string,
  ): Promise<Record<string, unknown>> {
    for (const key of Object.keys(partial)) {
      if ((SECRET_KEYS as readonly string[]).includes(key)) {
        throw new BadRequestException(
          'API keys must be set via the secrets endpoint, not feature flags.',
        );
      }
    }

    const current = await this.getSettings();
    const updated = { ...current, ...partial };

    await this.db.siteSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        settings: updated as unknown as Prisma.InputJsonValue,
        updatedBy: userId || null,
      },
      update: {
        settings: updated as unknown as Prisma.InputJsonValue,
        updatedBy: userId || null,
      },
    });

    return updated;
  }

  // ─── Encrypted secrets (server-only; never returned to clients) ────────────

  private assertSecretKey(key: string): asserts key is SecretKey {
    if (!(SECRET_KEYS as readonly string[]).includes(key)) {
      throw new BadRequestException(`Unknown secret key: ${key}`);
    }
  }

  /** Store (or clear) an encrypted secret. Empty value clears it. */
  async setSecret(key: string, value: string, userId?: string): Promise<void> {
    this.assertSecretKey(key);

    const trimmed = (value ?? '').trim();
    if (!trimmed) {
      await this.db.appSecret.deleteMany({ where: { key } });
      return;
    }

    const valueEnc = this.encryption.encrypt(trimmed);
    await this.db.appSecret.upsert({
      where: { key },
      create: { key, valueEnc, updatedBy: userId || null },
      update: { valueEnc, updatedBy: userId || null },
    });
  }

  /** Decrypt and return a secret (server-side use only). Null if not set. */
  async getSecret(key: SecretKey): Promise<string | null> {
    const record = await this.db.appSecret.findUnique({ where: { key } });
    if (!record) return null;
    try {
      return this.encryption.decrypt(record.valueEnc);
    } catch {
      // Key rotated or corrupt ciphertext — treat as unset rather than leaking errors.
      return null;
    }
  }

  /** Booleans only — which secrets are configured. Never reveals values. */
  async getSecretStatus(): Promise<Record<SecretKey, boolean>> {
    const records = await this.db.appSecret.findMany({
      select: { key: true },
    });
    const present = new Set(records.map((r) => r.key));
    return SECRET_KEYS.reduce(
      (acc, k) => {
        acc[k] = present.has(k);
        return acc;
      },
      {} as Record<SecretKey, boolean>,
    );
  }

  /** Resolve the API key for the currently selected image provider. */
  async getActiveImageProviderConfig(): Promise<{
    provider: 'gemini' | 'openai' | 'fal';
    apiKey: string | null;
    enabled: boolean;
  }> {
    const settings = await this.getSettings();
    const raw = settings.imageProvider;
    const provider: 'gemini' | 'openai' | 'fal' =
      raw === 'openai' ? 'openai' : raw === 'fal' ? 'fal' : 'gemini';
    const enabled = settings.imageGenEnabled === true;
    const secretKey: SecretKey =
      provider === 'openai'
        ? 'openaiApiKey'
        : provider === 'fal'
          ? 'falApiKey'
          : 'geminiApiKey';
    const apiKey = await this.getSecret(secretKey);
    return { provider, apiKey, enabled };
  }
}
