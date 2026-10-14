export type BackgroundCategory = 'colors' | 'gradients' | 'nature' | 'kids';

export interface BackgroundItem {
  id: string;
  category: BackgroundCategory;
  nameKey: string;
  defaultName: string;
  type: 'color' | 'gradient' | 'image';
  value: string; // Hex, linear-gradient(...), or image URL
  previewStyle: string; // CSS style for preview
}

export const PRESENTATION_BACKGROUNDS: BackgroundItem[] = [
  // 1. Solid Colors & Subtle Textures (5)
  {
    id: 'color_navy',
    category: 'colors',
    nameKey: 'backgrounds.colorNavy',
    defaultName: 'Klassisch Marineblau',
    type: 'color',
    value: '#0f172a',
    previewStyle: 'background-color: #0f172a;',
  },
  {
    id: 'color_black',
    category: 'colors',
    nameKey: 'backgrounds.colorBlack',
    defaultName: 'Obsidian Schwarz',
    type: 'color',
    value: '#000000',
    previewStyle: 'background-color: #000000;',
  },
  {
    id: 'color_burgundy',
    category: 'colors',
    nameKey: 'backgrounds.colorBurgundy',
    defaultName: 'Samt Bordeaux',
    type: 'color',
    value: '#1a050d',
    previewStyle: 'background-color: #1a050d;',
  },
  {
    id: 'color_forest',
    category: 'colors',
    nameKey: 'backgrounds.colorForest',
    defaultName: 'Tiefe Waldtöne',
    type: 'color',
    value: '#04150f',
    previewStyle: 'background-color: #04150f;',
  },
  {
    id: 'color_slate',
    category: 'colors',
    nameKey: 'backgrounds.colorSlate',
    defaultName: 'Mitternachtsschiefer',
    type: 'color',
    value: '#18181b',
    previewStyle: 'background-color: #18181b;',
  },

  // 2. Modern Worship Gradients (5)
  {
    id: 'grad_aurora',
    category: 'gradients',
    nameKey: 'backgrounds.gradAurora',
    defaultName: 'Nordlicht Cyan',
    type: 'gradient',
    value: 'linear-gradient(135deg, #022c43 0%, #054569 50%, #09203f 100%)',
    previewStyle: 'background: linear-gradient(135deg, #022c43 0%, #054569 50%, #09203f 100%);',
  },
  {
    id: 'grad_purple',
    category: 'gradients',
    nameKey: 'backgrounds.gradPurple',
    defaultName: 'Gnaden-Violett',
    type: 'gradient',
    value: 'linear-gradient(135deg, #180b2b 0%, #2e1065 55%, #0f172a 100%)',
    previewStyle: 'background: linear-gradient(135deg, #180b2b 0%, #2e1065 55%, #0f172a 100%);',
  },
  {
    id: 'grad_sunset',
    category: 'gradients',
    nameKey: 'backgrounds.gradSunset',
    defaultName: 'Abendrot Anbetung',
    type: 'gradient',
    value: 'linear-gradient(135deg, #2a0808 0%, #451a03 50%, #170d1a 100%)',
    previewStyle: 'background: linear-gradient(135deg, #2a0808 0%, #451a03 50%, #170d1a 100%);',
  },
  {
    id: 'grad_celestial',
    category: 'gradients',
    nameKey: 'backgrounds.gradCelestial',
    defaultName: 'Kosmische Nacht',
    type: 'gradient',
    value: 'linear-gradient(135deg, #030712 0%, #1e1b4b 60%, #311042 100%)',
    previewStyle: 'background: linear-gradient(135deg, #030712 0%, #1e1b4b 60%, #311042 100%);',
  },
  {
    id: 'grad_emerald',
    category: 'gradients',
    nameKey: 'backgrounds.gradEmerald',
    defaultName: 'Smaragd Herrlichkeit',
    type: 'gradient',
    value: 'linear-gradient(135deg, #022018 0%, #064e3b 50%, #022c22 100%)',
    previewStyle: 'background: linear-gradient(135deg, #022018 0%, #064e3b 50%, #022c22 100%);',
  },

  // 3. Photorealistic Nature Photos (5)
  {
    id: 'nature_mountains',
    category: 'nature',
    nameKey: 'backgrounds.natureMountains',
    defaultName: 'Majestätische Berge',
    type: 'image',
    value: '/backgrounds/nature_mountains.jpg',
    previewStyle: 'background-image: url("/backgrounds/nature_mountains.jpg"); background-size: cover; background-position: center;',
  },
  {
    id: 'nature_stars',
    category: 'nature',
    nameKey: 'backgrounds.natureStars',
    defaultName: 'Sternenhimmel Galaxie',
    type: 'image',
    value: '/backgrounds/nature_stars.jpg',
    previewStyle: 'background-image: url("/backgrounds/nature_stars.jpg"); background-size: cover; background-position: center;',
  },
  {
    id: 'nature_ocean',
    category: 'nature',
    nameKey: 'backgrounds.natureOcean',
    defaultName: 'Ruhiger Ozean',
    type: 'image',
    value: '/backgrounds/nature_ocean.jpg',
    previewStyle: 'background-image: url("/backgrounds/nature_ocean.jpg"); background-size: cover; background-position: center;',
  },
  {
    id: 'nature_forest',
    category: 'nature',
    nameKey: 'backgrounds.natureForest',
    defaultName: 'Nebeliger Nadelwald',
    type: 'image',
    value: '/backgrounds/nature_forest.jpg',
    previewStyle: 'background-image: url("/backgrounds/nature_forest.jpg"); background-size: cover; background-position: center;',
  },
  {
    id: 'nature_sunrise',
    category: 'nature',
    nameKey: 'backgrounds.natureSunrise',
    defaultName: 'Goldene Morgendämmerung',
    type: 'image',
    value: '/backgrounds/nature_sunrise.jpg',
    previewStyle: 'background-image: url("/backgrounds/nature_sunrise.jpg"); background-size: cover; background-position: center;',
  },

  // 4. Kids & Family Backgrounds (5)
  {
    id: 'kids_rainbow_ark',
    category: 'kids',
    nameKey: 'backgrounds.kidsRainbowArk',
    defaultName: 'Arche Noah Regenbogen',
    type: 'image',
    value: '/backgrounds/kids_rainbow_ark.jpg',
    previewStyle: 'background-image: url("/backgrounds/kids_rainbow_ark.jpg"); background-size: cover; background-position: center;',
  },
  {
    id: 'kids_twinkle_stars',
    category: 'kids',
    nameKey: 'backgrounds.kidsTwinkleStars',
    defaultName: 'Kleine Sterne & Mondsichel',
    type: 'image',
    value: '/backgrounds/kids_twinkle_stars.jpg',
    previewStyle: 'background-image: url("/backgrounds/kids_twinkle_stars.jpg"); background-size: cover; background-position: center;',
  },
  {
    id: 'kids_sunbeam_meadow',
    category: 'kids',
    nameKey: 'backgrounds.kidsSunbeamMeadow',
    defaultName: 'Sonnenschein Blumenwiese',
    type: 'image',
    value: '/backgrounds/kids_sunbeam_meadow.jpg',
    previewStyle: 'background-image: url("/backgrounds/kids_sunbeam_meadow.jpg"); background-size: cover; background-position: center;',
  },
  {
    id: 'kids_pastel_clouds',
    category: 'kids',
    nameKey: 'backgrounds.kidsPastelClouds',
    defaultName: 'Bunte Pastellwolken',
    type: 'image',
    value: '/backgrounds/kids_pastel_clouds.jpg',
    previewStyle: 'background-image: url("/backgrounds/kids_pastel_clouds.jpg"); background-size: cover; background-position: center;',
  },
  {
    id: 'kids_cozy_campfire',
    category: 'kids',
    nameKey: 'backgrounds.kidsCozyCampfire',
    defaultName: 'Abenteuer Lagerfeuer',
    type: 'image',
    value: '/backgrounds/kids_cozy_campfire.jpg',
    previewStyle: 'background-image: url("/backgrounds/kids_cozy_campfire.jpg"); background-size: cover; background-position: center;',
  },
];
