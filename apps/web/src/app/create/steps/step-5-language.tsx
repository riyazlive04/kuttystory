'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Globe } from 'lucide-react';
import type { WizardState } from '@kutty-story/shared';
import { Button } from '@kutty-story/ui';
import { useSettings } from '@/lib/settings-context';

interface Step5Props {
  wizard: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

function getLanguageOptions(tamilEnabled: boolean): Array<{
  value: WizardState['language'];
  label: string;
  description: string;
  sample: string;
  enabled: boolean;
  comingSoon?: boolean;
}> {
  return [
    {
      value: 'ENGLISH',
      label: 'English',
      description:
        'Full story in English, perfect for English-speaking families.',
      sample:
        'Once upon a time, in a land far, far away, there lived a brave young hero named {{name}}...',
      enabled: true,
    },
    {
      value: 'TAMIL',
      label: 'Tamil',
      description: tamilEnabled
        ? 'Full story in Tamil, perfect for Tamil-speaking families.'
        : 'Full story in Tamil. Coming soon!',
      sample:
        'ஒரு காலத்தில், வெகு தொலைவில் உள்ள ஒரு நாட்டில், {{name}} என்ற ஒரு துணிச்சலான இளம் நாயகன் வாழ்ந்து வந்தார்...',
      enabled: tamilEnabled,
      comingSoon: !tamilEnabled,
    },
  ];
}

const fadeInUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function Step5Language({
  wizard,
  onUpdate,
  onNext,
  onBack,
}: Step5Props) {
  const settings = useSettings();
  const languageOptions = getLanguageOptions(settings.tamilEnabled);
  const childName = wizard.childProfile?.name || 'your child';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold mb-2">
          Choose Language
        </h2>
        <p className="text-muted-foreground">
          Select the language for your storybook.
        </p>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="space-y-4 mb-8"
      >
        {languageOptions.map((option) => {
          const isSelected = wizard.language === option.value;
          const sampleText = option.sample.replace(/\{\{name\}\}/g, childName);

          return (
            <motion.button
              key={option.value}
              variants={fadeInUp}
              onClick={() => {
                if (option.enabled) {
                  onUpdate({ language: option.value });
                }
              }}
              disabled={!option.enabled}
              className={`relative w-full rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
                !option.enabled
                  ? 'border-border bg-muted/30 opacity-60 cursor-not-allowed'
                  : isSelected
                    ? 'border-purple-500 bg-purple-50/50 shadow-lg shadow-purple-100 ring-2 ring-purple-200'
                    : 'border-border hover:border-purple-300 hover:shadow-md bg-white'
              }`}
            >
              {isSelected && option.enabled && (
                <div className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-brand text-white shadow-md">
                  <Check className="h-4 w-4" />
                </div>
              )}

              {option.comingSoon && (
                <div className="absolute top-4 right-4">
                  <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-700">
                    Coming Soon
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    isSelected && option.enabled
                      ? 'bg-purple-200'
                      : 'bg-purple-100'
                  }`}
                >
                  <Globe className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base">
                    {option.label}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>

              {option.enabled && (
                <div className="mt-3 rounded-lg bg-accent/50 p-3 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">
                    Sample text:
                  </p>
                  <p className="text-sm text-foreground leading-relaxed italic">
                    {sampleText}
                  </p>
                </div>
              )}
            </motion.button>
          );
        })}
      </motion.div>

      <div className="flex items-center justify-between">
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
          Next: Preview
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
