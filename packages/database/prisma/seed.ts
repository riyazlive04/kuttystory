import { PrismaClient, StoryTheme } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const NEGATIVE_PROMPT =
  'different child, multiple children, adult features, distorted face, text watermarks, signature';

// ─── Helper Types ───────────────────────────────────────────────────────────

interface PageData {
  pageNumber: number;
  textEnglish: string;
  illustrationPrompt: string;
  styleTokens: Record<string, string>;
  isCoverPage: boolean;
  isPreviewPage: boolean;
}

interface StoryData {
  slug: string;
  title: string;
  description: string;
  theme: StoryTheme;
  ageMin: number;
  ageMax: number;
  artStyle: string;
  basePriceInr: number;
  premiumPriceInr: number;
  giftPriceInr: number;
  pageCount: number;
  pages: PageData[];
}

// ─── Story 1: ABC Adventure ────────────────────────────────────────────────

function buildAbcAdventurePages(): PageData[] {
  const abcStyle = {
    style: 'cartoon-vibrant',
    medium: 'digital illustration',
    palette: 'bright primary colors',
    lighting: 'cheerful daylight',
  };

  // Transcribed VERBATIM from the client's actual ABC templates (PSD text
  // layers). The old seed had diverged (J was "Jellyfish" not Juice, M "Moon"
  // not Mirror, R "Rainbow" not Rabbit, V "Violin" not Van, plus many location
  // differences). `line2` is the middle sentence — usually "{{childName}} is …"
  // but a few pages read "It is …" (O/S/U), so it's stored whole.
  const letterPages: Array<{ letter: string; word: string; line2: string; item: string }> = [
    { letter: 'A', word: 'Apple', line2: '{{childName}} is in the garden.', item: 'APPLE' },
    { letter: 'B', word: 'Ball', line2: '{{childName}} is in the park.', item: 'BLUE BALL' },
    { letter: 'C', word: 'Cat', line2: '{{childName}} is at home.', item: 'SLEEPY CAT' },
    { letter: 'D', word: 'Dog', line2: '{{childName}} is outside.', item: 'DOG' },
    { letter: 'E', word: 'Elephant', line2: '{{childName}} is in the Zoo.', item: 'ELEPHANT' },
    { letter: 'F', word: 'Fish', line2: '{{childName}} is near water.', item: 'ORANGE FISH' },
    { letter: 'G', word: 'Goat', line2: '{{childName}} is on a farm.', item: 'GOAT' },
    { letter: 'H', word: 'Hat', line2: '{{childName}} is playing dress-up.', item: 'HAT' },
    { letter: 'I', word: 'Ice Cream', line2: '{{childName}} is at a shop.', item: 'pink ice cream' },
    { letter: 'J', word: 'Juice', line2: '{{childName}} is having a drink.', item: 'JUICE GLASS' },
    { letter: 'K', word: 'Kite', line2: '{{childName}} is outside.', item: 'FLYING KITE' },
    { letter: 'L', word: 'Lion', line2: '{{childName}} is at the forest.', item: 'LION' },
    { letter: 'M', word: 'Mirror', line2: '{{childName}} is in the living room.', item: 'MIRROR' },
    { letter: 'N', word: 'Nest', line2: '{{childName}} is near a tree.', item: "BIRD'S NEST" },
    { letter: 'O', word: 'Owl', line2: 'It is evening time.', item: 'OWL' },
    { letter: 'P', word: 'Parrot', line2: '{{childName}} sees colorful birds.', item: 'PARROT' },
    { letter: 'Q', word: 'Queen', line2: '{{childName}} is in a castle.', item: 'QUEEN' },
    { letter: 'R', word: 'Rabbit', line2: '{{childName}} is in a field.', item: 'RABBIT' },
    { letter: 'S', word: 'Sun', line2: 'It is a bright day.', item: 'SHINING SUN' },
    { letter: 'T', word: 'Tree', line2: '{{childName}} is in the forest.', item: 'TALL TREE' },
    { letter: 'U', word: 'Umbrella', line2: 'It is raining.', item: 'UMBRELLA' },
    { letter: 'V', word: 'Van', line2: '{{childName}} is on the road.', item: 'VAN' },
    { letter: 'W', word: 'Whale', line2: '{{childName}} is near the sea.', item: 'BIG WHALE' },
    { letter: 'X', word: 'Xylophone', line2: '{{childName}} is playing music.', item: 'XYLOPHONE' },
    { letter: 'Y', word: 'Yak', line2: '{{childName}} is in the mountains.', item: 'FLUFFY YAK' },
    { letter: 'Z', word: 'Zebra', line2: '{{childName}} is in the grassland.', item: 'STRIPED ZEBRA' },
  ];

  const pages: PageData[] = [
    {
      pageNumber: 1,
      // Verbatim from the Front-1 template; the static "Look closely…" subtitle is
      // baked into the art, only this title is code-rendered (navy, on the ellipse).
      textEnglish: 'Welcome to {{childName}} ABC Adventure!',
      illustrationPrompt:
        'A personalized child standing in a colorful wonderland with giant floating alphabet letters A through Z surrounding them, confetti and sparkles in the air, a big friendly title banner overhead, lush green landscape in the background',
      styleTokens: abcStyle,
      isCoverPage: true,
      isPreviewPage: true,
    },
    {
      pageNumber: 2,
      // The static "Look carefully at every page" line is baked into the art; only
      // this name-bearing line is code-rendered (white) on the top shape.
      textEnglish: '{{childName}} needs your help to find hidden things!',
      illustrationPrompt:
        'A personalized child with a magnifying glass, looking curious and excited, surrounded by colorful question marks and hidden objects peeking from behind bushes and flowers, playful garden setting',
      styleTokens: abcStyle,
      isCoverPage: false,
      isPreviewPage: true,
    },
  ];

  for (let i = 0; i < letterPages.length; i++) {
    const lp = letterPages[i];
    const pageNumber = i + 3;

    const textEnglish = `${lp.letter} is for ${lp.word}. ${lp.line2} Can you find the ${lp.item}?`;

    pages.push({
      pageNumber,
      textEnglish,
      illustrationPrompt: `A personalized child with a large friendly ${lp.word.toLowerCase()} prominently featured in the scene, the letter "${lp.letter}" displayed decoratively, vibrant and engaging seek-and-find composition with hidden details for children to discover`,
      styleTokens: abcStyle,
      isCoverPage: false,
      isPreviewPage: pageNumber <= 5,
    });
  }

  return pages;
}

