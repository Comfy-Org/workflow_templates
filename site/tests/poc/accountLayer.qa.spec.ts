import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const evidenceDir =
  '/home/c_byrne/workspaces/comfy-account-layer/.concept-poc/account-layer-refactor/07-poc/consumer-astro/evidence';

interface DebugSnapshot {
  billingRequests: number;
  sessionExchanges: number;
  lastBillingSessionExchange: number | null;
  credentialLifetimeMs: number | null;
  refreshScheduleDelayMs: number | null;
  refreshCredits(): Promise<void>;
  runScheduledRefresh(): void;
}

async function signIn(page: import('@playwright/test').Page) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error('E2E credentials are unavailable');
  await page.goto('/poc/account-layer');
  await page.getByTestId('email').fill(email);
  await page.getByTestId('password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

async function refresh(page: import('@playwright/test').Page) {
  await page.evaluate(() =>
    (Reflect.get(window, '__accountLayerPoc') as DebugSnapshot).refreshCredits?.()
  );
}

test.beforeAll(async () => mkdir(evidenceDir, { recursive: true }));
test.setTimeout(60_000);

test('pre-load 401 causes one exchange and one replay only', async ({ page }) => {
  let armed = false;
  let balanceAttempts = 0;
  let exchanges = 0;
  await page.route('**/api/billing/balance', (route) => {
    if (!armed) return route.continue();
    balanceAttempts++;
    if (balanceAttempts === 1 || balanceAttempts >= 3) {
      return route.fulfill({ status: 401, body: '{}' });
    }
    return route.continue();
  });
  page.on('request', (request) => {
    if (armed && request.url().includes('/api/auth/token')) exchanges++;
  });
  await signIn(page);
  const panel = page.getByTestId('account-layer-poc');
  await expect(panel).toContainText(/Credits: \d+/, { timeout: 30_000 });
  armed = true;
  await refresh(page);
  expect(balanceAttempts).toBe(2);
  expect(exchanges).toBe(1);
  await refresh(page);
  expect(balanceAttempts).toBe(4);
  expect(exchanges).toBe(2);
});

for (const failure of ['500', 'malformed'] as const) {
  test(`pre-load balance ${failure} fails without a stale value`, async ({ page }) => {
    let armed = false;
    await page.route('**/api/billing/balance', (route) => {
      if (!armed) return route.continue();
      return route.fulfill({
        status: failure === '500' ? 500 : 200,
        body: failure === '500' ? '{}' : '{"unexpected":true}',
      });
    });
    await signIn(page);
    const panel = page.getByTestId('account-layer-poc');
    await expect(panel).toContainText(/Credits: \d+/, { timeout: 30_000 });
    armed = true;
    await refresh(page);
    await expect(panel.getByRole('alert')).toHaveText('Error');
    await expect(panel).not.toContainText(/Credits: \d+/);
  });
}

for (const failure of ['500', 'abort'] as const) {
  test(`pre-load exchange ${failure} fails closed`, async ({ page }) => {
    await page.route('**/api/auth/token', (route) =>
      failure === '500' ? route.fulfill({ status: 500, body: '{}' }) : route.abort('timedout')
    );
    await signIn(page);
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('email')).toBeVisible();
    const keys = await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.startsWith('comfy-hub-account-layer-poc:'))
    );
    expect(keys).toHaveLength(0);
  });
}

test('uses the Playwright clock at the exact refresh boundary', async ({ page }) => {
  const start = Date.now();
  await page.clock.install({ time: start });
  let exchanges = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/auth/token')) exchanges++;
  });
  await signIn(page);
  await expect(page.getByTestId('account-layer-poc')).toContainText(/Credits: \d+/, {
    timeout: 30_000,
  });
  const delay = await page.evaluate(
    () => (Reflect.get(window, '__accountLayerPoc') as DebugSnapshot).refreshScheduleDelayMs ?? 0
  );
  const before = exchanges;
  await page.clock.runFor(delay - 1);
  expect(exchanges).toBe(before);
  await page.clock.runFor(1);
  await expect.poll(() => exchanges).toBe(before + 1);
});

