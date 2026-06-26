import { afterEach, describe, expect, it, vi } from 'vitest';

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
}));

vi.mock('posthog-js', () => ({
  default: posthogMock,
}));

async function loadPostHog() {
  vi.resetModules();
  vi.stubGlobal('window', {});
  vi.stubEnv('PUBLIC_POSTHOG_KEY', 'phc_test');
  return import('../../src/lib/posthog');
}

afterEach(() => {
  posthogMock.init.mockReset();
  posthogMock.capture.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('trackSearchPerformed', () => {
  it('tracks workflow search metadata', async () => {
    const { initPostHog, trackSearchPerformed } = await loadPostHog();

    initPostHog();
    trackSearchPerformed({
      query: ' flux ',
      resultCount: 12,
      filtersApplied: ['model:Flux', 'mode:app'],
    });

    expect(posthogMock.capture).toHaveBeenCalledWith('hub:search_performed', {
      query: 'flux',
      result_count: 12,
      surface: 'workflows',
      filters_applied: ['model:Flux', 'mode:app'],
    });
  });

  it('tracks zero-result searches', async () => {
    const { initPostHog, trackSearchPerformed } = await loadPostHog();

    initPostHog();
    trackSearchPerformed({
      query: 'nonexistent workflow',
      resultCount: 0,
      filtersApplied: [],
    });

    expect(posthogMock.capture).toHaveBeenCalledWith('hub:search_performed', {
      query: 'nonexistent workflow',
      result_count: 0,
      surface: 'workflows',
      filters_applied: [],
    });
  });

  it('skips empty queries', async () => {
    const { initPostHog, trackSearchPerformed } = await loadPostHog();

    initPostHog();
    trackSearchPerformed({
      query: '   ',
      resultCount: 1,
      filtersApplied: ['tag:image'],
    });

    expect(posthogMock.capture).not.toHaveBeenCalled();
  });
});
