/**
 * Hub API client for fetching workflow data from the backend.
 *
 * API spec based on cloud PR #2840.
 * Base URL is configurable via PUBLIC_HUB_API_URL env var.
 * Note: PUBLIC_ prefix is required for Astro build-time access in getStaticPaths().
 * This URL is only used server-side (build + ISR), not in client-side Vue components.
 */

const HUB_API_BASE =
  (import.meta.env.PUBLIC_HUB_API_URL || 'https://api.comfy.org').replace(/\/$/, '');

// ---------------------------------------------------------------------------
// Types — mirrors backend OpenAPI schemas
// ---------------------------------------------------------------------------

export interface LabelRef {
  name: string;
  display_name: string;
}

export interface HubProfile {
  username: string;
  display_name?: string;
  description?: string;
  avatar_url?: string;
  website_urls?: string[];
}

export interface HubWorkflowSummary {
  share_id: string;
  name: string;
  description?: string;
  tags: LabelRef[];
  models: LabelRef[];
  custom_nodes?: LabelRef[];
  thumbnail_type?: 'image' | 'video' | 'image_comparison';
  thumbnail_url?: string;
  thumbnail_comparison_url?: string;
  publish_time?: string;
  profile: HubProfile;
}

export interface HubWorkflowDetail extends HubWorkflowSummary {
  workflow_id: string;
  tutorial_url?: string;
  metadata?: Record<string, unknown>;
  sample_image_urls?: string[];
  workflow_json: Record<string, unknown>;
  assets: AssetInfo[];
}

export interface AssetInfo {
  id: string;
  filename?: string;
  size?: number;
  content_type?: string;
  url?: string;
}

export interface HubWorkflowListResponse {
  workflows: HubWorkflowSummary[];
  next_cursor?: string;
}

/**
 * Template index entry — matches HubWorkflowTemplateEntry from the backend.
 * Returned by GET /api/hub/workflows/index in the same shape as index.json.
 */
export interface HubWorkflowTemplateEntry {
  name: string;
  title: string;
  description?: string;
  tags?: string[];
  models?: string[];
  requiresCustomNodes?: string[];
  thumbnailVariant?: string;
  mediaType?: string;
  mediaSubtype?: string;
  size?: number;
  vram?: number;
  openSource?: boolean | null;
  username?: string;
  tutorialUrl?: string;
  logos?: Record<string, unknown>[];
  date?: string;
  io?: {
    inputs?: Record<string, unknown>[];
    outputs?: Record<string, unknown>[];
  };
  includeOnDistributions?: string[];
  thumbnailUrl?: string;
  thumbnailComparisonUrl?: string;
  shareId?: string;
}

// ---------------------------------------------------------------------------
// Query parameters
// ---------------------------------------------------------------------------

