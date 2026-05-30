'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@kutty-story/ui';

interface Page {
  pageNumber: number;
  imageUrl: string;
  textOverlay?: string;
}

interface BookPreviewProps {
  pages: Page[];
  childName?: string;
  /** Overlay the Kutty Story logo as a watermark (free preview protection). */
  watermark?: boolean;
}

export function BookPreview({
  pages,
  childName,
  watermark = true,
}: BookPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const goToPage = (newPage: number) => {
    if (newPage < 0 || newPage >= pages.length) return;
    setDirection(newPage > currentPage ? 1 : -1);
    setCurrentPage(newPage);
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      rotateY: dir > 0 ? 45 : -45,
    }),
    center: {
      x: 0,
      opacity: 1,
      rotateY: 0,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      rotateY: dir > 0 ? -45 : 45,
    }),
  };

  const page = pages[currentPage];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Book container */}
      <div
        className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
        }`}
        style={{ perspective: '1200px' }}
        onClick={() => setIsZoomed(!isZoomed)}
      >
        <div
          className={`relative aspect-square transition-transform duration-300 ${
            isZoomed ? 'scale-150' : 'scale-100'
          }`}
        >
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={currentPage}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
                rotateY: { duration: 0.4 },
              }}
              className="absolute inset-0"
            >
              <div className="relative w-full h-full bg-gradient-to-br from-pink-50 to-purple-50">
                <Image
                  src={page.imageUrl}
                  alt={`Page ${page.pageNumber}`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 100vw, 640px"
                  priority
                />
                {/* Logo watermark (free-preview protection) */}
                {watermark && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-10"
                    style={{
                      backgroundImage: 'url(/KuttyStoryLogo.png)',
                      backgroundRepeat: 'repeat',
                      backgroundSize: '96px',
                      transform: 'rotate(-22deg) scale(1.5)',
                      opacity: 0.1,
                    }}
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Book spine effect */}
        <div className="absolute top-0 left-1/2 -translate-x-px w-0.5 h-full bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200 opacity-30" />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            goToPage(currentPage - 1);
          }}
          disabled={currentPage === 0}
          className="rounded-full"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground font-medium">
            Page {currentPage + 1} of {pages.length}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed(!isZoomed);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent transition-colors text-muted-foreground"
          >
            {isZoomed ? (
              <ZoomOut className="h-4 w-4" />
            ) : (
              <ZoomIn className="h-4 w-4" />
            )}
          </button>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            goToPage(currentPage + 1);
          }}
          disabled={currentPage === pages.length - 1}
          className="rounded-full"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Page dots */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
        {pages.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goToPage(idx)}
            className={`h-2 rounded-full transition-all duration-200 ${
              idx === currentPage
                ? 'w-6 bg-gradient-brand'
                : 'w-2 bg-border hover:bg-muted-foreground'
            }`}
            aria-label={`Go to page ${idx + 1}`}
          />
        ))}
      </div>

      {childName && (
        <p className="text-center text-sm text-muted-foreground mt-3">
          A story made just for <span className="font-semibold text-foreground">{childName}</span>
        </p>
      )}
    </div>
  );
}
