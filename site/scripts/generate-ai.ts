import OpenAI from 'openai';
import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

interface TemplateInfo {
  name: string;
  title?: string;
  description: string;
  mediaType: 'image' | 'video' | 'audio' | '3d';
  tags?: string[];
  models?: string[];
  date?: string;
  openSource?: boolean;
  requiresCustomNodes?: string[];
  usage?: number;
  size?: number;
  vram?: number;
}

interface GeneratedContent {
  extendedDescription: string;
  howToUse: string[];
  metaDescription: string;
  suggestedUseCases: string[];
  faqItems?: Array<{ question: string; answer: string }>;
  lastAIGeneration?: string;
}

interface CachedContent extends GeneratedContent {
  templateHash?: string;
}

interface Override extends Partial<GeneratedContent> {
  humanEdited?: boolean;
}

interface WorkflowAnalysis {
  hasInputImage: boolean;
  hasInputVideo: boolean;
  outputType: string;
  nodeTypes: string[];
}

interface GenerationContext {
  template: TemplateInfo;
  workflow: WorkflowAnalysis;
  modelDocs: Record<string, string>;
  conceptDocs: Record<string, string>;
}

const CACHE_DIR = '.content-cache';
const OUTPUT_DIR = 'src/content/templates';
const OVERRIDES_DIR = 'overrides/templates';
const KNOWLEDGE_DIR = 'knowledge';
const TEMPLATES_INDEX = '../templates/index.json';

async function loadKnowledgeBase(): Promise<{
  models: Record<string, string>;
  concepts: Record<string, string>;
  systemPrompt: string;
}> {
  const modelsDir = path.join(KNOWLEDGE_DIR, 'models');
  const conceptsDir = path.join(KNOWLEDGE_DIR, 'concepts');

  const models: Record<string, string> = {};
  const concepts: Record<string, string> = {};

  if (existsSync(modelsDir)) {
    const files = await readdir(modelsDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const name = path.basename(file, '.md');
        models[name] = await readFile(path.join(modelsDir, file), 'utf-8');
      }
    }
  }

  if (existsSync(conceptsDir)) {
    const files = await readdir(conceptsDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const name = path.basename(file, '.md');
        concepts[name] = await readFile(path.join(conceptsDir, file), 'utf-8');
      }
    }
  }

  const systemPrompt = await readFile(
    path.join(KNOWLEDGE_DIR, 'prompts', 'system.md'),
    'utf-8'
  );

  return { models, concepts, systemPrompt };
}

async function loadOverride(templateName: string): Promise<Override | null> {
  const overridePath = path.join(OVERRIDES_DIR, `${templateName}.json`);
  if (existsSync(overridePath)) {
    const content = await readFile(overridePath, 'utf-8');
    return JSON.parse(content);
  }
  return null;
}

async function loadCache(templateName: string): Promise<CachedContent | null> {
  const cachePath = path.join(CACHE_DIR, `${templateName}.json`);
  if (existsSync(cachePath)) {
    const content = await readFile(cachePath, 'utf-8');
    return JSON.parse(content);
  }
  return null;
}

async function saveCache(
  templateName: string,
  content: GeneratedContent
): Promise<void> {
  const cachePath = path.join(CACHE_DIR, `${templateName}.json`);
  await writeFile(cachePath, JSON.stringify(content, null, 2));
}

function computeTemplateHash(template: TemplateInfo): string {
  const relevant = {
    name: template.name,
    title: template.title,
    description: template.description,
    tags: template.tags,
    models: template.models,
  };
  return Buffer.from(JSON.stringify(relevant)).toString('base64').slice(0, 32);
}

function shouldRegenerate(
  template: TemplateInfo,
  cached: CachedContent
): boolean {
  const currentHash = computeTemplateHash(template);
  return cached.templateHash !== currentHash;
}

function applyOverrides(
  content: GeneratedContent,
  override: Override | null
): GeneratedContent {
  if (!override) return content;

  const merged = { ...content };
  for (const [key, value] of Object.entries(override)) {
    if (value !== null && key !== 'humanEdited') {
      (merged as any)[key] = value;
    }
  }
  return merged;
}

async function analyzeWorkflow(workflowPath: string): Promise<WorkflowAnalysis> {
  if (!existsSync(workflowPath)) {
    return {
      hasInputImage: false,
      hasInputVideo: false,
      outputType: 'image',
      nodeTypes: [],
    };
  }

  try {
    const content = await readFile(workflowPath, 'utf-8');
    const workflow = JSON.parse(content);

    const nodes = workflow.nodes || [];
    const nodeTypes = nodes.map((n: any) => n.type).filter(Boolean);

    const hasInputImage = nodeTypes.some(
      (t: string) =>
        t.toLowerCase().includes('loadimage') ||
        t.toLowerCase().includes('image input')
    );
    const hasInputVideo = nodeTypes.some(
      (t: string) =>
        t.toLowerCase().includes('loadvideo') ||
        t.toLowerCase().includes('video input')
    );

    let outputType = 'image';
    if (nodeTypes.some((t: string) => t.toLowerCase().includes('video'))) {
      outputType = 'video';
    } else if (nodeTypes.some((t: string) => t.toLowerCase().includes('audio'))) {
      outputType = 'audio';
    }

    return {
      hasInputImage,
      hasInputVideo,
      outputType,
      nodeTypes: [...new Set(nodeTypes)].slice(0, 20),
    };
  } catch {
    return {
      hasInputImage: false,
      hasInputVideo: false,
      outputType: 'image',
      nodeTypes: [],
    };
  }
}

