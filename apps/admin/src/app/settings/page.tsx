'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Settings,
  Shield,
  ToggleLeft,
  Save,
  CheckCircle,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

interface SiteSettings {
  paymentEnabled: boolean;
  razorpayLive: boolean;
  tamilEnabled: boolean;
  bilingualEnabled: boolean;
  maintenanceMode: boolean;
  freeShippingThreshold: number;
  maxPreviewsPerDay: number;
  imageGenEnabled: boolean;
  imageProvider: 'gemini' | 'openai' | 'fal';
}

const DEFAULT_SETTINGS: SiteSettings = {
  paymentEnabled: false,
  razorpayLive: false,
  tamilEnabled: false,
  bilingualEnabled: false,
  maintenanceMode: false,
  freeShippingThreshold: 0,
  maxPreviewsPerDay: 5,
  imageGenEnabled: false,
  imageProvider: 'gemini',
};

type SecretStatus = {
  geminiApiKey: boolean;
  openaiApiKey: boolean;
  falApiKey: boolean;
};

type ProviderSecretKey = 'geminiApiKey' | 'openaiApiKey' | 'falApiKey';

function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
        disabled
          ? 'opacity-50 cursor-not-allowed bg-gray-200'
          : enabled
            ? 'bg-brand-600'
            : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  // Last values persisted on the server — used to detect unsaved changes.
  const [savedSettings, setSavedSettings] =
    useState<SiteSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [secretStatus, setSecretStatus] = useState<SecretStatus>({
    geminiApiKey: false,
    openaiApiKey: false,
    falApiKey: false,
  });
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({
    geminiApiKey: '',
    openaiApiKey: '',
    falApiKey: '',
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await api.get<{ success: boolean; data: SiteSettings }>(
        '/settings',
      );
      const merged = { ...DEFAULT_SETTINGS, ...data.data };
      setSettings(merged);
      setSavedSettings(merged);
    } catch {
      // Use defaults
    }
    try {
      const status = await api.get<{ success: boolean; data: SecretStatus }>(
        '/settings/secrets/status',
      );
      setSecretStatus(status.data);
    } catch {
      // ignore — non-admin or unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  // Edit locally only; nothing is persisted until "Save Changes" is clicked.
  const updateSetting = (key: keyof SiteSettings, value: unknown) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const dirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const saveAll = async () => {
    setSaving(true);
    try {
      const data = await api.put<{ success: boolean; data: SiteSettings }>(
        '/settings/bulk',
        { settings },
      );
      const merged = { ...DEFAULT_SETTINGS, ...data.data };
      setSettings(merged);
      setSavedSettings(merged);
      showToast('Settings saved!');
    } catch {
      showToast('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => setSettings(savedSettings);

  const saveSecret = async (key: ProviderSecretKey) => {
    const value = keyInputs[key]?.trim();
    if (!value) return;
    setSavingKey(key);
    try {
      const res = await api.put<{ success: boolean; data: SecretStatus }>(
        '/settings/secrets',
        { key, value },
      );
      setSecretStatus(res.data);
      setKeyInputs((prev) => ({ ...prev, [key]: '' }));
      showToast('API key saved securely');
    } catch {
      showToast('Failed to save key');
    } finally {
      setSavingKey(null);
    }
  };

  const clearSecret = async (key: ProviderSecretKey) => {
    setSavingKey(key);
    try {
      const res = await api.put<{ success: boolean; data: SecretStatus }>(
        '/settings/secrets',
        { key, value: '' },
      );
      setSecretStatus(res.data);
      showToast('API key removed');
    } catch {
      showToast('Failed to remove key');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-in slide-in-from-top-2">
          <CheckCircle className="h-4 w-4" />
          {toast}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Admin panel configuration &amp; feature flags
          </p>
        </div>
        <button
          type="button"
          onClick={saveAll}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account Info */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Shield className="h-5 w-5" /> Account
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Name</span>
              <span className="font-medium">{user?.name || '--'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Email</span>
              <span className="font-medium">{user?.email || '--'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Role</span>
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                {user?.role || '--'}
              </span>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Settings className="h-5 w-5" /> Application
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">API Endpoint</span>
              <span className="font-mono text-xs">
                {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Environment</span>
              <span className="font-medium">
                {process.env.NODE_ENV || 'development'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
          <ToggleLeft className="h-5 w-5" /> Feature Flags
        </h2>

        <div className="divide-y">
          {/* Payment Gateway */}
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-sm">Payment Gateway (Razorpay)</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Enable or disable the payment gateway for customers
              </p>
            </div>
            <Toggle
              enabled={settings.paymentEnabled}
              onChange={(val) => updateSetting('paymentEnabled', val)}
            />
          </div>

          {/* Razorpay Mode */}
          {settings.paymentEnabled && (
            <div className="flex items-center justify-between py-4 pl-6 border-l-2 border-brand-200 ml-2">
              <div>
                <p className="font-medium text-sm">Razorpay Mode</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {settings.razorpayLive
                    ? 'LIVE - Real payments will be processed'
                    : 'TEST - Using sandbox/test mode'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${settings.razorpayLive ? 'text-[hsl(var(--muted-foreground))]' : 'text-amber-600'}`}>
                  Test
                </span>
                <Toggle
                  enabled={settings.razorpayLive}
                  onChange={(val) => updateSetting('razorpayLive', val)}
                />
                <span className={`text-xs font-medium ${settings.razorpayLive ? 'text-green-600' : 'text-[hsl(var(--muted-foreground))]'}`}>
                  Live
                </span>
              </div>
            </div>
          )}

          {/* Tamil Language */}
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-sm">Tamil Language</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Enable Tamil language option for story creation
              </p>
            </div>
            <Toggle
              enabled={settings.tamilEnabled}
              onChange={(val) => updateSetting('tamilEnabled', val)}
            />
          </div>

          {/* Bilingual Option */}
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-sm">Bilingual Option</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Enable bilingual (English + Tamil) story option
              </p>
            </div>
            <Toggle
              enabled={settings.bilingualEnabled}
              onChange={(val) => updateSetting('bilingualEnabled', val)}
            />
          </div>

          {/* Maintenance Mode */}
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-sm">Maintenance Mode</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Show a maintenance page to all visitors
              </p>
            </div>
            <Toggle
              enabled={settings.maintenanceMode}
              onChange={(val) => updateSetting('maintenanceMode', val)}
            />
          </div>
        </div>
      </div>

      {/* AI Image Generation */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5" /> AI Image Generation
        </h2>
        <p className="mb-6 text-xs text-[hsl(var(--muted-foreground))]">
          Generate personalized illustrations from the child&apos;s uploaded
          photo. API keys are encrypted at rest and never exposed to the public
          site. While disabled or unconfigured, previews show sample artwork.
        </p>

        {/* Enable toggle */}
        <div className="flex items-center justify-between border-b py-4">
          <div>
            <p className="text-sm font-medium">Live Generation</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              When on, previews are generated with the selected provider.
            </p>
          </div>
          <Toggle
            enabled={settings.imageGenEnabled}
            onChange={(val) => updateSetting('imageGenEnabled', val)}
          />
        </div>

        {/* Provider selector */}
        <div className="border-b py-4">
          <p className="mb-2 text-sm font-medium">Active Provider</p>
          <div className="flex flex-wrap gap-2">
            {(['gemini', 'openai', 'fal'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => updateSetting('imageProvider', p)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  settings.imageProvider === p
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-200 hover:bg-[hsl(var(--muted))]'
                }`}
              >
                {p === 'gemini'
                  ? 'Google Gemini'
                  : p === 'openai'
                    ? 'OpenAI'
                    : 'Fal.ai (PuLID)'}
                {settings.imageProvider === p && (
                  <CheckCircle className="ml-2 inline h-3.5 w-3.5" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* API key inputs */}
        <div className="space-y-5 pt-4">
          {(
            [
              { key: 'geminiApiKey', label: 'Google Gemini API key', hint: 'From Google AI Studio' },
              { key: 'openaiApiKey', label: 'OpenAI API key', hint: 'From platform.openai.com' },
              { key: 'falApiKey', label: 'Fal.ai API key', hint: 'From fal.ai/dashboard/keys' },
            ] as const
          ).map(({ key, label, hint }) => (
            <div key={key}>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-sm font-medium">
                  <KeyRound className="h-3.5 w-3.5" /> {label}
                </label>
                {secretStatus[key] ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    <CheckCircle className="h-3 w-3" /> Configured
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                    Not set
                  </span>
                )}
              </div>
              <p className="mb-2 text-xs text-[hsl(var(--muted-foreground))]">
                {hint}
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  autoComplete="off"
                  value={keyInputs[key]}
                  onChange={(e) =>
                    setKeyInputs((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder={
                    secretStatus[key] ? '•••••••••• (enter to replace)' : 'Paste API key'
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => saveSecret(key)}
                  disabled={savingKey === key || !keyInputs[key]?.trim()}
                  className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingKey === key ? 'Saving...' : 'Save'}
                </button>
                {secretStatus[key] && (
                  <button
                    type="button"
                    onClick={() => clearSecret(key)}
                    disabled={savingKey === key}
                    className="shrink-0 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Number Inputs */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
          <Save className="h-5 w-5" /> Thresholds
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Free Shipping Threshold */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Free Shipping Threshold
            </label>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">
              Orders above this amount (in INR) get free shipping. Set to 0 to disable.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">&#8377;</span>
              <input
                type="number"
                min={0}
                value={settings.freeShippingThreshold}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    freeShippingThreshold: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Max Previews Per Day */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Max Previews Per Day
            </label>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">
              Maximum number of preview generations per user per day.
            </p>
            <input
              type="number"
              min={1}
              max={50}
              value={settings.maxPreviewsPerDay}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  maxPreviewsPerDay: parseInt(e.target.value) || 5,
                }))
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Sticky save bar — appears whenever there are unsaved changes */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur px-6 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              You have unsaved changes.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={discardChanges}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))] disabled:opacity-50"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={saveAll}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
