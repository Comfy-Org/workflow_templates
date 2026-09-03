import {
  AccountError,
  MalformedResponseError,
  createBillingApiClient,
  createBillingCommands,
} from '@comfyorg/account/core';
import type {
  AccountHostAdapter,
  AccountLayerOperationRecord,
  AccountLayerPocSeam,
  BillingBalanceResponse,
  BillingCommands,
  BillingOperationResponse,
  BillingState,
  SessionClient,
  StorageKey,
  TransportRequest,
  WorkspaceCredential,
} from '@comfyorg/account/core';
import type { Auth } from 'firebase/auth';

export interface AccountLayerDebug extends Partial<AccountLayerPocSeam> {
  billingRequests: number;
  sessionExchanges: number;
  lastBillingSessionExchange: number | null;
  credentialLifetimeMs: number | null;
  refreshScheduleDelayMs: number | null;
  runScheduledRefresh(): void;
  refreshCredits?(): Promise<void>;
  billingPosts: number;
  openUrlCalls: number;
  lastCheckoutUrl: string | null;
  payment: BillingState;
  operationStore: AccountLayerOperationRecord | null;
  injectOperationResponse(response: BillingOperationResponse): Promise<void>;
  projectPaymentState?(state: BillingState): Promise<void>;
  getBillingStatus?(): Promise<Record<string, unknown>>;
}

export function createAccountBillingCommands(
  auth: Auth,
  cloudBaseUrl: string,
  getActiveWorkspace: () => string | null,
  session: SessionClient,
  debug: AccountLayerDebug
): BillingCommands {
  let injectedResponse: BillingOperationResponse | undefined;
  let operationContext: Omit<AccountLayerOperationRecord, 'id'> = {
    kind: 'subscribe',
    started_at: Date.now(),
    return_url: null,
  };
  const key = () =>
    `comfy-hub-account-layer-poc:${auth.currentUser?.uid ?? 'signed-out'}:${getActiveWorkspace() ?? 'no-workspace'}:billing:active-operation`;
  const operationStore = {
    namespace: 'comfy-hub-account-layer-poc',
    async getActiveId() {
      const value = localStorage.getItem(key());
      if (!value) return null;
      const record = JSON.parse(value) as AccountLayerOperationRecord;
      debug.operationStore = record;
      return record.id;
    },
    async setActiveId(id: string) {
      const record = { id, ...operationContext };
      localStorage.setItem(key(), JSON.stringify(record));
      debug.operationStore = record;
    },
    async clearActiveId() {
      localStorage.removeItem(key());
      debug.operationStore = null;
    },
  };
  const client = createBillingApiClient({
    async transport(request) {
      if (request.method === 'GET' && injectedResponse) {
        return { status: 200, body: injectedResponse };
      }
      const state = session.getState();
      if (state.phase !== 'authenticated' && state.phase !== 'refreshing') {
        throw new AccountError('Account session is unavailable');
      }
      if (request.method === 'POST') {
        const kind = request.path.includes('/topup')
          ? 'topup'
          : request.path.includes('/resubscribe')
            ? 'resubscribe'
            : request.path.includes('/cancel')
              ? 'cancel'
              : 'subscribe';
        operationContext = {
          kind,
          started_at: Date.now(),
          return_url: kind === 'subscribe' ? `${window.location.origin}/poc/account-layer` : null,
        };
      }
      if (request.method === 'POST') debug.billingPosts++;
      const response = await fetch(`${cloudBaseUrl}${request.path}`, {
        method: request.method,
        headers: {
          ...request.headers,
          Authorization: `Bearer ${state.credential.token}`,
          'Content-Type': 'application/json',
        },
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
      });
      const body = record(await response.json().catch(() => null));
      return {
        status: response.status,
        body: {
          ...body,
          action_url:
            typeof body.action_url === 'string' ? body.action_url : body.payment_method_url,
        },
      };
    },
  });
  const commands = createBillingCommands({
    client,
    ports: {
      operationStore,
      clock: {
        now: Date.now,
        schedule: (fn, delayMs) => setTimeout(fn, delayMs),
        cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
      },
      async openUrl(url) {
        debug.openUrlCalls++;
        debug.lastCheckoutUrl = url;
        debug.lastOpenedUrl = url;
        return { opened: window.open(url, '_blank') !== null };
      },
    },
  });
  debug.getBillingStatus = () => client.getStatus() as Promise<Record<string, unknown>>;
  commands.subscribeState((state) => {
    debug.payment = state;
  });
  debug.injectOperationResponse = async (response) => {
    if (response.status === 'pending' && response.action_url) {
      await debug.projectPaymentState?.({
        step: 'verifying',
        actionUrl: response.action_url,
        noChargeConfirmed: false,
      });
      return;
    }
    injectedResponse = response;
    operationContext = {
      kind: 'subscribe',
      started_at: Date.now(),
      return_url: `${window.location.origin}/poc/account-layer`,
    };
    await operationStore.setActiveId('injected-operation');
    await commands.start();
    await debug.projectPaymentState?.(debug.payment);
  };
  return commands;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new MalformedResponseError();
  return value as Record<string, unknown>;
}

