import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getCloudCtaUrl,
  getCloudLandingUrl,
  getComfyCloudBaseUrl,
  getWorkflowDownloadUrl,
  getPricingUrl,
} from '../../src/lib/urls';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getCloudCtaUrl', () => {
  it('includes all required UTM parameters', () => {
    const url = getCloudCtaUrl('my-template', 'hero');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('utm_source')).toBe('workflow_hub');
    expect(parsed.searchParams.get('utm_medium')).toBe('site_CTA');
    expect(parsed.searchParams.get('utm_campaign')).toBe('hub_preview');
    expect(parsed.searchParams.get('utm_content')).toBe('my-template');
    expect(parsed.searchParams.get('utm_term')).toBe('hero');
    expect(parsed.searchParams.get('share')).toBe('my-template');
  });

  it('uses cloud.comfy.org as the default base', () => {
    const url = getCloudCtaUrl('test', 'footer');
    expect(new URL(url).origin).toBe('https://cloud.comfy.org');
  });

  it('does not include mode parameter', () => {
    const url = getCloudCtaUrl('test', 'nav');
    const parsed = new URL(url);
    expect(parsed.searchParams.has('mode')).toBe(false);
  });

  it('uses PUBLIC_COMFY_CLOUD_URL when set', () => {
    vi.stubEnv('PUBLIC_COMFY_CLOUD_URL', 'https://testcloud.comfy.org');

    expect(getComfyCloudBaseUrl()).toBe('https://testcloud.comfy.org');
    expect(new URL(getCloudCtaUrl('test', 'hero')).origin).toBe('https://testcloud.comfy.org');
    expect(new URL(getCloudLandingUrl('site_button')).origin).toBe('https://testcloud.comfy.org');
  });

  it('builds canonical workflow download URLs from shareId', () => {
    expect(getWorkflowDownloadUrl('abc123def456')).toBe('/workflows/download/abc123def456.json');
    expect(getWorkflowDownloadUrl('abc123def456', 'video_ltx2_3_i2v')).toBe(
      '/workflows/download/abc123def456.json?filename=video_ltx2_3_i2v'
    );
  });
});

describe('getPricingUrl', () => {
  it('points at the pricing page with UTM params appended', () => {
    const url = new URL(getPricingUrl('usecase_headshot_banner'));
    expect(url.origin + url.pathname).toBe('https://comfy.org/cloud/pricing');
    expect(url.searchParams.get('utm_source')).toBe('workflow_hub');
    expect(url.searchParams.get('utm_medium')).toBe('site_CTA');
    expect(url.searchParams.get('utm_campaign')).toBe('hub_preview');
    expect(url.searchParams.get('utm_content')).toBe('usecase_headshot_banner');
  });
});
