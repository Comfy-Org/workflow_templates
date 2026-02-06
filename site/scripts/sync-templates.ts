import * as fs from 'node:fs';
import * as path from 'node:path';
import { identifyRequiredNodes } from '../src/lib/node-registry';

interface TemplateInfo {
  name: string;
  title?: string;
  description: string;
  mediaType: 'image' | 'video' | 'audio' | '3d';
  mediaSubtype?: string;
  thumbnailVariant?: 'compareSlider' | 'hoverDissolve' | 'zoomHover';
  tags?: string[];
  models?: string[];
  date?: string;
  openSource?: boolean;
  requiresCustomNodes?: string[];
  tutorialUrl?: string;
  usage?: number;
  size?: number;
  vram?: number;
}

interface TemplateCategory {
  moduleName: string;
  category: string;
  icon: string;
  title: string;
  type: string;
  templates: TemplateInfo[];
}

interface RequiredNodeInfo {
  nodeType: string;
  package: string;
  url: string;
  description?: string;
}

interface SyncedTemplate extends TemplateInfo {
  extendedDescription: string;
  howToUse: string[];
  metaDescription: string;
  suggestedUseCases: string[];
  thumbnails: string[];
  locale?: string;
  estimatedTime?: string;
  requiredNodes?: RequiredNodeInfo[];
}

interface WorkflowNode {
  type: string;
  [key: string]: unknown;
}

interface WorkflowJson {
  nodes?: WorkflowNode[];
  [key: string]: unknown;
}

// Locale configuration - must match src/i18n/config.ts
const LOCALE_INDEX_FILES: Record<string, string> = {
  en: 'index.json',
  zh: 'index.zh.json',
  'zh-TW': 'index.zh-TW.json',
  ja: 'index.ja.json',
  ko: 'index.ko.json',
  es: 'index.es.json',
  fr: 'index.fr.json',
  ru: 'index.ru.json',
  tr: 'index.tr.json',
  ar: 'index.ar.json',
  'pt-BR': 'index.pt-BR.json',
};

const DEFAULT_LOCALE = 'en';

const SITE_DIR = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const TEMPLATES_DIR = path.join(SITE_DIR, '..', 'templates');
const CONTENT_DIR = path.join(SITE_DIR, 'src', 'content', 'templates');
const THUMBNAILS_DIR = path.join(SITE_DIR, 'public', 'thumbnails');
const WORKFLOWS_DIR = path.join(SITE_DIR, 'public', 'workflows');
const LOGOS_SRC_DIR = path.join(TEMPLATES_DIR, 'logo');
const LOGOS_DEST_DIR = path.join(SITE_DIR, 'public', 'logos');

const LOGO_FILENAME_FIXES: Record<string, string> = {
  'recarft.png': 'recraft.png',
};

const ASSET_EXTENSIONS = ['.webp', '.png', '.jpg', '.jpeg', '.gif', '.mp3', '.mp4', '.webm'];

