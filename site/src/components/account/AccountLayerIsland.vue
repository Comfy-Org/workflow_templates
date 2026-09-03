<script setup lang="ts">
import {
  AccountLayerReadinessTimeoutError,
  billingCopyKeys,
  createBillingClient,
  createSessionClient,
} from '@comfyorg/account/core';
import type { AccountLayerPocSeam, BillingState } from '@comfyorg/account/core';
import {
  billingClientKey,
  CheckoutSteps,
  CreditsDisplay,
  useCheckout,
  useTopUp,
} from '@comfyorg/account/vue';
import { initializeApp } from 'firebase/app';
import { getAuth, onIdTokenChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { computed, onUnmounted, provide, ref } from 'vue';
import { createAccountBillingCommands, createAccountHostAdapter } from './accountHostAdapter';
import type { AccountLayerDebug } from './accountHostAdapter';

const email = ref('');
const password = ref('');
const authenticated = ref(false);
const error = ref('');
const workspaceId = ref<string | null>(null);
const app = initializeApp({
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const debug: AccountLayerDebug = {
  billingRequests: 0,
  sessionExchanges: 0,
  lastBillingSessionExchange: null,
  credentialLifetimeMs: null,
  refreshScheduleDelayMs: null,
  runScheduledRefresh: () => undefined,
  billingPosts: 0,
  openUrlCalls: 0,
  lastCheckoutUrl: null,
  lastOpenedUrl: null,
  payment: { step: 'select', noChargeConfirmed: false },
  operationStore: null,
  injectOperationResponse: async () => undefined,
};
const adapter = createAccountHostAdapter(
  auth,
  import.meta.env.PUBLIC_CLOUD_BASE_URL,
  () => workspaceId.value,
  debug
);
const session = createSessionClient(adapter);
const billing = createBillingClient(session, adapter);
const paymentCommands = createAccountBillingCommands(
  auth,
  import.meta.env.PUBLIC_CLOUD_BASE_URL,
  () => workspaceId.value,
  session,
  debug
);
const checkout = useCheckout(paymentCommands);
const topUp = useTopUp(paymentCommands);
const injectedPaymentState = ref<typeof checkout.state.value | null>(null);
const paymentState = computed(() => injectedPaymentState.value ?? checkout.state.value);
const paymentCopyKey = computed(() => billingCopyKeys(paymentState.value).body);
debug.projectPaymentState = async (state) => {
  injectedPaymentState.value = state;
};
provide(billingClientKey, billing);
debug.refreshCredits = () => billing.refreshCredits();
let initialization: Promise<void> | undefined;
const readinessTimeoutMs = 10_000;

async function whenAuthenticated(timeoutMs = readinessTimeoutMs): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const phase = session.getState().phase;
    if (phase === 'authenticated' || phase === 'refreshing') return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new AccountLayerReadinessTimeoutError(timeoutMs);
}

async function readyMutation(mutation: () => Promise<void>): Promise<void> {
  if (auth.currentUser) await initializeUser(auth.currentUser);
  await whenAuthenticated();
  await mutation();
}

async function resolveWorkspace(identityToken: string): Promise<string> {
  const response = await fetch(`${import.meta.env.PUBLIC_CLOUD_BASE_URL}/api/workspaces`, {
    headers: { Authorization: `Bearer ${identityToken}` },
  });
  const body: unknown = await response.json();
  const values = Array.isArray(body) ? body : (body as { workspaces?: unknown }).workspaces;
  if (!Array.isArray(values) || typeof values[0]?.id !== 'string') {
    throw new Error('No workspace is available');
  }
  return values[0].id;
}

async function login(): Promise<void> {
  error.value = '';
  try {
    const result = await signInWithEmailAndPassword(auth, email.value, password.value);
    await initializeUser(result.user);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Sign-in failed';
  }
}

async function initializeUser(user: User): Promise<void> {
  if (authenticated.value) return;
  initialization ??= (async () => {
    workspaceId.value = await resolveWorkspace(await user.getIdToken());
    await session.establishSession();
    await billing.refreshCredits();
    await paymentCommands.start();
    authenticated.value = true;
  })().finally(() => {
    initialization = undefined;
  });
  await initialization;
}

async function subscribe(): Promise<void> {
  const returnBase = `${window.location.origin}/poc/account-layer`;
  await checkout.submit({
    plan_slug: 'pro-monthly',
    return_url: `${returnBase}?payment=success`,
    cancel_url: `${returnBase}?payment=failed`,
  });
}

async function submitTopUp(): Promise<void> {
  await topUp.submit({ amount_cents: 500, idempotency_key: crypto.randomUUID() });
}

async function logout(): Promise<void> {
  await session.clearSession();
  await signOut(auth);
  authenticated.value = false;
  workspaceId.value = null;
}

const seam: AccountLayerPocSeam = {
  getSessionPhase: () => session.getState().phase,
  whenAuthenticated,
  subscribe: (planId = 'pro-monthly') =>
    readyMutation(() =>
      checkout.submit({
        plan_slug: planId,
        return_url: `${window.location.origin}/poc/account-layer?payment=success`,
        cancel_url: `${window.location.origin}/poc/account-layer?payment=failed`,
      })
    ),
  topUp: (amount = 500) =>
    readyMutation(() =>
      topUp.submit({ amount_cents: amount, idempotency_key: crypto.randomUUID() })
    ),
  cancelSubscription: () => readyMutation(() => paymentCommands.cancelSubscription({})),
  resubscribe: () => readyMutation(() => paymentCommands.resubscribe({ plan_slug: 'pro-monthly' })),
  openPaymentPortal: () =>
    readyMutation(async () => {
      await paymentCommands.openPaymentPortal({
        return_url: `${window.location.origin}/poc/account-layer`,
      });
    }),
  projectPaymentState: async (state: BillingState) => {
    injectedPaymentState.value = state;
  },
  getPaymentState: () => paymentState.value,
  getOperationStore: () => debug.operationStore,
  refreshCredits: () => billing.refreshCredits(),
  getCredits: () => billing.getCreditsState(),
  signOut: logout,
  get lastOpenedUrl() {
    return debug.lastOpenedUrl ?? null;
  },
};
Object.assign(debug, seam);
Object.assign(window, { __accountLayerPoc: debug });

const unsubscribeAuth = onIdTokenChanged(auth, (user) => {
  if (!user) {
    authenticated.value = false;
    return;
  }
  void initializeUser(user).catch((cause) => {
    error.value = cause instanceof Error ? cause.message : 'Sign-in failed';
  });
});
onUnmounted(unsubscribeAuth);
</script>

<template>
  <main class="mx-auto max-w-md p-8" data-testid="account-layer-poc">
    <h1 class="mb-6 text-2xl font-semibold">Account layer PoC</h1>
    <form v-if="!authenticated" class="grid gap-4" @submit.prevent="login">
      <label>Email <input v-model="email" data-testid="email" type="email" required /></label>
      <label
        >Password <input v-model="password" data-testid="password" type="password" required
      /></label>
      <button type="submit">Sign in</button>
    </form>
    <section v-else>
      <p>Credits: <CreditsDisplay source="provider" /></p>
      <div
        :data-copy-key="paymentCopyKey"
        :data-testid="`account-layer-billing-step-${paymentState.step}`"
      >
        <CheckoutSteps
          :no-charge-confirmed="paymentState.noChargeConfirmed"
          :reason="paymentState.reasonKey"
          :step="paymentState.step"
          @retry="checkout.retry"
        />
        <div v-if="paymentState.step === 'select'">
          <button data-testid="account-layer-subscribe" type="button" @click="subscribe">
            Subscribe
          </button>
          <button data-testid="account-layer-topup" type="button" @click="submitTopUp">
            Top up
          </button>
        </div>
      </div>
      <button type="button" data-testid="sign-out" @click="logout">Sign out</button>
    </section>
    <p v-if="error" role="alert">{{ error }}</p>
  </main>
</template>
