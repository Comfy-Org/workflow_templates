import { describe, expect, it } from 'vitest';
import {
  buildTermMap,
  protectText,
  restoreText,
  protectContent,
  restoreContent,
  findCollisionsAcrossFiles,
  findSentinelCollisions,
  sentinelFor,
} from '../../scripts/i18n/preserve-protection';

const TERMS = ['ComfyUI', 'Comfy', 'ControlNet', 'VAE', 'Nano Banana Pro', 'Nano Banana'];

describe('buildTermMap', () => {
  it('orders terms longest-first and dedupes/empties out', () => {
    const map = buildTermMap(['Comfy', 'ComfyUI', 'Comfy', '', '  ']);
    expect(map.ordered).toEqual(['ComfyUI', 'Comfy']); // longest first, deduped
  });
});

describe('protect + restore round-trip', () => {
  const map = buildTermMap(TERMS);

  it('protects the longer term first so ComfyUI is not split by Comfy', () => {
    const protectedText = protectText('Use ComfyUI and Comfy Cloud', map);
    // "ComfyUI" -> its own sentinel; the standalone "Comfy" -> its sentinel; never "[[..]]UI".
    expect(protectedText).not.toContain('ComfyUI');
    expect(protectedText).not.toMatch(/Comfy(?!UI)/); // no bare Comfy left either
    expect(restoreText(protectedText, map)).toBe('Use ComfyUI and Comfy Cloud');
  });

  it('round-trips multi-word terms and their prefixes (Nano Banana Pro vs Nano Banana)', () => {
    const s = 'Try Nano Banana Pro, not just Nano Banana.';
    expect(restoreText(protectText(s, map), map)).toBe(s);
  });

  it('does not reprocess a generated sentinel with a later term (FooX vs PT0)', () => {
    // Sequential per-term replacement would turn FooX -> {{PT0}} and then let the
    // "PT0" term rewrite that sentinel; single-pass protection must round-trip both.
    const m = buildTermMap(['FooX', 'PT0']);
    const s = 'render FooX then PT0';
    const prot = protectText(s, m);
    expect(prot).not.toContain('FooX');
    expect(restoreText(prot, m)).toBe(s);
  });

  it('the exact failure case: ComfyUI/Comfy survive a translation that rewrites all prose', () => {
    const en = '在 ComfyUI 中使用 Comfy 工作流'; // English brand names embedded in zh prose
    const prot = protectText(en, map);

    // Protection must have removed both brand names before the model ever sees them.
    const comfyUiToken = map.sentinelByTerm.get('ComfyUI')!;
    const comfyToken = map.sentinelByTerm.get('Comfy')!;
    expect(prot).toContain(comfyUiToken);
    expect(prot).toContain(comfyToken);
    expect(prot).not.toContain('ComfyUI');

    // Simulate a REAL translation: every non-sentinel word is rewritten (as a model
    // would when moving to another language) while the sentinels pass through. The
    // sentinels are therefore the only thing carrying the terms across, which is the
    // property under test — rewriting prose to itself would prove nothing.
    const modelOutput = prot
      .split(/(\{\{PT\d+\}\})/)
      .map((segment) =>
        /^\{\{PT\d+\}\}$/.test(segment) ? segment : segment.replace(/\S+/g, 'translated')
      )
      .join('');
    expect(modelOutput).not.toContain('工作流'); // prose really did change

    const restored = restoreText(modelOutput, map);
    expect(restored).toContain('ComfyUI');
    // Standalone "Comfy" came back as its own term, not merely as the tail of "ComfyUI".
    expect(restored.replace(/ComfyUI/g, '')).toContain('Comfy');
    expect(restored).not.toMatch(/\{\{PT\d+\}\}/); // no sentinel residue left behind
  });
});

describe('restoreText tolerance', () => {
  const map = buildTermMap(TERMS);
  it('restores sentinels the model nudged (spaces, single/fullwidth braces)', () => {
    const token = sentinelFor(0);
    expect(token).toBe('{{PT0}}');
    // spaced + single-brace + fullwidth-brace variants a model might emit
    expect(restoreText('a {{ PT0 }} b', map)).toBe(`a ${map.termByIndex[0]} b`);
    expect(restoreText('a {PT0} b', map)).toBe(`a ${map.termByIndex[0]} b`);
    expect(restoreText('a ｛｛PT0｝｝ b', map)).toBe(`a ${map.termByIndex[0]} b`);
  });
  it('leaves an unknown sentinel index untouched (validator catches residue)', () => {
    expect(restoreText('x {{PT999}} y', map)).toBe('x {{PT999}} y');
  });
});

describe('findSentinelCollisions (data-integrity guard)', () => {
  const map = buildTermMap(TERMS);
  it('detects sentinel-shaped text already present in the source', () => {
    expect(findSentinelCollisions({ a: { title: 'see {{PT0}} here' } })).toEqual([
      'see {{PT0}} here',
    ]);
    // the tolerant single-brace form too
    expect(findSentinelCollisions({ a: { howToUse: ['x {PT3} y'] } })).toEqual(['x {PT3} y']);
  });

  it('is empty for clean content', () => {
    expect(
      findSentinelCollisions({ a: { title: 'ComfyUI ControlNet', howToUse: ['Load it'] } })
    ).toEqual([]);
  });

  it('proves the guard is necessary: restore WOULD rewrite a literal marker', () => {
    // If protect did not reject this, genuine content would be corrupted on restore.
    expect(restoreText('literal {{PT0}} token', map)).toBe(`literal ${map.termByIndex[0]} token`);
  });
});

describe('protectContent / restoreContent walk nested structures', () => {
  const map = buildTermMap(TERMS);
  it('round-trips strings, arrays and FAQ objects', () => {
    const content = {
      s1: {
        title: 'ComfyUI ControlNet',
        howToUse: ['Load the ControlNet model', 'Run in ComfyUI'],
        faqItems: [{ question: 'What is VAE?', answer: 'A ComfyUI node.' }],
      },
    };
    const round = restoreContent(protectContent(content, map), map);
    expect(round).toEqual(content);
    // and protection actually removed the raw terms
    const prot = JSON.stringify(protectContent(content, map));
    expect(prot).not.toContain('ControlNet');
    expect(prot).not.toContain('ComfyUI');
  });
});

describe('findCollisionsAcrossFiles (restore rewrites every file, so check every file)', () => {
  it('finds a collision hiding in a locale file, not just in English', () => {
    // The regression this guards: protect only inspected en.json, but restore
    // rewrites every content file, so this zh string would have been silently
    // turned into a preserve-term.
    const collisions = findCollisionsAcrossFiles({
      'en.json': { a: { title: 'clean english' } },
      'zh.json': { a: { title: '包含 {{PT0}} 的文本' } },
    });
    expect(collisions).toEqual([{ file: 'zh.json', text: '包含 {{PT0}} 的文本' }]);
  });

  it('labels each collision with its file so the error names where to look', () => {
    const collisions = findCollisionsAcrossFiles({
      'en.json': { a: { title: 'see {{PT1}}' } },
      'ja.json': { a: { title: '{{PT2}} を使う' } },
    });
    expect(collisions.map((c) => c.file).sort()).toEqual(['en.json', 'ja.json']);
  });

  it('passes clean content across every file', () => {
    expect(
      findCollisionsAcrossFiles({
        'en.json': { a: { title: 'Use ComfyUI' } },
        'zh.json': { a: { title: '使用 ComfyUI' } },
      })
    ).toEqual([]);
  });
});
