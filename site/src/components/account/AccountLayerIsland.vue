<script setup lang="ts">
import { createBillingClient, createSessionClient } from '@comfyorg/account/core';
import { billingClientKey, CreditsDisplay } from '@comfyorg/account/vue';
import { initializeApp } from 'firebase/app';
import { getAuth, onIdTokenChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { onUnmounted, provide, ref } from 'vue';
import { createAccountHostAdapter } from './accountHostAdapter';
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
};
const adapter = createAccountHostAdapter(
  auth,
  import.meta.env.PUBLIC_CLOUD_BASE_URL,
  () => workspaceId.value,
  debug
);
const session = createSessionClient(adapter);
const billing = createBillingClient(session, adapter);
provide(billingClientKey, billing);
debug.refreshCredits = () => billing.refreshCredits();
Object.assign(window, { __accountLayerPoc: debug });

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
    workspaceId.value = await resolveWorkspace(await result.user.getIdToken());
    await session.establishSession();
    await billing.refreshCredits();
    authenticated.value = true;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Sign-in failed';
  }
}

async function logout(): Promise<void> {
  await session.clearSession();
  await signOut(auth);
  authenticated.value = false;
  workspaceId.value = null;
}

const unsubscribeAuth = onIdTokenChanged(auth, (user) => {
  if (!user) authenticated.value = false;
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
      <button type="button" data-testid="sign-out" @click="logout">Sign out</button>
    </section>
    <p v-if="error" role="alert">{{ error }}</p>
  </main>
</template>
