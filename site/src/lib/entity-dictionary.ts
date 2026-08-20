/**
 * Curated dictionary of schema.org `DefinedTerm` entities detectable in workflow
 * page copy, for `buildEntityMentionsJsonLd` (see structured-data.ts). Matching is
 * a simple case-insensitive phrase scan — good enough to surface genuine topical
 * coverage without requiring per-template curation. Extend this list as new
 * concepts show up in template copy; it is intentionally a starter set, not
 * exhaustive.
 */

export type EntityCategory =
  | 'Core'
  | 'Technology'
  | 'Business & Production'
  | 'Software & Development'
  | 'Audio & Video'
  | 'Marketing & Commerce';

export interface EntityDef {
  name: string;
  sameAs: string;
  category: EntityCategory;
  /** Case-insensitive phrases; matched as whole-word/phrase substrings. */
  match: string[];
}

export const ENTITY_DICTIONARY: EntityDef[] = [
  // Core — topic-level entities, emitted under `about` rather than a DefinedTermSet.
  {
    name: 'Video',
    sameAs: 'https://en.wikipedia.org/wiki/Video',
    category: 'Core',
    match: ['video'],
  },
  {
    name: 'Image',
    sameAs: 'https://en.wikipedia.org/wiki/Image',
    category: 'Core',
    match: ['image'],
  },
  {
    name: 'Sound',
    sameAs: 'https://en.wikipedia.org/wiki/Sound',
    category: 'Core',
    match: ['audio', 'sound'],
  },
  {
    name: 'Reference',
    sameAs: 'https://en.wikipedia.org/wiki/Reference',
    category: 'Core',
    match: ['reference'],
  },
  {
    name: 'Motion',
    sameAs: 'https://en.wikipedia.org/wiki/Motion_(physics)',
    category: 'Core',
    match: ['motion'],
  },
  {
    name: '3D Modeling',
    sameAs: 'https://en.wikipedia.org/wiki/3D_modeling',
    category: 'Core',
    match: ['3d model', '3d asset'],
  },

  // Technology
  {
    name: 'API',
    sameAs: 'https://en.wikipedia.org/wiki/API',
    category: 'Technology',
    match: ['api'],
  },
  {
    name: 'Open-source software',
    sameAs: 'https://en.wikipedia.org/wiki/Open-source_software',
    category: 'Technology',
    match: ['open source', 'open-source'],
  },
  {
    name: 'Codec',
    sameAs: 'https://en.wikipedia.org/wiki/Codec',
    category: 'Technology',
    match: ['codec'],
  },
  {
    name: 'Accessibility',
    sameAs: 'https://en.wikipedia.org/wiki/Accessibility',
    category: 'Technology',
    match: ['accessib'],
  },
  {
    name: 'High Dynamic Range',
    sameAs: 'https://en.wikipedia.org/wiki/High_dynamic_range',
    category: 'Technology',
    match: ['hdr', 'high dynamic range'],
  },
  {
    name: 'Motion Interpolation',
    sameAs: 'https://en.wikipedia.org/wiki/Motion_interpolation',
    category: 'Technology',
    match: ['motion interpolation'],
  },
  {
    name: 'Image File Format',
    sameAs: 'https://en.wikipedia.org/wiki/Image_file_format',
    category: 'Technology',
    match: ['image format', 'file format'],
  },
  {
    name: 'Display Resolution',
    sameAs: 'https://en.wikipedia.org/wiki/Display_resolution',
    category: 'Technology',
    match: ['resolution'],
  },
  {
    name: 'Display Aspect Ratio',
    sameAs: 'https://en.wikipedia.org/wiki/Display_aspect_ratio',
    category: 'Technology',
    match: ['aspect ratio'],
  },
  {
    name: 'Image Stabilization',
    sameAs: 'https://en.wikipedia.org/wiki/Image_stabilization',
    category: 'Technology',
    match: ['stabiliz'],
  },
  {
    name: 'Frame Rate',
    sameAs: 'https://en.wikipedia.org/wiki/Frame_rate',
    category: 'Technology',
    match: ['frame rate', 'fps'],
  },
  {
    name: '4K Resolution',
    sameAs: 'https://en.wikipedia.org/wiki/4K_resolution',
    category: 'Technology',
    match: ['4k'],
  },

  // Business & Production
  {
    name: 'Footage',
    sameAs: 'https://en.wikipedia.org/wiki/Footage',
    category: 'Business & Production',
    match: ['footage'],
  },
  {
    name: 'Camera',
    sameAs: 'https://en.wikipedia.org/wiki/Camera',
    category: 'Business & Production',
    match: ['camera'],
  },
  {
    name: 'Rendering (Computer Graphics)',
    sameAs: 'https://en.wikipedia.org/wiki/Rendering_(computer_graphics)',
    category: 'Business & Production',
    match: ['render'],
  },
  {
    name: 'Quality (Business)',
    sameAs: 'https://en.wikipedia.org/wiki/Quality_(business)',
    category: 'Business & Production',
    match: ['quality'],
  },
  {
    name: 'Business Process',
    sameAs: 'https://en.wikipedia.org/wiki/Business_process',
    category: 'Business & Production',
    match: ['business process'],
  },

  // Software & Development
  {
    name: 'Prompt Engineering',
    sameAs: 'https://en.wikipedia.org/wiki/Prompt_engineering',
    category: 'Software & Development',
    match: ['prompt'],
  },
  {
    name: 'Library (Computing)',
    sameAs: 'https://en.wikipedia.org/wiki/Library_(computing)',
    category: 'Software & Development',
    match: ['node library'],
  },
  {
    name: 'Computer Hardware',
    sameAs: 'https://en.wikipedia.org/wiki/Computer_hardware',
    category: 'Software & Development',
    match: ['hardware'],
  },
  {
    name: 'Graphics Processing Unit',
    sameAs: 'https://en.wikipedia.org/wiki/Graphics_processing_unit',
    category: 'Software & Development',
    match: ['gpu'],
  },
  {
    name: 'Load (Computing)',
    sameAs: 'https://en.wikipedia.org/wiki/Load_(computing)',
    category: 'Software & Development',
    match: ['vram'],
  },

  // Audio & Video
  {
    name: 'Pixel',
    sameAs: 'https://en.wikipedia.org/wiki/Pixel',
    category: 'Audio & Video',
    match: ['pixel'],
  },
  {
    name: 'Subtitles',
    sameAs: 'https://en.wikipedia.org/wiki/Subtitles',
    category: 'Audio & Video',
    match: ['subtitle'],
  },
  {
    name: '1080p',
    sameAs: 'https://en.wikipedia.org/wiki/1080p',
    category: 'Audio & Video',
    match: ['1080p'],
  },
  {
    name: 'Motion Blur',
    sameAs: 'https://en.wikipedia.org/wiki/Motion_blur',
    category: 'Audio & Video',
    match: ['motion blur'],
  },
  {
    name: 'MPEG-4',
    sameAs: 'https://en.wikipedia.org/wiki/MPEG-4',
    category: 'Audio & Video',
    match: ['mp4', 'mpeg-4', 'mpeg4'],
  },
  {
    name: 'Video Editing',
    sameAs: 'https://en.wikipedia.org/wiki/Video_editing',
    category: 'Audio & Video',
    match: ['video editing'],
  },
  {
    name: 'Sound Effect',
    sameAs: 'https://en.wikipedia.org/wiki/Sound_effect',
    category: 'Audio & Video',
    match: ['sound effect'],
  },
  {
    name: 'Cinematic Techniques',
    sameAs: 'https://en.wikipedia.org/wiki/Cinematic_techniques',
    category: 'Audio & Video',
    match: ['cinematic'],
  },
  {
    name: 'Microphone',
    sameAs: 'https://en.wikipedia.org/wiki/Microphone',
    category: 'Audio & Video',
    match: ['microphone'],
  },

  // Marketing & Commerce
  {
    name: 'Brand',
    sameAs: 'https://en.wikipedia.org/wiki/Brand',
    category: 'Marketing & Commerce',
    match: ['brand'],
  },
  {
    name: 'Personalization',
    sameAs: 'https://en.wikipedia.org/wiki/Personalization',
    category: 'Marketing & Commerce',
    match: ['personaliz'],
  },
  {
    name: 'Product Demonstration',
    sameAs: 'https://en.wikipedia.org/wiki/Product_demonstration',
    category: 'Marketing & Commerce',
    match: ['product demo'],
  },
  {
    name: 'Digital Marketing',
    sameAs: 'https://en.wikipedia.org/wiki/Digital_marketing',
    category: 'Marketing & Commerce',
    match: ['digital marketing'],
  },
  {
    name: 'Target Market',
    sameAs: 'https://en.wikipedia.org/wiki/Target_market',
    category: 'Marketing & Commerce',
    match: ['target market', 'target audience'],
  },
  {
    name: 'Distribution (Marketing)',
    sameAs: 'https://en.wikipedia.org/wiki/Distribution_(marketing)',
    category: 'Marketing & Commerce',
    match: ['distribution'],
  },
  {
    name: 'E-commerce',
    sameAs: 'https://en.wikipedia.org/wiki/E-commerce',
    category: 'Marketing & Commerce',
    match: ['e-commerce', 'ecommerce'],
  },
  {
    name: 'Advertising',
    sameAs: 'https://en.wikipedia.org/wiki/Advertising',
    category: 'Marketing & Commerce',
    match: ['advertis'],
  },
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-insensitive phrase match against combined page text; dedupes by name. */
export function detectEntities(text: string): EntityDef[] {
  const seen = new Set<string>();
  const matches: EntityDef[] = [];
  for (const entity of ENTITY_DICTIONARY) {
    const found = entity.match.some((phrase) => {
      const pattern = new RegExp(`\\b${escapeRegExp(phrase)}`, 'i');
      return pattern.test(text);
    });
    if (found && !seen.has(entity.name)) {
      seen.add(entity.name);
      matches.push(entity);
    }
  }
  return matches;
}
