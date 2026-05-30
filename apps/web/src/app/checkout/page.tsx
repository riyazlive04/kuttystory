'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Download,
  Truck,
  Check,
  Shield,
  ArrowLeft,
  FileText,
  Package,
  Mail,
} from 'lucide-react';
import { formatPriceInr, PRICING } from '@kutty-story/shared';
import { useSettings } from '@/lib/settings-context';
import { api, ensureGuestSession } from '@/lib/api';

type Format = 'PDF_DOWNLOAD' | 'PRINTED_BOOK';

const WIZARD_STORAGE_KEY = 'kutty-story-wizard';

export default function CheckoutPage() {
  const settings = useSettings();
  const [selectedFormat, setSelectedFormat] = useState<Format>('PRINTED_BOOK');
  const [placed, setPlaced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [shippingForm, setShippingForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Prefill name / email / phone from what the visitor already entered in the
  // create wizard (persisted in localStorage), so they don't retype it. The
  // shipping address is collected here only when a printed book is selected.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WIZARD_STORAGE_KEY);
      if (!saved) return;
      const w = JSON.parse(saved) as {
        contactName?: string;
        contactEmail?: string;
        contactPhone?: string;
      };
      setShippingForm((prev) => ({
        ...prev,
        fullName: prev.fullName || w.contactName || '',
        email: prev.email || w.contactEmail || '',
        phone: prev.phone || w.contactPhone || '',
      }));
    } catch {
      // ignore malformed wizard state
    }
  }, []);

  const handlePlaceOrder = async () => {
    // Submits the order for offline payment. Team will contact the customer.
    // When Razorpay is enabled by admin, the online payment button replaces this.
    setOrderError(null);

    // Contact details are required so the team can reach the customer offline.
    if (!shippingForm.fullName.trim() || !shippingForm.phone.trim()) {
      setOrderError('Please enter your name and phone number.');
      return;
    }
    // PDF is delivered by email, so a valid email is required for that format.
    if (selectedFormat === 'PDF_DOWNLOAD') {
      const email = shippingForm.email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setOrderError('Please enter a valid email — we send the PDF there.');
        return;
      }
    }
    if (selectedFormat === 'PRINTED_BOOK') {
      if (
        !shippingForm.addressLine1.trim() ||
        !shippingForm.city.trim() ||
        !shippingForm.state.trim() ||
        !shippingForm.pincode.trim()
      ) {
        setOrderError('Please complete your shipping address.');
        return;
      }
    }

    // The book id comes from the create wizard (persisted in localStorage).
    let bookId: string | null = null;
    try {
      const saved = localStorage.getItem(WIZARD_STORAGE_KEY);
      if (saved) {
        bookId = (JSON.parse(saved) as { bookId?: string }).bookId ?? null;
      }
    } catch {
      // ignore parse errors
    }
    // Sample-only previews use a throwaway "book-…" id; a real order needs a
    // book that was actually created on the server.
    if (!bookId || bookId.startsWith('book-')) {
      setOrderError(
        'Please generate your book preview before placing an order.',
      );
      return;
    }

    setSubmitting(true);
    try {
      await ensureGuestSession();
      const res = await api.post<{ order: { orderNumber: string } }>(
        '/orders/create',
        {
          bookId,
          format: selectedFormat,
          shippingAddress: shippingForm,
        },
      );
      setOrderNumber(res.data?.order?.orderNumber ?? null);
      setPlaced(true);
    } catch {
      setOrderError(
        'Sorry, we could not place your order. Please try again, or email info121.tph@gmail.com.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const price =
    selectedFormat === 'PDF_DOWNLOAD'
      ? PRICING.PDF_DOWNLOAD
      : PRICING.PRINTED_BOOK;

  const handleInputChange = (field: string, value: string) => {
    setShippingForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-brand-soft">
      <div className="container-custom py-8 sm:py-12">
        <Link
          href="/create"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to preview
        </Link>

        <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-8">
          Checkout
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Format selection + Shipping */}
          <div className="lg:col-span-2 space-y-6">
            {/* Format selection */}
            <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
              <h2 className="font-heading font-bold text-lg mb-4">
                Choose Your Format
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedFormat('PDF_DOWNLOAD')}
                  className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                    selectedFormat === 'PDF_DOWNLOAD'
                      ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-200'
                      : 'border-border hover:border-purple-300'
                  }`}
                >
                  {selectedFormat === 'PDF_DOWNLOAD' && (
                    <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-brand text-white">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 mb-3">
                    <Download className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-heading font-bold text-base mb-1">
                    PDF Download
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    High-quality PDF. Download instantly and print anywhere.
                  </p>
                  <p className="text-2xl font-heading font-bold text-gradient">
                    {formatPriceInr(PRICING.PDF_DOWNLOAD)}
                  </p>
                </button>

                <button
                  onClick={() => setSelectedFormat('PRINTED_BOOK')}
                  className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                    selectedFormat === 'PRINTED_BOOK'
                      ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-200'
                      : 'border-border hover:border-purple-300'
                  }`}
                >
                  {selectedFormat === 'PRINTED_BOOK' && (
                    <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-brand text-white">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className="absolute -top-2.5 left-4">
                    <span className="inline-block rounded-full bg-gradient-brand px-3 py-0.5 text-[10px] font-bold text-white">
                      Most Popular
                    </span>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100 mb-3">
                    <Package className="h-6 w-6 text-pink-600" />
                  </div>
                  <h3 className="font-heading font-bold text-base mb-1">
                    Printed Book
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Premium printed book delivered to your doorstep. Free
                    shipping across India.
                  </p>
                  <p className="text-2xl font-heading font-bold text-gradient">
                    {formatPriceInr(PRICING.PRINTED_BOOK)}
                  </p>
                </button>
              </div>
            </div>

            {/* Shipping form (only for printed book) */}
            {selectedFormat === 'PRINTED_BOOK' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-white rounded-2xl border border-border p-6 shadow-sm"
              >
                <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-purple-600" />
                  Shipping Address
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  We ship across India. Delivery in 5-7 business days.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={shippingForm.fullName}
                      onChange={(e) =>
                        handleInputChange('fullName', e.target.value)
                      }
                      placeholder="Recipient's full name"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={shippingForm.phone}
                      onChange={(e) =>
                        handleInputChange('phone', e.target.value)
                      }
                      placeholder="+91 98765 43210"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={shippingForm.pincode}
                      onChange={(e) =>
                        handleInputChange('pincode', e.target.value)
                      }
                      placeholder="600001"
                      maxLength={6}
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1.5">
                      Address Line 1
                    </label>
                    <input
                      type="text"
                      value={shippingForm.addressLine1}
                      onChange={(e) =>
                        handleInputChange('addressLine1', e.target.value)
                      }
                      placeholder="House/Flat No., Building, Street"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1.5">
                      Address Line 2{' '}
                      <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={shippingForm.addressLine2}
                      onChange={(e) =>
                        handleInputChange('addressLine2', e.target.value)
                      }
                      placeholder="Landmark, Area"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      value={shippingForm.city}
                      onChange={(e) =>
                        handleInputChange('city', e.target.value)
                      }
                      placeholder="Chennai"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      State
                    </label>
                    <input
                      type="text"
                      value={shippingForm.state}
                      onChange={(e) =>
                        handleInputChange('state', e.target.value)
                      }
                      placeholder="Tamil Nadu"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Contact details (PDF has no shipping address, but we still need
                a way to reach the customer for offline payment) */}
            {selectedFormat === 'PDF_DOWNLOAD' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-white rounded-2xl border border-border p-6 shadow-sm"
              >
                <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-purple-600" />
                  Contact Details
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  We&apos;ll email your PDF here and contact you to collect
                  payment.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1.5">
                      Email <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="email"
                      value={shippingForm.email}
                      onChange={(e) =>
                        handleInputChange('email', e.target.value)
                      }
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Your personalized storybook PDF is sent to this address.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={shippingForm.fullName}
                      onChange={(e) =>
                        handleInputChange('fullName', e.target.value)
                      }
                      placeholder="Your full name"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={shippingForm.phone}
                      onChange={(e) =>
                        handleInputChange('phone', e.target.value)
                      }
                      placeholder="+91 98765 43210"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right: Order summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-2xl border border-border p-6 shadow-sm">
              <h2 className="font-heading font-bold text-lg mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {selectedFormat === 'PDF_DOWNLOAD'
                      ? 'PDF Download'
                      : 'Printed Book'}
                  </span>
                  <span className="font-medium">
                    {formatPriceInr(price)}
                  </span>
                </div>
                {selectedFormat === 'PRINTED_BOOK' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium text-green-600">Free</span>
                  </div>
                )}
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-heading font-bold">Total</span>
                  <span className="font-heading font-bold text-lg text-gradient">
                    {formatPriceInr(price)}
                  </span>
                </div>
              </div>

              {settings.paymentEnabled ? (
                <>
                  <button
                    className="w-full rounded-full bg-gradient-brand py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-200 hover:opacity-95 transition-all"
                    onClick={() =>
                      alert(
                        'Redirecting to secure payment... (Razorpay checkout opens here)',
                      )
                    }
                  >
                    {selectedFormat === 'PDF_DOWNLOAD'
                      ? 'Pay & Download PDF'
                      : 'Pay & Place Order'}
                  </button>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3.5 w-3.5" />
                      Secure payment powered by Razorpay
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      Satisfaction guarantee on all orders
                    </div>
                    {selectedFormat === 'PRINTED_BOOK' && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Truck className="h-3.5 w-3.5" />
                        Free shipping across India (5-7 days)
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button
                    className="w-full rounded-full bg-gradient-brand py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-200 hover:opacity-95 transition-all disabled:opacity-50"
                    disabled={placed || submitting}
                    onClick={handlePlaceOrder}
                  >
                    {placed
                      ? 'Order Placed!'
                      : submitting
                        ? 'Placing Order…'
                        : 'Place Order'}
                  </button>

                  {orderError && !placed && (
                    <p className="mt-3 text-xs text-destructive text-center">
                      {orderError}
                    </p>
                  )}

                  {placed ? (
                    <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                      <Check className="mx-auto mb-2 h-6 w-6 text-green-600" />
                      <p className="text-sm font-medium text-green-800">
                        Thank you! Your order is received.
                      </p>
                      {orderNumber && (
                        <p className="mt-1 text-xs font-semibold text-green-800">
                          Order #{orderNumber}
                        </p>
                      )}
                      {selectedFormat === 'PDF_DOWNLOAD' && (
                        <p className="mt-1 text-xs text-green-700">
                          Your storybook PDF will be emailed to{' '}
                          <span className="font-medium">
                            {shippingForm.email}
                          </span>
                          .
                        </p>
                      )}
                      <p className="mt-1 text-xs text-green-700">
                        Our team will reach out shortly to confirm your order
                        and collect payment. For queries, email{' '}
                        <a
                          href="mailto:info121.tph@gmail.com"
                          className="font-medium underline"
                        >
                          info121.tph@gmail.com
                        </a>
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50 p-3 text-center">
                      <p className="text-xs text-purple-700">
                        Place your order now — our team will contact you to
                        confirm and collect payment (pay offline via UPI, bank
                        transfer, or cash).
                      </p>
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      Satisfaction guarantee on all orders
                    </div>
                    {selectedFormat === 'PRINTED_BOOK' && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Truck className="h-3.5 w-3.5" />
                        Free shipping across India (5-7 days)
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