// ─── Story 2: Magical Unicorn Adventure ────────────────────────────────────

function buildMagicalUnicornPages(): PageData[] {
  const unicornStyle = {
    style: 'watercolor-fantasy',
    medium: 'watercolor illustration',
    palette: 'pastel rainbow, soft pinks and purples',
    lighting: 'magical glow with soft sparkles',
  };

  // Transcribed verbatim from the client's actual Unicorn templates (PSD text
  // layers), with the placeholder name swapped for {{childName}}. Backtick
  // literals so the embedded " and ' need no escaping.
  const pageTexts: string[] = [
    `In a colorful little town, there lived a sweet girl named {{childName}}.`,
    `Every night, {{childName}} looked at the sky and whispered, "Maybe one day, I will meet a unicorn!"`,
    `She kept tiny drawings of unicorns in her bed room.`,
    `One bright morning, something magical happened.`,
    `The door glowed softly with sparkling colors.`,
    `"Wow!" said {{childName}}, opening the door slowly.`,
    `Suddenly...clip-clop, clip-clop! A beautiful unicorn appeared with a sparkling horn.`,
    `Her silver mane waved in the breeze like silk.`,
    `"Hello, {{childName}}!" said the unicorn. "My name is Luna. I need your help!"`,
    `"The magic in our land is fading," Luna said sadly. "Only a kind and brave girl can bring it back."`,
    `Tiny stars above them began to flicker dimly.`,
    `"I will help!" said {{childName}} with a smile.`,
    `Luna happily stamped her shiny hooves. "Thank you, brave friend!"`,
    `They walked through a Rainbow Forest filled with glowing trees and singing birds.`,
    `Bright flowers opened as they passed by. Even the butterflies danced around them.`,
    `"First, we must find the Golden Star," said Luna. "It gives light to our magical world."`,
    `They climbed a soft, fluffy hill and found the Golden Star shining softly.`,
    `The Golden Star twinkled warmly in {{childName}}'s hands. It filled the sky with golden light.`,
    `"Great job, {{childName}}!" said Luna happily. The sky became a little brighter.`,
    `Next, they went to the Glitter River to find the Silver Heart.`,
    `{{childName}} gently picked up the Silver Heart. It glowed with soft light.`,
    `"You are so kind," said Luna. The flowers around them began to bloom again!`,
    `It was hidden high above! "Don't worry," said Luna, "hop on my back!"`,
    `{{childName}} reached out and grabbed the crystal.`,
    `Suddenly... WHOOSH! Magic filled the land again!`,
    `The sky sparkled, flowers danced, and colors returned everywhere.`,
    `"It's time to go home," Luna said gently. "But remember... magic is always in your heart."`,
    `Back in her room, {{childName}} smiled. Was it a dream... or real magic?`,
  ];

  const illustrationPrompts: string[] = [
    'A personalized young girl standing in front of a cozy colorful house in a charming little town, flowers blooming, warm afternoon light, storybook opening scene',
    'A personalized young girl sitting by a window at night gazing at a starry sky with a crescent moon, dreamy expression, soft moonlight illuminating her face',
    'A personalized young girl in pajamas discovering a glowing magical letter under a fluffy pillow, soft morning light streaming through curtains, sparkles around the letter',
    'Close-up of a glowing parchment letter with magical swirling text, golden light emanating from the paper, sparkles and fairy dust surrounding it',
    'A magical glowing door appearing in a bedroom wall, radiating rainbow-colored sparkles and soft light, a personalized young girl reaching toward it in wonder',
    'A personalized young girl stepping into a breathtaking magical land with double rainbows arching across a pastel sky, floating islands, crystal flowers, and glowing butterflies everywhere',
    'A majestic white unicorn with a rainbow-colored flowing mane standing gracefully before a personalized young girl, in a magical meadow with sparkling flowers',
    "Close-up of a beautiful unicorn's face with a magnificent rainbow-colored mane that sparkles and shimmers, gentle eyes, golden horn glowing softly",
    'A personalized young girl riding on a beautiful white unicorn flying through a pastel sky filled with clouds, rainbows, and sparkling stars below them',
    'A unicorn with a sad expression talking to a personalized young girl, the magical landscape behind them showing fading colors and dimming sparkles',
    'A personalized young girl with a determined and cheerful expression, raising her fist bravely, sparkles forming around her, the unicorn smiling beside her',
    'A personalized young girl and a unicorn flying toward a magnificent crystal cave with glowing purple and blue crystals, a golden star visible deep inside',
    'A personalized young girl holding up a radiant golden star inside a cave of sparkling crystals, light beams radiating from the star in all directions',
    'A personalized young girl and unicorn arriving at a beautiful meadow filled with rainbow-colored flowers stretching to the horizon under a pastel sky',
    'Vibrant flowers blooming open as a personalized young girl and unicorn walk through, colorful butterflies swirling and dancing around them in a joyful scene',
    'A personalized young girl discovering a shimmering rainbow-colored feather nestled among magical flowers, reaching down gently to pick it up, sparkles rising',
    'A personalized young girl and unicorn approaching a mystical bridge made of light and crystal, spanning across a misty chasm, soft whispers visualized as gentle swirls',
    'A personalized young girl on a magical bridge with gentle glowing spirits and wisps floating around her, encouraging her forward with warm light',
    'A personalized young girl carefully walking step by step across a shimmering bridge, determination on her face, the unicorn waiting on the other side',
    'A personalized young girl and unicorn at the bank of a sparkling glittering river that flows with silver and diamond-like particles, a silver heart visible beneath the surface',
    'A personalized young girl reaching into a sparkling river and lifting out a glowing silver heart, water droplets catching light like diamonds, joyful expression',
    'A personalized young girl and unicorn approaching a magnificent ancient tree that towers above the landscape, its branches spreading wide, three treasures glowing in the girl\'s hands',
    'A personalized young girl gently placing three glowing treasures — a golden star, rainbow feather, and silver heart — at the roots of a great magical tree',
    'A magnificent tree erupting with brilliant golden and rainbow light from its trunk and branches, illuminating the entire magical landscape',
    'A spectacular magical explosion of color and light spreading across the entire land, flowers blooming instantly, rainbows appearing, sparkles filling the sky, a personalized young girl and unicorn at the center',
    'Magical creatures, fairies, and woodland animals cheering and celebrating around a personalized young girl and unicorn, confetti and sparkles falling from the sky, jubilant scene',
    'A unicorn gently nuzzling a personalized young girl, their foreheads touching, a soft glow surrounding them both, tender and heartwarming moment under a rainbow',
    'A personalized young girl back in her cozy bedroom, tucked into bed with a gentle smile, moonlight through the window, a faint rainbow sparkle on her pillow hinting at real magic',
  ];

  return pageTexts.map((text, i) => ({
    pageNumber: i + 1,
    textEnglish: text,
    illustrationPrompt: illustrationPrompts[i],
    styleTokens: unicornStyle,
    isCoverPage: i === 0,
    isPreviewPage: i < 5,
  }));
}

