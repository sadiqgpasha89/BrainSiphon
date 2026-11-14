import { describe, expect, it } from 'vitest';
import { checkVersions, loadVersionRegistry } from '../content/versions';

const reg = loadVersionRegistry();

describe('version registry', () => {
  it('matches the files it pins, as of the date it was checked', () => {
    const r = checkVersions(reg, process.cwd(), new Date('2026-11-14T12:00:00Z'));
    expect(r.errors).toEqual([]);
  });

  it('flags a version after its support ends and an overdue review', () => {
    const r = checkVersions(reg, process.cwd(), new Date('2028-09-01T00:00:00Z'));
    expect(r.errors.some((e) => e.includes('eks-kubernetes') && e.includes('support ended'))).toBe(true);
    expect(r.errors.some((e) => e.includes('review was due'))).toBe(true);
  });

  it('warns ahead of the end of support', () => {
    const r = checkVersions(reg, process.cwd(), new Date('2027-06-01T00:00:00Z'));
    expect(r.warnings.some((w) => w.includes('eks-kubernetes'))).toBe(true);
  });

  it('no longer pins Kubernetes 1.30 anywhere in the deployment material', async () => {
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
    for (const f of walk('deployment').filter((f) => f.endsWith('.tf')))
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/(version|kubernetes_version)\s*=\s*"1\.30"/);
  });
});
