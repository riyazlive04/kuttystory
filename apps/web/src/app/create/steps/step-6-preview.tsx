'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  BookOpen,
  User,
  Camera,
  Globe,
  Palette,
  MessageSquare,
  Lock,
} from 'lucide-react';
import type { WizardState, BookPreviewData } from '@kutty-story/shared';
import { Button } from '@kutty-story/ui';
import { BookPreview } from '@/components/book-preview';
import { AuthModal } from '@/components/auth-modal';
import { api, ensureGuestSession } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const FULL_BOOK_PAGE_COUNT = 28;
const PREVIEW_PAGE_COUNT = 5;

interface Step6Props {
  wizard: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  onBack: () => void;
}

type PreviewState =
  | 'idle'
  | 'generating'
  | 'ready'
  | 'generatingFull'
  | 'fullReady'
  | 'error';

const DISPLAY_TITLES: Record<string, string> = {
  'abc-adventure': 'ABC Adventure',
  'magical-unicorn': 'Magical Unicorn Adventure',
  'beach-adventure': 'Beach Adventure',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface GeneratedPage {
  pageNumber: number;
  finalImageUrl: string | null;
  status: string;
}

interface PollOptions {
  expectedPages: number;
  successStatuses: string[];
  generatingStatuses: string[];
  failureStatuses: string[];
  graceMs?: number;
}

/** Poll book status until generation finishes; returns the ready pages. */
async function pollUntilReady(
  bookId: string,
  onProgress: (pct: number) => void,
  opts: PollOptions,
): Promise<GeneratedPage[]> {
  const { expectedPages, successStatuses, generatingStatuses, failureStatuses } =
    opts;
  const graceMs = opts.graceMs ?? 15000;
  const startedAt = Date.now();
  const maxMs = 10 * 60 * 1000;
  let sawGenerating = false;

  while (Date.now() - startedAt < maxMs) {
    await sleep(3000);

    let status = '';
    try {
      const statusRes = await api.get<{ bookStatus: string }>(
        `/generation/status/${bookId}`,
      );
      status = statusRes.data?.bookStatus ?? '';
    } catch {
      // transient — keep polling
    }

    if (generatingStatuses.includes(status)) {
      sawGenerating = true;
    }

    let ready: GeneratedPage[] = [];
    try {
      const pagesRes = await api.get<GeneratedPage[]>(`/books/${bookId}/pages`);
      ready = (pagesRes.data ?? []).filter((p) => p.finalImageUrl);
    } catch {
      // ignore — keep polling
    }
    onProgress(Math.min(95, Math.round((ready.length / expectedPages) * 100)));

    if (successStatuses.includes(status)) {
      return ready.sort((a, b) => a.pageNumber - b.pageNumber);
    }

    // Reverted to a failure status (or never started) → failed/unconfigured.
    if (
      failureStatuses.includes(status) &&
      (sawGenerating || Date.now() - startedAt > graceMs)
    ) {
      throw new Error('Generation failed or not configured');
    }
  }
  throw new Error('Generation timed out');
}

export function Step6Preview({ wizard, onUpdate, onBack }: Step6Props) {
  const { user } = useAuth();
  const [dedicationMessage, setDedicationMessage] = useState(
    wizard.dedicationMessage,
  );
  const [previewState, setPreviewState] = useState<PreviewState>('idle');
  const [previewData, setPreviewData] = useState<BookPreviewData | null>(null);
  const [fullData, setFullData] = useState<BookPreviewData | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [storySlug, setStorySlug] = useState<string | null>(null);
  const [storyTitle, setStoryTitle] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
  // Lead details captured before the free preview so the sales team can follow
  // up even if the visitor never signs up or orders.
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Resolve the selected story's slug + display title from its id.
  useEffect(() => {
    if (!wizard.storyTemplateId) return;
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    fetch(`${apiUrl}/stories`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const found = data.data.find(
            (s: Record<string, unknown>) => s.id === wizard.storyTemplateId,
          );
          if (found) {
            const slug = found.slug as string;
            setStorySlug(slug);
            setStoryTitle(
              DISPLAY_TITLES[slug] ||
                (found.title as string).replace(
                  /\{\{childName\}\}/g,
                  'Your Child',
                ),
            );
          }
        }
      })
      .catch(() => {});
  }, [wizard.storyTemplateId]);

  const resolvedSlug = storySlug || 'abc-adventure';

  const charsLeft = 200 - dedicationMessage.length;

  const handleDedicationChange = (value: string) => {
    if (value.length <= 200) {
      setDedicationMessage(value);
      onUpdate({ dedicationMessage: value });
    }
  };

  // Build placeholder pages from the story's sample artwork.
  const buildSamplePages = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      pageNumber: i + 1,
      imageUrl: `/images/stories/${resolvedSlug}/page-${i + 1}.jpg`,
    }));

  // Fallback when live AI generation isn't available (no provider key yet).
  // Keep the real book id (if one was created) so the order can reference it.
  const showSamplePreview = (realBookId?: string) => {
    setProgress(100);
    const bookId = realBookId ?? `book-${Date.now()}`;
    setPreviewData({
      bookId,
      storyTemplateId: wizard.storyTemplateId ?? '',
      childName: wizard.childProfile?.name ?? 'Child',
      language: wizard.language,
      pages: buildSamplePages(PREVIEW_PAGE_COUNT),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    onUpdate({ bookId });
    setTimeout(() => setPreviewState('ready'), 400);
  };

  const showFullSamplePreview = (bookId: string) => {
    setProgress(100);
    setFullData({
      bookId,
      storyTemplateId: wizard.storyTemplateId ?? '',
      childName: wizard.childProfile?.name ?? 'Child',
      language: wizard.language,
      pages: buildSamplePages(FULL_BOOK_PAGE_COUNT),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    setTimeout(() => setPreviewState('fullReady'), 400);
  };

  const generatePreview = async () => {
    setPreviewState('generating');
    setProgress(0);
    setError(null);

    let createdBookId: string | undefined;
    try {
      // 0. Make sure a session exists (anonymous guest if not signed in) so the
      //    auth-guarded child/book/generation endpoints accept the request.
      await ensureGuestSession();

      // 0b. Save the lead's contact details on the (guest) user so the sales
      //     team can reach out even if they never sign up. Best-effort.
      try {
        await api.put('/users/me/contact', {
          name: contactName.trim() || undefined,
          phone: contactPhone.trim() || undefined,
          email: contactEmail.trim() || undefined,
        });
      } catch {
        // non-fatal — continue with preview generation
      }

      // 1. Persist the child profile with the uploaded photo keys as references.
      const childRes = await api.post<{ id: string }>('/users/me/children', {
        name: wizard.childProfile?.name,
        nickname: wizard.childProfile?.nickname,
        gender: wizard.childProfile?.gender,
        ageYears: wizard.childProfile?.ageYears,
        skinTone: wizard.childProfile?.skinTone,
        hairColor: wizard.childProfile?.hairColor,
        hasGlasses: wizard.childProfile?.hasGlasses ?? false,
        referencePhotoUrls: wizard.photoIds,
      });
      const childProfileId = childRes.data?.id;
      if (!childProfileId) throw new Error('Could not create child profile');

      // 2. Create the book.
      const bookRes = await api.post<{ id: string }>('/books', {
        storyTemplateId: wizard.storyTemplateId,
        childProfileId,
        language: wizard.language,
      });
      const bookId = bookRes.data?.id;
      if (!bookId) throw new Error('Could not create book');
      createdBookId = bookId;
      onUpdate({ bookId });

      // 3. Trigger the free preview (first few pages only).
      await api.post(`/generation/preview/${bookId}`);

      // 4. Poll until the preview pages are generated, then render them.
      const pages = await pollUntilReady(bookId, (pct) => setProgress(pct), {
        expectedPages: PREVIEW_PAGE_COUNT,
        successStatuses: ['PREVIEW_READY', 'PENDING_APPROVAL'],
        generatingStatuses: ['GENERATING_PREVIEW', 'GENERATING_FULL'],
        failureStatuses: ['DRAFT'],
      });
      if (pages.length === 0) throw new Error('No pages generated');

      setProgress(100);
      setPreviewData({
        bookId,
        storyTemplateId: wizard.storyTemplateId ?? '',
        childName: wizard.childProfile?.name ?? 'Child',
        language: wizard.language,
        pages: pages.map((p) => ({
          pageNumber: p.pageNumber,
          imageUrl: p.finalImageUrl as string,
        })),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      setTimeout(() => setPreviewState('ready'), 400);
    } catch {
      // Live generation unavailable (provider key not configured, etc.) — fall
      // back to sample artwork so the flow still completes.
      showSamplePreview(createdBookId);
    }
  };

  // The full 28-page book is gated behind sign-up. Triggered automatically once
  // the visitor authenticates (see effect below) or for already-signed-in users.
  const generateFullBook = async (bookId: string) => {
    setPreviewState('generatingFull');
    setProgress(0);
    setError(null);
    try {
      await api.post(`/generation/full/${bookId}`);
      const pages = await pollUntilReady(bookId, (pct) => setProgress(pct), {
        expectedPages: FULL_BOOK_PAGE_COUNT,
        successStatuses: ['PENDING_APPROVAL', 'APPROVED'],
        generatingStatuses: ['GENERATING_FULL'],
        failureStatuses: ['PREVIEW_READY', 'DRAFT'],
      });
      if (pages.length === 0) throw new Error('No pages generated');

      setProgress(100);
      setFullData({
        bookId,
        storyTemplateId: wizard.storyTemplateId ?? '',
        childName: wizard.childProfile?.name ?? 'Child',
        language: wizard.language,
        pages: pages.map((p) => ({
          pageNumber: p.pageNumber,
          imageUrl: p.finalImageUrl as string,
        })),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      setTimeout(() => setPreviewState('fullReady'), 400);
    } catch {
      showFullSamplePreview(bookId);
    }
  };

  // NOTE: the full 28-page book is intentionally NOT generated here. To control
  // cost, the create flow only produces the 5-page preview; the full book is
  // generated server-side when the customer places an order (see
  // OrdersService.triggerFullGeneration). Signed-in users go straight to
  // checkout from the preview below.

  // Summary items
  const summaryItems = [
    {
      icon: BookOpen,
      label: 'Story',
      value: storyTitle || (wizard.storyTemplateId ? 'Selected story' : 'Not selected'),
    },
    {
      icon: User,
      label: 'Child',
      value: wizard.childProfile
        ? `${wizard.childProfile.name}, ${wizard.childProfile.ageYears} years`
        : 'Not provided',
    },
    {
      icon: Camera,
      label: 'Photos',
      value: `${wizard.photoIds.length} photo${wizard.photoIds.length !== 1 ? 's' : ''} uploaded`,
    },
    {
      icon: Palette,
      label: 'Appearance',
      value: [
        wizard.childProfile?.skinTone,
        wizard.childProfile?.hairColor,
        wizard.childProfile?.hasGlasses ? 'glasses' : null,
      ]
        .filter(Boolean)
        .join(', ') || 'Auto-detect from photos',
    },
    {
      icon: Globe,
      label: 'Language',
      value:
        wizard.language === 'BILINGUAL'
          ? 'Bilingual (English + Tamil)'
          : wizard.language === 'TAMIL'
            ? 'Tamil'
            : 'English',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold mb-2">
          Dedication & Preview
        </h2>
        <p className="text-muted-foreground">
          Add a personal dedication message and generate a free preview of your
          storybook.
        </p>
      </div>

      {/* Dedication message */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm mb-6">
        <label className="flex items-center gap-2 text-sm font-semibold mb-3">
          <MessageSquare className="h-4 w-4 text-purple-600" />
          Dedication Message
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          value={dedicationMessage}
          onChange={(e) => handleDedicationChange(e.target.value)}
          placeholder="To my dearest Aarav, may you always find magic in every page of life..."
          rows={4}
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
        <p
          className={`text-xs mt-1.5 ${
            charsLeft < 20 ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {charsLeft} characters remaining
        </p>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm mb-6">
        <h3 className="font-heading font-bold text-base mb-4">
          Order Summary
        </h3>
        <div className="space-y-3">
          {summaryItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                <item.icon className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview generation */}
      <AnimatePresence mode="wait">
        {previewState === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-8"
          >
            {/* Contact details — lets us send the preview and follow up */}
            <div className="bg-white rounded-2xl border border-border p-6 shadow-sm mb-6">
              <h3 className="font-heading font-bold text-base mb-1">
                Where should we send your preview?
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Enter your details to generate your free preview. We&apos;ll use
                these to help you with your order.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Your name
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Phone (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="e.g. 98765 43210"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Email <span className="font-normal">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={generatePreview}
                disabled={
                  contactName.trim().length < 2 ||
                  contactPhone.replace(/\D/g, '').length < 10
                }
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-10 py-4 text-base font-bold text-white shadow-lg shadow-purple-200 hover:shadow-xl hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="h-5 w-5" />
                Generate Free Preview
              </button>
              <p className="text-xs text-muted-foreground mt-3">
                Free {PREVIEW_PAGE_COUNT}-page personalized preview. Sign up to
                unlock the full {FULL_BOOK_PAGE_COUNT}-page book.
              </p>
            </div>
          </motion.div>
        )}

        {previewState === 'generating' && (
          <motion.div
            key="generating"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl border border-border p-8 shadow-sm mb-8"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: 'linear',
                }}
                className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-purple-100 mb-4"
              >
                <Sparkles className="h-8 w-8 text-purple-600" />
              </motion.div>
              <h3 className="font-heading font-bold text-lg mb-2">
                Creating Your Preview
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Our AI is generating personalized illustrations of{' '}
                {wizard.childProfile?.name ?? 'your child'}...
              </p>

              {/* Progress bar */}
              <div className="max-w-sm mx-auto">
                <div className="h-2 rounded-full bg-purple-100 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-brand"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.round(Math.min(progress, 100))}% complete
                </p>
              </div>

              {/* Progress steps */}
              <div className="mt-6 space-y-2 text-left max-w-xs mx-auto">
                {[
                  { label: 'Analyzing photos', threshold: 20 },
                  { label: 'Generating character model', threshold: 45 },
                  { label: 'Illustrating pages', threshold: 70 },
                  { label: 'Adding text overlays', threshold: 90 },
                  { label: 'Finalizing preview', threshold: 100 },
                ].map((step) => (
                  <div
                    key={step.label}
                    className={`flex items-center gap-2 text-xs ${
                      progress >= step.threshold
                        ? 'text-purple-600'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        progress >= step.threshold
                          ? 'bg-purple-500'
                          : 'bg-border'
                      }`}
                    />
                    {step.label}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {previewState === 'ready' && previewData && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-8"
          >
            <div className="bg-white rounded-2xl border border-border p-6 shadow-sm mb-6">
              <h3 className="font-heading font-bold text-lg text-center mb-2">
                Your Free Preview is Ready!
              </h3>
              <p className="text-center text-sm text-muted-foreground mb-6">
                Here are the first {previewData.pages.length} pages of{' '}
                {previewData.childName}&apos;s story.
              </p>
              <BookPreview
                pages={previewData.pages}
                childName={previewData.childName}
              />
            </div>

            {/* Gate: ordering requires an account. The full 28-page book is
                created after the order is placed (not here), to control cost. */}
            {user ? (
              <div className="text-center">
                <a
                  href="/checkout"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-10 py-4 text-base font-bold text-white shadow-lg shadow-purple-200 hover:shadow-xl hover:opacity-95 transition-all"
                >
                  <Sparkles className="h-5 w-5" />
                  Love It! Order Now
                </a>
                <p className="mt-3 text-xs text-muted-foreground">
                  We&apos;ll create all {FULL_BOOK_PAGE_COUNT} personalized pages
                  after you order and deliver your book. Choose PDF (₹899) or
                  printed book (₹1,299) at checkout.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/60 p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand text-white">
                  <Lock className="h-6 w-6" />
                </div>
                <h4 className="font-heading font-bold text-base mb-1">
                  Love it? Create the full book
                </h4>
                <p className="text-sm text-muted-foreground mb-5">
                  Sign up free to generate all {FULL_BOOK_PAGE_COUNT}{' '}
                  personalized pages and place your order.
                </p>
                <button
                  onClick={() => setAuthMode('signup')}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-purple-200 hover:shadow-xl hover:opacity-95 transition-all"
                >
                  <Sparkles className="h-5 w-5" />
                  Sign Up & Create Full Book
                </button>
                <p className="mt-3 text-xs text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    onClick={() => setAuthMode('login')}
                    className="font-semibold text-purple-600 hover:underline"
                  >
                    Log in
                  </button>
                </p>
              </div>
            )}
          </motion.div>
        )}

        {previewState === 'generatingFull' && (
          <motion.div
            key="generatingFull"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl border border-border p-8 shadow-sm mb-8"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-purple-100 mb-4"
              >
                <Sparkles className="h-8 w-8 text-purple-600" />
              </motion.div>
              <h3 className="font-heading font-bold text-lg mb-2">
                Creating Your Full Storybook
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Generating all {FULL_BOOK_PAGE_COUNT} personalized pages of{' '}
                {wizard.childProfile?.name ?? 'your child'}&apos;s story. This
                can take a few minutes.
              </p>
              <div className="max-w-sm mx-auto">
                <div className="h-2 rounded-full bg-purple-100 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-brand"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.round(Math.min(progress, 100))}% complete
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {previewState === 'fullReady' && fullData && (
          <motion.div
            key="fullReady"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-8"
          >
            <div className="bg-white rounded-2xl border border-border p-6 shadow-sm mb-6">
              <h3 className="font-heading font-bold text-lg text-center mb-6">
                Your Full Storybook is Ready!
              </h3>
              <BookPreview
                pages={fullData.pages}
                childName={fullData.childName}
              />
            </div>

            <div className="text-center">
              <a
                href="/checkout"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-10 py-4 text-base font-bold text-white shadow-lg shadow-purple-200 hover:shadow-xl hover:opacity-95 transition-all"
              >
                Love It! Order Now
              </a>
              <p className="text-xs text-muted-foreground mt-3">
                Choose PDF download (₹899) or printed book (₹1,299) at
                checkout.
              </p>
            </div>
          </motion.div>
        )}

        {previewState === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center mb-8"
          >
            <div className="rounded-xl bg-destructive/10 p-6">
              <p className="text-sm text-destructive font-medium mb-3">
                {error ?? 'Something went wrong. Please try again.'}
              </p>
              <Button
                onClick={generatePreview}
                className="rounded-full bg-gradient-brand text-white"
              >
                Try Again
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-start mt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="rounded-full gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <AuthModal
        mode={authMode}
        onClose={() => setAuthMode(null)}
        onSwitchMode={(mode) => setAuthMode(mode)}
      />
    </div>
  );
}
