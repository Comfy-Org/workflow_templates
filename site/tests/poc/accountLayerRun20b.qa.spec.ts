import { expect, test } from '@playwright/test';
import type { Page, Response } from '@playwright/test';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';

const evidenceDir =
  '/home/c_byrne/workspaces/comfy-account-layer/.concept-poc/account-layer-refactor/08-qa/evidence/run-20o-astro';
const fixtureEmail = process.env.FIXTURE_EMAIL;
const fixturePassword = process.env.FIXTURE_PASSWORD;
const topUpKey = 'RUN20N-topup-500';

interface Run20bSeam {
  whenAuthenticated(timeout?: number): Promise<void>;
  getCurrentEmail(): string | null;
  getBillingStatus(): Promise<Record<string, unknown>>;
  refreshBillingStatus(): Promise<Record<string, unknown>>;
  getCredits(): { phase: string; value?: { balance?: number } };
  refreshCredits(): Promise<void>;
  getPaymentState(): { step: string; operationId?: string };
  resubscribeWithIdempotency(key: string): Promise<void>;
  cancelWithIdempotency(key: string): Promise<void>;
  topUpWithIdempotency(amount: number, key: string): Promise<void>;
  openPaymentPortal(): Promise<void>;
  signOut(): Promise<void>;
  lastOpenedUrl: string | null;
}

async function signIn(page: Page) {
  if (!fixtureEmail || !fixturePassword) throw new Error('Fixture credentials are unavailable');
  await page.goto('/poc/account-layer');
  const currentEmail = await page.evaluate(() =>
    (Reflect.get(window, '__accountLayerPoc') as Run20bSeam | undefined)?.getCurrentEmail()
  );
  if (currentEmail === fixtureEmail) {
    await writeFile(`${evidenceDir}/firebase-password-signins-${Date.now()}.txt`, '0\n');
    return;
  }
  await page.getByTestId('email').fill(fixtureEmail);
  await page.getByTestId('password').fill(fixturePassword);
  const signInResponse = page.waitForResponse((response) =>
    response.url().includes('identitytoolkit.googleapis.com/v1/accounts:signInWithPassword')
  );
  await page.getByRole('button', { name: 'Sign in' }).click();
  const response = await signInResponse;
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const redacted = { ...body, idToken: undefined, refreshToken: undefined };
  await writeFile(
    `${evidenceDir}/signin-response-${Date.now()}.json`,
    `${JSON.stringify({ status: response.status(), body: redacted }, null, 2)}\n`
  );
  await writeFile(`${evidenceDir}/firebase-password-signins-${Date.now()}.txt`, '1\n');
  if (!response.ok()) {
    const error = body.error as { message?: string } | undefined;
    throw new Error(`Firebase sign-in failed: ${error?.message ?? response.status()}`);
  }
  await expect(page.getByTestId('sign-out')).toBeVisible({ timeout: 30_000 });
  const email = await page.evaluate(() =>
    (Reflect.get(window, '__accountLayerPoc') as Run20bSeam).getCurrentEmail()
  );
  expect(email).toBe(fixtureEmail);
}

async function snapshot(page: Page, name: string) {
  const state = await page.evaluate(async () => {
    const value = Reflect.get(window, '__accountLayerPoc') as Run20bSeam;
    await value.refreshCredits();
    const status = await value.refreshBillingStatus();
    return { status, balance: value.getCredits() };
  });
  await writeFile(
    `${evidenceDir}/${name}-status.json`,
    `${JSON.stringify(state.status, null, 2)}\n`
  );
  await writeFile(
    `${evidenceDir}/${name}-balance.json`,
    `${JSON.stringify(state.balance, null, 2)}\n`
  );
  return state;
}

function balance(state: Awaited<ReturnType<typeof snapshot>>) {
  return state.balance.value?.balance ?? 0;
}

test.beforeAll(() => mkdir(evidenceDir, { recursive: true }));
test.setTimeout(180_000);

