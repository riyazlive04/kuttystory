import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Returns & Refunds Policy',
  description:
    'Kutty Story Returns & Refunds Policy. Because each book is personalized and made to order, returns are limited. Replacements and refunds are offered for damage, defects, or errors made by us.',
  alternates: { canonical: 'https://kuttystory.com/refunds' },
};

export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-brand py-12 sm:py-16">
        <div className="container-custom text-center">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white">
            Returns &amp; Refunds Policy
          </h1>
          <p className="text-white/70 mt-2">Last updated: June 11, 2026</p>
        </div>
      </section>

      <div className="container-custom py-10 sm:py-14 max-w-3xl">
        <div className="prose prose-sm sm:prose max-w-none prose-headings:font-heading prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-purple-600">
          <p>
            Every Kutty Story book is custom-made for one child using the name,
            photos, personal details, and story choices you provide. Because a
            personalized book cannot be resold to anyone else, our returns and
            refunds policy is different from that of an ordinary retail product.
            Please read it carefully before placing your order.
          </p>

          <h2>1. No Returns or Cancellations on Personalized Books</h2>
          <p>
            Due to the personalized, made-to-order nature of our products, we{' '}
            <strong>
              do not accept returns, exchanges, or cancellations once production
              has begun
            </strong>
            . Production begins as soon as your book is approved and sent for
            generation or printing.
          </p>

          <h2>2. When You Are Eligible for a Replacement or Refund</h2>
          <p>
            We stand behind the quality of our work. You are eligible for a free
            replacement or a refund if the problem was caused by us, including:
          </p>
          <ul>
            <li>The wrong name was printed due to an error on our side.</li>
            <li>Incorrect photos were used due to an error on our side.</li>
            <li>The book arrived physically damaged.</li>
            <li>There is a manufacturing or printing defect.</li>
            <li>You received the wrong product.</li>
          </ul>
          <p>
            If your order arrives damaged or defective, or contains an error
            made by our team, please contact us within{' '}
            <strong>48 hours of delivery</strong> with clear photos of the
            issue. We will review the case and provide a replacement or refund
            where appropriate.
          </p>

          <h2>3. Errors in Information You Submit</h2>
          <p>
            We print exactly the details you enter. We are{' '}
            <strong>
              not responsible for errors in information submitted by the
              customer
            </strong>{' '}
            and cannot offer refunds or replacements for such mistakes,
            including:
          </p>
          <ul>
            <li>Misspelled name or incorrect spelling.</li>
            <li>The wrong photo uploaded.</li>
            <li>An incorrect birth date or age.</li>
            <li>Any other incorrect information provided at checkout.</li>
          </ul>
          <p>
            Please review your name, photos, and details carefully on the
            preview screen before approving your book for production.
          </p>

          <h2>4. Digital (PDF) Orders</h2>
          <p>
            Digital download (PDF) orders are delivered electronically and are
            generated specifically for you. They are{' '}
            <strong>non-returnable and non-refundable</strong> once generated,
            except where the file is corrupted or contains an error made by our
            team — in which case we will regenerate and re-deliver it at no cost.
          </p>

          <h2>5. How to Request a Replacement or Refund</h2>
          <p>
            Email us at{' '}
            <a href="mailto:hello@kuttystory.com">hello@kuttystory.com</a> within
            48 hours of delivery with your order number and photos of the issue.
            Approved refunds are issued to your original payment method within
            5&ndash;7 business days.
          </p>

          <h2>Summary</h2>
          <p>
            Personalized products are created specifically for you and are
            therefore non-returnable and non-refundable{' '}
            <strong>
              unless the item is defective, damaged during transit, or contains
              an error made by our team
            </strong>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
