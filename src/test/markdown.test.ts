import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { toMarkdown } from '../content/markdown';

describe('markdown export', () => {
  const u = loadAllUseCases().find((x) => x.slug === 'fintech/real-time-card-upi-fraud-detection')!;
  const md = toMarkdown(u, 'https://brainsiphon.com');

  it('contains every major section as clean, fenced markdown', () => {
    for (const h of [
      '## Signal vs. Noise',
      '## Problem formulation',
      '## High-level design (10M users)',
      '## Sequence diagram',
      '## Low-level design',
      '## End-to-end breakdown',
      '## Scale to 10M users',
      '## Production edge cases',
      '## Agentic solution',
    ])
      expect(md).toContain(h);
    expect((md.match(/```mermaid/g) ?? []).length).toBe(6);
    expect((md.match(/```/g) ?? []).length % 2).toBe(0);
  });

  it('escapes table pipes so rows never break', () => {
    expect(
      md
        .split('\n')
        .filter((l) => l.startsWith('| '))
        .every((l) => !l.includes(' | | ')),
    ).toBe(true);
  });
});