test('RUN20B staging-real account matrix', async ({ page }, testInfo) => {
  const project = testInfo.project.name;
  const attempt = Date.now();
  const projectTopUpKey = `${topUpKey}-${project}-${attempt}`;
  const requests: string[] = [];
  const operations: string[] = [];
  page.on('response', async (response: Response) => {
    const url = new URL(response.url());
    if (!url.pathname.includes('/api/billing/')) return;
    const body = (await response.text().catch(() => '')).replace(
      /("url":"https:[^"]+\?secret=)[^"]+/,
      '$1[redacted]'
    );
    requests.push(
      `${new Date().toISOString()} ${response.request().method()} ${url.pathname} ${response.status()} ${body}`
    );
    await appendFile(`${evidenceDir}/requests-live.log`, `${requests.at(-1)}\n`);
    if (url.pathname.includes('/ops/')) operations.push(body);
  });

  await signIn(page);
  await page.screenshot({ path: `${evidenceDir}/preflight.png` });
  const preflight = await snapshot(page, 'preflight');
  expect(['active', 'canceled']).toContain(preflight.status.subscription_status);

  if (preflight.status.subscription_status === 'canceled') {
    await page.evaluate(async (key) => {
      const value = Reflect.get(window, '__accountLayerPoc') as Run20bSeam;
      await value.resubscribeWithIdempotency(key);
    }, `RUN20N-resubscribe-${project}-${attempt}`);
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const value = Reflect.get(window, '__accountLayerPoc') as Run20bSeam;
            const status = await value.refreshBillingStatus();
            return status.subscription_status;
          }),
        { timeout: 180_000, intervals: [1_000, 3_000, 8_000] }
      )
      .toBe('active');
  }
  const active = await snapshot(page, 'post-resubscribe');
  expect(active.status.subscription_status).toBe('active');
  await page.screenshot({ path: `${evidenceDir}/resubscribe-terminal.png` });

  await page.evaluate(async (key) => {
    const value = Reflect.get(window, '__accountLayerPoc') as Run20bSeam;
    await value.cancelWithIdempotency(key);
  }, `RUN20N-cancel-${project}-${attempt}`);
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const value = Reflect.get(window, '__accountLayerPoc') as Run20bSeam;
          const status = await value.refreshBillingStatus();
          return status.subscription_status;
        }),
      { timeout: 180_000, intervals: [1_000, 3_000, 8_000] }
    )
    .toBe('canceled');
  const canceled = await snapshot(page, `post-cancel-${project}`);
  expect(canceled.status.subscription_status).toBe('canceled');
  expect(canceled.status.cancel_at).toBeTruthy();
  await expect(page.getByTestId('account-layer-poc')).not.toContainText('Nothing was charged');
  await page.screenshot({ path: `${evidenceDir}/cancel-terminal.png` });

  await page.evaluate(
    async ({ amount, key }) => {
      const value = Reflect.get(window, '__accountLayerPoc') as Run20bSeam;
      await value.topUpWithIdempotency(amount, key);
    },
    { amount: 500, key: projectTopUpKey }
  );
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const value = Reflect.get(window, '__accountLayerPoc') as Run20bSeam;
          return (await value.refreshBillingStatus()).pending_billing_op_id ?? null;
        }),
      { timeout: 120_000 }
    )
    .toBeNull();
  const toppedUp = await snapshot(page, 'post-topup');
  expect(balance(toppedUp) - balance(canceled)).toBe(500);
  await page.screenshot({ path: `${evidenceDir}/topup-terminal.png` });

  await page.evaluate(async () => {
    const value = Reflect.get(window, '__accountLayerPoc') as Run20bSeam;
    await value.openPaymentPortal();
  });
  const portal = await page.evaluate(
    () => (Reflect.get(window, '__accountLayerPoc') as Run20bSeam).lastOpenedUrl
  );
  expect(portal).toMatch(/^https:\/\//);
  await writeFile(
    `${evidenceDir}/portal.json`,
    `${JSON.stringify({ https: true, host: new URL(portal ?? '').host }, null, 2)}\n`
  );

  await page.reload();
  await expect(page.getByTestId('sign-out')).toBeVisible({ timeout: 30_000 });
  const reloaded = await snapshot(page, 'post-reload');
  expect(reloaded.status.subscription_status).toBe('canceled');
  await page.screenshot({ path: `${evidenceDir}/reload-restored.png` });
  await page.getByTestId('sign-out').click();
  await expect(page.getByTestId('email')).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.startsWith('comfy-hub-account-layer-poc:'))
    )
  ).toHaveLength(0);
  await signIn(page);
  expect((await snapshot(page, 'post-signin')).status.subscription_status).toBe('canceled');

  let duplicate: unknown;
  try {
    await page.evaluate(async (key) => {
      const value = Reflect.get(window, '__accountLayerPoc') as Run20bSeam;
      await value.topUpWithIdempotency(500, key);
    }, projectTopUpKey);
    duplicate = await snapshot(page, 'post-idempotency');
  } catch (error) {
    duplicate = String(error);
  }
  await writeFile(
    `${evidenceDir}/idempotency-result.json`,
    `${JSON.stringify(duplicate, null, 2)}\n`
  );

  await expect(
    page.evaluate(async () => {
      const value = Reflect.get(window, '__accountLayerPoc') as Run20bSeam;
      try {
        await value.topUpWithIdempotency(100, 'RUN20N-malformed');
      } catch {
        return true;
      }
      return false;
    })
  ).resolves.toBe(true);
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('"status":');
  await expect(alert).toContainText('"body":');
  await expect(alert).not.toContainText(/stripe/i);
  await page.screenshot({ path: `${evidenceDir}/malformed-error.png` });
  await snapshot(page, 'final-fixture');

  await writeFile(`${evidenceDir}/requests.log`, `${requests.join('\n')}\n`);
  await writeFile(`${evidenceDir}/ops-responses.jsonl`, `${operations.join('\n')}\n`);
  await writeFile(
    `${evidenceDir}/hosted-page-note.txt`,
    'Not reachable: fixture has a saved chargeable payment method, so top-ups settle immediately. Coupon field not observable.\n'
  );
  await appendFile(
    `${evidenceDir}/paystate.log`,
    `${new Date().toISOString()} ${JSON.stringify(await page.evaluate(() => (Reflect.get(window, '__accountLayerPoc') as Run20bSeam).getPaymentState()))}\n`
  );
});
