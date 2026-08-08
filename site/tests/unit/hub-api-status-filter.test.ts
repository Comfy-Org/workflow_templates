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
  it('requests only approved when PUBLIC_APPROVED_ONLY is true', async () => {
    vi.stubEnv('PUBLIC_APPROVED_ONLY', 'true');
    mockFetchReturning(approvedEntries);

    const { listWorkflowIndex } = await import('../../src/lib/hub-api');
    const result = await listWorkflowIndex();

    expect(result).toHaveLength(2);
    expect(result.every((e) => e.status === 'approved')).toBe(true);

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('?status=approved');
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

describe('Hub workflow classification', () => {
  it('uses the canonical index defaultView instead of the filename', async () => {
    const { serializeIndexEntry } = await import('../../src/lib/hub-api');

    const app = serializeIndexEntry(
      { name: 'plain-name', title: 'App', status: 'approved', defaultView: 'app' },
      new Map()
    );
    const workflow = serializeIndexEntry(
      { name: 'legacy.app', title: 'Workflow', status: 'approved', defaultView: 'workflow' },
      new Map()
    );

    expect(app.isApp).toBe(true);
    expect(workflow.isApp).toBe(false);
  });

  it('uses the canonical summary default_view instead of the display name', async () => {
    const { toSerializedTemplate } = await import('../../src/lib/hub-api');
    const template = toSerializedTemplate({
      share_id: 'share-1',
      name: 'not-an-app-name',
      status: 'approved',
      default_view: 'app',
      tags: [],
      models: [],
      profile: { username: 'alice' },
    });

    expect(template.isApp).toBe(true);
  });

  it('keeps the .app fallback for legacy API responses', async () => {
    const { serializeIndexEntry } = await import('../../src/lib/hub-api');
    const template = serializeIndexEntry(
      { name: 'legacy.app', title: 'Legacy', status: 'approved' },
      new Map()
    );

    expect(template.isApp).toBe(true);
  });
});
