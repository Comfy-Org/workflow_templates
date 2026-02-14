import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { ImageResponse } from '@vercel/og';
import { SITE_ORIGIN } from '../../../config/site';

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
    };
  };

  const title = (template.title || template.name).slice(0, 60);
  const description = template.description.slice(0, 150);
  const mediaConfig = MEDIA_TYPE_CONFIG[template.mediaType] || MEDIA_TYPE_CONFIG.image;

  // Simplified OG image using React-like JSX syntax with satori
  const html = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        padding: '60px',
        fontFamily: 'sans-serif',
      },
      children: [
        // Badge
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              backgroundColor: mediaConfig.color,
              color: 'white',
              padding: '8px 16px',
              borderRadius: '18px',
              fontSize: '20px',
              fontWeight: 'bold',
              marginBottom: '24px',
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
            children: title,
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
              marginBottom: '40px',
            },
            children: description,
          },
        },
        // Branding
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              marginTop: 'auto',
            },
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
                  children: SITE_ORIGIN.replace(/^https?:\/\//, ''),
                },
              },
            ],
          },
        },
      ],
    },
  };

  return new ImageResponse(html, {
    width: 1200,
    height: 630,
  });
};