// ─── Story 3: Beach Adventure ──────────────────────────────────────────────

function buildBeachAdventurePages(): PageData[] {
  const beachStyle = {
    style: 'cartoon-warm',
    medium: 'digital illustration',
    palette: 'warm sandy tones, ocean blues, sunny yellows',
    lighting: 'bright sunny day with warm golden light',
  };

  // Exact story lines transcribed from the client's final "Edited" beach pages
  // (30 pages). The art is TEXT-FREE; the name is rendered by our text-layer
  // renderer (see story-text.ts), so {{childName}} is replaced perfectly.
  // NOTE: pages 26/27 and 28/30 repeat their line in the client's source set —
  // left as-is pending client confirmation.
  const pageTexts: string[] = [
    'Today is a sunny day. {{childName}} is going to the beach!',
    '{{childName}} wears a big sun hat and brings a little beach bag.',
    '{{childName}} walks on the warm sand.',
    "Squish squish! The sand feels funny on {{childName}}'s feet.",
    'Whoosh! The waves roll onto the shore.',
    '{{childName}} watches the big blue ocean.',
    'Look! A little crab walks sideways.',
    'Tap tap tap! The crab hides in the sand.',
    '{{childName}} finds a shiny seashell.',
    'Another shell! {{childName}} starts a shell collection.',
    'Splash splash! {{childName}} runs to the water.',
    "The cool water tickles {{childName}}'s toes.",
    'Tiny fish swim near the shore.',
    '{{childName}} waves hello to the little fish.',
    'A seagull flies above the beach.',
    'Caw caw! The seagull sings loudly.',
    '{{childName}} builds a big sandcastle.',
    'A tall tower goes on top!',
    'Oh no! A wave splashes the castle.',
    '{{childName}} laughs and builds again.',
    'Look! A colorful kite in the sky.',
    'The kite dances in the wind.',
    '{{childName}} eats a yummy snack.',
    '{{childName}} drinks cool juice and rests.',
    'The sun starts going down.',
    'The sky turns pink and orange.',
    'The sky turns pink and orange.',
    '{{childName}} waves goodbye to the ocean.',
    'What a fun beach day!',
    '{{childName}} waves goodbye to the ocean.',
  ];

  return pageTexts.map((text, i) => {
    // illustrationPrompt is unused by the chosen face-swap path (the template art
    // is fixed) but kept non-empty as a sensible fallback for prompt-based
    // providers, derived from the page's own line.
    const scene = text.replace(/\{\{childName\}\}/g, 'the child').trim();
    return {
      pageNumber: i + 1,
      textEnglish: text,
      illustrationPrompt: `A warm, sunny beach storybook illustration featuring a personalized child. Scene: ${scene}`,
      styleTokens: beachStyle,
      isCoverPage: i === 0,
      isPreviewPage: i < 5,
    };
  });
}

