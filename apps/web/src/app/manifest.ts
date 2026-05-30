import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kutty Story - Personalized AI Storybooks',
    short_name: 'Kutty Story',
    description:
      'Create personalized storybooks where your child is the hero',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#a855f7',
    icons: [
      { src: '/KuttyStoryLogo.png', sizes: '192x192', type: 'image/jpeg' },
      { src: '/KuttyStoryLogo.png', sizes: '512x512', type: 'image/jpeg' },
    ],
  };
}
