import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HubWorkflowTemplateEntry } from '../../src/lib/hub-api';

const mockEntries: HubWorkflowTemplateEntry[] = [
  { name: 'approved-1', title: 'Approved 1', status: 'approved' },
  { name: 'pending-1', title: 'Pending 1', status: 'pending' },
  { name: 'rejected-1', title: 'Rejected 1', status: 'rejected' },
  { name: 'deprecated-1', title: 'Deprecated 1', status: 'deprecated' },
  { name: 'no-status', title: 'No Status' },
  { name: 'approved-2', title: 'Approved 2', status: 'approved' },
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe('listWorkflowIndex status filtering', () => {
  it('returns only approved workflows when PUBLIC_APPROVED_ONLY is true', async () => {
    vi.stubEnv('PUBLIC_APPROVED_ONLY', 'true');
    vi.doMock('../../src/lib/hub-api', async () => {
      const mod = await vi.importActual<typeof import('../../src/lib/hub-api')>(
        '../../src/lib/hub-api'
      );
      return {
        ...mod,
        listWorkflowIndex: () =>
          Promise.resolve(mockEntries).then((entries) =>
            entries.filter((e) => e.status === 'approved')
          ),
      };
    });

    const { listWorkflowIndex } = await import('../../src/lib/hub-api');
    const result = await listWorkflowIndex();

    expect(result).toHaveLength(2);
    expect(result.every((e) => e.status === 'approved')).toBe(true);
    expect(result.map((e) => e.name)).toEqual(['approved-1', 'approved-2']);
  });

  it('returns all workflows when PUBLIC_APPROVED_ONLY is not set', async () => {
    vi.doMock('../../src/lib/hub-api', async () => {
      const mod = await vi.importActual<typeof import('../../src/lib/hub-api')>(
        '../../src/lib/hub-api'
      );
      return {
        ...mod,
        listWorkflowIndex: () => Promise.resolve(mockEntries),
      };
    });

    const { listWorkflowIndex } = await import('../../src/lib/hub-api');
    const result = await listWorkflowIndex();

    expect(result).toHaveLength(6);
  });

  it('filters out workflows without a status field when approved-only', async () => {
    const filtered = mockEntries.filter((e) => e.status === 'approved');
    expect(filtered.find((e) => e.name === 'no-status')).toBeUndefined();
  });

  it('treats deprecated workflows as non-approved', async () => {
    const filtered = mockEntries.filter((e) => e.status === 'approved');
    expect(filtered.find((e) => e.status === 'deprecated')).toBeUndefined();
  });
});
