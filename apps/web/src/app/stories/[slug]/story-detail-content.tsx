'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Star,
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { formatPriceInr, PRICING } from '@kutty-story/shared';
import { Badge, Button } from '@kutty-story/ui';

interface StoryMeta {
  title: string;
  description: string;
  longDescription: string;
  theme: string;
  ageMin: number;
  ageMax: number;
  pageCount: number;
}

const STORY_FALLBACK: Record<string, StoryMeta> = {
  'abc-adventure': {
    title: 'ABC Adventure',
    description:
      'An interactive alphabet adventure where your child explores all 26 letters with hidden seek-and-find surprises on every page.',
    longDescription:
      'Join your little one on a joyful journey through the alphabet. Each page introduces a new letter through playful illustrations and gentle seek-and-find moments, building early reading confidence while keeping the magic of story-time alive. Your child appears as the hero throughout, making every letter feel personal.',
    theme: 'Learning',
    ageMin: 2,
    ageMax: 6,
    pageCount: 28,
  },
  'magical-unicorn': {
    title: 'Magical Unicorn Adventure',
    description:
      'A magical journey where your child befriends Luna the unicorn on an enchanted quest full of wonder and kindness.',
    longDescription:
      'In this dreamy watercolour adventure, your child discovers Luna, a gentle unicorn who needs a brave friend. Together they journey through sparkling meadows and starlit skies, learning that courage and kindness are the truest kind of magic. Your child is the star of every beautifully illustrated page.',
    theme: 'Imagination',
    ageMin: 3,
    ageMax: 8,
    pageCount: 28,
  },
  'beach-adventure': {
    title: 'Beach Adventure',
    description:
      'A sunny beach day full of sandcastles, seashells, splashing waves and a perfect afternoon by the ocean.',
    longDescription:
      'Pack your bucket and spade! Your child sets off for a sun-filled day at the seaside, building sandcastles, collecting shells and chasing the waves. This warm, cheerful story celebrates curiosity and play, with your child front and centre in every scene.',
    theme: 'Adventure',
    ageMin: 2,
    ageMax: 5,
    pageCount: 28,
  },
};

const cleanText = (text: string) =>
  text.replace(/\{\{\s*childName\s*\}\}/gi, 'Your child').trim();

