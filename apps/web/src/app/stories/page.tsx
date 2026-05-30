import type { Metadata } from 'next';
import StoriesContent from './stories-content';

export const metadata: Metadata = {
  title: 'Personalized Story Books for Kids - Browse Our Collection',
  description:
    'Choose from ABC Adventure, Magical Unicorn, and Beach Adventure. Personalized AI storybooks where your child is the hero. Starting ₹899. English & Tamil.',
  alternates: { canonical: 'https://kuttystory.com/stories' },
};

export default function StoriesPage() {
  return <StoriesContent />;
}
