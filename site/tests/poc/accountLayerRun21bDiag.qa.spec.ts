import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const output = process.env.ACCOUNT_LAYER_EVIDENCE_DIR!;

test('diagnoses account island hydration', async ({ page }) => {
  test.setTimeout(45_000);
  mkdirSync(output, { recursive: true });
  const events: string[] = [];
  page.on('console', (message) => events.push(`console ${message.type()} ${message.text()}`));
  page.on('pageerror', (error) => events.push(`pageerror ${error.message}`));
  page.on('requestfailed', (request) =>
    events.push(`requestfailed ${request.url()} ${request.failure()?.errorText ?? ''}`)
  );
  await page.goto('/poc/account-layer');
  await page.waitForTimeout(30_000);
  writeFileSync(`${output}/browser.log`, `${events.join('\n')}\n`);
  writeFileSync(`${output}/page-after-30s.html`, await page.content());
  await page.screenshot({ path: `${output}/after-30s.png`, fullPage: true });
});
