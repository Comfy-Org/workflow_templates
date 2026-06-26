import { describe, expect, it } from 'vitest';
import { getLogoPath, providerLogos, providerName } from '../../src/lib/provider-logos';

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

  it('returns null for an unknown provider', () => {
    expect(getLogoPath('Totally Unknown Co')).toBeNull();
  });

  it('does not match a key as a partial substring inside an unrelated word', () => {
    expect(getLogoPath('Swan AI')).toBeNull();
    expect(getLogoPath('Conflux Labs')).toBeNull();
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

  it('returns an empty array for missing or empty input', () => {
    expect(providerLogos(undefined)).toEqual([]);
    expect(providerLogos([])).toEqual([]);
    expect(providerLogos([{ provider: [] }])).toEqual([]);
  });
});
