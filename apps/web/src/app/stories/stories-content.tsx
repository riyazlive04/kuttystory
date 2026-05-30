'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, X } from 'lucide-react';
import { formatPriceInr, PRICING } from '@kutty-story/shared';
import { Input } from '@kutty-story/ui';
import { StoryCard } from '@/components/story-card';

interface Story {
  slug: string;
  title: string;
  coverImage: string;
  theme: string;
  ageRange: string;
  ageMin: number;
  ageMax: number;
  price: string;
  description: string;
}

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

const fallbackStories: Story[] = [
  {
    slug: 'abc-adventure',
    title: 'ABC Adventure',
    coverImage: '/images/stories/abc-adventure.jpg',
    theme: 'Learning',
    ageRange: '2-6',
    ageMin: 2,
    ageMax: 6,
    price: formatPriceInr(PRICING.PDF_DOWNLOAD),
    description:
      'An interactive alphabet adventure with hidden seek-and-find elements on every page.',
  },
  {
    slug: 'magical-unicorn',
    title: 'Magical Unicorn Adventure',
    coverImage: '/images/stories/magical-unicorn.jpg',
    theme: 'Imagination',
    ageRange: '3-8',
    ageMin: 3,
    ageMax: 8,
    price: formatPriceInr(PRICING.PDF_DOWNLOAD),
    description:
      'A magical journey where your child befriends a unicorn named Luna on an enchanted quest.',
  },
  {
    slug: 'beach-adventure',
    title: 'Beach Adventure',
    coverImage: '/images/stories/beach-adventure.jpg',
    theme: 'Adventure',
    ageRange: '2-5',
    ageMin: 2,
    ageMax: 5,
    price: formatPriceInr(PRICING.PDF_DOWNLOAD),
    description:
      'A sunny beach day with sandcastles, seashells, waves, and a perfect day by the ocean.',
  },
];

const themes = ['All', 'Adventure', 'Learning', 'Imagination'];
const ageRanges = [
  { label: 'All Ages', min: 0, max: 15 },
  { label: '2-4 years', min: 2, max: 4 },
  { label: '3-6 years', min: 3, max: 6 },
  { label: '5-8 years', min: 5, max: 8 },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function StoriesContent() {
  const [stories, setStories] = useState<Story[]>(fallbackStories);
  const [search, setSearch] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('All');
  const [selectedAgeRange, setSelectedAgeRange] = useState(ageRanges[0]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    fetch(`${apiUrl}/stories`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.length > 0) {
          const mapped: Story[] = data.data.map(
            (s: Record<string, unknown>) => ({
              slug: s.slug as string,
              title:
                displayTitles[s.slug as string] ||
                (s.title as string).replace(
                  /\{\{childName\}\}/g,
                  'Your Child',
                ),
              coverImage:
                coverImages[s.slug as string] ||
                (s.coverImageUrl as string) ||
                '/images/stories/abc-adventure.jpg',
              theme:
                (s.theme as string).charAt(0) +
                (s.theme as string).slice(1).toLowerCase(),
              ageRange: `${s.ageMin}-${s.ageMax}`,
              ageMin: s.ageMin as number,
              ageMax: s.ageMax as number,
              price: formatPriceInr(s.basePriceInr as number),
              description: s.description as string,
            }),
          );
          setStories(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      if (
        search &&
        !story.title.toLowerCase().includes(search.toLowerCase()) &&
        !story.description.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      if (selectedTheme !== 'All' && story.theme !== selectedTheme) {
        return false;
      }
      if (selectedAgeRange.min > 0) {
        const overlaps =
          story.ageMin <= selectedAgeRange.max &&
          story.ageMax >= selectedAgeRange.min;
        if (!overlaps) return false;
      }
      return true;
    });
  }, [stories, search, selectedTheme, selectedAgeRange]);

  const hasActiveFilters =
    search !== '' ||
    selectedTheme !== 'All' ||
    selectedAgeRange !== ageRanges[0];

  const clearFilters = () => {
    setSearch('');
    setSelectedTheme('All');
    setSelectedAgeRange(ageRanges[0]);
  };

  return (
    <div className="min-h-screen bg-gradient-brand-soft">
      <section className="bg-gradient-brand py-16 sm:py-20">
        <div className="container-custom text-center">
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Our Story Collection
          </h1>
          <p className="text-white/80 max-w-xl mx-auto">
            Choose a story and personalize it with your child as the hero.
            Starting from {formatPriceInr(PRICING.PDF_DOWNLOAD)}.
          </p>
        </div>
      </section>

      <div className="container-custom py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search stories..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              className="pl-10 rounded-full bg-white"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white px-5 py-2.5 text-sm font-medium"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-brand text-xs text-white">
                !
              </span>
            )}
          </button>
        </div>

        <div
          className={`${
            showFilters ? 'block' : 'hidden'
          } sm:block mb-8 space-y-4`}
        >
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Theme
            </p>
            <div className="flex flex-wrap gap-2">
              {themes.map((theme) => (
                <button
                  key={theme}
                  onClick={() => setSelectedTheme(theme)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    selectedTheme === theme
                      ? 'bg-gradient-brand text-white shadow-md'
                      : 'bg-white border border-border text-muted-foreground hover:border-purple-300 hover:text-foreground'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Age Range
            </p>
            <div className="flex flex-wrap gap-2">
              {ageRanges.map((range) => (
                <button
                  key={range.label}
                  onClick={() => setSelectedAgeRange(range)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    selectedAgeRange === range
                      ? 'bg-gradient-brand text-white shadow-md'
                      : 'bg-white border border-border text-muted-foreground hover:border-purple-300 hover:text-foreground'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Clear all filters
            </button>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          {filteredStories.length}{' '}
          {filteredStories.length === 1 ? 'story' : 'stories'} found
        </p>

        {filteredStories.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredStories.map((story) => (
              <motion.div key={story.slug} variants={fadeInUp}>
                <StoryCard {...story} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-20">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
              <Search className="h-7 w-7 text-purple-400" />
            </div>
            <h3 className="font-heading font-bold text-lg mb-2">
              No stories found
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your filters or search term.
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center justify-center rounded-full bg-gradient-brand px-6 py-2 text-sm font-semibold text-white"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
