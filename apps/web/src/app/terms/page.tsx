import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Kutty Story Terms of Service. Rules and guidelines for using our personalized AI storybook platform. Operated by The Printing House.',
  alternates: { canonical: 'https://kuttystory.com/terms' },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-brand py-12 sm:py-16">
        <div className="container-custom text-center">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white">
            Terms of Service
          </h1>
          <p className="text-white/70 mt-2">Last updated: May 27, 2026</p>
        </div>
      </section>

      <div className="container-custom py-10 sm:py-14 max-w-3xl">
        <div className="prose prose-sm sm:prose max-w-none prose-headings:font-heading prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-purple-600">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Kutty Story website and services
            (collectively, the &ldquo;Service&rdquo;), you agree to be bound by
            these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to
            these Terms, please do not use the Service.
          </p>
          <p>
            The Service is operated by The Printing House 
            (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), a
            company registered in India.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Kutty Story provides a personalized storybook creation service where
            users can upload photographs of their children and use AI technology
            to generate custom-illustrated storybooks. The Service includes:
          </p>
          <ul>
            <li>
              A web-based platform for browsing story templates and creating
              personalized books.
            </li>
            <li>
              AI-powered illustration generation using uploaded photographs.
            </li>
            <li>
              Printing and delivery of physical storybooks within India.
            </li>
          </ul>

          <h2>3. User Accounts</h2>
          <p>
            To use certain features of the Service, you must create an account.
            You are responsible for:
          </p>
          <ul>
            <li>
              Providing accurate and complete registration information.
            </li>
            <li>Maintaining the security of your account credentials.</li>
            <li>All activity that occurs under your account.</li>
          </ul>
          <p>
            You must be at least 18 years old to create an account. By creating
            an account, you represent that you are at least 18 years of age.
          </p>

          <h2>4. Photo Upload and Child Content</h2>
          <p>
            By uploading photographs to the Service, you represent and warrant
            that:
          </p>
          <ul>
            <li>
              You are the parent or legal guardian of the child depicted in the
              photographs.
            </li>
            <li>
              You have the legal right to upload and use the photographs for the
              purpose of creating personalized storybooks.
            </li>
            <li>
              The photographs do not contain inappropriate, offensive, or illegal
              content.
            </li>
          </ul>
          <p>
            You retain ownership of all photographs you upload. By uploading
            photos, you grant us a limited, non-exclusive license to use the
            photographs solely for the purpose of generating storybook
            illustrations and delivering the Service.
          </p>

          <h2>5. AI-Generated Content</h2>
          <p>
            The illustrations in your personalized storybook are generated using
            artificial intelligence technology. You acknowledge that:
          </p>
          <ul>
            <li>
              AI-generated illustrations are approximations and may not be
              perfectly photorealistic.
            </li>
            <li>
              Minor variations in appearance between pages are normal.
            </li>
            <li>
              You may preview and approve illustrations before placing an order.
            </li>
          </ul>
          <p>
            Upon purchase, you receive a personal, non-commercial license to the
            AI-generated illustrations in your storybook. You may not resell,
            redistribute, or use the illustrations for commercial purposes.
          </p>

          <h2>6. Pricing and Payment</h2>
          <ul>
            <li>
              All prices are listed in Indian Rupees (INR) and include
              applicable taxes unless stated otherwise.
            </li>
            <li>
              Prices may change at any time, but changes will not affect orders
              already placed.
            </li>
            <li>
              Payment is processed securely through Razorpay. We do not store
              your payment card details.
            </li>
            <li>
              Free previews are limited to 5 per user per day.
            </li>
          </ul>

          <h2>7. Orders, Shipping, and Returns</h2>
          <h3>7.1 Order Processing</h3>
          <p>
            After placing an order, your book enters our printing queue. Once
            printing begins, orders cannot be cancelled. Please review your
            preview carefully before ordering.
          </p>

          <h3>7.2 Shipping</h3>
          <p>
            We ship across India. Estimated delivery times are 10-14 business
            days from order placement. Delivery times may vary based on location
            and are estimates only.
          </p>

          <h3>7.3 Returns and Refunds</h3>
          <ul>
            <li>
              Since each book is uniquely personalized, we cannot accept returns
              for change of mind.
            </li>
            <li>
              If your book arrives damaged or with a significant printing defect,
              contact us within 7 days of delivery for a free replacement.
            </li>
            <li>
              If we are unable to resolve the issue, we will provide a full
              refund.
            </li>
          </ul>

          <h2>8. Intellectual Property</h2>
          <p>
            The Kutty Story name, logo, story templates, original text, and
            website design are the intellectual property of The Printing House. You may not copy, reproduce, or distribute any part of the
            Service without our written permission.
          </p>

          <h2>9. Prohibited Uses</h2>
          <p>You agree not to:</p>
          <ul>
            <li>
              Upload photographs of anyone other than your own children or
              children for whom you have legal guardianship.
            </li>
            <li>
              Upload inappropriate, offensive, or illegal content.
            </li>
            <li>
              Use the Service for any commercial purpose without our permission.
            </li>
            <li>
              Attempt to reverse-engineer, decompile, or extract our AI models
              or algorithms.
            </li>
            <li>
              Use automated tools to scrape, crawl, or access the Service.
            </li>
            <li>
              Abuse the free preview system by creating excessive generations.
            </li>
          </ul>

          <h2>10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by Indian law, Kutty Story shall not be liable for any indirect, incidental,
            special, consequential, or punitive damages arising from your use of
            the Service. Our total liability for any claim shall not exceed the
            amount you paid for the specific order in question.
          </p>

          <h2>11. Governing Law and Disputes</h2>
          <p>
            These Terms are governed by the laws of India. Any disputes arising
            from these Terms or the Service shall be subject to the exclusive
            jurisdiction of the courts in Chennai, Tamil Nadu, India.
          </p>

          <h2>12. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will
            provide notice of significant changes via email or a prominent notice
            on the website. Your continued use of the Service after changes
            constitutes acceptance.
          </p>

          <h2>13. Contact</h2>
          <p>
            For questions about these Terms, contact us at:
          </p>
          <ul>
            <li>Email: info121.tph@gmail.com</li>
            <li>
              Address: No 6, Race Course Road, Kajamalai, Tiruchirappalli, Tamil Nadu, India 620023
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