// ─── All Stories ────────────────────────────────────────────────────────────

const stories: StoryData[] = [
  {
    slug: 'abc-adventure',
    title: "{{childName}}'s ABC Adventure",
    description:
      'An interactive alphabet adventure where your child explores 26 letters with hidden seek-and-find elements on every page.',
    theme: StoryTheme.LEARNING,
    ageMin: 2,
    ageMax: 6,
    artStyle: 'cartoon-vibrant',
    basePriceInr: 79900,
    premiumPriceInr: 139900,
    giftPriceInr: 139900,
    pageCount: 28,
    pages: buildAbcAdventurePages(),
  },
  {
    slug: 'magical-unicorn',
    title: '{{childName}} and the Magical Unicorn Adventure',
    description:
      'A magical journey where your child befriends a unicorn named Luna and embarks on a quest to restore magic to an enchanted land.',
    theme: StoryTheme.IMAGINATION,
    ageMin: 3,
    ageMax: 8,
    artStyle: 'watercolor-fantasy',
    basePriceInr: 79900,
    premiumPriceInr: 139900,
    giftPriceInr: 139900,
    pageCount: 28,
    pages: buildMagicalUnicornPages(),
  },
  {
    slug: 'beach-adventure',
    title: '{{childName}} Goes to the Beach',
    description:
      'A sunny beach day adventure where your child discovers seashells, builds sandcastles, splashes in the waves, and enjoys a perfect day by the ocean.',
    theme: StoryTheme.ADVENTURE,
    ageMin: 2,
    ageMax: 5,
    artStyle: 'cartoon-warm',
    basePriceInr: 79900,
    premiumPriceInr: 139900,
    giftPriceInr: 139900,
    pageCount: 30,
    pages: buildBeachAdventurePages(),
  },
];

