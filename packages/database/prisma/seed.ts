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

  const letterPages: Array<{ letter: string; word: string; location: string; item: string }> = [
    { letter: 'A', word: 'Apple', location: 'in the garden', item: 'APPLE' },
    { letter: 'B', word: 'Ball', location: 'in the park', item: 'BLUE BALL' },
    { letter: 'C', word: 'Cat', location: 'at home', item: 'SLEEPY CAT' },
    { letter: 'D', word: 'Dog', location: 'outside', item: 'DOG' },
    { letter: 'E', word: 'Elephant', location: 'in the zoo', item: 'ELEPHANT' },
    { letter: 'F', word: 'Fish', location: 'near water', item: 'ORANGE FISH' },
    { letter: 'G', word: 'Goat', location: 'on a farm', item: 'GOAT' },
    { letter: 'H', word: 'Hat', location: 'playing dress-up', item: 'HAT' },
    { letter: 'I', word: 'Ice cream', location: 'at the shop', item: 'ICE CREAM' },
    { letter: 'J', word: 'Jellyfish', location: 'at the aquarium', item: 'JELLYFISH' },
    { letter: 'K', word: 'Kite', location: 'at the beach', item: 'KITE' },
    { letter: 'L', word: 'Lion', location: 'at the forest', item: 'LION' },
    { letter: 'M', word: 'Moon', location: 'looking at the sky', item: 'MOON' },
    { letter: 'N', word: 'Nest', location: 'in the garden', item: 'BIRD NEST' },
    { letter: 'O', word: 'Owl', location: 'in the woods', item: 'OWL' },
    { letter: 'P', word: 'Parrot', location: 'sees colorful birds', item: 'PARROT' },
    { letter: 'Q', word: 'Queen', location: 'at a castle', item: 'QUEEN' },
    { letter: 'R', word: 'Rainbow', location: 'looks up high', item: 'RAINBOW' },
    { letter: 'S', word: 'Sun', location: 'outside playing', item: 'SUN' },
    { letter: 'T', word: 'Tree', location: 'in the forest', item: 'TALL TREE' },
    { letter: 'U', word: 'Umbrella', location: 'in the rain', item: 'UMBRELLA' },
    { letter: 'V', word: 'Violin', location: 'hears music', item: 'VIOLIN' },
    { letter: 'W', word: 'Whale', location: 'at the ocean', item: 'WHALE' },
    { letter: 'X', word: 'Xylophone', location: 'playing music', item: 'XYLOPHONE' },
    { letter: 'Y', word: 'Yak', location: 'in the mountains', item: 'FLUFFY YAK' },
    { letter: 'Z', word: 'Zebra', location: 'in the grassland', item: 'STRIPED ZEBRA' },
  ];

  const pages: PageData[] = [
    {
      pageNumber: 1,
      textEnglish: "Welcome to {{childName}}'s ABC Adventure!",
      illustrationPrompt:
        'A personalized child standing in a colorful wonderland with giant floating alphabet letters A through Z surrounding them, confetti and sparkles in the air, a big friendly title banner overhead, lush green landscape in the background',
      styleTokens: abcStyle,
      isCoverPage: true,
      isPreviewPage: true,
    },
    {
      pageNumber: 2,
      textEnglish:
        'Look carefully at every page — {{childName}} needs your help to find hidden things!',
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
    const locationDesc = lp.location.startsWith('sees') || lp.location.startsWith('looks') || lp.location.startsWith('hears') || lp.location.startsWith('playing')
      ? lp.location
      : lp.location;

    const textEnglish = `${lp.letter} is for ${lp.word}. {{childName}} is ${lp.location}. Can you find the ${lp.item}?`;

    pages.push({
      pageNumber,
      textEnglish,
      illustrationPrompt: `A personalized child ${locationDesc}, with a large friendly ${lp.word.toLowerCase()} prominently featured in the scene, the letter "${lp.letter}" displayed decoratively, vibrant and engaging seek-and-find composition with hidden details for children to discover`,
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

  const pageTexts: string[] = [
    'In a colorful little town, there lived a sweet girl named {{childName}}.',
    "Every night, {{childName}} looked at the sky and whispered, 'Maybe one day, I will meet a unicorn!'",
    'One morning, {{childName}} found a glowing letter under her pillow.',
    "It said: 'Dear {{childName}}, come find me in the land of magic!'",
    'The door glowed softly with sparkling colors.',
    '{{childName}} stepped through and saw a magical land full of rainbows.',
    "A beautiful unicorn stood before her. 'I'm Luna!' she said.",
    "Luna's mane sparkled with every color of the rainbow.",
    '{{childName}} climbed onto Luna\'s back and they began to fly.',
    "'The magic in our land is fading,' Luna said sadly. 'Only a kind and brave girl can bring it back.'",
    "'I'll help you!' said {{childName}} with a big smile.",
    'First, they flew to the Crystal Cave to find the Golden Star.',
    '{{childName}} found the star glowing inside a crystal.',
    'Next, they went to the Rainbow Meadow.',
    'Bright flowers opened as they passed by. Even the butterflies danced around them.',
    'They found the Rainbow Feather hidden among the flowers.',
    'Then they crossed the Whispering Bridge.',
    '{{childName}} heard soft voices cheering her on.',
    'She was brave and crossed it step by step.',
    'Next, they went to the Glitter River to find the Silver Heart.',
    '{{childName}} reached into the sparkling water and pulled it out.',
    'They brought all three treasures to the Magic Tree.',
    '{{childName}} placed them gently at its roots.',
    'The tree glowed brightly!',
    'Suddenly... WHOOSH! Magic filled the land again!',
    "Everyone cheered. 'Thank you, {{childName}}! You saved our world!'",
    "Luna whispered, 'You are the bravest girl I know. I'll always be your friend.'",
    'Back in her room, {{childName}} smiled. Was it a dream... or real magic?',
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

  const pageTexts: string[] = [
    'Today is a sunny day. {{childName}} is going to the beach!',
    '{{childName}} wears a big sun hat and brings a little beach bag.',
    'They walk to the beach together.',
    "{{childName}} sees the big blue ocean. 'Wow!' says {{childName}}.",
    'Whoosh! The waves roll onto the shore.',
    '{{childName}} feels the warm sand under their feet.',
    '{{childName}} picks up a pretty seashell.',
    'There are so many shells on the beach!',
    '{{childName}} digs in the sand with a little shovel.',
    'Splash splash! {{childName}} runs to the water.',
    "The water tickles {{childName}}'s toes.",
    '{{childName}} jumps over a small wave. Wheee!',
    'A friendly crab says hello.',
    '{{childName}} sees a colorful starfish.',
    '{{childName}} builds a big sandcastle.',
    'The sandcastle has a flag on top!',
    "A seagull flies above {{childName}}'s head.",
    '{{childName}} eats a yummy ice cream cone.',
    "It's coconut flavor — {{childName}}'s favorite!",
    'The kite dances in the wind.',
    '{{childName}} watches the boats on the sea.',
    'The sun starts to set. The sky turns orange and pink.',
    '{{childName}} takes one more walk along the shore.',
    '{{childName}} finds a special seashell to keep.',
    '{{childName}} waves goodbye to the ocean.',
    'Back in the car, {{childName}} holds the seashell tight.',
    'What a fun beach day!',
    '{{childName}} waves goodbye to the ocean.',
  ];

  const illustrationPrompts: string[] = [
    'A personalized child excitedly getting ready for a beach trip on a bright sunny day, blue sky with fluffy clouds, beach visible in the distance, joyful expression',
    'A personalized child wearing an oversized cute sun hat and carrying a small colorful beach bag, standing at the doorstep ready to go, cheerful and eager',
    'A personalized child walking along a sandy path toward the beach with a parent, palm trees lining the way, ocean sparkling in the distance',
    'A personalized child standing at the edge of the beach seeing the vast blue ocean for the first time, eyes wide with wonder, waves gently lapping the shore',
    'Dynamic ocean waves rolling onto a sandy beach shore, white foam patterns on golden sand, a personalized child watching excitedly from nearby',
    'A personalized child standing barefoot on warm golden sand, wiggling toes, feeling the texture, sunny beach scene with gentle waves in the background',
    'A personalized child bending down to pick up a beautiful spiral seashell from the sand, close-up view, gentle waves nearby, warm sunlight',
    'A beach scene with many colorful and varied seashells scattered across the sand, a personalized child looking at them with delight, gentle waves in the background',
    'A personalized child enthusiastically digging in the sand with a bright little shovel and bucket, sand flying playfully, beach scene with ocean behind',
    'A personalized child running toward the ocean water with arms spread wide, water splashing around their feet, joyful expression, bright sunny beach',
    'Close-up of a personalized child\'s feet in shallow ocean water, gentle waves washing over their toes, clear turquoise water, sandy bottom visible',
    'A personalized child mid-jump leaping over a small ocean wave, hair flying, huge smile, sparkling water droplets in the air, dynamic and fun composition',
    'A personalized child crouching down on the sand looking at a small friendly cartoon crab with big eyes, beach setting, both appearing to greet each other',
    'A personalized child pointing excitedly at a bright colorful starfish in a shallow tide pool, vivid orange and purple starfish, crystal clear water',
    'A personalized child building an impressive sandcastle on the beach, using hands and tools, the castle taking shape with towers and walls, ocean in background',
    'A beautiful completed sandcastle with towers, a moat, and a small flag on the very top, a personalized child proudly admiring their creation, sunny beach',
    'A seagull flying gracefully overhead with wings spread wide, a personalized child looking up and pointing at it, blue sky with scattered clouds, beach setting',
    'A personalized child sitting on a beach towel happily eating a colorful ice cream cone, beach umbrella providing shade, ocean visible in the background',
    'Close-up of a personalized child joyfully licking a coconut-flavored ice cream cone, eyes closed in delight, tropical beach setting with palm trees',
    'A colorful kite with a long tail dancing and swooping in the ocean breeze against a bright blue sky, a personalized child watching from the beach below',
    'A personalized child standing at the shore watching sailboats and small boats on the sparkling ocean, peaceful scene, afternoon light reflecting on water',
    'A stunning beach sunset with the sky turning brilliant shades of orange, pink, and purple, a personalized child silhouetted watching the sun dip toward the horizon',
    'A personalized child taking a peaceful walk along the shoreline during golden hour, gentle waves washing over footprints in the sand, warm glowing light',
    'A personalized child discovering a unique and beautiful special seashell on the beach, holding it up to examine it, golden sunset light, sparkle effect on the shell',
    'A personalized child standing at the water\'s edge waving goodbye to the ocean, sunset colors in the sky, gentle waves, bittersweet but happy expression',
    'A personalized child sitting in the back seat of a car holding a seashell close to their chest, looking content and slightly sleepy, warm evening light through the window',
    'A collage-style illustration of all the fun beach moments — sandcastle, seashells, waves, ice cream, kite — surrounding a happy personalized child, warm sunny theme',
    'A personalized child waving goodbye with the ocean and beach in the background, sun low on the horizon, a trail of footprints in the sand, warm farewell scene',
  ];

  return pageTexts.map((text, i) => ({
    pageNumber: i + 1,
    textEnglish: text,
    illustrationPrompt: illustrationPrompts[i],
    styleTokens: beachStyle,
    isCoverPage: i === 0,
    isPreviewPage: i < 5,
  }));
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
    basePriceInr: 89900,
    premiumPriceInr: 129900,
    giftPriceInr: 129900,
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
    basePriceInr: 89900,
    premiumPriceInr: 129900,
    giftPriceInr: 129900,
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
    basePriceInr: 89900,
    premiumPriceInr: 129900,
    giftPriceInr: 129900,
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
