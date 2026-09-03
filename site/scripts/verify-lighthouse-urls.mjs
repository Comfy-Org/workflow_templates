import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(siteDir, 'dist', 'client');
const config = JSON.parse(readFileSync(join(siteDir, 'lighthouserc.json'), 'utf-8'));

const urls = config.ci?.collect?.url ?? [];
if (urls.length === 0) {
  console.error(
    'No URLs configured in lighthouserc.json. Refusing to pass a check that tests nothing.'
  );
  process.exit(1);
}

if (!existsSync(distDir)) {
  console.error(`Build output not found at ${distDir}. Run \`pnpm build\` first.`);
  process.exit(1);
}

const missing = [];
for (const url of urls) {
  const path = new URL(url).pathname;
  const file = join(distDir, path, 'index.html');
  if (!existsSync(file)) missing.push({ path, file });
}

if (missing.length > 0) {
  console.error('Pages pinned in lighthouserc.json are missing from the build:\n');
  for (const { path, file } of missing) console.error(`  ${path}\n    expected ${file}`);
  console.error(
    '\nThe page was probably renamed or archived. Update the `url` list and the matching\n' +
      '`assertMatrix` entry in site/lighthouserc.json to a page of the same type, then\n' +
      're-measure its budget rather than copying the old number across.'
  );
  process.exit(1);
}

console.log(`All ${urls.length} pinned Lighthouse URLs exist in the build.`);