function loadTemplateIndex(locale: string): TemplateCategory[] | null {
  const filename = LOCALE_INDEX_FILES[locale];
  if (!filename) return null;

  const indexPath = path.join(TEMPLATES_DIR, filename);
  if (!fs.existsSync(indexPath)) {
    console.warn(`  Warning: ${filename} not found, skipping locale ${locale}`);
    return null;
  }

  const content = fs.readFileSync(indexPath, 'utf-8');
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse template index at ${indexPath}: ${error}`);
  }
}

function flattenTemplates(categories: TemplateCategory[]): TemplateInfo[] {
  const templates: TemplateInfo[] = [];
  for (const category of categories) {
    templates.push(...category.templates);
  }
  return templates;
}

function getTopByUsage(templates: TemplateInfo[], limit?: number): TemplateInfo[] {
  const sorted = [...templates].sort((a, b) => (b.usage || 0) - (a.usage || 0));
  return limit ? sorted.slice(0, limit) : sorted;
}

function findThumbnails(templateName: string): string[] {
  const extPattern = ASSET_EXTENSIONS.map((e) => escapeRegExp(e)).join('|');
  const pattern = new RegExp(
    `^${escapeRegExp(templateName)}-\\d+(${extPattern})$`
  );
  const files = fs.readdirSync(TEMPLATES_DIR);
  return files
    .filter((file) => pattern.test(file))
    .sort((a, b) => {
      const numA = parseInt(a.match(/-(\d+)\./)?.[1] || '0');
      const numB = parseInt(b.match(/-(\d+)\./)?.[1] || '0');
      return numA - numB;
    });
}

function extractRequiredNodes(templateName: string): RequiredNodeInfo[] {
  const workflowPath = path.join(TEMPLATES_DIR, `${templateName}.json`);
  if (!fs.existsSync(workflowPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(workflowPath, 'utf-8');
    const workflow = JSON.parse(content);
    const nodes = identifyRequiredNodes(workflow);

    return nodes.map(({ nodeType, info }) => ({
      nodeType,
      package: info.package,
      url: info.url,
      description: info.description,
    }));
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.warn(`  Warning: Invalid JSON in ${templateName}.json`);
    } else {
      console.warn(
        `  Warning: Could not parse workflow ${templateName}.json for custom nodes:`,
        error
      );
    }
    return [];
  }
}

function createSyncedTemplate(template: TemplateInfo, locale: string): SyncedTemplate {
  const thumbnails = findThumbnails(template.name);
  const estimatedTime = estimateGenerationTime(template.name, template.mediaType);
  const requiredNodes = extractRequiredNodes(template.name);

  return {
    ...template,
    extendedDescription: template.description,
    howToUse: ['Load the template', 'Configure inputs', 'Run the workflow'],
    metaDescription: template.description.slice(0, 160),
    suggestedUseCases: [],
    thumbnails,
    locale: locale === DEFAULT_LOCALE ? undefined : locale,
    estimatedTime,
    requiredNodes: requiredNodes.length > 0 ? requiredNodes : undefined,
  };
}

function copyThumbnails(templateName: string): void {
  const extPattern = ASSET_EXTENSIONS.map((e) => escapeRegExp(e)).join('|');
  const pattern = new RegExp(
    `^${escapeRegExp(templateName)}-\\d+(${extPattern})$`
  );

  const files = fs.readdirSync(TEMPLATES_DIR);
  for (const file of files) {
    if (pattern.test(file)) {
      const src = path.join(TEMPLATES_DIR, file);
      const dest = path.join(THUMBNAILS_DIR, file);
      if (!fs.existsSync(dest) || fs.statSync(src).mtime > fs.statSync(dest).mtime) {
        fs.copyFileSync(src, dest);
      }
    }
  }
}

function copyWorkflowJson(templateName: string): void {
  const src = path.join(TEMPLATES_DIR, `${templateName}.json`);
  const dest = path.join(WORKFLOWS_DIR, `${templateName}.json`);

  if (!fs.existsSync(src)) {
    return;
  }

  // Only copy if source is newer or dest doesn't exist
  if (!fs.existsSync(dest) || fs.statSync(src).mtime > fs.statSync(dest).mtime) {
    fs.copyFileSync(src, dest);
  }
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Heavy node types that add significant processing time
const HEAVY_NODE_TYPES = new Set([
  'KSampler',
  'KSamplerAdvanced',
  'SamplerCustom',
  'SamplerCustomAdvanced',
  'VAEDecode',
  'VAEEncode',
  'CheckpointLoaderSimple',
  'UNETLoader',
  'DualCLIPLoader',
  'CLIPLoader',
  'ControlNetLoader',
  'LoraLoader',
  'VideoLinearCFGGuidance',
  'ImageUpscaleWithModel',
]);

// Video-related node types
const VIDEO_NODE_TYPES = new Set([
  'VHS_VideoCombine',
  'VideoLinearCFGGuidance',
  'ImageOnlyCheckpointLoader',
]);

function estimateGenerationTime(templateName: string, mediaType: string): string | undefined {
  const workflowPath = path.join(TEMPLATES_DIR, `${templateName}.json`);
  if (!fs.existsSync(workflowPath)) {
    return undefined;
  }

  try {
    const content = fs.readFileSync(workflowPath, 'utf-8');
    const workflow: WorkflowJson = JSON.parse(content);
    const nodes = workflow.nodes || [];

    // Count nodes and analyze complexity
    const nodeCount = nodes.length;
    const heavyNodeCount = nodes.filter((n) => HEAVY_NODE_TYPES.has(n.type)).length;
    const hasVideoNodes = nodes.some((n) => VIDEO_NODE_TYPES.has(n.type));

    // Base time calculation (in seconds)
    let minTime = 5; // minimum 5 seconds base
    let maxTime = 15;

    // Add time per node (lighter nodes)
    minTime += nodeCount * 0.5;
    maxTime += nodeCount * 1.5;

    // Add time for heavy nodes (samplers, loaders)
    minTime += heavyNodeCount * 3;
    maxTime += heavyNodeCount * 8;

    // Video workflows take significantly longer
    if (mediaType === 'video' || hasVideoNodes) {
      minTime *= 3;
      maxTime *= 5;
    }

    // 3D workflows also take longer
    if (mediaType === '3d') {
      minTime *= 2;
      maxTime *= 3;
    }

    // Audio is generally faster
    if (mediaType === 'audio') {
      minTime *= 0.8;
      maxTime *= 0.8;
    }

    // API workflows are typically faster on cloud
    if (templateName.startsWith('api_')) {
      minTime *= 0.5;
      maxTime *= 0.7;
    }

    // Round and format
    minTime = Math.round(minTime);
    maxTime = Math.round(maxTime);

    // Format as human-readable time range
    if (maxTime < 60) {
      return `${minTime}-${maxTime} seconds`;
    } else if (maxTime < 120) {
      const minMins = Math.max(1, Math.round(minTime / 60));
      const maxMins = Math.round(maxTime / 60);
      if (minMins === maxMins) {
        return `~${minMins} minute${minMins > 1 ? 's' : ''}`;
      }
      return `${minMins}-${maxMins} minutes`;
    } else {
      const minMins = Math.round(minTime / 60);
      const maxMins = Math.round(maxTime / 60);
      return `${minMins}-${maxMins} minutes`;
    }
  } catch {
    return undefined;
  }
}

function ensureDirectories(locales: string[]): void {
  // Main content dir for English
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }

  // Locale-specific content directories
  for (const locale of locales) {
    if (locale === DEFAULT_LOCALE) continue;
    const localeDir = path.join(CONTENT_DIR, locale);
    if (!fs.existsSync(localeDir)) {
      fs.mkdirSync(localeDir, { recursive: true });
    }
  }

  if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
  }

  if (!fs.existsSync(WORKFLOWS_DIR)) {
    fs.mkdirSync(WORKFLOWS_DIR, { recursive: true });
  }

  if (!fs.existsSync(LOGOS_DEST_DIR)) {
    fs.mkdirSync(LOGOS_DEST_DIR, { recursive: true });
  }
}

function syncLogos(): number {
  if (!fs.existsSync(LOGOS_SRC_DIR)) {
    console.warn('  Warning: logos source directory not found, skipping logo sync');
    return 0;
  }

  let count = 0;
  for (const file of fs.readdirSync(LOGOS_SRC_DIR)) {
    if (!file.endsWith('.png') && !file.endsWith('.svg')) continue;
    const src = path.join(LOGOS_SRC_DIR, file);
    const destName = LOGO_FILENAME_FIXES[file] || file;
    const dest = path.join(LOGOS_DEST_DIR, destName);
    if (!fs.existsSync(dest) || fs.statSync(src).mtime > fs.statSync(dest).mtime) {
      fs.copyFileSync(src, dest);
      count++;
    }
  }
  return count;
}

function printHelp(): void {
  console.log(`
Usage: sync-templates.ts [options]

Options:
  --all         Sync all templates (default behavior)
  --top-50      Sync top 50 templates by usage (shortcut for --limit 50)
  --limit N     Sync top N templates by usage
  --locale X    Sync only specific locale (e.g., --locale zh)
  --en-only     Sync English only (faster for development)
  --help, -h    Show this help message

Examples:
  pnpm run sync                  # Sync ALL templates (200+)
  pnpm run sync -- --top-50      # Sync top 50 by usage
  pnpm run sync -- --limit 100   # Sync top 100 by usage
  pnpm run sync -- --en-only     # Sync English only
`);
}

function parseArgs(): { limit?: number; locales: string[] } {
  const args = process.argv.slice(2);

  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  // Parse limit - default is undefined (all templates)
  let limit: number | undefined;

  // --top-50 is a shortcut for --limit 50
  if (args.includes('--top-50')) {
    limit = 50;
  }

  // --limit N overrides --top-50 if both are specified
  const limitIndex = args.indexOf('--limit');
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    const parsedLimit = parseInt(args[limitIndex + 1], 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = parsedLimit;
    }
  }

  // --all is explicit but also the default (no-op, just for clarity)
  // No action needed since limit is already undefined by default

  // Parse locales
  let locales: string[] = Object.keys(LOCALE_INDEX_FILES);
  const localeIndex = args.indexOf('--locale');
  if (localeIndex !== -1 && args[localeIndex + 1]) {
    const requestedLocale = args[localeIndex + 1];
    if (LOCALE_INDEX_FILES[requestedLocale]) {
      locales = [requestedLocale];
    } else {
      console.error(`Unknown locale: ${requestedLocale}`);
      console.error(`Available locales: ${Object.keys(LOCALE_INDEX_FILES).join(', ')}`);
      process.exit(1);
    }
  }

  // Check for --en-only flag (for quick builds)
  if (args.includes('--en-only')) {
    locales = [DEFAULT_LOCALE];
  }

  return { limit, locales };
}

function getOutputPath(templateName: string, locale: string): string {
  if (locale === DEFAULT_LOCALE) {
    return path.join(CONTENT_DIR, `${templateName}.json`);
  }
  return path.join(CONTENT_DIR, locale, `${templateName}.json`);
}

function main(): void {
  const { limit, locales } = parseArgs();

  console.log('Syncing templates...\n');
  console.log(`Locales: ${locales.join(', ')}`);

  ensureDirectories(locales);

  // Track which templates exist (from English) for thumbnail copying
  const enCategories = loadTemplateIndex(DEFAULT_LOCALE);
  if (!enCategories) {
    console.error('Error: Could not load English index.json');
    process.exit(1);
  }

  const allEnTemplates = flattenTemplates(enCategories);
  const templatesToProcess = getTopByUsage(allEnTemplates, limit);
  const templateNames = new Set(templatesToProcess.map((t) => t.name));

  console.log(`Found ${allEnTemplates.length} total templates in English`);
  if (limit) {
    console.log(`Processing top ${templatesToProcess.length} templates by usage\n`);
  } else {
    console.log(`Processing ALL ${templatesToProcess.length} templates\n`);
  }

  let syncedCount = 0;
  const stats: Record<string, number> = {};

  // Process each locale
  for (const locale of locales) {
    console.log(`\n--- Processing locale: ${locale} ---`);
    stats[locale] = 0;

    const categories = loadTemplateIndex(locale);
    if (!categories) continue;

    const templates = flattenTemplates(categories);

    // Build a map of template name -> localized template data
    const templateMap = new Map<string, TemplateInfo>();
    for (const t of templates) {
      templateMap.set(t.name, t);
    }

    // Sync templates that exist in English
    for (const templateName of templateNames) {
      const template = templateMap.get(templateName);
      if (!template) {
        // Template exists in English but not in this locale
        // Skip silently - not all templates are translated
        continue;
      }

      // Create synced template
      const synced = createSyncedTemplate(template, locale);

      // Write to locale-appropriate content directory
      const outputPath = getOutputPath(templateName, locale);
      fs.writeFileSync(outputPath, JSON.stringify(synced, null, 2));

      // Only copy thumbnails and workflow JSON once (from English processing)
      if (locale === DEFAULT_LOCALE) {
        copyThumbnails(templateName);
        copyWorkflowJson(templateName);
      }

      syncedCount++;
      stats[locale]++;
    }

    console.log(`  Synced ${stats[locale]} templates for ${locale}`);
  }

  // Clean up orphan content JSONs not in index.json
  const allIndexNames = new Set(allEnTemplates.map((t) => t.name));
  let orphansRemoved = 0;

  for (const locale of locales) {
    const dir = locale === DEFAULT_LOCALE ? CONTENT_DIR : path.join(CONTENT_DIR, locale);
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      const name = file.replace(/\.json$/, '');
      if (!allIndexNames.has(name)) {
        const filePath = path.join(dir, file);
        fs.unlinkSync(filePath);
        console.log(`  Removed orphan: ${locale === DEFAULT_LOCALE ? '' : locale + '/'}${file}`);
        orphansRemoved++;
      }
    }
  }

  // Clean up orphan thumbnails not belonging to any indexed template
  let orphanThumbsRemoved = 0;
  if (fs.existsSync(THUMBNAILS_DIR)) {
    for (const file of fs.readdirSync(THUMBNAILS_DIR)) {
      const match = file.match(/^(.+)-\d+\.\w+$/);
      if (match && !allIndexNames.has(match[1])) {
        fs.unlinkSync(path.join(THUMBNAILS_DIR, file));
        console.log(`  Removed orphan thumbnail: ${file}`);
        orphanThumbsRemoved++;
      }
    }
  }

  // Sync provider logos from templates/logo/
  const logosSynced = syncLogos();

  console.log(`\n=== Sync complete ===`);
  console.log(`Total: ${syncedCount} template files synced`);
  for (const [locale, count] of Object.entries(stats)) {
    console.log(`  ${locale}: ${count}`);
  }
  if (logosSynced > 0) {
    console.log(`Synced ${logosSynced} logos`);
  }
  if (orphansRemoved > 0) {
    console.log(`Removed ${orphansRemoved} orphan content files`);
  }
  if (orphanThumbsRemoved > 0) {
    console.log(`Removed ${orphanThumbsRemoved} orphan thumbnails`);
  }
  console.log(`Content dir: ${CONTENT_DIR}`);
  console.log(`Thumbnails dir: ${THUMBNAILS_DIR}`);
}

main();
