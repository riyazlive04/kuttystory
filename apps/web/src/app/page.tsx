'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Camera,
  Sparkles,
  Truck,
  Star,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatPriceInr, PRICING } from '@kutty-story/shared';
import { StoryCard } from '@/components/story-card';
import { PriceCard } from '@/components/price-card';
import { HeroShowcase } from '@/components/hero-showcase';

// ─── Animation helpers ──────────────────────────────────────
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

// ─── Cover image lookup (DB doesn't store local paths) ──────
const coverImages: Record<string, string> = {
  'abc-adventure': '/images/stories/abc-adventure.jpg',
  'magical-unicorn': '/images/stories/magical-unicorn.jpg',
  'beach-adventure': '/images/stories/beach-adventure.jpg',
};

// ─── Fallback stories (real data) ───────────────────────────
const fallbackStories = [
  {
    slug: 'abc-adventure',
    title: 'ABC Adventure',
    coverImage: '/images/stories/abc-adventure.jpg',
    theme: 'LEARNING',
    ageRange: '2-6',
    price: formatPriceInr(PRICING.PDF_DOWNLOAD),
    description:
      'A fun alphabet journey where your child discovers letters through vibrant cartoon illustrations.',
  },
  {
    slug: 'magical-unicorn',
    title: 'Magical Unicorn Adventure',
    coverImage: '/images/stories/magical-unicorn.jpg',
    theme: 'IMAGINATION',
    ageRange: '3-8',
    price: formatPriceInr(PRICING.PDF_DOWNLOAD),
    description:
      'A dreamy watercolor tale where your child befriends a magical unicorn and explores a fantasy world.',
  },
  {
    slug: 'beach-adventure',
    title: 'Beach Adventure',
    coverImage: '/images/stories/beach-adventure.jpg',
    theme: 'ADVENTURE',
    ageRange: '2-5',
    price: formatPriceInr(PRICING.PDF_DOWNLOAD),
    description:
      'A warm, sunny adventure at the beach filled with sandcastles, waves, and happy discoveries.',
  },
];

// ─── Static data ────────────────────────────────────────────
const howItWorks = [
  {
    icon: BookOpen,
    title: 'Choose a Story',
    description:
      'Pick from our curated library of beautifully written stories across themes like adventure, science, and fantasy.',
  },
  {
    icon: Camera,
    title: 'Upload Photos',
    description:
      'Upload clear photos of your child. Our AI detects faces and learns their features to create a perfect character.',
  },
  {
    icon: Sparkles,
    title: 'AI Magic',
    description:
      'Our AI illustrator generates stunning, personalized artwork placing your child as the hero of every page.',
  },
  {
    icon: Truck,
    title: 'Delivered to You',
    description:
      'Choose your format, and we print and deliver a premium quality storybook to your doorstep across India.',
  },
];

const reviews = [
  {
    name: 'Priya M.',
    location: 'Chennai',
    rating: 5,
    text: 'My daughter was absolutely thrilled to see herself as a princess in the story. The illustrations are stunning and the print quality is amazing.',
  },
  {
    name: 'Rahul S.',
    location: 'Bangalore',
    rating: 5,
    text: "Ordered the printed book for my nephew's birthday. The quality exceeded our expectations. A truly magical gift!",
  },
  {
    name: 'Anita K.',
    location: 'Mumbai',
    rating: 5,
    text: 'The bilingual Tamil-English edition is perfect. My son now loves reading in both languages. Highly recommend Kutty Story!',
  },
];

const faqs = [
  {
    question: 'How long does it take to create and deliver a book?',
    answer:
      'Once you place an order, our AI generates the illustrations within minutes. Printing takes 3-5 business days, and delivery across India typically takes 5-7 business days. Total time is about 10-14 days.',
  },
  {
    question: 'What photo quality do I need?',
    answer:
      "We recommend clear, front-facing photos taken in good lighting. The child's face should be clearly visible. JPEG, PNG, and WebP formats are accepted, up to 10 MB per photo.",
  },
  {
    question: "Is my child's data safe?",
    answer:
      'Absolutely. We take data privacy very seriously and comply with the DPDP Act. Photos are encrypted, used only for illustration, and automatically deleted within 30 days. We never share your data with third parties.',
  },
  {
    question: 'Can I get a book in Tamil?',
    answer:
      'Yes! We offer books in English, Tamil, and bilingual (English + Tamil) editions. The bilingual option adds both languages on each page for a small additional charge.',
  },
  {
    question: 'What if I am not happy with the illustrations?',
    answer:
      'You get a free preview before ordering. If you are not satisfied, you can regenerate pages or try different photos. We also offer a satisfaction guarantee on all printed orders.',
  },
  {
    question: 'Do you ship internationally?',
    answer:
      'Currently, we ship across India with free shipping on orders above a certain value. International shipping is coming soon. Contact us if you need a special arrangement.',
  },
];