export interface ListWorkflowsParams {
  cursor?: string;
  limit?: number;
  search?: string;
  tag?: string;
  username?: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

async function hubFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${HUB_API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`Hub API error: ${res.status} ${res.statusText} — ${url}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Browse hub workflows (public, no auth required).
 */
export async function listWorkflows(
  params: ListWorkflowsParams = {}
): Promise<HubWorkflowListResponse> {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set('cursor', params.cursor);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.tag) qs.set('tag', params.tag);
  if (params.username) qs.set('username', params.username);

  const query = qs.toString();
  return hubFetch<HubWorkflowListResponse>(
    `/api/hub/workflows${query ? `?${query}` : ''}`
  );
}

/**
 * Get a single workflow detail by share_id (public, no auth required).
 */
export async function getWorkflow(shareId: string): Promise<HubWorkflowDetail> {
  return hubFetch<HubWorkflowDetail>(`/api/hub/workflows/${encodeURIComponent(shareId)}`);
}

/**
 * Get a public hub profile by username.
 */
export async function getProfile(username: string): Promise<HubProfile> {
  return hubFetch<HubProfile>(`/api/hub/profiles/${encodeURIComponent(username)}`);
}

// ---------------------------------------------------------------------------
// Profile cache — built at startup from index usernames
// ---------------------------------------------------------------------------

let profileCache: Map<string, HubProfile> | null = null;

/**
 * Fetch and cache all creator profiles referenced in the workflow index.
 * Called once; subsequent calls return the cached map.
 */
export async function getProfileCache(): Promise<Map<string, HubProfile>> {
  if (profileCache) return profileCache;

  profileCache = new Map();
  try {
    const entries = await listWorkflowIndex();
    const usernames = [...new Set(entries.map((e) => e.username).filter(Boolean) as string[])];
    const results = await Promise.allSettled(usernames.map((u) => getProfile(u)));
    for (let i = 0; i < usernames.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        profileCache.set(usernames[i], result.value);
      }
    }
  } catch {
    // Index fetch failed — return empty cache, pages will use fallback display names
  }
  return profileCache;
}

// ---------------------------------------------------------------------------
// Helpers — map API responses to existing frontend data shapes
// ---------------------------------------------------------------------------

/**
 * Convert a HubWorkflowSummary to the serialized template shape
 * used by HubBrowse.vue and other Vue islands.
 */
export function toSerializedTemplate(workflow: HubWorkflowSummary) {
  return {
    name: workflow.share_id,
    title: workflow.name,
    description: workflow.description || '',
    mediaType: inferMediaType(workflow),
    tags: (workflow.tags || []).map((t) => t.name),
    models: (workflow.models || []).map((m) => m.name),
    logos: [] as { provider: string | string[] }[],
    usage: 0,
    date: workflow.publish_time || '',
    thumbnails: buildThumbnailList(workflow),
    username: workflow.profile.username,
    creatorDisplayName: workflow.profile.display_name || workflow.profile.username,
    creatorAvatarUrl: workflow.profile.avatar_url || '',
    isApp: false,
  };
}

/**
 * Convert a HubWorkflowDetail to the template data shape
 * used by [slug].astro and TemplateDetailPage.astro.
 */
export function toTemplateData(workflow: HubWorkflowDetail) {
  const mediaType =
    (workflow.metadata?.media_type as string) || inferMediaType(workflow);
  const mediaSubtype = (workflow.metadata?.media_subtype as string) || undefined;

  return {
    name: workflow.share_id,
    title: workflow.name,
    description: workflow.description || '',
    extendedDescription: (workflow.metadata?.extendedDescription as string) || '',
    mediaType: mediaType as 'image' | 'video' | 'audio' | '3d',
    mediaSubtype,
    thumbnailVariant: mapThumbnailVariant(workflow.thumbnail_type),
    thumbnails: buildThumbnailList(workflow),
    tags: (workflow.tags || []).map((t) => t.name),
    models: (workflow.models || []).map((m) => m.name),
    username: workflow.profile.username,
    date: workflow.publish_time || '',
    metaDescription: (workflow.metadata?.metaDescription as string) || workflow.description || '',
    faqItems: (workflow.metadata?.faqItems as { question: string; answer: string }[]) || [],
    tutorialUrl: workflow.tutorial_url,
  };
}

function inferMediaType(workflow: HubWorkflowSummary): 'image' | 'video' | 'audio' | '3d' {
  const tags = (workflow.tags || []).map((t) => t.name.toLowerCase());
  if (tags.includes('video') || tags.includes('animation')) return 'video';
  if (tags.includes('audio')) return 'audio';
  if (tags.includes('3d')) return '3d';
  return 'image';
}

function buildThumbnailList(workflow: HubWorkflowSummary): string[] {
  const list: string[] = [];
  if (workflow.thumbnail_url) list.push(workflow.thumbnail_url);
  if (workflow.thumbnail_comparison_url) list.push(workflow.thumbnail_comparison_url);
  return list;
}

/**
 * Fetch all workflows in template index format (build-time helper).
 * Single request — backend returns the full list with no pagination.
 */
export async function listWorkflowIndex(): Promise<HubWorkflowTemplateEntry[]> {
  return hubFetch<HubWorkflowTemplateEntry[]>('/api/hub/workflows/index');
}

// ---------------------------------------------------------------------------
// URL utilities — /workflows/{slug}-{shareId} format
// ---------------------------------------------------------------------------

const SHARE_ID_LENGTH = 12;

/**
 * Build a workflow URL path from an index entry.
 * Format: /workflows/{slug}-{shareId}/
 */
export function workflowUrl(entry: HubWorkflowTemplateEntry): string {
  const slug = entry.name || entry.shareId || '';
  const shareId = entry.shareId || '';
  return `/workflows/${slug}-${shareId}/`;
}

/**
 * Extract the share_id from a workflow URL segment.
 * The last 12 characters after the final hyphen are the share_id.
 * e.g. "flux-schnell-e90e933d6c5d" → "e90e933d6c5d"
 */
export function extractShareId(urlSegment: string): string | null {
  const lastHyphen = urlSegment.lastIndexOf('-');
  if (lastHyphen === -1) return null;
  const candidate = urlSegment.slice(lastHyphen + 1);
  if (candidate.length === SHARE_ID_LENGTH && /^[0-9a-f]+$/.test(candidate)) {
    return candidate;
  }
  return null;
}

function mapThumbnailVariant(
  type?: string
): 'compareSlider' | 'hoverDissolve' | 'hoverZoom' | 'zoomHover' | undefined {
  if (type === 'image_comparison') return 'compareSlider';
  return undefined;
}
