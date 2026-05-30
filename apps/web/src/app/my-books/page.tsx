'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Eye,
  Pencil,
  Plus,
  Clock,
  CheckCircle,
  Loader2,
  Truck,
  Package,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

const coverImages: Record<string, string> = {
  'abc-adventure': '/images/stories/abc-adventure.jpg',
  'magical-unicorn': '/images/stories/magical-unicorn.jpg',
  'beach-adventure': '/images/stories/beach-adventure.jpg',
};

const displayTitles: Record<string, string> = {
  'abc-adventure': 'ABC Adventure',
  'magical-unicorn': 'Magical Unicorn Adventure',
  'beach-adventure': 'Beach Adventure',
};

interface BookData {
  id: string;
  status: string;
  language: string;
  createdAt: string;
  child: {
    id: string;
    name: string;
    gender: string;
  };
  story: {
    id: string;
    slug: string;
    title: string;
    coverImageUrl: string | null;
  };
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-700',
    icon: <Pencil className="h-3 w-3" />,
  },
  GENERATING_PREVIEW: {
    label: 'Generating Preview',
    color: 'bg-amber-100 text-amber-700',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  PREVIEW_READY: {
    label: 'Preview Ready',
    color: 'bg-blue-100 text-blue-700',
    icon: <Eye className="h-3 w-3" />,
  },
  GENERATING_FULL: {
    label: 'Generating',
    color: 'bg-amber-100 text-amber-700',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    color: 'bg-yellow-100 text-yellow-700',
    icon: <Clock className="h-3 w-3" />,
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  PRINTING: {
    label: 'Printing',
    color: 'bg-purple-100 text-purple-700',
    icon: <Package className="h-3 w-3" />,
  },
  SHIPPED: {
    label: 'Shipped',
    color: 'bg-indigo-100 text-indigo-700',
    icon: <Truck className="h-3 w-3" />,
  },
  DELIVERED: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700',
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

export default function MyBooksPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }

    api
      .get<BookData[]>('/books')
      .then((res) => {
        if (res.success && res.data) {
          setBooks(res.data);
        }
      })
      .catch(() => {
        // Failed to fetch
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, authLoading, router]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen bg-gradient-brand-soft flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-brand-soft">
      <div className="container-custom py-8 sm:py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold">
              My Books
            </h1>
            <p className="text-muted-foreground mt-1">
              Your personalized storybooks
            </p>
          </div>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-200 hover:opacity-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Create New
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
          </div>
        ) : books.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-200 bg-white/60 py-20 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 mb-4">
              <BookOpen className="h-8 w-8 text-purple-600" />
            </div>
            <h2 className="font-heading text-xl font-bold mb-2">
              You haven&apos;t created any books yet.
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Start creating a personalized storybook where your child is the hero!
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-purple-200 hover:opacity-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              Start Creating!
            </Link>
          </div>
        ) : (
          /* Book Grid */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => {
              const status = statusConfig[book.status] || statusConfig.DRAFT;
              const storySlug = book.story.slug;
              const coverImage =
                coverImages[storySlug] ||
                book.story.coverImageUrl ||
                '/images/stories/abc-adventure.jpg';
              const storyTitle =
                displayTitles[storySlug] ||
                book.story.title.replace(/\{\{childName\}\}/g, book.child.name);
              const createdDate = new Date(book.createdAt).toLocaleDateString(
                'en-IN',
                {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                },
              );

              const canViewPreview = [
                'PREVIEW_READY',
                'GENERATING_FULL',
                'PENDING_APPROVAL',
                'APPROVED',
                'PRINTING',
                'SHIPPED',
                'DELIVERED',
              ].includes(book.status);

              const canContinue = book.status === 'DRAFT';

              return (
                <div
                  key={book.id}
                  className="rounded-2xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Cover Image */}
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-pink-100 to-purple-100">
                    <Image
                      src={coverImage}
                      alt={storyTitle}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.color}`}
                      >
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">
                      For {book.child.name}
                    </p>
                    <h3 className="font-heading font-bold text-base mb-1">
                      {storyTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Created {createdDate}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {canViewPreview && (
                        <Link
                          href={`/create?bookId=${book.id}&step=6`}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Preview
                        </Link>
                      )}
                      {canContinue && (
                        <Link
                          href={`/create?bookId=${book.id}`}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-brand px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95 transition-all"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Continue
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