// ─── Main Seed Function ────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding story templates...\n');

  for (const story of stories) {
    console.log(`  Seeding "${story.title}" (${story.slug})...`);

    // Upsert the story template
    const template = await prisma.storyTemplate.upsert({
      where: { slug: story.slug },
      update: {
        title: story.title,
        description: story.description,
        theme: story.theme,
        ageMin: story.ageMin,
        ageMax: story.ageMax,
        artStyle: story.artStyle,
        basePriceInr: story.basePriceInr,
        premiumPriceInr: story.premiumPriceInr,
        giftPriceInr: story.giftPriceInr,
        pageCount: story.pageCount,
        isActive: true,
        isFeatured: true,
      },
      create: {
        slug: story.slug,
        title: story.title,
        description: story.description,
        theme: story.theme,
        ageMin: story.ageMin,
        ageMax: story.ageMax,
        artStyle: story.artStyle,
        basePriceInr: story.basePriceInr,
        premiumPriceInr: story.premiumPriceInr,
        giftPriceInr: story.giftPriceInr,
        pageCount: story.pageCount,
        isActive: true,
        isFeatured: true,
      },
    });

    // Delete existing pages for idempotent seeding
    await prisma.storyPageTemplate.deleteMany({
      where: { storyTemplateId: template.id },
    });

    // Create all pages
    await prisma.storyPageTemplate.createMany({
      data: story.pages.map((page) => ({
        storyTemplateId: template.id,
        pageNumber: page.pageNumber,
        textEnglish: page.textEnglish,
        illustrationPrompt: page.illustrationPrompt,
        negativePrompt: NEGATIVE_PROMPT,
        styleTokens: page.styleTokens,
        isCoverPage: page.isCoverPage,
        isPreviewPage: page.isPreviewPage,
      })),
    });

    console.log(`    ✅ ${story.pages.length} pages created`);
  }

  // ─── Seed Admin User ───────────────────────────────────────────────────────
  console.log('\n  Seeding admin user...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@kuttystory.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'KuttyStory@Admin2026!';

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(adminPassword, salt, 100000, 64, 'sha512').toString('hex');
  const passwordHash = `${salt}:${hash}`;

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: 'SUPER_ADMIN',
      passwordHash,
      name: 'Admin',
    },
    create: {
      email: adminEmail,
      name: 'Admin',
      role: 'SUPER_ADMIN',
      passwordHash,
      emailVerified: new Date(),
    },
  });

  console.log(`    ✅ Admin user created: ${adminEmail}`);
  console.log(`    ⚠️  CHANGE THE PASSWORD after first login!`);

  console.log('\n🎉 Seeding complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
