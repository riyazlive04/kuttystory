import React from 'react';
import type { Metadata } from 'next';
import { Mail, MessageCircle, Clock, MapPin } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact & Support',
  description:
    'Get in touch with the Kutty Story team. Questions about your personalized storybook, an order, shipping, or a refund — we are here to help.',
  alternates: { canonical: 'https://kuttystory.com/contact' },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-brand py-12 sm:py-16">
        <div className="container-custom text-center">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white">
            Contact &amp; Support
          </h1>
          <p className="text-white/80 mt-3 max-w-xl mx-auto">
            We&apos;d love to help with your storybook, an order, shipping, or
            anything else. Reach out and we&apos;ll get back to you quickly.
          </p>
        </div>
      </section>

      <div className="container-custom py-12 sm:py-16 max-w-4xl">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Email */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-pink-100 to-purple-100">
              <Mail className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="font-heading text-lg font-bold mb-1">Email us</h2>
            <p className="text-sm text-muted-foreground mb-3">
              For orders, support, and general questions.
            </p>
            <a
              href="mailto:hello@kuttystory.com"
              className="text-sm font-semibold text-purple-600 hover:text-purple-700"
            >
              hello@kuttystory.com
            </a>
          </div>

          {/* WhatsApp / chat */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-pink-100 to-purple-100">
              <MessageCircle className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="font-heading text-lg font-bold mb-1">Order help</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Have an order number? Include it in your email so we can find it
              fast and sort things out for you.
            </p>
            <a
              href="mailto:hello@kuttystory.com?subject=Order%20help"
              className="text-sm font-semibold text-purple-600 hover:text-purple-700"
            >
              Email about an order
            </a>
          </div>

          {/* Hours */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-pink-100 to-purple-100">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="font-heading text-lg font-bold mb-1">
              Response time
            </h2>
            <p className="text-sm text-muted-foreground">
              We typically reply within 1&ndash;2 business days, Monday to
              Saturday.
            </p>
          </div>

          {/* Location */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-pink-100 to-purple-100">
              <MapPin className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="font-heading text-lg font-bold mb-1">Where we are</h2>
            <p className="text-sm text-muted-foreground">
              Made with love in India. We ship across India and internationally.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl bg-gradient-brand-soft border border-border p-6 text-center">
          <h2 className="font-heading text-lg font-bold mb-2">
            Looking for quick answers?
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Many common questions about delivery, photos, and refunds are
            answered on our FAQ.
          </p>
          <a
            href="/#faq"
            className="inline-flex items-center justify-center rounded-full bg-gradient-brand px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Read the FAQ
          </a>
        </div>
      </div>
    </div>
  );
}
