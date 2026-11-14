import { describe, expect, it } from 'vitest';
import proCatalog from '../../content/pro-catalog.json';
import { FREE_WORKED_EXAMPLE, PRO_PACK_COUNT, proEntry } from '../lib/pro';
import { loadAllUseCases } from '../content/load';
import { toMarkdown } from '../content/markdown';
import { PACKS } from '../content/fde/catalog';
import { AUTHORED } from '../content/fde/packs';

const all = loadAllUseCases();

describe('the freemium split', () => {
  it('publishes the worked example for exactly one use case', () => {
    const open = all.filter((u) => u.playbook?.workedExample).map((u) => u.slug);
    expect(open).toEqual([FREE_WORKED_EXAMPLE]);
  });

  it('keeps everything else in a playbook for the locked use cases', () => {
    for (const u of all.filter((x) => x.slug !== FREE_WORKED_EXAMPLE)) {
      const pb = u.playbook!;
      expect(pb.milestones.length).toBeGreaterThanOrEqual(6);
      expect(pb.tests.length).toBeGreaterThanOrEqual(6);
      expect(pb.pitfalls.length).toBeGreaterThanOrEqual(4);
      expect(pb.workedExample).toBeUndefined();
    }
  });

  it('points to Pro, and shows no worked-example text, in the Markdown of a locked use case', () => {
    const locked = all.find((u) => u.slug === 'saas/in-app-ai-copilot')!;
    const md = toMarkdown(locked, 'https://example.test');
    expect(md).toContain('### 5. Worked example');
    expect(md).toContain('https://example.test/pro');
    expect(md).not.toMatch(/\*Basis: /);
    const free = toMarkdown(
      all.find((u) => u.slug === FREE_WORKED_EXAMPLE)!,
      'https://example.test',
    );
    expect(free).toMatch(/\*Basis: /);
  });

  it('ships exactly one executable implementation pack and one authored implementation playbook', () => {
    expect(PACKS.map((p) => p.slug)).toEqual([FREE_WORKED_EXAMPLE]);
    expect(Object.keys(AUTHORED)).toEqual([FREE_WORKED_EXAMPLE]);
  });
});

describe('the Pro catalogue the site publishes', () => {
  it('lists a worked template for every use case, and nothing else', () => {
    expect(PRO_PACK_COUNT).toBe(all.length);
    expect(new Set(proCatalog.packs.map((p) => p.slug))).toEqual(new Set(all.map((u) => u.slug)));
    for (const u of all) expect(proEntry(u.slug), u.slug).toBeDefined();
  });

  it('says what each template contains without publishing any result', () => {
    for (const p of proCatalog.packs) {
      expect(p.documents).toBeGreaterThanOrEqual(9);
      expect(p.files).toBeGreaterThan(20);
      expect(Object.keys(p).sort()).toEqual(
        [
          'authoredStarter',
          'contracts',
          'documents',
          'engine',
          'engineLabel',
          'fdePack',
          'files',
          'fit',
          'path',
          'slug',
        ].sort(),
      );
    }
  });
});
