import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { SatoriOptions } from 'satori';
import fs from 'node:fs';
import path from 'node:path';

const WIDTH = 1200;
const HEIGHT = 630;

// Module-scoped font cache
let fontsPromise: Promise<SatoriOptions['fonts']> | null = null;

async function loadFonts(): Promise<SatoriOptions['fonts']> {
  if (fontsPromise) return fontsPromise;
  fontsPromise = (async () => {
    const [regular, bold] = await Promise.all([
      fetch(
        'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2'
      ).then((r) => r.arrayBuffer()),
      fetch(
        'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hiA.woff2'
      ).then((r) => r.arrayBuffer()),
    ]);
    return [
      { name: 'Inter', data: regular, weight: 400 as const, style: 'normal' as const },
      { name: 'Inter', data: bold, weight: 700 as const, style: 'normal' as const },
    ];
  })();
  return fontsPromise;
}

// Load the Comfy Hub logo SVG as a base64 data URI for embedding in satori
let logoDataUri: string | null = null;
function getLogoDataUri(): string {
  if (logoDataUri) return logoDataUri;
  const logoPath = path.join(process.cwd(), 'public/brand/comfy-hub-logo.svg');
  const svg = fs.readFileSync(logoPath, 'utf-8');
  logoDataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return logoDataUri;
}

async function fetchImageAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

function workflowLayout(
  title: string,
  thumbnailDataUri: string | null,
  creatorName?: string
) {
  const logo = getLogoDataUri();
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
        padding: '60px',
        fontFamily: 'Inter',
      },
      children: [
        // Thumbnail
        thumbnailDataUri
          ? {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  flexShrink: 0,
                  marginRight: '48px',
                  alignItems: 'center',
                },
                children: [
                  {
                    type: 'img',
                    props: {
                      src: thumbnailDataUri,
                      width: 440,
                      height: 330,
                      style: {
                        borderRadius: '16px',
                        objectFit: 'cover',
                      },
                    },
                  },
                ],
              },
            }
          : null,
        // Text content
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flex: 1,
              overflow: 'hidden',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 40,
                    fontWeight: 700,
                    color: '#ffffff',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  },
                  children: title,
                },
              },
              creatorName
                ? {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: 24,
                        color: '#888888',
                        marginTop: '16px',
                      },
                      children: `by @${creatorName}`,
                    },
                  }
                : null,
            ].filter(Boolean),
          },
        },
        // Logo bottom-right
        {
          type: 'img',
          props: {
            src: logo,
            width: 140,
            height: 35,
            style: {
              position: 'absolute',
              bottom: '40px',
              right: '48px',
            },
          },
        },
      ].filter(Boolean),
    },
  };
}

function creatorLayout(
  displayName: string,
  username: string,
  avatarDataUri: string | null
) {
  const logo = getLogoDataUri();
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter',
      },
      children: [
        // Avatar
        avatarDataUri
          ? {
              type: 'img',
              props: {
                src: avatarDataUri,
                width: 120,
                height: 120,
                style: {
                  borderRadius: '60px',
                  objectFit: 'cover',
                },
              },
            }
          : {
              type: 'div',
              props: {
                style: {
                  width: 120,
                  height: 120,
                  borderRadius: '60px',
                  background: 'linear-gradient(135deg, #c8ff00, #a0cc00)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                  fontWeight: 700,
                  color: '#000000',
                },
                children: displayName.charAt(0).toUpperCase(),
              },
            },
        // Display name
        {
          type: 'div',
          props: {
            style: {
              fontSize: 48,
              fontWeight: 700,
              color: '#ffffff',
              marginTop: '24px',
            },
            children: displayName,
          },
        },
        // Username
        {
          type: 'div',
          props: {
            style: {
              fontSize: 28,
              color: '#888888',
              marginTop: '8px',
            },
            children: `@${username}`,
          },
        },
        // Logo bottom-right
        {
          type: 'img',
          props: {
            src: logo,
            width: 140,
            height: 35,
            style: {
              position: 'absolute',
              bottom: '40px',
              right: '48px',
            },
          },
        },
      ],
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function renderOgPng(layout: any): Promise<Uint8Array> {
  const fonts = await loadFonts();
  const svg = await satori(layout, {
    width: WIDTH,
    height: HEIGHT,
    fonts,
  });
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: WIDTH },
  });
  return resvg.render().asPng();
}

export { workflowLayout, creatorLayout, fetchImageAsDataUri };
