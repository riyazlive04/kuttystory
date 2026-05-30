'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Glasses } from 'lucide-react';
import type { WizardState } from '@kutty-story/shared';
import { Button } from '@kutty-story/ui';

interface Step4Props {
  wizard: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const skinTones = [
  { id: 'very-light', label: 'Very Light', color: '#FDEBD0' },
  { id: 'light', label: 'Light', color: '#F5CBA7' },
  { id: 'medium-light', label: 'Medium Light', color: '#E0A96D' },
  { id: 'medium', label: 'Medium', color: '#C68642' },
  { id: 'medium-dark', label: 'Medium Dark', color: '#A0522D' },
  { id: 'dark', label: 'Dark', color: '#6B3A2A' },
];

const hairColors = [
  { id: 'black', label: 'Black', color: '#1A1A2E' },
  { id: 'dark-brown', label: 'Dark Brown', color: '#3E2723' },
  { id: 'brown', label: 'Brown', color: '#6D4C41' },
  { id: 'light-brown', label: 'Light Brown', color: '#A1887F' },
  { id: 'blonde', label: 'Blonde', color: '#FFD54F' },
  { id: 'red', label: 'Red', color: '#B71C1C' },
  { id: 'auburn', label: 'Auburn', color: '#8B4513' },
  { id: 'grey', label: 'Grey', color: '#9E9E9E' },
];

export function Step4Details({
  wizard,
  onUpdate,
  onNext,
  onBack,
}: Step4Props) {
  const currentSkinTone = wizard.childProfile?.skinTone ?? '';
  const currentHairColor = wizard.childProfile?.hairColor ?? '';
  const hasGlasses = wizard.childProfile?.hasGlasses ?? false;

  const updateProfile = (updates: Record<string, unknown>) => {
    onUpdate({
      childProfile: wizard.childProfile
        ? { ...wizard.childProfile, ...updates }
        : null,
    });
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold mb-2">
          Personalization Details
        </h2>
        <p className="text-muted-foreground">
          Help us match your child&apos;s appearance in the illustrations.
          Auto-detected values are shown as defaults.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-8">
        {/* Skin Tone */}
        <div>
          <label className="block text-sm font-semibold mb-3">
            Skin Tone
          </label>
          <div className="flex flex-wrap gap-3">
            {skinTones.map((tone) => (
              <button
                key={tone.id}
                onClick={() => updateProfile({ skinTone: tone.id })}
                title={tone.label}
                className={`relative h-12 w-12 rounded-full border-2 transition-all hover:scale-110 ${
                  currentSkinTone === tone.id
                    ? 'border-purple-500 ring-2 ring-purple-200 scale-110'
                    : 'border-transparent'
                }`}
              >
                <div
                  className="h-full w-full rounded-full shadow-inner"
                  style={{ backgroundColor: tone.color }}
                />
                {currentSkinTone === tone.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-brand"
                  >
                    <Check className="h-3 w-3 text-white" />
                  </motion.div>
                )}
              </button>
            ))}
          </div>
          {currentSkinTone && (
            <p className="mt-2 text-xs text-muted-foreground">
              Selected: {skinTones.find((t) => t.id === currentSkinTone)?.label}
            </p>
          )}
        </div>

        {/* Hair Color */}
        <div>
          <label className="block text-sm font-semibold mb-3">
            Hair Color
          </label>
          <div className="flex flex-wrap gap-3">
            {hairColors.map((hair) => (
              <button
                key={hair.id}
                onClick={() => updateProfile({ hairColor: hair.id })}
                title={hair.label}
                className={`relative h-12 w-12 rounded-full border-2 transition-all hover:scale-110 ${
                  currentHairColor === hair.id
                    ? 'border-purple-500 ring-2 ring-purple-200 scale-110'
                    : 'border-transparent'
                }`}
              >
                <div
                  className="h-full w-full rounded-full shadow-inner"
                  style={{ backgroundColor: hair.color }}
                />
                {currentHairColor === hair.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-brand"
                  >
                    <Check className="h-3 w-3 text-white" />
                  </motion.div>
                )}
              </button>
            ))}
          </div>
          {currentHairColor && (
            <p className="mt-2 text-xs text-muted-foreground">
              Selected:{' '}
              {hairColors.find((h) => h.id === currentHairColor)?.label}
            </p>
          )}
        </div>

        {/* Glasses toggle */}
        <div>
          <label className="block text-sm font-semibold mb-3">
            Glasses
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => updateProfile({ hasGlasses: false })}
              className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 px-4 text-sm font-medium transition-all ${
                !hasGlasses
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-border hover:border-purple-300'
              }`}
            >
              No Glasses
            </button>
            <button
              onClick={() => updateProfile({ hasGlasses: true })}
              className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 px-4 text-sm font-medium transition-all ${
                hasGlasses
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-border hover:border-purple-300'
              }`}
            >
              <Glasses className="h-4 w-4" />
              Wears Glasses
            </button>
          </div>
        </div>

        {/* Preview note */}
        <div className="rounded-lg bg-purple-50 p-4">
          <p className="text-xs text-purple-700">
            These details, combined with the uploaded photos, help our AI create
            accurate and beautiful illustrations of your child. You can always
            adjust and regenerate during the preview step.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <Button
          variant="outline"
          onClick={onBack}
          className="rounded-full gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <button
          onClick={onNext}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-purple-200 hover:opacity-95 transition-all"
        >
          Next: Choose Language
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