function pickRelevantDocs(
  keys: string[],
  docs: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [docKey, docValue] of Object.entries(docs)) {
      const normalizedDocKey = docKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (
        normalizedKey.includes(normalizedDocKey) ||
        normalizedDocKey.includes(normalizedKey)
      ) {
        result[docKey] = docValue;
      }
    }
  }
  return result;
}

function buildPrompt(ctx: GenerationContext): string {
  return `
# Task
Generate SEO-optimized content for a ComfyUI workflow template page.

# Template Data
Name: ${ctx.template.title || ctx.template.name}
Description: ${ctx.template.description}
Category: ${ctx.template.mediaType}
Tags: ${ctx.template.tags?.join(', ') || 'None'}
Models Used: ${ctx.template.models?.join(', ') || 'None'}
Open Source: ${ctx.template.openSource ? 'Yes (runs locally)' : 'No (uses cloud APIs)'}
Custom Nodes: ${ctx.template.requiresCustomNodes?.join(', ') || 'None (core nodes only)'}

# Workflow Analysis
Input Type: ${ctx.workflow.hasInputImage ? 'Image' : ctx.workflow.hasInputVideo ? 'Video' : 'Text/prompt only'}
Output Type: ${ctx.workflow.outputType}
Key Nodes: ${ctx.workflow.nodeTypes.slice(0, 10).join(', ')}

# Model Context
${ctx.template.models?.map((m) => ctx.modelDocs[m.toLowerCase()] || '').join('\n\n') || 'No specific model documentation available.'}

# Output Format (JSON)
{
  "extendedDescription": "2-3 paragraphs (150-250 words). Explain what this template does, who it's for, and the key models/techniques. Include model names naturally.",
  
  "howToUse": [
    "Step 1: Clear action with specific details",
    "Step 2: ...",
    "Step 3: ..."
  ],
  
  "metaDescription": "150-160 character summary. Include primary keyword. Focus on user benefit.",
  
  "suggestedUseCases": [
    "Specific use case with context",
    "Another specific application",
    "Third use case"
  ],
  
  "faqItems": [
    {
      "question": "How do I [specific task] with ComfyUI?",
      "answer": "Concise answer using this template..."
    }
  ]
}

# Keywords to Include
- comfyui workflow
- ${ctx.template.mediaType} generation
- ${ctx.template.models?.[0]?.toLowerCase() || ''}
- ${ctx.template.tags?.[0]?.toLowerCase() || ''}
`.trim();
}

async function generateContent(
  ctx: GenerationContext,
  systemPrompt: string,
  openai: OpenAI
): Promise<GeneratedContent> {
  const userPrompt = buildPrompt(ctx);

  const fullSystemPrompt = systemPrompt
    .replace(
      '{model_docs}',
      Object.entries(ctx.modelDocs)
        .map(([name, doc]) => `## ${name}\n${doc}`)
        .join('\n\n') || 'No model documentation available.'
    )
    .replace(
      '{concept_docs}',
      Object.entries(ctx.conceptDocs)
        .map(([name, doc]) => `## ${name}\n${doc}`)
        .join('\n\n') || 'No concept documentation available.'
    );

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: fullSystemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 1500,
  });

  const content = JSON.parse(response.choices[0].message.content!);
  return validateContent(content);
}

function validateContent(content: any): GeneratedContent {
  return {
    extendedDescription:
      content.extendedDescription || 'Description not available.',
    howToUse: Array.isArray(content.howToUse)
      ? content.howToUse
      : ['Load the template', 'Configure inputs', 'Run the workflow'],
    metaDescription:
      content.metaDescription?.slice(0, 160) || 'ComfyUI workflow template',
    suggestedUseCases: Array.isArray(content.suggestedUseCases)
      ? content.suggestedUseCases
      : [],
    faqItems: Array.isArray(content.faqItems) ? content.faqItems : [],
  };
}

function getPlaceholderContent(template: TemplateInfo): GeneratedContent {
  return {
    extendedDescription: template.description,
    howToUse: ['Load the template', 'Configure inputs', 'Run the workflow'],
    metaDescription: template.description.slice(0, 160),
    suggestedUseCases: [],
    faqItems: [],
  };
}

