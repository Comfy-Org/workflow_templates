/**
 * Groups the Hub catalog into model families at build time. A family qualifies
 * for a rich editorial page when its cluster clears the thresholds (or is a
 * priority model); the rest stay a bare noindex grid. The only human knobs are
 * the thresholds and FAMILY_RULES.
 */
import { slugify } from '../slugify';
import type { SerializedTemplate } from '../hub-api';
import type { KeywordModel } from './schema';

/** Minimal template shape deriveModelGroups reads. */
export interface CatalogTemplate {
  name: string;
  tags?: string[];
  models?: string[];
  usage?: number;
}

function sortByUsage<T extends CatalogTemplate>(templates: T[]): T[] {
  return [...templates].sort((a, b) => (b.usage ?? 0) - (a.usage ?? 0));
}

const MIN_CLUSTER_SIZE = 5;
const MIN_CLUSTER_USAGE = 500;

/** Maker/company names that are not models — never get their own page. */
const PROVIDER_DENYLIST = new Set(
  [
    'Google',
    'ByteDance',
    'OpenAI',
    'Stability',
    'Lightricks',
    'Alibaba',
    'Tencent',
    'Black Forest Labs',
  ].map((name) => name.toLowerCase())
);

/** Strategic models that qualify even at low usage, for day-one launch pages. */
const PRIORITY_MODELS = [
  'flux',
  'wan',
  'seedance',
  'kling',
  'ltx',
  'qwen-image',
  'nano-banana',
  'z-image',
  'hunyuan3d',
  'triposplat',
  'ideogram',
  'stable audio',
  'veo',
  'hailuo',
  'seedream',
  'gpt-image',
];
const PRIORITY_SLUGS = PRIORITY_MODELS.map((name) => slugify(name));

function isProvider(label: string): boolean {
  return PROVIDER_DENYLIST.has(label.toLowerCase());
}

/** Priority if the slug equals or is a versioned variant of a priority slug. */
function isPriority(label: string): boolean {
  const slug = slugify(label);
  return PRIORITY_SLUGS.some((priority) => slug === priority || slug.startsWith(`${priority}-`));
}

// Collapse versioned variants to one canonical family label. Rules use hyphen
// form and are matched against both raw and space->hyphen forms (so "Nano Banana
// Pro" matches ^nano-banana). Order matters: specific rules precede their bases.
const FAMILY_RULES: { match: RegExp; label: string }[] = [
  { match: /^wan/i, label: 'Wan' },
  { match: /^flux/i, label: 'Flux' },
  { match: /^ltx/i, label: 'LTX' },
  { match: /^sd(xl|\d|\b)|^stable-diffusion/i, label: 'Stable Diffusion' },
  { match: /^qwen-image-edit/i, label: 'Qwen-Image-Edit' },
  { match: /^qwen-image/i, label: 'Qwen-Image' },
  { match: /^seedance/i, label: 'Seedance' },
  { match: /^seedream/i, label: 'Seedream' },
  { match: /^kling/i, label: 'Kling' },
  { match: /^z-image/i, label: 'Z-Image' },
  { match: /^gpt-image/i, label: 'GPT-Image' },
  { match: /^nano-banana|^gemini.*image/i, label: 'Nano Banana Pro' },
  { match: /^hunyuan3d/i, label: 'Hunyuan3D' },
];

const NON_MODELS = new Set(['none', '']);

export function modelFamilyLabel(modelName: string): string {
  const normalized = modelName.trim().replace(/\s+/g, '-');
  const rule = FAMILY_RULES.find(({ match }) => match.test(modelName) || match.test(normalized));
  return rule?.label ?? modelName;
}

export interface ModelGroup<T extends CatalogTemplate = SerializedTemplate> {
  slug: string;
  label: string;
  modelNames: string[];
  templates: T[];
  usage: number;
  qualifies: boolean;
  keywords: KeywordModel;
  redirectFrom: string[];
}

const STOP_TAGS = new Set(['API']);

/** Derive a keyword model for a family from its cluster's common tags. */
function deriveKeywords(label: string, templates: CatalogTemplate[]): KeywordModel {
  const tagCounts = new Map<string, number>();
  for (const tmpl of templates) {
    for (const tag of tmpl.tags ?? []) {
      if (STOP_TAGS.has(tag)) continue;
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag]) => tag.toLowerCase());

  const lower = label.toLowerCase();
  return {
    primary: `${lower} comfyui workflows`,
    secondary: [
      `${lower} comfyui`,
      `${lower} workflow`,
      ...topTags.map((tag) => `${lower} ${tag}`),
    ],
  };
}

/**
 * Group the catalog into model families, resolve each cluster, and flag which
 * qualify for a rich editorial page. Pure: pass the serialized catalog in.
 */
export function deriveModelGroups<T extends CatalogTemplate>(catalog: T[]): ModelGroup<T>[] {
  const groups = new Map<
    string,
    {
      templates: Map<string, T>;
      modelNames: Set<string>;
      variantSlugs: Set<string>;
    }
  >();

  for (const tmpl of catalog) {
    for (const model of tmpl.models ?? []) {
      if (NON_MODELS.has(model.trim().toLowerCase())) continue;
      const label = modelFamilyLabel(model);
      let group = groups.get(label);
      if (!group) {
        group = { templates: new Map(), modelNames: new Set(), variantSlugs: new Set() };
        groups.set(label, group);
      }
      group.templates.set(tmpl.name, tmpl);
      group.modelNames.add(model);
      const variantSlug = slugify(model);
      if (variantSlug) group.variantSlugs.add(variantSlug);
    }
  }

  const result: ModelGroup<T>[] = [];
  for (const [label, group] of groups) {
    const slug = slugify(label);
    if (!slug) continue;
    const templates = sortByUsage([...group.templates.values()]);
    const usage = templates.reduce((sum, tmpl) => sum + (tmpl.usage ?? 0), 0);
    const meetsThreshold = templates.length >= MIN_CLUSTER_SIZE && usage >= MIN_CLUSTER_USAGE;
    const qualifies =
      !isProvider(label) && templates.length > 0 && (isPriority(label) || meetsThreshold);
    result.push({
      slug,
      label,
      modelNames: [...group.modelNames],
      templates,
      usage,
      qualifies,
      keywords: deriveKeywords(label, templates),
      redirectFrom: [...group.variantSlugs].filter((variant) => variant !== slug),
    });
  }
  return result;
}
