'use client';

import React, { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  ImagePlus,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import {
  MAX_PHOTO_SIZE_BYTES,
  ALLOWED_IMAGE_MIME_TYPES,
} from '@kutty-story/shared';

// Only one photo is collected for now (single reference face).
const MAX_PHOTOS_PER_CHILD = 1;
import type { WizardState } from '@kutty-story/shared';
import { Button } from '@kutty-story/ui';
import { api, ensureGuestSession } from '@/lib/api';

// Files are served by the API at `${origin}/files/<key>` (the API base minus
// its `/api` suffix). Used to show the real, stored photo as a thumbnail.
const FILES_BASE = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
).replace(/\/api\/?$/, '');

/** Resolve a stored photo key (or an already-usable URL) to a displayable src. */
function photoSrc(keyOrUrl: string): string {
  if (!keyOrUrl) return '';
  if (/^(blob:|data:|https?:)/.test(keyOrUrl)) return keyOrUrl;
  return `${FILES_BASE}/files/${keyOrUrl.replace(/^\/+/, '')}`;
}

interface Step3Props {
  wizard: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface UploadedPhoto {
  id: string;
  previewUrl: string;
  faceDetected: boolean;
  uploading: boolean;
  progress: number;
  error?: string;
}

export function Step3Photos({ wizard, onUpdate, onNext, onBack }: Step3Props) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>(
    wizard.photoIds.map((id) => ({
      id,
      previewUrl: photoSrc(id),
      faceDetected: true,
      uploading: false,
      progress: 100,
    })),
  );
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remainingSlots = MAX_PHOTOS_PER_CHILD - photos.length;

      if (remainingSlots <= 0) return;

      const filesToProcess = fileArray.slice(0, remainingSlots);

      // Anonymous guests can upload too — establish a session first so the
      // auth-guarded upload endpoint accepts the file.
      await ensureGuestSession();

