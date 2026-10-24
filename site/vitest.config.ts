/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import { getViteConfig } from 'astro/config';

// getViteConfig rather than plain defineConfig so tests can import and render
// .astro components; without it Vite cannot parse their template syntax.
export default getViteConfig({
  resolve: {
    // Mirror the tsconfig `@/* → ./src/*` alias so unit tests can import
    // source modules that use it (e.g. composables).
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