interface PageTemplate {
  pageNumber: number;
  textEnglish?: string;
  isPreviewPage?: boolean;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const reviews = [
  {
    name: 'Meera R.',
    rating: 5,
    date: '2 weeks ago',
    text: 'My daughter could not stop smiling when she saw herself in the story. The illustrations are breathtaking.',
  },
  {
    name: 'Vijay K.',
    rating: 5,
    date: '1 month ago',
    text: 'Ordered the printed book as a birthday gift. The quality is outstanding and the story is wonderfully written.',
  },
  {
    name: 'Lakshmi S.',
    rating: 4,
    date: '1 month ago',
    text: 'Beautiful story with amazing artwork. My son loves seeing himself as the hero of his very own book.',
  },
];

export default function StoryDetailContent({ slug }: { slug: string }) {
  const [currentSample, setCurrentSample] = useState(0);
  const [meta, setMeta] = useState<StoryMeta | null>(
    STORY_FALLBACK[slug] || null,
  );
  const [pages, setPages] = useState<PageTemplate[]>([]);

  useEffect(() => {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    fetch(`${apiUrl}/stories/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const s = data.data;
          setMeta((prev) => ({
            title: STORY_FALLBACK[slug]?.title || cleanText(s.title || ''),
            description: s.description
              ? cleanText(s.description)
              : prev?.description || '',
            longDescription:
              prev?.longDescription ||
              (s.description ? cleanText(s.description) : ''),
            theme: s.theme
              ? s.theme.charAt(0) + s.theme.slice(1).toLowerCase()
              : prev?.theme || 'Adventure',
            ageMin: s.ageMin ?? prev?.ageMin ?? 2,
            ageMax: s.ageMax ?? prev?.ageMax ?? 8,
            pageCount: s.pageCount ?? prev?.pageCount ?? 28,
          }));
          if (Array.isArray(s.pages)) {
            setPages(s.pages as PageTemplate[]);
          }
        }
      })
      .catch(() => {});
  }, [slug]);

  const coverImage = `/images/stories/${slug}.jpg`;
  const averageRating = 4.8;
  const totalReviews = 156;
  const readTime = '15 min';
  const languages = ['English'];

  const samplePages = useMemo(() => {
    const previewNumbers = pages
      .filter((p) => p.isPreviewPage)
      .map((p) => p.pageNumber);
    const numbers =
      previewNumbers.length >= 3
        ? previewNumbers.slice(0, 6)
        : [1, 2, 3, 4, 5, 6];
    return numbers.map((n) => {
      const pageText = pages.find((p) => p.pageNumber === n)?.textEnglish;
      const caption = pageText ? cleanText(pageText).slice(0, 70) : `Page ${n}`;
      return { url: `/images/stories/${slug}/page-${n}.jpg`, caption };
    });
  }, [pages, slug]);

  if (!meta) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  const story = {
    ...meta,
    slug,
    coverImage,
    ageRange: `${meta.ageMin}-${meta.ageMax}`,
    readTime,
    languages,
    samplePages,
    reviews,
    averageRating,
    totalReviews,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="bg-gradient-brand-soft border-b border-border">
        <div className="container-custom py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link
              href="/stories"
              className="hover:text-foreground transition-colors"
            >
              Stories
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{story.title}</span>
          </nav>
        </div>
      </div>

      <div className="container-custom py-8 sm:py-12">
        {/* Hero section */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
          {/* Cover Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100 shadow-2xl">
              <Image
                src={story.coverImage}
                alt={story.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
          </motion.div>

          {/* Story Info */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } },
            }}
            className="flex flex-col justify-center"
          >
            <motion.div variants={fadeInUp} className="flex flex-wrap gap-2 mb-4">
              <Badge className="bg-purple-100 text-purple-700 border-0">
                {story.theme}
              </Badge>
              <Badge variant="outline">Ages {story.ageRange}</Badge>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="font-heading text-3xl sm:text-4xl font-bold mb-4"
            >
              {story.title}
            </motion.h1>

            {/* Rating */}
            <motion.div
              variants={fadeInUp}
              className="flex items-center gap-3 mb-4"
            >
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(story.averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold">
                {story.averageRating}
              </span>
              <span className="text-sm text-muted-foreground">
                ({story.totalReviews} reviews)
              </span>
            </motion.div>

            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground leading-relaxed mb-6"
            >
              {story.description}
            </motion.p>

            {/* Meta info */}
            <motion.div
              variants={fadeInUp}
              className="grid grid-cols-3 gap-4 mb-8"
            >
              <div className="flex items-center gap-2.5 text-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold">{story.pageCount}</p>
                  <p className="text-xs text-muted-foreground">Pages</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-100">
                  <Clock className="h-4 w-4 text-pink-600" />
                </div>
                <div>
                  <p className="font-semibold">{story.readTime}</p>
                  <p className="text-xs text-muted-foreground">Read time</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100">
                  <Globe className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold">{story.languages.length}</p>
                  <p className="text-xs text-muted-foreground">Languages</p>
                </div>
              </div>
            </motion.div>

            {/* Pricing */}
            <motion.div
              variants={fadeInUp}
              className="mb-6 flex flex-wrap items-center gap-4"
            >
              <div className="rounded-xl border border-border bg-white px-4 py-2">
                <p className="text-xs text-muted-foreground">PDF Download</p>
                <p className="text-xl font-heading font-bold text-gradient">
                  {formatPriceInr(PRICING.PDF_DOWNLOAD)}
                </p>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50/50 px-4 py-2">
                <p className="text-xs text-muted-foreground">Printed Book</p>
                <p className="text-xl font-heading font-bold text-gradient">
                  {formatPriceInr(PRICING.PRINTED_BOOK)}
                </p>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div variants={fadeInUp}>
              <Link
                href={`/create?story=${story.slug}`}
                className="inline-flex items-center justify-center rounded-full bg-gradient-brand px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-purple-200 hover:shadow-xl hover:opacity-95 transition-all"
              >
                Start Personalizing
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Full description */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-3xl mb-16"
        >
          <h2 className="font-heading text-2xl font-bold mb-4">
            About This Story
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {story.longDescription}
          </p>
        </motion.div>

        {/* Sample Pages Carousel */}
        <div className="mb-16">
          <h2 className="font-heading text-2xl font-bold mb-6">
            Sample Pages
          </h2>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl">
              <div className="relative aspect-[3/2] bg-gradient-to-br from-pink-50 to-purple-50">
                <Image
                  src={story.samplePages[currentSample].url}
                  alt={story.samplePages[currentSample].caption}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-3">
              {story.samplePages[currentSample].caption}
            </p>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCurrentSample(
                    currentSample > 0
                      ? currentSample - 1
                      : story.samplePages.length - 1,
                  )
                }
                className="rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="text-sm text-muted-foreground">
                {currentSample + 1} / {story.samplePages.length}
              </span>

              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCurrentSample(
                    currentSample < story.samplePages.length - 1
                      ? currentSample + 1
                      : 0,
                  )
                }
                className="rounded-full"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Dots */}
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {story.samplePages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSample(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentSample
                      ? 'w-6 bg-gradient-brand'
                      : 'w-2 bg-border'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Customer Reviews */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-2xl font-bold">
              Customer Reviews
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(story.averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold">
                {story.averageRating} / 5
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {story.reviews.map((review, idx) => (
              <motion.div
                key={idx}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-300 to-purple-300" />
                    <div>
                      <p className="text-sm font-semibold">{review.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {review.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {review.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="rounded-3xl bg-gradient-brand p-8 sm:p-12 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-3">
            Make {story.title} Personal
          </h2>
          <p className="text-white/80 max-w-lg mx-auto mb-6">
            Upload your child&apos;s photo and create a one-of-a-kind storybook
            they will treasure forever.
          </p>
          <Link
            href={`/create?story=${story.slug}`}
            className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-base font-bold text-purple-700 hover:bg-purple-50 transition-colors"
          >
            Start Personalizing
          </Link>
        </div>
      </div>
    </div>
  );
}
