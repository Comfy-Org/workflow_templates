/**
 * Hub API client for fetching workflow data from the backend.
 *
 * API spec based on cloud PR #2840.
 * Base URL is configurable via PUBLIC_HUB_API_URL env var.
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

export interface HubLabelInfo {
  name: string;
  display_name: string;
  description?: string;
  type: 'tag' | 'model' | 'custom_node';
}

export interface HubProfile {
  id: string;
  username: string;
  display_name?: string;
  description?: string;
  avatar_url?: string;
}

export interface HubWorkflowSummary {
  share_id: string;
  name: string;
  description?: string;
  tags: LabelRef[];
  models: LabelRef[];
  custom_nodes: LabelRef[];
  thumbnail_type?: 'image' | 'video' | 'image_comparison';
  thumbnail_url?: string;
  thumbnail_comparison_url?: string;
  publish_time?: string;
  profile: HubProfile;
}

export interface HubWorkflowDetail extends HubWorkflowSummary {
  workflow_id: string;
  listed: boolean;
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

export interface HubLabelListResponse {
  labels: HubLabelInfo[];
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
      'Content-Type': 'application/json',
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
 * List hub labels, optionally filtered by type (public, no auth required).
 */
export async function listLabels(
  type?: 'tag' | 'model' | 'custom_node'
): Promise<HubLabelListResponse> {
  const qs = type ? `?type=${type}` : '';
  return hubFetch<HubLabelListResponse>(`/api/hub/labels${qs}`);
}

/**
 * Get a public hub profile by username.
 */
export async function getProfile(username: string): Promise<HubProfile> {
  return hubFetch<HubProfile>(`/api/hub/profiles/${encodeURIComponent(username)}`);
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
    tags: workflow.tags.map((t) => t.name),
    models: workflow.models.map((m) => m.name),
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
  return {
    name: workflow.share_id,
    title: workflow.name,
    description: workflow.description || '',
    extendedDescription: (workflow.metadata?.extendedDescription as string) || '',
    mediaType: inferMediaType(workflow) as 'image' | 'video' | 'audio' | '3d',
    mediaSubtype: undefined as string | undefined,
    thumbnailVariant: mapThumbnailVariant(workflow.thumbnail_type),
    thumbnails: buildThumbnailList(workflow),
    tags: workflow.tags.map((t) => t.name),
    models: workflow.models.map((m) => m.name),
    username: workflow.profile.username,
    date: workflow.publish_time || '',
    metaDescription: (workflow.metadata?.metaDescription as string) || workflow.description || '',
    faqItems: (workflow.metadata?.faqItems as { question: string; answer: string }[]) || [],
    tutorialUrl: workflow.tutorial_url,
  };
}

function inferMediaType(workflow: HubWorkflowSummary): string {
  const tags = workflow.tags.map((t) => t.name.toLowerCase());
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

function mapThumbnailVariant(
  type?: string
): 'compareSlider' | 'hoverDissolve' | 'hoverZoom' | 'zoomHover' | undefined {
  if (type === 'image_comparison') return 'compareSlider';
  return undefined;
}