// ─── Story type from API ────────────────────────────────────
interface FeaturedStory {
  slug: string;
  title: string;
  coverImage: string;
  theme: string;
  ageRange: string;
  price: string;
  description?: string;
}

// ─── Page Component ─────────────────────────────────────────

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [featuredStories, setFeaturedStories] =
    useState<FeaturedStory[]>(fallbackStories);

  useEffect(() => {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

    fetch(`${apiUrl}/stories/featured`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch featured stories');
        return res.json();
      })
      .then((data: any[]) => {
        const stories: FeaturedStory[] = data.map((story) => ({
          slug: story.slug,
          title: story.title,
          coverImage:
            coverImages[story.slug] ||
            story.coverImage ||
            '/images/stories/default.jpg',
          theme: story.theme,
          ageRange: story.ageRange || story.age_range || '2-8',
          price: formatPriceInr(PRICING.PDF_DOWNLOAD),
          description: story.description,
        }));
        if (stories.length > 0) {
          setFeaturedStories(stories);
        }
      })
      .catch(() => {
        // Keep fallback stories on error
      });
  }, []);

  return (
    <div className="overflow-hidden">
      {/* ────── HERO SECTION ────── */}
      <section className="relative bg-gradient-brand-soft min-h-[90vh] flex items-center">
        {/* Decorative blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-200 rounded-full blur-3xl opacity-30 animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-30 animate-float [animation-delay:3s]" />

        <div className="container-custom relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="text-center lg:text-left"
            >
              <motion.div variants={fadeInUp}>
                <span className="inline-block rounded-full bg-purple-100 px-4 py-1.5 text-sm font-semibold text-purple-700 mb-6">
                  Personalized AI Storybooks
                </span>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
              >
                Your Child is the{' '}
                <span className="text-gradient">Hero</span> of Their Own{' '}
                <span className="text-gradient">Story</span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0 mb-8"
              >
                Upload a photo and watch AI create a beautiful, personalized
                storybook where your child stars in every illustration.
                Available in English, Tamil, and bilingual editions.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              >
                <Link
                  href="/create"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-brand px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-purple-200 hover:shadow-xl hover:opacity-95 transition-all"
                >
                  Create Your Book
                </Link>
                <Link
                  href="/stories"
                  className="inline-flex items-center justify-center rounded-full border-2 border-purple-200 bg-white px-8 py-3.5 text-base font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
                >
                  Browse Stories
                </Link>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className="mt-8 flex items-center gap-6 justify-center lg:justify-start"
              >
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br from-pink-300 to-purple-300"
                    />
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">2,500+</span>{' '}
                  happy parents and counting
                </div>
              </motion.div>
            </motion.div>

            {/* Right: Illustration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative hidden lg:block"
            >
              <div className="relative aspect-square max-w-lg mx-auto">
                {/* Floating book mockup */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-pink-100 to-purple-100 animate-float" />
                <div className="absolute inset-4 rounded-2xl bg-white shadow-2xl overflow-hidden animate-float [animation-delay:1s]">
                  <HeroShowcase />
                </div>
                {/* Decorative floating elements */}
                <div className="absolute -top-4 -right-4 h-16 w-16 rounded-2xl bg-pink-400/80 flex items-center justify-center text-white animate-float [animation-delay:2s]">
                  <Sparkles className="h-8 w-8" />
                </div>
                <div className="absolute -bottom-4 -left-4 h-14 w-14 rounded-xl bg-purple-400/80 flex items-center justify-center text-white animate-float [animation-delay:4s]">
                  <Star className="h-7 w-7" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ────── HOW IT WORKS ────── */}
      <section id="how-it-works" className="section-padding bg-white">
        <div className="container-custom">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.span
              variants={fadeInUp}
              className="inline-block rounded-full bg-purple-100 px-4 py-1.5 text-sm font-semibold text-purple-700 mb-4"
            >
              Simple Process
            </motion.span>
            <motion.h2
              variants={fadeInUp}
              className="font-heading text-3xl sm:text-4xl font-bold mb-4"
            >
              How It Works
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground max-w-2xl mx-auto"
            >
              Creating a personalized storybook is as easy as 1-2-3-4. The whole
              process takes just a few minutes.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {howItWorks.map((step, idx) => (
              <motion.div
                key={step.title}
                variants={fadeInUp}
                className="relative text-center group"
              >
                {/* Connector line */}
                {idx < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-pink-200 to-purple-200" />
                )}

                <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 group-hover:from-pink-200 group-hover:to-purple-200 transition-colors duration-300">
                  <step.icon className="h-8 w-8 text-purple-600" />
                  <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white shadow">
                    {idx + 1}
                  </span>
                </div>
                <h3 className="font-heading font-bold text-lg mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ────── FEATURED STORIES ────── */}
      <section className="section-padding bg-gradient-brand-soft">
        <div className="container-custom">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.span
              variants={fadeInUp}
              className="inline-block rounded-full bg-purple-100 px-4 py-1.5 text-sm font-semibold text-purple-700 mb-4"
            >
              Our Stories
            </motion.span>
            <motion.h2
              variants={fadeInUp}
              className="font-heading text-3xl sm:text-4xl font-bold mb-4"
            >
              Featured Stories
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground max-w-2xl mx-auto"
            >
              Each story is lovingly written by children&apos;s authors and
              designed to spark imagination, curiosity, and joy.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {featuredStories.map((story) => (
              <motion.div key={story.slug} variants={fadeInUp}>
                <StoryCard {...story} />
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center mt-10">
            <Link
              href="/stories"
              className="inline-flex items-center justify-center rounded-full border-2 border-purple-200 bg-white px-8 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
            >
              View All Stories
            </Link>
          </div>
        </div>
      </section>

      {/* ────── SOCIAL PROOF / REVIEWS ────── */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.span
              variants={fadeInUp}
              className="inline-block rounded-full bg-pink-100 px-4 py-1.5 text-sm font-semibold text-pink-700 mb-4"
            >
              Loved by Parents
            </motion.span>
            <motion.h2
              variants={fadeInUp}
              className="font-heading text-3xl sm:text-4xl font-bold mb-4"
            >
              Trusted by 2,500+ Parents
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6"
          >
            {reviews.map((review) => (
              <motion.div
                key={review.name}
                variants={fadeInUp}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-4">
                  &ldquo;{review.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-300 to-purple-300" />
                  <div>
                    <p className="text-sm font-semibold">{review.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {review.location}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ────── PRICING ────── */}
      <section id="pricing" className="section-padding bg-gradient-brand-soft">
        <div className="container-custom">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.span
              variants={fadeInUp}
              className="inline-block rounded-full bg-purple-100 px-4 py-1.5 text-sm font-semibold text-purple-700 mb-4"
            >
              Pricing
            </motion.span>
            <motion.h2
              variants={fadeInUp}
              className="font-heading text-3xl sm:text-4xl font-bold mb-4"
            >
              Choose Your Format
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground max-w-2xl mx-auto"
            >
              Every format features 28 beautifully illustrated pages on premium
              paper. Free preview before you buy.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto"
          >
            <motion.div variants={fadeInUp}>
              <PriceCard
                name="PDF Download"
                price={formatPriceInr(PRICING.PDF_DOWNLOAD)}
                description="Get your personalized storybook as a beautiful high-quality PDF. Download instantly and print anywhere."
                features={[
                  '28 illustrated pages',
                  'High-resolution PDF',
                  'Print-ready quality',
                  'Instant download',
                  'Share digitally',
                ]}
                ctaLabel="Start Creating"
              />
            </motion.div>

            <motion.div variants={fadeInUp}>
              <PriceCard
                name="Printed Book"
                price={formatPriceInr(PRICING.PRINTED_BOOK)}
                description="Premium printed book delivered to your doorstep across India in 5-7 business days."
                isPopular
                features={[
                  '28 illustrated pages',
                  '210mm x 210mm square format',
                  '170gsm art paper',
                  'Matte laminated cover',
                  'Free shipping across India',
                ]}
                ctaLabel="Start Creating"
              />
            </motion.div>
          </motion.div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Bilingual (English + Tamil) editions available for an additional{' '}
            {formatPriceInr(PRICING.BILINGUAL_UPSELL)} on any format.
          </p>
        </div>
      </section>

      {/* ────── FAQ ────── */}
      <section id="faq" className="section-padding bg-white">
        <div className="container-custom max-w-3xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.span
              variants={fadeInUp}
              className="inline-block rounded-full bg-purple-100 px-4 py-1.5 text-sm font-semibold text-purple-700 mb-4"
            >
              FAQ
            </motion.span>
            <motion.h2
              variants={fadeInUp}
              className="font-heading text-3xl sm:text-4xl font-bold mb-4"
            >
              Frequently Asked Questions
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="space-y-3"
          >
            {faqs.map((faq, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="flex w-full items-center justify-between p-5 text-left"
                >
                  <span className="font-heading font-semibold text-sm sm:text-base pr-4">
                    {faq.question}
                  </span>
                  {openFaq === idx ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </button>
                {openFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="px-5 pb-5"
                  >
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ────── CTA BANNER ────── */}
      <section className="section-padding bg-gradient-brand">
        <div className="container-custom text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Create Something Magical?
            </h2>
            <p className="text-white/80 max-w-xl mx-auto mb-8">
              It only takes a few minutes to create a personalized storybook
              your child will treasure forever.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-bold text-purple-700 shadow-lg hover:shadow-xl hover:bg-purple-50 transition-all"
            >
              Create Your Book Now
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
