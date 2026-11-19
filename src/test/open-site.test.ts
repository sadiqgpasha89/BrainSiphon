import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';

const all = loadAllUseCases();

describe('one free site', () => {
  it('shows a worked example for every use case', () => {
    for (const u of all) expect(u.playbook?.workedExample, u.slug).toBeDefined();
  });

  it('has a worked template in the repository for every use case', () => {
    for (const u of all) {
      const file = path.join(process.cwd(), 'templates', u.slug, 'WORKED_EXAMPLE.md');
      expect(existsSync(file), u.slug).toBe(true);
    }
  });
});
