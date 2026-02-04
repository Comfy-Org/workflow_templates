import * as fs from "node:fs";
import * as path from "node:path";

interface TemplateInfo {
  name: string;
  title?: string;
  description: string;
  mediaType: "image" | "video" | "audio" | "3d";
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

interface SyncedTemplate extends TemplateInfo {
  extendedDescription: string;
  howToUse: string[];
  metaDescription: string;
  suggestedUseCases: string[];
  thumbnails: string[];
}

const SITE_DIR = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const TEMPLATES_DIR = path.join(SITE_DIR, "..", "templates");
const CONTENT_DIR = path.join(SITE_DIR, "src", "content", "templates");
const THUMBNAILS_DIR = path.join(SITE_DIR, "public", "thumbnails");

function loadTemplateIndex(): TemplateCategory[] {
  const indexPath = path.join(TEMPLATES_DIR, "index.json");
  const content = fs.readFileSync(indexPath, "utf-8");
  return JSON.parse(content);
}

function flattenTemplates(categories: TemplateCategory[]): TemplateInfo[] {
  const templates: TemplateInfo[] = [];
  for (const category of categories) {
    templates.push(...category.templates);
  }
  return templates;
}

function getTop50ByUsage(templates: TemplateInfo[]): TemplateInfo[] {
  return templates
    .sort((a, b) => (b.usage || 0) - (a.usage || 0))
    .slice(0, 50);
}

function findThumbnails(templateName: string): string[] {
  const pattern = new RegExp(`^${escapeRegExp(templateName)}-\\d+\\.webp$`);
  const files = fs.readdirSync(TEMPLATES_DIR);
  return files
    .filter((file) => pattern.test(file))
    .sort((a, b) => {
      const numA = parseInt(a.match(/-(\d+)\.webp$/)?.[1] || "0");
      const numB = parseInt(b.match(/-(\d+)\.webp$/)?.[1] || "0");
      return numA - numB;
    });
}

function createSyncedTemplate(template: TemplateInfo): SyncedTemplate {
  const thumbnails = findThumbnails(template.name);
  return {
    ...template,
    extendedDescription: template.description,
    howToUse: ["Load the template", "Configure inputs", "Run the workflow"],
    metaDescription: template.description.slice(0, 160),
    suggestedUseCases: [],
    thumbnails,
  };
}

function copyThumbnails(templateName: string): void {
  const pattern = new RegExp(`^${escapeRegExp(templateName)}-\\d+\\.webp$`);

  const files = fs.readdirSync(TEMPLATES_DIR);
  for (const file of files) {
    if (pattern.test(file)) {
      const src = path.join(TEMPLATES_DIR, file);
      const dest = path.join(THUMBNAILS_DIR, file);
      fs.copyFileSync(src, dest);
      console.log(`  Copied thumbnail: ${file}`);
    }
  }
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ensureDirectories(): void {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }
  if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
  }
}

function main(): void {
  console.log("Syncing templates...\n");

  ensureDirectories();

  // Load and process templates
  const categories = loadTemplateIndex();
  const allTemplates = flattenTemplates(categories);
  const top50 = getTop50ByUsage(allTemplates);

  console.log(`Found ${allTemplates.length} total templates`);
  console.log(`Processing top ${top50.length} by usage\n`);

  let syncedCount = 0;

  for (const template of top50) {
    console.log(`Processing: ${template.name}`);

    // Create synced template with placeholder AI fields
    const synced = createSyncedTemplate(template);

    // Write to content directory
    const outputPath = path.join(CONTENT_DIR, `${template.name}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(synced, null, 2));
    console.log(`  Wrote: ${template.name}.json`);

    // Copy thumbnails
    copyThumbnails(template.name);

    syncedCount++;
  }

  console.log(`\nSync complete: ${syncedCount} templates synced`);
  console.log(`Content dir: ${CONTENT_DIR}`);
  console.log(`Thumbnails dir: ${THUMBNAILS_DIR}`);
}

main();