      for (const file of filesToProcess) {
        // Validate
        if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as 'image/jpeg' | 'image/png' | 'image/webp')) {
          continue;
        }
        if (file.size > MAX_PHOTO_SIZE_BYTES) {
          continue;
        }

        const previewUrl = URL.createObjectURL(file);
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        // Add to state as uploading
        const newPhoto: UploadedPhoto = {
          id: tempId,
          previewUrl,
          faceDetected: false,
          uploading: true,
          progress: 0,
        };

        setPhotos((prev) => [...prev, newPhoto]);

        // Simulate upload progress
        try {
          // Simulate progress updates
          for (let p = 10; p <= 90; p += 20) {
            await new Promise((r) => setTimeout(r, 200));
            setPhotos((prev) =>
              prev.map((ph) =>
                ph.id === tempId ? { ...ph, progress: p } : ph,
              ),
            );
          }

          // Upload to the API, which stores it (local disk or R2) and returns a key.
          const formData = new FormData();
          formData.append('file', file);
          const res = await api.upload<{ key: string; url: string }>(
            '/upload/photo',
            formData,
          );

          // The storage key is REQUIRED — it's what the AI uses as the reference
          // photo. Without it, generation can't personalize the face, so never
          // fall back to a fake id.
          const photoId = res.data?.key;
          if (!photoId) {
            throw new Error('Upload did not return a storage key');
          }

          setPhotos((prev) =>
            prev.map((ph) =>
              ph.id === tempId
                ? {
                    ...ph,
                    id: photoId,
                    // Switch the thumbnail from the local blob to the stored
                    // server copy so it survives navigating back to this step.
                    previewUrl: res.data?.url || photoSrc(photoId),
                    faceDetected: true,
                    uploading: false,
                    progress: 100,
                    error: undefined,
                  }
                : ph,
            ),
          );

          // Update wizard state with the storage key
          onUpdate({
            photoIds: [
              ...wizard.photoIds.filter((id) => id !== tempId),
              photoId,
            ],
          });
        } catch {
          // Real failure — mark the photo as errored so the user re-uploads.
          // Do NOT store a placeholder id; a fake key silently breaks the
          // face-swap (the AI gets no reference photo and returns the template).
          setPhotos((prev) =>
            prev.map((ph) =>
              ph.id === tempId
                ? {
                    ...ph,
                    faceDetected: false,
                    uploading: false,
                    progress: 0,
                    error: 'Upload failed — please remove and try again.',
                  }
                : ph,
            ),
          );
          onUpdate({
            photoIds: wizard.photoIds.filter((id) => id !== tempId),
          });
        }
      }
    },
    [photos.length, wizard.photoIds, onUpdate],
  );

  const removePhoto = (photoId: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === photoId);
      if (photo?.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl);
      }
      return prev.filter((p) => p.id !== photoId);
    });
    onUpdate({
      photoIds: wizard.photoIds.filter((id) => id !== photoId),
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Require at least one successfully-uploaded photo (a real storage key),
  // and no uploads still in flight.
  const canProceed =
    photos.some((p) => !p.uploading && !p.error) &&
    photos.every((p) => !p.uploading);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold mb-2">
          Upload a Photo
        </h2>
        <p className="text-muted-foreground">
          Upload one clear, front-facing photo of your child — this is the face
          we&apos;ll use in the storybook.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        {/* Drop zone */}
        {photos.length < MAX_PHOTOS_PER_CHILD && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 px-6 cursor-pointer transition-all ${
              dragActive
                ? 'border-purple-500 bg-purple-50'
                : 'border-border hover:border-purple-300 hover:bg-purple-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />

            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 mb-4">
              <ImagePlus className="h-7 w-7 text-purple-600" />
            </div>
            <p className="text-sm font-semibold mb-1">
              Drop photos here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, or WebP up to 10 MB each
            </p>
          </div>
        )}

        {/* Photo previews */}
        {photos.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">
                Uploaded Photos ({photos.length}/{MAX_PHOTOS_PER_CHILD})
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <AnimatePresence>
                {photos.map((photo) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative group"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100">
                      {photo.previewUrl ? (
                        <Image
                          src={photo.previewUrl}
                          alt="Child photo"
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="200px"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}

                      {/* Upload progress overlay */}
                      {photo.uploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-3/4">
                            <div className="h-1.5 rounded-full bg-white/30 overflow-hidden">
                              <motion.div
                                className="h-full bg-white rounded-full"
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${photo.progress}%`,
                                }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                            <p className="text-white text-xs text-center mt-1">
                              {photo.progress}%
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Remove button */}
                      {!photo.uploading && (
                        <button
                          onClick={() => removePhoto(photo.id)}
                          className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Status badge */}
                    {!photo.uploading && (
                      <div className="absolute bottom-2 left-2 right-2">
                        {photo.error ? (
                          <div className="flex items-center gap-1 rounded-md bg-red-500/90 px-2 py-0.5 text-white">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span className="text-xs font-medium">
                              Upload failed
                            </span>
                          </div>
                        ) : photo.faceDetected ? (
                          <div className="flex items-center gap-1 rounded-md bg-green-500/90 px-2 py-0.5 text-white">
                            <CheckCircle2 className="h-3 w-3" />
                            <span className="text-xs font-medium">
                              Uploaded
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 rounded-md bg-yellow-500/90 px-2 py-0.5 text-white">
                            <AlertCircle className="h-3 w-3" />
                            <span className="text-xs font-medium">
                              Processing
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 rounded-lg bg-purple-50 p-4">
          <p className="text-sm font-semibold text-purple-800 mb-2">
            Tips for best results:
          </p>
          <ul className="space-y-1.5">
            {[
              'Use a clear, well-lit front-facing photo',
              'Avoid sunglasses or hats that hide the face',
              'A sharp, in-focus face gives the best likeness',
              'A photo with a simple background works best',
            ].map((tip) => (
              <li
                key={tip}
                className="flex items-start gap-2 text-xs text-purple-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
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
          disabled={!canProceed}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-purple-200 hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Preview
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
