'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { childProfileSchema, type ChildProfile } from '@kutty-story/shared';
import type { WizardState } from '@kutty-story/shared';
import { Input, Button } from '@kutty-story/ui';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface Step2Props {
  wizard: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Child({ wizard, onUpdate, onNext, onBack }: Step2Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ChildProfile>({
    resolver: zodResolver(childProfileSchema),
    defaultValues: {
      name: wizard.childProfile?.name ?? '',
      nickname: wizard.childProfile?.nickname ?? '',
      gender: wizard.childProfile?.gender ?? 'PREFER_NOT_TO_SAY',
      ageYears: wizard.childProfile?.ageYears ?? 4,
      hasGlasses: wizard.childProfile?.hasGlasses ?? false,
    },
  });

  // Contact / shipping details, collected upfront (not part of the child zod
  // form). Reused to send the preview, for sales follow-up, and at checkout.
  const [contact, setContact] = useState({
    name: wizard.contactName ?? '',
    phone: wizard.contactPhone ?? '',
    email: wizard.contactEmail ?? '',
  });
  const [contactError, setContactError] = useState<string | null>(null);
  const contactValid =
    contact.name.trim().length >= 2 &&
    contact.phone.replace(/\D/g, '').length >= 10;

  const onSubmit = (data: ChildProfile) => {
    if (!contactValid) {
      setContactError(
        'Please enter your name and a valid phone number so we can send your preview.',
      );
      return;
    }
    onUpdate({
      childProfile: {
        ...data,
        skinTone: wizard.childProfile?.skinTone,
        hairColor: wizard.childProfile?.hairColor,
      },
      contactName: contact.name.trim(),
      contactPhone: contact.phone.trim(),
      contactEmail: contact.email.trim(),
    });
    onNext();
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold mb-2">
          Tell Us About Your Child
        </h2>
        <p className="text-muted-foreground">
          These details help us personalize the story and illustrations.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm"
      >
        {/* Name */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Child&apos;s Name <span className="text-destructive">*</span>
          </label>
          <Input
            {...register('name')}
            placeholder="e.g., Aarav, Meera"
            className="rounded-lg"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Nickname */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Nickname <span className="text-muted-foreground">(optional)</span>
          </label>
          <Input
            {...register('nickname')}
            placeholder="e.g., Aaru, Cutie"
            className="rounded-lg"
          />
          {errors.nickname && (
            <p className="mt-1 text-xs text-destructive">
              {errors.nickname.message}
            </p>
          )}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Gender <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'BOY', label: 'Boy' },
              { value: 'GIRL', label: 'Girl' },
              { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex items-center justify-center rounded-lg border-2 py-2.5 px-3 text-sm font-medium cursor-pointer transition-all ${
                  watch('gender') === option.value
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-border hover:border-purple-300'
                }`}
              >
                <input
                  type="radio"
                  {...register('gender')}
                  value={option.value}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
          {errors.gender && (
            <p className="mt-1 text-xs text-destructive">
              {errors.gender.message}
            </p>
          )}
        </div>

        {/* Age */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Age (years) <span className="text-destructive">*</span>
          </label>
          <Input
            {...register('ageYears', { valueAsNumber: true })}
            type="number"
            min={0}
            max={15}
            className="rounded-lg w-32"
          />
          {errors.ageYears && (
            <p className="mt-1 text-xs text-destructive">
              {errors.ageYears.message}
            </p>
          )}
        </div>

        {/* Glasses */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('hasGlasses')}
              className="h-5 w-5 rounded border-border text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm font-medium">
              My child wears glasses
            </span>
          </label>
        </div>

        {/* Contact / shipping details (collected upfront) */}
        <div className="border-t border-border pt-6">
          <h3 className="text-sm font-semibold mb-1">Your contact details</h3>
          <p className="text-xs text-muted-foreground mb-4">
            So we can send your preview and help with your order.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Your name <span className="text-destructive">*</span>
              </label>
              <Input
                value={contact.name}
                onChange={(e) =>
                  setContact((c) => ({ ...c, name: e.target.value }))
                }
                placeholder="e.g., Priya Sharma"
                className="rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Phone (WhatsApp) <span className="text-destructive">*</span>
              </label>
              <Input
                type="tel"
                inputMode="tel"
                value={contact.phone}
                onChange={(e) =>
                  setContact((c) => ({ ...c, phone: e.target.value }))
                }
                placeholder="e.g., 98765 43210"
                className="rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Email <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                type="email"
                value={contact.email}
                onChange={(e) =>
                  setContact((c) => ({ ...c, email: e.target.value }))
                }
                placeholder="you@example.com"
                className="rounded-lg"
              />
            </div>
            {contactError && !contactValid && (
              <p className="text-xs text-destructive">{contactError}</p>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="rounded-full gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-purple-200 hover:opacity-95 transition-all"
          >
            Next: Upload Photos
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
