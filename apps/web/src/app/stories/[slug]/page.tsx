import type { Metadata } from 'next';
import StoryDetailContent from './story-detail-content';

const storyMeta: Record<string, { title: string; description: string; ageRange: string; price: string }> = {
  'abc-adventure': {
    title: 'ABC Adventure - Personalized Alphabet Book for Kids Ages 2-6',
    description:
      "An interactive alphabet adventure where your child explores 26 letters with hidden seek-and-find elements. Personalized with your child's photo. Ages 2-6. Starting ₹899.",
    ageRange: '2-6',
    price: '899',
  },
  'magical-unicorn': {
    title: 'Magical Unicorn Adventure - Personalized Fantasy Book for Kids Ages 3-8',
    description:
      "Your child befriends Luna the unicorn on a magical quest. Watercolor-fantasy illustrations personalized with your child's likeness. Ages 3-8. Starting ₹899.",
    ageRange: '3-8',
    price: '899',
  },
  'beach-adventure': {
    title: 'Beach Adventure - Personalized Story Book for Kids Ages 2-5',
    description:
      'A sunny beach day adventure with sandcastles, seashells and waves. Personalized with your child as the hero. Ages 2-5. Starting ₹899.',
    ageRange: '2-5',
    price: '899',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = storyMeta[slug];

  return {
    title: meta?.title || 'Story Details',
    description: meta?.description,
    alternates: { canonical: `https://kuttystory.com/stories/${slug}` },
    openGraph: {
      title: meta?.title,
      description: meta?.description,
      images: [`/images/stories/${slug}.jpg`],
    },
  };
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = storyMeta[slug];

  // Product structured data for the story
  const productJsonLd = meta
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: meta.title,
        description: meta.description,
        image: `https://kuttystory.com/images/stories/${slug}.jpg`,
        brand: {
          '@type': 'Brand',
          name: 'Kutty Story',
        },
        offers: [
          {
            '@type': 'Offer',
            name: 'PDF Download',
            price: '899',
            priceCurrency: 'INR',
            availability: 'https://schema.org/InStock',
            url: `https://kuttystory.com/stories/${slug}`,
            seller: {
              '@type': 'Organization',
              name: 'Kutty Story',
            },
          },
          {
            '@type': 'Offer',
            name: 'Printed Book',
            price: '1299',
            priceCurrency: 'INR',
            availability: 'https://schema.org/InStock',
            url: `https://kuttystory.com/stories/${slug}`,
            shippingDetails: {
              '@type': 'OfferShippingDetails',
              shippingDestination: {
                '@type': 'DefinedRegion',
                addressCountry: 'IN',
              },
              deliveryTime: {
                '@type': 'ShippingDeliveryTime',
                handlingTime: {
                  '@type': 'QuantitativeValue',
                  minValue: 3,
                  maxValue: 5,
                  unitCode: 'DAY',
                },
                transitTime: {
                  '@type': 'QuantitativeValue',
                  minValue: 5,
                  maxValue: 7,
                  unitCode: 'DAY',
                },
              },
            },
            seller: {
              '@type': 'Organization',
              name: 'Kutty Story',
            },
          },
        ],
        audience: {
          '@type': 'PeopleAudience',
          suggestedMinAge: parseInt(meta.ageRange.split('-')[0], 10),
          suggestedMaxAge: parseInt(meta.ageRange.split('-')[1], 10),
        },
        category: 'Personalized Children Books',
      }
    : null;

  return (
    <>
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
      <StoryDetailContent slug={slug} />
    </>
  );
}
