import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HubWorkflowTemplateEntry } from '../../src/lib/hub-api';

const approvedEntries: HubWorkflowTemplateEntry[] = [
  { name: 'approved-1', title: 'Approved 1', status: 'approved' },
  { name: 'approved-2', title: 'Approved 2', status: 'approved' },
];

const allEntries: HubWorkflowTemplateEntry[] = [
  ...approvedEntries,
  { name: 'pending-1', title: 'Pending 1', status: 'pending' },
  { name: 'rejected-1', title: 'Rejected 1', status: 'rejected' },
  { name: 'deprecated-1', title: 'Deprecated 1', status: 'deprecated' },
];

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function mockFetchReturning(data: unknown) {
  fetchSpy.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

describe('listWorkflowIndex status filtering', () => {
  it('uses API default (approved-only) when PUBLIC_APPROVED_ONLY is true', async () => {
    vi.stubEnv('PUBLIC_APPROVED_ONLY', 'true');
    mockFetchReturning(approvedEntries);

    const { listWorkflowIndex } = await import('../../src/lib/hub-api');
    const result = await listWorkflowIndex();

    expect(result).toHaveLength(2);
    expect(result.every((e) => e.status === 'approved')).toBe(true);

    // Should NOT pass ?status= param — API defaults to approved
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/hub/workflows/index');
    expect(calledUrl).not.toContain('?status=');
  });

  it('passes all statuses when PUBLIC_APPROVED_ONLY is not set', async () => {
    mockFetchReturning(allEntries);

    const { listWorkflowIndex } = await import('../../src/lib/hub-api');
    const result = await listWorkflowIndex();

    expect(result).toHaveLength(5);

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('?status=pending,approved,rejected,deprecated');
  });

  it('caches the result across multiple calls', async () => {
    mockFetchReturning(approvedEntries);

    const { listWorkflowIndex } = await import('../../src/lib/hub-api');
    await listWorkflowIndex();
    await listWorkflowIndex();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('listWorkflows status param', () => {
  it('passes status filter as comma-separated query param', async () => {
    mockFetchReturning({ workflows: [], next_cursor: '' });

    const { listWorkflows } = await import('../../src/lib/hub-api');
    await listWorkflows({ status: ['pending', 'approved'] });

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('status=pending%2Capproved');
  });

  it('omits status param when not specified', async () => {
    mockFetchReturning({ workflows: [], next_cursor: '' });

    const { listWorkflows } = await import('../../src/lib/hub-api');
    await listWorkflows({});

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('status');
  });
});