test('proves account lifecycle, refresh, replay, and error handling', async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error('E2E credentials are unavailable');
  await page.goto('/poc/account-layer');
  await page.getByTestId('email').fill(email);
  await page.getByTestId('password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  const panel = page.getByTestId('account-layer-poc');
  await expect(panel).toContainText(/Credits: \d+/, { timeout: 30_000 });
  const initial = await page.evaluate(() => {
    const value = Reflect.get(window, '__accountLayerPoc') as DebugSnapshot;
    return {
      billingRequests: value.billingRequests,
      sessionExchanges: value.sessionExchanges,
      lastBillingSessionExchange: value.lastBillingSessionExchange,
      credentialLifetimeMs: value.credentialLifetimeMs,
      refreshScheduleDelayMs: value.refreshScheduleDelayMs,
    };
  });
  expect(initial.sessionExchanges).toBeGreaterThan(0);
  expect(initial.billingRequests).toBeGreaterThan(0);
  expect(initial.lastBillingSessionExchange).toBe(initial.sessionExchanges);
  expect(
    (initial.credentialLifetimeMs ?? 0) - (initial.refreshScheduleDelayMs ?? 0)
  ).toBeGreaterThanOrEqual(299_000);
  expect(
    (initial.credentialLifetimeMs ?? 0) - (initial.refreshScheduleDelayMs ?? 0)
  ).toBeLessThanOrEqual(301_000);
  await page.screenshot({ path: `${evidenceDir}/signed-in-credits.png` });

  await page.evaluate(() =>
    (Reflect.get(window, '__accountLayerPoc') as DebugSnapshot).runScheduledRefresh()
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => (Reflect.get(window, '__accountLayerPoc') as DebugSnapshot).sessionExchanges
      )
    )
    .toBeGreaterThan(initial.sessionExchanges);
  const refreshedSessionExchanges = await page.evaluate(
    () => (Reflect.get(window, '__accountLayerPoc') as DebugSnapshot).sessionExchanges
  );

  let attempts = 0;
  await page.route('**/api/billing/balance', async (route) => {
    attempts++;
    if (attempts === 1) return route.fulfill({ status: 401, body: '{}' });
    return route.continue();
  });
  await page.evaluate(() =>
    (Reflect.get(window, '__accountLayerPoc') as DebugSnapshot).refreshCredits()
  );
  expect(attempts).toBe(2);
  const replayed = await page.evaluate(
    () => (Reflect.get(window, '__accountLayerPoc') as DebugSnapshot).sessionExchanges
  );
  expect(replayed).toBe(refreshedSessionExchanges + 1);
  await page.screenshot({ path: `${evidenceDir}/balance-401-replay.png` });
  await page.unroute('**/api/billing/balance');

  await page.route('**/api/billing/balance', (route) => route.fulfill({ status: 500, body: '{}' }));
  await page.evaluate(() =>
    (Reflect.get(window, '__accountLayerPoc') as DebugSnapshot).refreshCredits()
  );
  await expect(panel.getByRole('alert')).toHaveText('Error');
  await page.screenshot({ path: `${evidenceDir}/balance-500-error.png` });
  await page.unroute('**/api/billing/balance');

  await page.getByTestId('sign-out').click();
  await expect(page.getByTestId('email')).toBeVisible();
  const storageKeys = await page.evaluate(() =>
    Object.keys(localStorage).filter((key) => key.startsWith('comfy-hub-account-layer-poc:'))
  );
  expect(storageKeys).toHaveLength(0);
  await writeFile(
    `${evidenceDir}/debug-snapshots.json`,
    JSON.stringify(
      {
        initial: {
          billingRequests: initial.billingRequests,
          sessionExchanges: initial.sessionExchanges,
          billingUsedSessionExchange: initial.lastBillingSessionExchange,
          bufferMs: (initial.credentialLifetimeMs ?? 0) - (initial.refreshScheduleDelayMs ?? 0),
        },
        naturalRefresh: {
          exchangesBefore: initial.sessionExchanges,
          exchangesAfter: refreshedSessionExchanges,
        },
        replay: { attempts, exchangesAfter: replayed, reminted: true },
        signOut: { storageCleared: true },
      },
      null,
      2
    )
  );
});
