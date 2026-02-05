import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { ImageResponse } from '@vercel/og';
import * as fs from 'node:fs';
import * as path from 'node:path';

const MEDIA_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  image: { label: 'Image Generation', color: '#818cf8' },
  video: { label: 'Video Generation', color: '#f472b6' },
  audio: { label: 'Audio Generation', color: '#34d399' },
  '3d': { label: '3D Generation', color: '#fbbf24' },
};

export const getStaticPaths: GetStaticPaths = async () => {
  const templates = await getCollection('templates');
  return templates.map((template) => ({
    params: { slug: template.data.name },
    props: { template: template.data },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { template } = props as {
    template: {
      name: string;
      title?: string;
      description: string;
      mediaType: 'image' | 'video' | 'audio' | '3d';
      models?: string[];
      tags?: string[];
      thumbnails?: string[];
    };
  };

  const title = template.title || template.name;
  const mediaConfig = MEDIA_TYPE_CONFIG[template.mediaType] || MEDIA_TYPE_CONFIG.image;
  const pills = [
    ...(template.models?.slice(0, 2) || []),
    ...(template.tags?.slice(0, 2) || []),
  ].slice(0, 4);

  // Try to load thumbnail as base64
  let thumbnailDataUrl: string | null = null;
  const primaryThumbnail = template.thumbnails?.[0];
  if (primaryThumbnail) {
    try {
      const thumbnailPath = path.join(process.cwd(), 'public', 'thumbnails', primaryThumbnail);
      if (fs.existsSync(thumbnailPath)) {
        const imageBuffer = fs.readFileSync(thumbnailPath);
        const base64 = imageBuffer.toString('base64');
        const ext = primaryThumbnail.split('.').pop()?.toLowerCase() || 'webp';
        const mimeType = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg';
        thumbnailDataUrl = `data:${mimeType};base64,${base64}`;
      }
    } catch {
      // Ignore thumbnail load errors
    }
  }

  const html = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        padding: '60px',
        fontFamily: 'sans-serif',
      },
      children: [
        // Left content
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: thumbnailDataUrl ? '0 0 600px' : '1',
              justifyContent: 'space-between',
              height: '100%',
            },
            children: [
              // Top section
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column' },
                  children: [
                    // Badge
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: mediaConfig.color,
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '18px',
                          fontSize: '20px',
                          fontWeight: 'bold',
                          marginBottom: '24px',
                          alignSelf: 'flex-start',
                        },
                        children: mediaConfig.label,
                      },
                    },
                    // Title
                    {
                      type: 'div',
                      props: {
                        style: {
                          color: 'white',
                          fontSize: '52px',
                          fontWeight: 'bold',
                          lineHeight: 1.2,
                          marginBottom: '16px',
                        },
                        children: title.slice(0, 60),
                      },
                    },
                    // Description
                    {
                      type: 'div',
                      props: {
                        style: {
                          color: 'rgba(255, 255, 255, 0.75)',
                          fontSize: '22px',
                          lineHeight: 1.4,
                          marginBottom: '20px',
                        },
                        children: template.description.slice(0, 150),
                      },
                    },
                    // Pills
                    pills.length > 0
                      ? {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              gap: '10px',
                              flexWrap: 'wrap',
                            },
                            children: pills.map((pill) => ({
                              type: 'div',
                              props: {
                                style: {
                                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  color: 'rgba(255, 255, 255, 0.9)',
                                  padding: '6px 14px',
                                  borderRadius: '16px',
                                  fontSize: '16px',
                                },
                                children: pill,
                              },
                            })),
                          },
                        }
                      : null,
                  ].filter(Boolean),
                },
              },
              // Branding
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column' },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          color: 'white',
                          fontSize: '28px',
                          fontWeight: 'bold',
                        },
                        children: 'ComfyUI Templates',
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontSize: '18px',
                          marginTop: '8px',
                        },
                        children: 'templates.comfy.org',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        // Thumbnail (right side)
        thumbnailDataUrl
          ? {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  marginLeft: '40px',
                  width: '420px',
                  height: '420px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  alignSelf: 'center',
                },
                children: {
                  type: 'img',
                  props: {
                    src: thumbnailDataUrl,
                    style: {
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    },
                  },
                },
              },
            }
          : null,
      ].filter(Boolean),
    },
  };

  return new ImageResponse(html, {
    width: 1200,
    height: 630,
  });
};
