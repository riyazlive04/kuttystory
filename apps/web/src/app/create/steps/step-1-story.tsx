'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { WizardState } from '@kutty-story/shared';
import { Badge } from '@kutty-story/ui';

interface Step1Props {
  wizard: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  onNext: () => void;
}

interface StoryData {
  id: string;
  slug: string;
  title: string;
  description: string;
  theme: string;
  ageMin: number;
  ageMax: number;
  coverImage: string;
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

const fallbackStories: StoryData[] = [
  {
    id: 'abc-adventure',
    slug: 'abc-adventure',
    title: 'ABC Adventure',
    description:
      'An interactive alphabet adventure with hidden seek-and-find elements on every page.',
    theme: 'Learning',
    ageMin: 2,
    ageMax: 6,
    coverImage: '/images/stories/abc-adventure.jpg',
  },
  {
    id: 'magical-unicorn',
    slug: 'magical-unicorn',
    title: 'Magical Unicorn Adventure',
    description:
      'A magical journey where your child befriends a unicorn named Luna on an enchanted quest.',
    theme: 'Imagination',
    ageMin: 3,
    ageMax: 8,
    coverImage: '/images/stories/magical-unicorn.jpg',
  },
  {
    id: 'beach-adventure',
    slug: 'beach-adventure',
    title: 'Beach Adventure',
    description:
      'A sunny beach day with sandcastles, seashells, waves, and a perfect day by the ocean.',
    theme: 'Adventure',
    ageMin: 2,
    ageMax: 5,
    coverImage: '/images/stories/beach-adventure.jpg',
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function Step1Story({ wizard, onUpdate, onNext }: Step1Props) {
  const [stories, setStories] = useState<StoryData[]>(fallbackStories);

  useEffect(() => {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    fetch(`${apiUrl}/stories/featured`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.length > 0) {
          const mapped = data.data.map(
            (s: Record<string, unknown>) => ({
              id: s.id as string,
              slug: s.slug as string,
              title:
                displayTitles[(s.slug as string)] ||
                (s.title as string).replace(/\{\{childName\}\}/g, 'Your Child'),
              description: s.description as string,
              theme: ((s.theme as string).charAt(0) +
                (s.theme as string).slice(1).toLowerCase()) as string,
              ageMin: s.ageMin as number,
              ageMax: s.ageMax as number,
              coverImage:
                coverImages[(s.slug as string)] ||
                (s.coverImageUrl as string) ||
                '/images/stories/abc-adventure.jpg',
            }),
          );
          setStories(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelect = (storyId: string) => {
    onUpdate({ storyTemplateId: storyId });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold mb-2">
          Choose a Story
        </h2>
        <p className="text-muted-foreground">
          Pick the perfect adventure for your child. Each story is 28 pages of
          magic.
        </p>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8"
      >
        {stories.map((story) => {
          const isSelected = wizard.storyTemplateId === story.id;

          return (
            <motion.button
              key={story.id}
              variants={fadeInUp}
              onClick={() => handleSelect(story.id)}
              className={`relative rounded-2xl border-2 overflow-hidden text-left transition-all duration-200 ${
                isSelected
                  ? 'border-purple-500 shadow-lg shadow-purple-100 ring-2 ring-purple-200'
                  : 'border-border hover:border-purple-300 hover:shadow-md'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-brand text-white shadow-md">
                  <Check className="h-4 w-4" />
                </div>
              )}

              <div className="relative aspect-[4/3] bg-gradient-to-br from-pink-100 to-purple-100">
                <Image
                  src={story.coverImage}
                  alt={story.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>

              <div className="p-4 bg-white">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge
                    variant="secondary"
                    className="text-xs bg-purple-100 text-purple-700 border-0"
                  >
                    {story.theme}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Ages {story.ageMin}-{story.ageMax}
                  </span>
                </div>
                <h3 className="font-heading font-bold text-base">
                  {story.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {story.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!wizard.storyTemplateId}
          className="inline-flex items-center justify-center rounded-full bg-gradient-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-purple-200 hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Child Details
        </button>
      </div>
    </div>
  );
}
