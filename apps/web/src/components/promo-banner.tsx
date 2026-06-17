'use client';

import React from 'react';

/**
 * Top promotional / urgency banner. Sits above the header to grab attention and
 * surface the active discount code. Copy mirrors the marketing review:
 * "Save 20% on 2+ Books — Use Code: STORY20".
 */
export function PromoBanner() {
  return (
    <div className="w-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 text-white">
      <div className="container-custom flex h-9 items-center justify-center gap-2 text-center text-xs font-semibold sm:text-sm">
        <span className="hidden sm:inline">🎉</span>
        <span>Save 20% on 2+ Books — use code</span>
        <span className="rounded-md bg-yellow-300 px-2 py-0.5 font-bold tracking-wide text-purple-900">
          STORY20
        </span>
      </div>
    </div>
  );
}
