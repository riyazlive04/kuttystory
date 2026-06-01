import type { ComparisonConfig } from './types';

/**
 * Example config for the provider comparison harness.
 *
 * To run a real comparison:
 *   1. Copy this file to `comparison-config.ts` in the same folder.
 *   2. Drop 3–5 clear, front-facing photos of ONE child into `photosDir`.
 *   3. Adjust the child details + the 5 page scenes to match a real story
 *      (ideally copy 5 page prompts from a seeded StoryTemplate so the
 *      comparison reflects production output).
 *   4. (Optional) point each page's `baseTemplatePath` at the existing
 *      sample illustration so Option A reproduces the production edit baseline.
 *
 * `comparison-config.ts` is gitignored — only this example is committed.
 */
const config: ComparisonConfig = {
  storyTitle: 'ABC Adventure (comparison)',
  child: {
    name: 'Aarav',
    ageYears: 5,
    gender: 'boy',
    skinTone: 'warm medium-brown',
    hairColor: 'black',
    hasGlasses: false,
  },
  style: {
    style: 'cartoon-vibrant',
    medium: 'digital illustration',
    palette: 'warm and vibrant',
    lighting: 'soft natural lighting',
  },
  // Put the test child's photos here (relative to this folder or absolute).
  photosDir: './photos',
  pages: [
    {
      pageNumber: 1,
      scene:
        'The hero stands at the entrance of a magical alphabet forest, looking up in wonder at giant glowing letters hanging from the trees.',
      caption: "Aarav's ABC Adventure",
    },
    {
      pageNumber: 2,
      scene:
        'The hero befriends a friendly Apple-shaped creature under a big red letter A, both smiling.',
      caption: 'A is for Apple!',
    },
    {
      pageNumber: 3,
      scene:
        'The hero rides a gentle blue Butterfly past a giant letter B over a flower meadow.',
      caption: 'B is for Butterfly!',
    },
    {
      pageNumber: 4,
      scene:
        'The hero pets a fluffy Cat sitting beside a sparkling letter C on a cozy windowsill.',
      caption: 'C is for Cat!',
    },
    {
      pageNumber: 5,
      scene:
        'The hero dances with a happy Dog under a bright letter D as confetti falls.',
      caption: 'D is for Dog!',
    },
  ],
  // Run all four by default. Remove any you can't run yet.
  options: ['A_openai', 'B_flux_kontext', 'C_flux_lora', 'D_fal_pulid'],
};

export default config;
