'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatPriceInr, PRICING } from '@kutty-story/shared';
import { Badge } from '@kutty-story/ui';

interface StoryCardProps {
  slug: string;
  title: string;
  coverImage: string;
  theme: string;
  ageRange: string;
  price?: string;
  description?: string;
}

export function StoryCard({
  slug,
  title,
  coverImage,
  theme,
  ageRange,
  price,
  description,
}: StoryCardProps) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group"
    >
      <Link href={`/stories/${slug}`} className="block">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-xl transition-shadow duration-300">
          {/* Cover Image */}
          <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100">
            <Image
              src={coverImage}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
            {/* Theme badge overlay */}
            <div className="absolute top-3 left-3">
              <Badge className="bg-white/90 text-purple-700 backdrop-blur-sm border-0 shadow-sm">
                {theme}
              </Badge>
            </div>
          </div>

          {/* Card content */}
          <div className="p-4">
            <h3 className="font-heading font-bold text-lg text-foreground line-clamp-1 mb-1">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {description}
              </p>
            )}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium bg-accent px-2.5 py-1 rounded-full">
                Ages {ageRange}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-foreground">
                PDF {formatPriceInr(PRICING.PDF_DOWNLOAD)}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="font-semibold text-foreground">
                Printed {formatPriceInr(PRICING.PRINTED_BOOK)}
              </span>
            </div>
            <button className="mt-3 w-full rounded-full bg-gradient-brand py-2.5 text-sm font-semibold text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
              Personalize
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
