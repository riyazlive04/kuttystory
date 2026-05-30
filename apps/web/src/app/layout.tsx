import type { Metadata } from 'next';
import { Nunito, Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { AuthProvider } from '@/lib/auth-context';
import { SettingsProvider } from '@/lib/settings-context';

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
  weight: ['400', '600', '700', '800', '900'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://kuttystory.com'),
  title: {
    default:
      'Kutty Story - Personalized AI Storybooks for Kids | Your Child is the Hero',
    template: '%s | Kutty Story',
  },
  description:
    "Create magical personalized storybooks where your child is the hero. AI-powered illustrations featuring your child's likeness. Available in English & Tamil. Starting at ₹899. Ships across India.",
  keywords: [
    'personalized storybooks',
    'kids books India',
    'custom children books',
    'AI storybooks',
    'personalized gifts for kids',
    'Tamil storybooks',
    'children book with photos',
    'kutty story',
    'birthday gift kids India',
    'personalized children books online India',
    'custom storybook with child photo',
    'kids birthday gift under 1000',
  ],
  authors: [{ name: 'Kutty Story', url: 'https://kuttystory.com' }],
  creator: 'Kutty Story',
  publisher: 'The Printing House',
  formatDetection: { email: false, telephone: false },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://kuttystory.com',
    siteName: 'Kutty Story',
    title: 'Kutty Story - Personalized AI Storybooks for Kids',
    description:
      'Create magical personalized storybooks where your child is the hero. AI-powered illustrations. English & Tamil. Starting ₹899.',
    images: [
      {
        url: '/KuttyStoryLogo.png',
        width: 1200,
        height: 630,
        alt: 'Kutty Story - Personalized AI Storybooks',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kutty Story - Personalized AI Storybooks for Kids',
    description:
      'Create magical personalized storybooks where your child is the hero.',
    images: ['/KuttyStoryLogo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://kuttystory.com',
  },
  other: {
    'theme-color': '#a855f7',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Kutty Story',
      url: 'https://kuttystory.com',
      logo: 'https://kuttystory.com/KuttyStoryLogo.png',
      description:
        'Personalized AI storybooks where your child is the hero. Available in English & Tamil.',
      foundingDate: '2025',
      founder: { '@type': 'Organization', name: 'The Printing House' },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Chennai',
        addressRegion: 'Tamil Nadu',
        addressCountry: 'IN',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'info121.tph@gmail.com',
        contactType: 'customer service',
        availableLanguage: ['English', 'Tamil'],
      },
      sameAs: [
        'https://www.instagram.com/kuttystory',
        'https://www.facebook.com/kuttystory',
        'https://twitter.com/kuttystory',
      ],
    },
    {
      '@type': 'WebSite',
      name: 'Kutty Story',
      url: 'https://kuttystory.com',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://kuttystory.com/stories?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How long does it take to create and deliver a book?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Once you place an order, our AI generates the illustrations within minutes. Printing takes 3-5 business days, and delivery across India typically takes 5-7 business days.',
          },
        },
        {
          '@type': 'Question',
          name: 'What photo quality do I need?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "We recommend clear, front-facing photos taken in good lighting. The child's face should be clearly visible. JPEG, PNG, and WebP formats are accepted, up to 10 MB per photo.",
          },
        },
        {
          '@type': 'Question',
          name: "Is my child's data safe?",
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Absolutely. We comply with the DPDP Act. Photos are encrypted, used only for illustration, and automatically deleted within 30 days.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I get a book in Tamil?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes! We offer books in English, Tamil, and bilingual (English + Tamil) editions.',
          },
        },
        {
          '@type': 'Question',
          name: 'What if I am not happy with the illustrations?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You get a free preview before ordering. You can regenerate pages or try different photos. We also offer a satisfaction guarantee on all printed orders.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do you ship internationally?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Currently, we ship across India with free shipping on orders above ₹999. International shipping is coming soon.',
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${nunito.variable} ${inter.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="min-h-screen bg-background font-body antialiased"
        suppressHydrationWarning
      >
        <SettingsProvider>
          <AuthProvider>
            <Header />
            <main className="min-h-[calc(100vh-4rem)]">{children}</main>
            <Footer />
          </AuthProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
