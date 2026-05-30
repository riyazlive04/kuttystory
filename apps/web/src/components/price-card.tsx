'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface PriceCardProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  ctaLabel?: string;
  onSelect?: () => void;
}

export function PriceCard({
  name,
  price,
  description,
  features,
  isPopular = false,
  ctaLabel = 'Get Started',
  onSelect,
}: PriceCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative rounded-2xl border-2 p-6 sm:p-8 ${
        isPopular
          ? 'border-purple-400 bg-gradient-to-b from-purple-50/80 to-pink-50/50 shadow-xl shadow-purple-100'
          : 'border-border bg-card shadow-sm'
      }`}
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-block rounded-full bg-gradient-brand px-4 py-1 text-xs font-bold text-white shadow-md">
            Most Popular
          </span>
        </div>
      )}

      {/* Format name */}
      <h3 className="font-heading font-bold text-xl mb-1">{name}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>

      {/* Price */}
      <div className="mb-6">
        <span className="text-4xl font-heading font-bold text-gradient">
          {price}
        </span>
        <span className="text-sm text-muted-foreground ml-1">per book</span>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                isPopular
                  ? 'bg-purple-100 text-purple-600'
                  : 'bg-accent text-primary'
              }`}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </div>
            <span className="text-sm text-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        onClick={onSelect}
        className={`w-full rounded-full py-3 text-sm font-semibold transition-all duration-200 ${
          isPopular
            ? 'bg-gradient-brand text-white hover:opacity-90 shadow-lg shadow-purple-200'
            : 'border-2 border-border text-foreground hover:border-purple-300 hover:bg-purple-50'
        }`}
      >
        {ctaLabel}
      </button>
    </motion.div>
  );
}
