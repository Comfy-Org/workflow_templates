import { describe, expect, it } from 'vitest';
import {
  getLogoPath,
  providerLogos,
  providerName,
  resolveTemplateLogos,
} from '../../src/lib/model-logos';

describe('getLogoPath', () => {
  it('resolves an exact provider name to its logo asset', () => {
    expect(getLogoPath('OpenAI')).toBe('/logos/openai.png');
  });

  it('maps aliased names to a shared slug', () => {
    // Stability / Stable Diffusion / SDXL all share the "stability" logo.
    expect(getLogoPath('Stable Diffusion')).toBe('/logos/stability.png');
    expect(getLogoPath('SDXL')).toBe('/logos/stability.png');
  });

  it('falls back to a case-insensitive substring match', () => {
    expect(getLogoPath('Flux.1 [dev]')).toBe('/logos/bfl.png');
    expect(getLogoPath('google gemini')).toBe('/logos/google.png');
  });

  it('matches a family key that runs straight into a version', () => {
    expect(getLogoPath('Wan2.2')).toBe('/logos/wan.png');
    expect(getLogoPath('Hunyuan3D')).toBe('/logos/hunyuan.png');
    expect(getLogoPath('grok-2')).toBe('/logos/grok.png');
    expect(getLogoPath('Nano Banana Pro')).toBe('/logos/google.png');
    expect(getLogoPath('GPT-Image-1.5')).toBe('/logos/openai.png');
    expect(getLogoPath('Seedance 1.5 Pro')).toBe('/logos/bytedance.png');
  });

  it('resolves a known compound name via an explicit key', () => {
    // "TripoSplat" continues with letters, so it needs its own map entry.
    expect(getLogoPath('TripoSplat')).toBe('/logos/tripo.png');
  });

  it('returns null for an unknown provider', () => {
    expect(getLogoPath('Totally Unknown Co')).toBeNull();
  });

  it('does not match a key buried in or prefixing a different word', () => {
    expect(getLogoPath('Swan AI')).toBeNull();
    expect(getLogoPath('Conflux Labs')).toBeNull();
    // Key at a word start but continuing into a different word must not match.
    expect(getLogoPath('waning')).toBeNull();
    expect(getLogoPath('pikachu')).toBeNull();
  });
});

describe('providerName', () => {
  it('returns the single provider string', () => {
    expect(providerName([{ provider: 'OpenAI' }])).toBe('OpenAI');
  });

  it('returns the first entry of a multi-provider array', () => {
    expect(providerName([{ provider: ['Flux', 'Google'] }])).toBe('Flux');
  });

  it('returns null when logos is missing or empty', () => {
    expect(providerName(undefined)).toBeNull();
    expect(providerName([])).toBeNull();
  });

  it('returns null when the first entry has an empty provider array', () => {
    expect(providerName([{ provider: [] }])).toBeNull();
  });
});

describe('providerLogos', () => {
  it('resolves each distinct provider to its logo, preserving order', () => {
    expect(providerLogos([{ provider: 'OpenAI' }, { provider: 'Google' }])).toEqual([
      { name: 'OpenAI', logoPath: '/logos/openai.png' },
      { name: 'Google', logoPath: '/logos/google.png' },
    ]);
  });

  it('flattens provider arrays and dedupes repeats', () => {
    expect(providerLogos([{ provider: ['Flux', 'Google'] }, { provider: 'Flux' }])).toEqual([
      { name: 'Flux', logoPath: '/logos/bfl.png' },
      { name: 'Google', logoPath: '/logos/google.png' },
    ]);
  });

  it('drops providers with no resolvable logo', () => {
    expect(providerLogos([{ provider: 'Google' }, { provider: 'Totally Unknown Co' }])).toEqual([
      { name: 'Google', logoPath: '/logos/google.png' },
    ]);
  });

  it('dedupes aliases that resolve to the same logo', () => {
    // Google and Gemini both map to /logos/google.png — one badge, not two.
    expect(providerLogos([{ provider: 'Google' }, { provider: 'Gemini' }])).toEqual([
      { name: 'Google', logoPath: '/logos/google.png' },
    ]);
  });

  it('returns an empty array for missing or empty input', () => {
    expect(providerLogos(undefined)).toEqual([]);
    expect(providerLogos([])).toEqual([]);
    expect(providerLogos([{ provider: [] }])).toEqual([]);
  });
});

describe('resolveTemplateLogos', () => {
  it('prefers the structured logos, one badge per distinct provider in order', () => {
    expect(
      resolveTemplateLogos({ logos: [{ provider: 'OpenAI' }, { provider: 'Google' }] })
    ).toEqual([
      { src: '/logos/openai.png', name: 'OpenAI' },
      { src: '/logos/google.png', name: 'Google' },
    ]);
  });

  it('flattens provider arrays and dedupes repeats', () => {
    expect(
      resolveTemplateLogos({ logos: [{ provider: ['Flux', 'Google'] }, { provider: 'Flux' }] })
    ).toEqual([
      { src: '/logos/bfl.png', name: 'Flux' },
      { src: '/logos/google.png', name: 'Google' },
    ]);
  });

  it('lets logos win and ignores models when both are present', () => {
    expect(resolveTemplateLogos({ logos: [{ provider: 'OpenAI' }], models: ['Wan2.2'] })).toEqual([
      { src: '/logos/openai.png', name: 'OpenAI' },
    ]);
  });

  it('falls back to the models list when no structured logos are present', () => {
    expect(resolveTemplateLogos({ models: ['Wan2.2', 'Flux.1 [dev]'] })).toEqual([
      { src: '/logos/wan.png', name: 'Wan2.2' },
      { src: '/logos/bfl.png', name: 'Flux.1 [dev]' },
    ]);
  });

  it('dedupes model entries that resolve to the same logo', () => {
    // SDXL and Stable Diffusion both map to the "stability" asset.
    expect(resolveTemplateLogos({ models: ['SDXL', 'Stable Diffusion'] })).toEqual([
      { src: '/logos/stability.png', name: 'SDXL' },
    ]);
  });

  it('drops models with no resolvable logo', () => {
    expect(resolveTemplateLogos({ models: ['Totally Unknown Co', 'Google'] })).toEqual([
      { src: '/logos/google.png', name: 'Google' },
    ]);
  });

  it('returns an empty array when neither logos nor models resolve', () => {
    expect(resolveTemplateLogos({})).toEqual([]);
    expect(resolveTemplateLogos({ models: [], logos: [] })).toEqual([]);
  });
});
