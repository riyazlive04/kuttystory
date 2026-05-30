'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import type { WizardState } from '@kutty-story/shared';
import { Step1Story } from './steps/step-1-story';
import { Step2Child } from './steps/step-2-child';
import { Step3Photos } from './steps/step-3-photos';
import { Step6Preview } from './steps/step-6-preview';

const STORAGE_KEY = 'kutty-story-wizard';

// Personalization Details + Language steps were removed (English-only for now),
// so the wizard is 4 steps. Preview is the final step.
const steps = [
  { number: 1, label: 'Story' },
  { number: 2, label: 'Child' },
  { number: 3, label: 'Photos' },
  { number: 4, label: 'Preview' },
];

const LAST_STEP = steps.length; // 4

const defaultWizardState: WizardState = {
  currentStep: 1,
  storyTemplateId: null,
  childProfile: null,
  photoIds: [],
  language: 'ENGLISH',
  dedicationMessage: '',
  bookId: null,
  contactName: '',
  contactPhone: '',
  contactEmail: '',
};

export default function CreatePage() {
  const [wizard, setWizard] = useState<WizardState>(defaultWizardState);
  const [isHydrated, setIsHydrated] = useState(false);
  // Furthest step the user has reached — lets them jump back AND forward to any
  // step they've already completed (not just steps <= the current one).
  const [maxStep, setMaxStep] = useState(1);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as WizardState;
        // Clamp any previously-saved step to the new last step (the wizard
        // shrank from 6 to 4 steps).
        const clampedStep = Math.min(
          parsed.currentStep || 1,
          LAST_STEP,
        ) as WizardState['currentStep'];
        setWizard({ ...parsed, currentStep: clampedStep });
      }
    } catch {
      // Ignore parse errors
    }
    setIsHydrated(true);
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wizard));
    }
  }, [wizard, isHydrated]);

  // Remember the furthest step reached (so back-then-forward navigation works).
  useEffect(() => {
    setMaxStep((m) => Math.max(m, wizard.currentStep));
  }, [wizard.currentStep]);

  // If the user picked a story upfront (e.g. /create?story=beach-adventure from
  // a story page), resolve the slug to its id and pre-select it so the choice
  // is retained all the way through preview generation.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('story');
    if (!slug) return;
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    fetch(`${apiUrl}/stories/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        const id = data?.data?.id as string | undefined;
        if (id) {
          setWizard((prev) => ({ ...prev, storyTemplateId: id }));
        }
      })
      .catch(() => {});
  }, []);

  const updateWizard = useCallback((updates: Partial<WizardState>) => {
    setWizard((prev) => ({ ...prev, ...updates }));
  }, []);

  const goToStep = useCallback((step: WizardState['currentStep']) => {
    setWizard((prev) => ({ ...prev, currentStep: step }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const nextStep = useCallback(() => {
    setWizard((prev) => {
      const next = Math.min(prev.currentStep + 1, LAST_STEP) as WizardState['currentStep'];
      return { ...prev, currentStep: next };
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const prevStep = useCallback(() => {
    setWizard((prev) => {
      const prev_ = Math.max(prev.currentStep - 1, 1) as WizardState['currentStep'];
      return { ...prev, currentStep: prev_ };
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-brand-soft">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="container-custom py-6">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-center mb-8">
            Create Your Storybook
          </h1>

          {/* Progress bar */}
          <div className="max-w-2xl mx-auto">
            {/* Steps row */}
            <div className="flex items-center justify-between relative">
              {/* Background line */}
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
              {/* Active line */}
              <div
                className="absolute top-5 left-0 h-0.5 bg-gradient-brand transition-all duration-500"
                style={{
                  width: `${((wizard.currentStep - 1) / (steps.length - 1)) * 100}%`,
                }}
              />

              {steps.map((step) => {
                const isCompleted = wizard.currentStep > step.number;
                const isCurrent = wizard.currentStep === step.number;

                return (
                  <button
                    key={step.number}
                    onClick={() => {
                      if (step.number <= maxStep) {
                        goToStep(step.number as WizardState['currentStep']);
                      }
                    }}
                    disabled={step.number > maxStep}
                    className="relative flex flex-col items-center gap-2 z-10"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300 ${
                        isCompleted
                          ? 'bg-gradient-brand border-purple-500 text-white'
                          : isCurrent
                            ? 'bg-white border-purple-500 text-purple-600 shadow-md shadow-purple-100'
                            : 'bg-white border-border text-muted-foreground'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        step.number
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium hidden sm:block ${
                        isCurrent
                          ? 'text-purple-600'
                          : isCompleted
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="container-custom py-8 sm:py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={wizard.currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {wizard.currentStep === 1 && (
              <Step1Story
                wizard={wizard}
                onUpdate={updateWizard}
                onNext={nextStep}
              />
            )}
            {wizard.currentStep === 2 && (
              <Step2Child
                wizard={wizard}
                onUpdate={updateWizard}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}
            {wizard.currentStep === 3 && (
              <Step3Photos
                wizard={wizard}
                onUpdate={updateWizard}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}
            {wizard.currentStep === 4 && (
              <Step6Preview
                wizard={wizard}
                onUpdate={updateWizard}
                onBack={prevStep}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
