import { describe, it, expect } from 'vitest';
import { getCloudCtaUrl } from '../../src/lib/urls';

describe('getCloudCtaUrl', () => {
  it('includes all required UTM parameters', () => {
    const url = getCloudCtaUrl('my-template', 'hero');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('utm_source')).toBe('workflow_hub');
    expect(parsed.searchParams.get('utm_medium')).toBe('site_CTA');
    expect(parsed.searchParams.get('utm_campaign')).toBe('hub_preview');
    expect(parsed.searchParams.get('utm_content')).toBe('my-template');
    expect(parsed.searchParams.get('utm_term')).toBe('hero');
    expect(parsed.searchParams.get('template')).toBe('my-template');
  });

  it('uses cloud.comfy.org as base', () => {
    const url = getCloudCtaUrl('test', 'footer');
    expect(url).toContain('cloud.comfy.org');
  });

  it('does not include mode parameter', () => {
    const url = getCloudCtaUrl('test', 'nav');
    const parsed = new URL(url);
    expect(parsed.searchParams.has('mode')).toBe(false);
  });
});
