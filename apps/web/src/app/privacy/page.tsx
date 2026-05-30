import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - DPDP Act Compliant',
  description:
    "Kutty Story privacy policy. DPDP Act 2023 compliant. Learn how we protect your child's photos and personal data.",
  alternates: { canonical: 'https://kuttystory.com/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-brand py-12 sm:py-16">
        <div className="container-custom text-center">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white">
            Privacy Policy
          </h1>
          <p className="text-white/70 mt-2">Last updated: May 27, 2026</p>
        </div>
      </section>

      <div className="container-custom py-10 sm:py-14 max-w-3xl">
        <div className="prose prose-sm sm:prose max-w-none prose-headings:font-heading prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-purple-600">
          <h2>1. Introduction</h2>
          <p>
            Kutty Story (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;)
            is committed to protecting your privacy and the privacy of your
            children. This Privacy Policy explains how we collect, use, store,
            and protect personal data when you use our personalized storybook
            service at kuttystory.com.
          </p>
          <p>
            This policy is compliant with the Digital Personal Data Protection
            Act, 2023 (DPDP Act) of India and applicable data protection
            regulations.
          </p>

          <h2>2. Data We Collect</h2>
          <h3>2.1 Account Information</h3>
          <p>
            When you create an account, we collect your name, email address, and
            optionally your phone number. If you sign in via Google, we receive
            your name, email, and profile picture from Google.
          </p>

          <h3>2.2 Child Information</h3>
          <p>
            To personalize storybooks, we collect your child&apos;s first name,
            nickname (optional), gender, age, and physical appearance attributes
            (skin tone, hair color, glasses preference). We also collect
            photographs of your child that you upload.
          </p>

          <h3>2.3 Order and Payment Data</h3>
          <p>
            We collect shipping addresses, order details, and transaction
            records. Payment processing is handled by Razorpay; we do not store
            your full credit card or debit card numbers on our servers.
          </p>

          <h3>2.4 Usage Data</h3>
          <p>
            We automatically collect device information, browser type, IP
            address, pages visited, and interaction data to improve our service.
          </p>

          <h2>3. How We Use Your Data</h2>
          <ul>
            <li>
              <strong>Service Delivery:</strong> To create personalized
              storybooks featuring your child&apos;s likeness based on the photos
              and details you provide.
            </li>
            <li>
              <strong>Order Fulfillment:</strong> To process payments, print
              books, and deliver them to your address.
            </li>
            <li>
              <strong>Communication:</strong> To send order updates, delivery
              notifications, and customer support responses.
            </li>
            <li>
              <strong>Improvement:</strong> To improve our AI illustration
              quality, website performance, and user experience.
            </li>
          </ul>

          <h2>4. Children&apos;s Data Protection</h2>
          <p>
            We take special care with children&apos;s data as required by the
            DPDP Act:
          </p>
          <ul>
            <li>
              Photos and child details are collected only with verifiable
              parental consent.
            </li>
            <li>
              Child photographs are encrypted at rest and in transit using
              AES-256 encryption.
            </li>
            <li>
              Photos are used exclusively for generating storybook illustrations
              and are never shared with third parties for marketing or any other
              purpose.
            </li>
            <li>
              Uploaded photos are automatically deleted within 30 days of upload,
              unless you explicitly request earlier deletion.
            </li>
            <li>
              We do not track, profile, or serve advertising to children.
            </li>
          </ul>

          <h2>5. Data Storage and Security</h2>
          <p>
            Your data is stored on servers located in India and protected by
            industry-standard security measures including:
          </p>
          <ul>
            <li>AES-256 encryption for photos and sensitive data at rest.</li>
            <li>TLS 1.3 encryption for all data in transit.</li>
            <li>Access controls limiting data access to authorized personnel only.</li>
            <li>Regular security audits and vulnerability assessments.</li>
          </ul>

          <h2>6. Data Sharing</h2>
          <p>
            We share your data only with the following categories of service
            providers, strictly for the purpose of delivering our service:
          </p>
          <ul>
            <li>
              <strong>Print Partners:</strong> Printing facilities receive the
              final book PDF for printing. They do not receive raw photos.
            </li>
            <li>
              <strong>Shipping Partners:</strong> Courier services receive
              shipping address details for delivery.
            </li>
            <li>
              <strong>Payment Processor:</strong> Razorpay processes your
              payments securely.
            </li>
            <li>
              <strong>Cloud Infrastructure:</strong> Cloudflare R2 for CDN and
              storage, with data residency in India.
            </li>
          </ul>
          <p>
            We never sell your personal data or your child&apos;s data to third
            parties.
          </p>

          <h2>7. Your Rights Under DPDP Act</h2>
          <p>As a Data Principal, you have the right to:</p>
          <ul>
            <li>
              <strong>Access:</strong> Request a summary of the personal data we
              hold about you and your child.
            </li>
            <li>
              <strong>Correction:</strong> Request correction of inaccurate or
              incomplete data.
            </li>
            <li>
              <strong>Erasure:</strong> Request deletion of your personal data
              and your child&apos;s data, subject to legal retention
              requirements.
            </li>
            <li>
              <strong>Withdraw Consent:</strong> Withdraw your consent for data
              processing at any time, understanding this may affect our ability
              to provide the service.
            </li>
            <li>
              <strong>Grievance Redressal:</strong> Lodge a complaint with our
              Data Protection Officer or the Data Protection Board of India.
            </li>
          </ul>

          <h2>8. Data Retention</h2>
          <ul>
            <li>
              <strong>Photos:</strong> Automatically deleted within 30 days of
              upload.
            </li>
            <li>
              <strong>Account data:</strong> Retained while your account is
              active and for 90 days after deletion request.
            </li>
            <li>
              <strong>Order records:</strong> Retained for 7 years as required
              by Indian tax and commerce regulations.
            </li>
          </ul>

          <h2>9. Cookies</h2>
          <p>
            We use essential cookies for authentication and session management.
            We use analytics cookies (only with your consent) to understand
            usage patterns and improve our service. You can manage cookie
            preferences from your browser settings.
          </p>

          <h2>10. Data Protection Officer</h2>
          <p>
            For any privacy-related queries, concerns, or to exercise your
            rights, contact our Data Protection Officer:
          </p>
          <ul>
            <li>Email: info121.tph@gmail.com</li>
            <li>
              Address: No 6, Race Course Road, Kajamalai, Tiruchirappalli, Tamil Nadu 620023
            </li>
          </ul>

          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify
            you of significant changes via email or a prominent notice on our
            website. Your continued use of the service after changes constitutes
            acceptance of the updated policy.
          </p>
        </div>
      </div>
    </div>
  );
}
