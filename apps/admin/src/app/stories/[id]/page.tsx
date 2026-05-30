'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Wand2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { adminApi } from '@/lib/api';

const THEMES = [
  'ADVENTURE',
  'LEARNING',
  'PROFESSIONS',
  'FESTIVALS',
  'FAMILY_LOVE',
  'IMAGINATION',
  'BEDTIME',
] as const;

interface PageTemplate {
  id: string;
  pageNumber: number;
  textTemplate: string;
  illustrationPrompt: string;
  negativePrompt: string | null;
  styleTokens: Record<string, unknown> | null;
  isCoverPage: boolean;
  isPreviewPage: boolean;
}

interface StoryData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  theme: string;
  ageMin: number;
  ageMax: number;
  artStyle: string;
  coverImageUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  basePriceInr: number;
  premiumPriceInr: number;
  giftPriceInr: number;
  pages: PageTemplate[];
}

export default function StoryEditorPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.id as string;
  const isNew = storyId === 'new';

  const [story, setStory] = useState<StoryData>({
    id: '',
    slug: '',
    title: '',
    description: '',
    theme: 'ADVENTURE',
    ageMin: 3,
    ageMax: 8,
    artStyle: 'watercolor storybook illustration',
    coverImageUrl: null,
    isActive: false,
    isFeatured: false,
    basePriceInr: 149900,
    premiumPriceInr: 229900,
    giftPriceInr: 349900,
    pages: [],
  });
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedPages, setExpandedPages] = useState<Set<number>>(new Set());

  const fetchStory = useCallback(async () => {
    if (isNew) return;
    setIsLoading(true);
    try {
      const data = await adminApi.getStoryTemplate(storyId);
      setStory(data);
    } catch {
      router.push('/stories');
    } finally {
      setIsLoading(false);
    }
  }, [storyId, isNew, router]);

  useEffect(() => {
    fetchStory();
  }, [fetchStory]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (isNew) {
        await adminApi.createStoryTemplate(story as unknown as Record<string, unknown>);
      } else {
        await adminApi.updateStoryTemplate(storyId, story as unknown as Record<string, unknown>);
      }
      router.push('/stories');
    } catch {
      // Error handled silently
    } finally {
      setIsSaving(false);
    }
  };

  const addPage = () => {
    const nextPageNum = story.pages.length > 0
      ? Math.max(...story.pages.map((p) => p.pageNumber)) + 1
      : 1;
    setStory((prev) => ({
      ...prev,
      pages: [
        ...prev.pages,
        {
          id: `new-${Date.now()}`,
          pageNumber: nextPageNum,
          textTemplate: '',
          illustrationPrompt: '',
          negativePrompt: '',
          styleTokens: null,
          isCoverPage: false,
          isPreviewPage: nextPageNum <= 5,
        },
      ],
    }));
    setExpandedPages((prev) => new Set([...prev, nextPageNum]));
  };

  const removePage = (pageNumber: number) => {
    setStory((prev) => ({
      ...prev,
      pages: prev.pages.filter((p) => p.pageNumber !== pageNumber),
    }));
  };

  const updatePage = (pageNumber: number, updates: Partial<PageTemplate>) => {
    setStory((prev) => ({
      ...prev,
      pages: prev.pages.map((p) =>
        p.pageNumber === pageNumber ? { ...p, ...updates } : p,
      ),
    }));
  };

  const togglePageExpand = (pageNumber: number) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNumber)) {
        next.delete(pageNumber);
      } else {
        next.add(pageNumber);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/stories')}
          className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{isNew ? 'Create Story' : 'Edit Story'}</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {isNew ? 'Create a new story template' : story.slug}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Story Details */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Basic Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Title</label>
                <input
                  type="text"
                  value={story.title}
                  onChange={(e) => setStory((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="The Magic Adventure of {childName}"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">
                  Description (English)
                </label>
                <textarea
                  value={story.description || ''}
                  onChange={(e) =>
                    setStory((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="A magical adventure where your child..."
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Slug</label>
                <input
                  type="text"
                  value={story.slug}
                  onChange={(e) => setStory((prev) => ({ ...prev, slug: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="magic-adventure"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Theme</label>
                <select
                  value={story.theme}
                  onChange={(e) => setStory((prev) => ({ ...prev, theme: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                >
                  {THEMES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Age Min</label>
                <input
                  type="number"
                  value={story.ageMin}
                  onChange={(e) =>
                    setStory((prev) => ({ ...prev, ageMin: parseInt(e.target.value) || 0 }))
                  }
                  min={1}
                  max={12}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Age Max</label>
                <input
                  type="number"
                  value={story.ageMax}
                  onChange={(e) =>
                    setStory((prev) => ({ ...prev, ageMax: parseInt(e.target.value) || 0 }))
                  }
                  min={1}
                  max={12}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Art Style</label>
                <input
                  type="text"
                  value={story.artStyle}
                  onChange={(e) => setStory((prev) => ({ ...prev, artStyle: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="watercolor storybook illustration"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Cover Image URL</label>
                <input
                  type="text"
                  value={story.coverImageUrl || ''}
                  onChange={(e) =>
                    setStory((prev) => ({ ...prev, coverImageUrl: e.target.value || null }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Pages */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Pages ({story.pages.length})</h2>
              <button
                onClick={addPage}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
              >
                <Plus className="h-4 w-4" /> Add Page
              </button>
            </div>

            <div className="space-y-3">
              {story.pages
                .sort((a, b) => a.pageNumber - b.pageNumber)
                .map((page) => {
                  const isExpanded = expandedPages.has(page.pageNumber);
                  return (
                    <div key={page.id} className="rounded-lg border">
                      {/* Page header */}
                      <div
                        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-[hsl(var(--muted)/0.3)]"
                        onClick={() => togglePageExpand(page.pageNumber)}
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                          {page.pageNumber}
                        </span>
                        <div className="flex-1">
                          <span className="text-sm font-medium">
                            Page {page.pageNumber}
                            {page.isCoverPage && ' (Cover)'}
                            {page.isPreviewPage && ' (Preview)'}
                          </span>
                          {page.textTemplate && (
                            <p className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-md">
                              {page.textTemplate.slice(0, 80)}...
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removePage(page.pageNumber);
                            }}
                            className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                          )}
                        </div>
                      </div>

                      {/* Page editor */}
                      {isExpanded && (
                        <div className="space-y-4 border-t px-4 py-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <label className="mb-1 block text-xs font-medium">
                                Text Template (English) - use {'{childName}'} for personalization
                              </label>
                              <textarea
                                value={page.textTemplate}
                                onChange={(e) =>
                                  updatePage(page.pageNumber, { textTemplate: e.target.value })
                                }
                                rows={3}
                                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="mb-1 block text-xs font-medium">
                                Illustration Prompt
                              </label>
                              <textarea
                                value={page.illustrationPrompt}
                                onChange={(e) =>
                                  updatePage(page.pageNumber, {
                                    illustrationPrompt: e.target.value,
                                  })
                                }
                                rows={3}
                                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                placeholder="A young child standing in a magical forest..."
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="mb-1 block text-xs font-medium">
                                Negative Prompt
                              </label>
                              <textarea
                                value={page.negativePrompt || ''}
                                onChange={(e) =>
                                  updatePage(page.pageNumber, {
                                    negativePrompt: e.target.value || null,
                                  })
                                }
                                rows={2}
                                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                placeholder="blurry, distorted, extra fingers..."
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="mb-1 block text-xs font-medium">
                                Style Tokens (JSON)
                              </label>
                              <textarea
                                value={
                                  page.styleTokens
                                    ? JSON.stringify(page.styleTokens, null, 2)
                                    : ''
                                }
                                onChange={(e) => {
                                  try {
                                    const parsed = e.target.value
                                      ? JSON.parse(e.target.value)
                                      : null;
                                    updatePage(page.pageNumber, { styleTokens: parsed });
                                  } catch {
                                    // Allow typing invalid JSON while editing
                                  }
                                }}
                                rows={3}
                                className="w-full rounded-lg border px-3 py-2 font-mono text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                placeholder='{ "guidance_scale": 7.5, "steps": 30 }'
                              />
                            </div>
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={page.isCoverPage}
                                  onChange={(e) =>
                                    updatePage(page.pageNumber, {
                                      isCoverPage: e.target.checked,
                                    })
                                  }
                                  className="rounded border-gray-300"
                                />
                                Cover Page
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={page.isPreviewPage}
                                  onChange={(e) =>
                                    updatePage(page.pageNumber, {
                                      isPreviewPage: e.target.checked,
                                    })
                                  }
                                  className="rounded border-gray-300"
                                />
                                Preview Page
                              </label>
                            </div>
                            <div className="flex justify-end">
                              <button className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100">
                                <Wand2 className="h-3.5 w-3.5" /> Test Generation
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right column - Settings */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Settings</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium">Active</span>
                <button
                  onClick={() =>
                    setStory((prev) => ({ ...prev, isActive: !prev.isActive }))
                  }
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    story.isActive ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      story.isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium">Featured</span>
                <button
                  onClick={() =>
                    setStory((prev) => ({ ...prev, isFeatured: !prev.isFeatured }))
                  }
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    story.isFeatured ? 'bg-yellow-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      story.isFeatured ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Pricing (INR)</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Softcover</label>
                <input
                  type="number"
                  value={story.basePriceInr / 100}
                  onChange={(e) =>
                    setStory((prev) => ({
                      ...prev,
                      basePriceInr: Math.round(parseFloat(e.target.value) * 100) || 0,
                    }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Hardcover</label>
                <input
                  type="number"
                  value={story.premiumPriceInr / 100}
                  onChange={(e) =>
                    setStory((prev) => ({
                      ...prev,
                      premiumPriceInr: Math.round(parseFloat(e.target.value) * 100) || 0,
                    }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Premium Gift Box</label>
                <input
                  type="number"
                  value={story.giftPriceInr / 100}
                  onChange={(e) =>
                    setStory((prev) => ({
                      ...prev,
                      giftPriceInr: Math.round(parseFloat(e.target.value) * 100) || 0,
                    }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
