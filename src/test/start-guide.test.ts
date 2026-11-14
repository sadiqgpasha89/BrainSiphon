import { describe, expect, it } from 'vitest';
import { PRIMITIVE_IDS } from '../content/primitives';
import { loadAllUseCases } from '../content/load';
import { PATTERN_IDS } from '../schemas/usecase.schema';
import { SECTION_IDS } from '../lib/roles';
import { CAPSTONE, EXAMPLE, FIRST_HOUR, SECTION_PURPOSE, WEEKS, guideLinks } from '../content/start-guide';

const slugs = new Set(loadAllUseCases().map((u) => u.slug));
const ROUTES = new Set([
  '/',
  '/about',
  '/delivery',
  '/patterns',
  '/workspace',
  '/deployment',
  '/release',
  '/implementations',
  '/llms.txt',
  '/start',
]);
const DELIVERY_ANCHORS = new Set(['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'templates']);
const DEPLOYMENT_ANCHORS = new Set([
  'variants',
  'recovery',
  'validation',
  'environments',
  'versions',
  'commands',
]);

describe('start guide', () => {
  it('links only to pages and anchors that exist', () => {
    for (const href of guideLinks()) {
      if (/^https:\/\/github\.com\/sadiqgpasha89\/BrainSiphon\//.test(href)) continue;
      expect(href.startsWith('/'), href).toBe(true);
      const [path, hash] = href.split('#') as [string, string | undefined];
      if (ROUTES.has(path)) {
        if (path === '/delivery' && hash) expect(DELIVERY_ANCHORS.has(hash), href).toBe(true);
        if (path === '/deployment' && hash) expect(DEPLOYMENT_ANCHORS.has(hash), href).toBe(true);
        if (path === '/' && hash) expect(['domains', 'about'], href).toContain(hash);
        continue;
      }
      const prim = /^\/patterns\/primitives\/(.+)$/.exec(path);
      if (prim) {
        expect(PRIMITIVE_IDS as readonly string[], href).toContain(prim[1]);
        continue;
      }
      const kit = /^\/patterns\/(.+)$/.exec(path);
      if (kit) {
        expect(PATTERN_IDS as readonly string[], href).toContain(kit[1]);
        continue;
      }
      expect(slugs.has(path.slice(1)), href).toBe(true);
      if (hash) expect(SECTION_IDS as readonly string[], href).toContain(hash);
    }
  });

  it('explains every blueprint section exactly once', () => {
    expect(Object.keys(SECTION_PURPOSE).sort()).toEqual([...SECTION_IDS].sort());
    for (const s of Object.values(SECTION_PURPOSE)) expect(s.length).toBeGreaterThan(20);
  });

  it('gives every step a time, something to read and a way to know you have it; ids are unique', () => {
    const steps = [...FIRST_HOUR, ...WEEKS.flatMap((w) => w.steps)];
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length);
    for (const s of steps) {
      expect(s.minutes, s.id).toBeGreaterThan(0);
      expect(s.read.length, s.id).toBeGreaterThan(30);
      expect(s.checkpoint.length, s.id).toBeGreaterThan(20);
    }
    expect(FIRST_HOUR.reduce((n, s) => n + s.minutes, 0)).toBeLessThanOrEqual(75);
  });

  it('ends each week with something to build and a question, and has a capstone', () => {
    expect(WEEKS).toHaveLength(4);
    for (const w of WEEKS) {
      expect(w.exercise.length, w.id).toBeGreaterThan(40);
      expect(w.question.endsWith('?'), w.id).toBe(true);
    }
    expect(CAPSTONE).toMatch(/seven delivery phases/);
    expect(slugs.has(EXAMPLE)).toBe(true);
  });
});