export function decodeCredential(value: unknown): WorkspaceCredential {
  const input = record(value);
  const workspace = record(input.workspace);
  const expiresAt =
    typeof input.expires_at === 'string' ? new Date(input.expires_at).getTime() : Number.NaN;
  if (
    typeof input.token !== 'string' ||
    typeof workspace.id !== 'string' ||
    !Number.isFinite(expiresAt)
  ) {
    throw new MalformedResponseError();
  }
  return { token: input.token, workspaceId: workspace.id, expiresAt };
}

export function decodeBalance(value: unknown): BillingBalanceResponse {
  const input = record(value);
  if (typeof input.effective_balance_micros !== 'number') throw new MalformedResponseError();
  return { balance: input.effective_balance_micros };
}

function storageName(key: StorageKey): string {
  return `${key.namespace}:${key.userId}:${key.workspaceId}`;
}

export function createAccountHostAdapter(
  auth: Auth,
  apiBaseUrl: string,
  getActiveWorkspace: () => string | null,
  debug: AccountLayerDebug
): AccountHostAdapter {
  return {
    namespace: 'comfy-hub-account-layer-poc',
    scheduler: {
      now: Date.now,
      schedule(fn, delayMs) {
        debug.runScheduledRefresh = fn;
        debug.refreshScheduleDelayMs = delayMs;
        return setTimeout(fn, delayMs);
      },
      cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    },
    async acquireIdentity(options) {
      const user = auth.currentUser;
      if (!user) return null;
      return { userId: user.uid, token: await user.getIdToken(options?.forceRefresh ?? false) };
    },
    getActiveWorkspace,
    storage: {
      async read(key) {
        const value = localStorage.getItem(storageName(key));
        return value === null ? null : JSON.parse(value);
      },
      async write(key, value) {
        localStorage.setItem(storageName(key), JSON.stringify(value));
      },
      async clear(key) {
        localStorage.removeItem(storageName(key));
      },
    },
    operations: {
      exchange: {
        idempotent: true,
        makeRequest: ({ identity, workspaceId }, signal) => ({
          method: 'POST',
          path: '/api/auth/token',
          headers: {
            Authorization: `Bearer ${identity.token}`,
            'Content-Type': 'application/json',
          },
          body: { identityToken: identity.token, workspaceId, workspace_id: workspaceId },
          signal,
        }),
        response: {
          decode(value) {
            const credential = decodeCredential(value);
            debug.sessionExchanges++;
            debug.credentialLifetimeMs = credential.expiresAt - Date.now();
            return credential;
          },
        },
        mapError: (status) => new AccountError(`Account exchange failed (${status})`, status),
      },
      balance: {
        idempotent: true,
        makeRequest: ({ credential }, signal) => {
          debug.lastBillingSessionExchange = debug.sessionExchanges;
          return {
            method: 'GET',
            path: '/api/billing/balance',
            headers: { Authorization: `Bearer ${credential.token}` },
            signal,
          };
        },
        response: {
          decode(value) {
            debug.billingRequests++;
            return decodeBalance(value);
          },
        },
        mapError: (status) => new AccountError(`Account balance failed (${status})`, status),
      },
    },
    async transport(request: TransportRequest<unknown>) {
      const response = await fetch(`${apiBaseUrl}${request.path}`, {
        method: request.method,
        headers: request.headers,
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
      });
      return { status: response.status, body: await response.json().catch(() => null) };
    },
  };
}
