export const prerender = false;

import type { APIRoute } from 'astro';
import {
  renderOgPng,
  workflowLayout,
  creatorLayout,
  fetchImageAsDataUri,
} from '../../lib/og';

export const GET: APIRoute = async ({ url }) => {
  const type = url.searchParams.get('type');
  const title = url.searchParams.get('title');
  const thumbnail = url.searchParams.get('thumbnail');
  const creator = url.searchParams.get('creator');
  const name = url.searchParams.get('name');
  const username = url.searchParams.get('username');
  const avatar = url.searchParams.get('avatar');

  let layout;

  if (type === 'workflow' && title) {
    const thumbnailDataUri = thumbnail
      ? await fetchImageAsDataUri(thumbnail)
      : null;
    layout = workflowLayout(title, thumbnailDataUri, creator || undefined);
  } else if (type === 'creator' && name && username) {
    const avatarDataUri = avatar
      ? await fetchImageAsDataUri(avatar)
      : null;
    layout = creatorLayout(name, username, avatarDataUri);
  } else {
    return new Response('Missing required parameters', { status: 400 });
  }

  const png = await renderOgPng(layout);

  return new Response(png as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'CDN-Cache-Control':
        'public, s-maxage=86400, stale-while-revalidate=3600',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
