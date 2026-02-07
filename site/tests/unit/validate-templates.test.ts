import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { resolve } from 'path';

const siteDir = resolve(import.meta.dirname!, '../..');

describe('validate-templates script', () => {
  it('passes on current templates/index.json', () => {
    const result = execSync('npx tsx scripts/validate-templates.ts', {
      cwd: siteDir,
      encoding: 'utf-8',
    });
    expect(result).toContain('✅');
    expect(result).toContain('templates/index.json is valid');
  });
});
