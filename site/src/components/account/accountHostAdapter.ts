import { AccountError, MalformedResponseError } from '@comfyorg/account/core';
import type {
  AccountHostAdapter,
  BillingBalanceResponse,
  StorageKey,
  TransportRequest,
  WorkspaceCredential,
} from '@comfyorg/account/core';
import type { Auth } from 'firebase/auth';

export interface AccountLayerDebug {
  billingRequests: number;
  sessionExchanges: number;
  lastBillingSessionExchange: number | null;
  credentialLifetimeMs: number | null;
  refreshScheduleDelayMs: number | null;
  runScheduledRefresh(): void;
  refreshCredits?(): Promise<void>;
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
