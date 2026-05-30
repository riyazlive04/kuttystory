'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, BookOpen, Star, ToggleLeft, ToggleRight } from 'lucide-react';
import { adminApi } from '@/lib/api';

const THEME_COLORS: Record<string, string> = {
  ADVENTURE: 'bg-amber-100 text-amber-800',
  LEARNING: 'bg-blue-100 text-blue-800',
  PROFESSIONS: 'bg-indigo-100 text-indigo-800',
  FESTIVALS: 'bg-rose-100 text-rose-800',
  FAMILY_LOVE: 'bg-pink-100 text-pink-800',
  IMAGINATION: 'bg-purple-100 text-purple-800',
  BEDTIME: 'bg-cyan-100 text-cyan-800',
};

interface StoryTemplate {
  id: string;
  slug: string;
  title: string;
  theme: string;
  ageMin: number;
  ageMax: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  _count: { books: number };
}

export default function StoriesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<StoryTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getStoryTemplates({ page: 1, limit: 100 });
      setTemplates(data.templates);
      setTotal(data.total);
    } catch {
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    setTogglingId(id);
    try {
      await adminApi.toggleStoryActive(id, !isActive);
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isActive: !isActive } : t)),
      );
    } catch {
      // Error handled silently
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Story Templates</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {total} templates in catalog
          </p>
        </div>
        <button
          onClick={() => router.push('/stories/new')}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> New Story
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
          <BookOpen className="mx-auto h-12 w-12 text-[hsl(var(--muted-foreground))]" />
          <p className="mt-4 text-lg font-medium">No story templates yet</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Create your first story template to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="group relative rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md cursor-pointer"
              onClick={() => router.push(`/stories/${template.id}`)}
            >
              {/* Featured badge */}
              {template.isFeatured && (
                <div className="absolute right-3 top-3">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </div>
              )}

              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    THEME_COLORS[template.theme] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {template.theme.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  Ages {template.ageMin}-{template.ageMax}
                </span>
              </div>

              <h3 className="mb-1 text-lg font-semibold group-hover:text-brand-600 transition-colors">
                {template.title}
              </h3>

              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {template._count.books} books generated | slug: {template.slug}
              </p>

              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive(template.id, template.isActive);
                  }}
                  disabled={togglingId === template.id}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    template.isActive ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {template.isActive ? (
                    <ToggleRight className="h-5 w-5" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                  {template.isActive ? 'Active' : 'Inactive'}
                </button>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {new Date(template.createdAt).toLocaleDateString('en-IN')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