async function main() {
  const skipAI = process.env.SKIP_AI_GENERATION === 'true';

  console.log('🤖 AI Content Generation Pipeline');
  console.log(`   Mode: ${skipAI ? 'PLACEHOLDER (no API calls)' : 'FULL AI GENERATION'}`);
  console.log('');

  // Load templates index
  if (!existsSync(TEMPLATES_INDEX)) {
    console.error(`❌ Templates index not found: ${TEMPLATES_INDEX}`);
    console.error('   Run sync-templates.ts first or check the path.');
    process.exit(1);
  }

  const categories = JSON.parse(await readFile(TEMPLATES_INDEX, 'utf-8'));

  // Flatten all templates
  const allTemplates: TemplateInfo[] = categories.flatMap(
    (cat: any) => cat.templates || []
  );

  // Sort by usage and take top 50
  const top50 = allTemplates
    .filter((t) => t.usage !== undefined)
    .sort((a, b) => (b.usage || 0) - (a.usage || 0))
    .slice(0, 50);

  // If no usage data, just take all templates
  const templatesToProcess = top50.length > 0 ? top50 : allTemplates.slice(0, 50);

  console.log(`📦 Processing ${templatesToProcess.length} templates...`);
  console.log('');

  // Ensure output directories
  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(CACHE_DIR, { recursive: true });
  await mkdir(OVERRIDES_DIR, { recursive: true });

  // Load knowledge base
  const knowledge = await loadKnowledgeBase();
  console.log(`📚 Loaded knowledge base:`);
  console.log(`   - Models: ${Object.keys(knowledge.models).join(', ') || 'none'}`);
  console.log(`   - Concepts: ${Object.keys(knowledge.concepts).join(', ') || 'none'}`);
  console.log('');

  // Initialize OpenAI client (only if not skipping)
  let openai: OpenAI | null = null;
  if (!skipAI) {
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not set. Use SKIP_AI_GENERATION=true for placeholder mode.');
      process.exit(1);
    }
    openai = new OpenAI();
  }

  let stats = { skipped: 0, cached: 0, generated: 0, placeholder: 0 };

  for (const template of templatesToProcess) {
    const outPath = path.join(OUTPUT_DIR, `${template.name}.json`);

    // Load existing content to preserve synced fields like thumbnails
    let existingContent: Record<string, unknown> = {};
    if (existsSync(outPath)) {
      try {
        existingContent = JSON.parse(await readFile(outPath, 'utf-8'));
      } catch {
        // Ignore parse errors
      }
    }

    // Preserve thumbnails from sync script
    const preservedFields = {
      thumbnails: existingContent.thumbnails || [],
    };

    // Check for human override
    const override = await loadOverride(template.name);
    if (override?.humanEdited) {
      console.log(`⏭️  [SKIP] ${template.name} - human edited`);
      await writeFile(
        outPath,
        JSON.stringify({ ...template, ...preservedFields, ...override, humanEdited: true }, null, 2)
      );
      stats.skipped++;
      continue;
    }

    // Check cache
    const cached = await loadCache(template.name);
    if (cached && !shouldRegenerate(template, cached)) {
      console.log(`💾 [CACHE] ${template.name}`);
      const merged = applyOverrides(cached, override);
      await writeFile(
        outPath,
        JSON.stringify({ ...template, ...preservedFields, ...merged }, null, 2)
      );
      stats.cached++;
      continue;
    }

    if (skipAI) {
      console.log(`📝 [PLACEHOLDER] ${template.name}`);
      const placeholder = getPlaceholderContent(template);
      await writeFile(
        outPath,
        JSON.stringify({ ...template, ...preservedFields, ...placeholder }, null, 2)
      );
      stats.placeholder++;
      continue;
    }

    // Analyze workflow
    const workflowPath = `../templates/${template.name}.json`;
    const workflow = await analyzeWorkflow(workflowPath);

    // Build context
    const ctx: GenerationContext = {
      template,
      workflow,
      modelDocs: pickRelevantDocs(template.models || [], knowledge.models),
      conceptDocs: pickRelevantDocs(template.tags || [], knowledge.concepts),
    };

    // Generate AI content
    console.log(`🤖 [GENERATE] ${template.name}`);
    try {
      const content = await generateContent(ctx, knowledge.systemPrompt, openai!);

      // Save to cache with hash
      const cacheContent: CachedContent = {
        ...content,
        lastAIGeneration: new Date().toISOString(),
        templateHash: computeTemplateHash(template),
      };
      await saveCache(template.name, cacheContent);

      // Apply overrides and write
      const merged = applyOverrides(content, override);
      await writeFile(
        outPath,
        JSON.stringify({ ...template, ...preservedFields, ...merged }, null, 2)
      );
      stats.generated++;
    } catch (error) {
      console.error(`   ❌ Error generating content: ${error}`);
      // Fall back to placeholder
      const placeholder = getPlaceholderContent(template);
      await writeFile(
        outPath,
        JSON.stringify({ ...template, ...preservedFields, ...placeholder }, null, 2)
      );
      stats.placeholder++;
    }
  }

  console.log('');
  console.log('✅ Done!');
  console.log(`   Skipped (human edited): ${stats.skipped}`);
  console.log(`   From cache: ${stats.cached}`);
  console.log(`   AI generated: ${stats.generated}`);
  console.log(`   Placeholders: ${stats.placeholder}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
