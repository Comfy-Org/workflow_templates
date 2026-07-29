import { describe, expect, it } from 'vitest';
import {
  buildTermMap,
  protectText,
  restoreText,
  protectContent,
  restoreContent,
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

  it('the exact failure case: ComfyUI/Comfy survive a "translation" that drops originals', () => {
    const en = '在 ComfyUI 中使用 Comfy 工作流'; // English brand names embedded in zh prose
    const prot = protectText(en, map);
    // Simulate the model translating everything it can but leaving sentinels intact.
    const modelOutput = prot.replace('在', '在').replace('中使用', '中使用');
    expect(restoreText(modelOutput, map)).toContain('ComfyUI');
    expect(restoreText(modelOutput, map)).toContain('Comfy');
  });
});

describe('restoreText tolerance', () => {
  const map = buildTermMap(TERMS);
  it('restores sentinels the model nudged (spaces, fullwidth brackets)', () => {
    const i = 0;
    const token = sentinelFor(i);
    expect(token).toBe('[[PT0]]');
    // spaced + fullwidth-bracket variants a model might emit
    expect(restoreText('a [[ PT0 ]] b', map)).toBe(`a ${map.termByIndex[0]} b`);
    expect(restoreText('a ［［PT0］］ b', map)).toBe(`a ${map.termByIndex[0]} b`);
    expect(restoreText('a 【PT0】 b', map)).toBe(`a ${map.termByIndex[0]} b`);
  });
  it('leaves an unknown sentinel index untouched (validator catches residue)', () => {
    expect(restoreText('x [[PT999]] y', map)).toBe('x [[PT999]] y');
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
