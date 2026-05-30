'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';

// Real storybook artwork cycled in the hero card so the section feels alive.
const IMAGES = [
  '/images/stories/magical-unicorn.jpg',
  '/images/stories/beach-adventure.jpg',
  '/images/stories/abc-adventure.jpg',
];

const INTERVAL_MS = 3500;

export function HeroShowcase() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setIdx((i) => (i + 1) % IMAGES.length),
      INTERVAL_MS,
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AnimatePresence>
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <Image
            src={IMAGES[idx]}
            alt="Personalized storybook page"
            fill
            priority
            sizes="(max-width: 1024px) 0px, 28rem"
            className="object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Caption overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent p-5">
        <h3 className="font-heading text-lg font-bold text-white drop-shadow">
          Your Story Awaits
        </h3>
        <p className="text-sm text-white/85">
          Every child deserves to be the hero
        </p>
      </div>
    </div>
  );
}
