/**
 * Generate Open Graph images for template pages at build time.
 *
 * Uses satori for SVG generation and @resvg/resvg-js for PNG conversion.
 * Output: public/og/{template-name}.png
 */

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import * as fs from 'fs';
import * as path from 'path';

const TEMPLATES_DIR = path.join(process.cwd(), 'src/content/templates');
const THUMBNAILS_DIR = path.join(process.cwd(), 'public/thumbnails');
const OUTPUT_DIR = path.join(process.cwd(), 'public/og');
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

interface TemplateData {
  name: string;
  title: string;
  description?: string;
  metaDescription?: string;
  thumbnails?: string[];
  mediaType?: string;
  tags?: string[];
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

async function loadThumbnailAsDataUrl(thumbnailPath: string): Promise<string | null> {
  if (!fs.existsSync(thumbnailPath)) return null;
  try {
    const buffer = fs.readFileSync(thumbnailPath);
    const ext = path.extname(thumbnailPath).toLowerCase();
    const mimeType = ext === '.webp' ? 'image/webp' : ext === '.png' ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

async function generateOGImage(template: TemplateData): Promise<void> {
  const description = template.metaDescription || template.description || '';
  const truncatedDesc = truncateText(description, 180);
  const tag = template.mediaType || template.tags?.[0] || '';
  const tagText = tag ? tag.charAt(0).toUpperCase() + tag.slice(1) : '';

  let thumbnailDataUrl: string | null = null;
  if (template.thumbnails && template.thumbnails.length > 0) {
    const thumbnailPath = path.join(THUMBNAILS_DIR, template.thumbnails[0]);
    const ext = path.extname(thumbnailPath).toLowerCase();
    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
      thumbnailDataUrl = await loadThumbnailAsDataUrl(thumbnailPath);
    }
  }

  const element = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        padding: '40px',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              height: '100%',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: '40px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'row',
                    width: '100%',
                    flex: 1,
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          flexDirection: 'column',
                          flex: 1,
                          paddingRight: thumbnailDataUrl ? '40px' : '0',
                        },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: {
                                display: 'flex',
                                flexDirection: 'row',
                                gap: '10px',
                                marginBottom: '24px',
                              },
                              children: [
                                {
                                  type: 'div',
                                  props: {
                                    style: {
                                      display: 'flex',
                                      background: 'rgba(255, 255, 255, 0.15)',
                                      borderRadius: '18px',
                                      padding: '8px 16px',
                                      fontSize: '14px',
                                      fontWeight: 'bold',
                                      color: 'white',
                                    },
                                    children: 'ComfyUI Template',
                                  },
                                },
                                ...(tagText
                                  ? [
                                      {
                                        type: 'div',
                                        props: {
                                          style: {
                                            display: 'flex',
                                            background: 'rgba(255, 255, 255, 0.2)',
                                            borderRadius: '18px',
                                            padding: '8px 16px',
                                            fontSize: '14px',
                                            color: 'rgba(255, 255, 255, 0.9)',
                                          },
                                          children: tagText,
                                        },
                                      },
                                    ]
                                  : []),
                              ],
                            },
                          },
                          {
                            type: 'div',
                            props: {
                              style: {
                                display: 'flex',
                                fontSize: '48px',
                                fontWeight: 'bold',
                                color: 'white',
                                lineHeight: 1.2,
                                marginBottom: '20px',
                              },
                              children: truncateText(template.title, 80),
                            },
                          },
                          {
                            type: 'div',
                            props: {
                              style: {
                                display: 'flex',
                                fontSize: '24px',
                                color: 'rgba(255, 255, 255, 0.8)',
                                lineHeight: 1.4,
                              },
                              children: truncatedDesc,
                            },
                          },
                        ],
                      },
                    },
                    ...(thumbnailDataUrl
                      ? [
                          {
                            type: 'img',
                            props: {
                              src: thumbnailDataUrl,
                              width: 280,
                              height: 280,
                              style: {
                                borderRadius: '16px',
                                border: '2px solid rgba(255, 255, 255, 0.3)',
                                objectFit: 'cover',
                              },
                            },
                          },
                        ]
                      : []),
                  ],
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: '18px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginTop: 'auto',
                  },
                  children: (
                    process.env.PUBLIC_SITE_ORIGIN || 'https://comfy.org'
                  ).replace(/^https?:\/\//, ''),
                },
              },
            ],
          },
        },
      ],
    },
  };

  const svg = await satori(element, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: [
      {
        name: 'Inter',
        data: await getInterFont(),
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Inter',
        data: await getInterBoldFont(),
        weight: 700,
        style: 'normal',
      },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: OG_WIDTH },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  const outputPath = path.join(OUTPUT_DIR, `${template.name}.png`);
  fs.writeFileSync(outputPath, pngBuffer);
}

let interFontCache: Buffer | null = null;
let interBoldFontCache: Buffer | null = null;

async function getInterFont(): Promise<Buffer> {
  if (interFontCache) return interFontCache;

  const response = await fetch(
    'https://fonts.gstatic.com/s/roboto/v50/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmT.ttf'
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch font: ${response.status}`);
  }
  interFontCache = Buffer.from(await response.arrayBuffer());
  return interFontCache;
}

async function getInterBoldFont(): Promise<Buffer> {
  if (interBoldFontCache) return interBoldFontCache;

  const response = await fetch(
    'https://fonts.gstatic.com/s/roboto/v50/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWuYjammT.ttf'
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch bold font: ${response.status}`);
  }
  interBoldFontCache = Buffer.from(await response.arrayBuffer());
  return interBoldFontCache;
}

async function main(): Promise<void> {
  console.log('🖼️  Generating OG images...\n');
  const startTime = Date.now();

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.json'));

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const templatePath = path.join(TEMPLATES_DIR, file);
    const templateName = path.basename(file, '.json');
    const outputPath = path.join(OUTPUT_DIR, `${templateName}.png`);

    if (fs.existsSync(outputPath)) {
      const templateStat = fs.statSync(templatePath);
      const ogStat = fs.statSync(outputPath);
      if (ogStat.mtime >= templateStat.mtime) {
        skipped++;
        continue;
      }
    }

    try {
      const content = fs.readFileSync(templatePath, 'utf-8');
      const template: TemplateData = JSON.parse(content);
      await generateOGImage(template);
      generated++;
      process.stdout.write(
        `\r   Generated: ${generated} | Skipped: ${skipped} | Errors: ${errors}`
      );
    } catch (err) {
      errors++;
      console.error(`\n   ❌ Error generating OG for ${file}:`, err);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n\n✅ OG image generation complete!`);
  console.log(`   Generated: ${generated} | Skipped: ${skipped} | Errors: ${errors}`);
  console.log(`   Duration: ${duration}s`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
