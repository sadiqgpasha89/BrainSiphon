import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cache } from 'react';
import type { ResolvedDomainTracks } from '../content/tracks';
import type { ReleaseManifest } from '../content/release';
import {
  UseCaseSchema,
  type Domain,
  type PatternId,
  type UseCase,
  type UseCaseIndexEntry,
} from '../schemas/usecase.schema';

const root = join(process.cwd(), 'content', 'generated');

let indexMemo: Promise<UseCaseIndexEntry[]> | null = null;

export function getIndex(): Promise<UseCaseIndexEntry[]> {
  indexMemo ??= readFile(join(root, 'index.json'), 'utf8').then((t) => JSON.parse(t) as UseCaseIndexEntry[]);
  return indexMemo;
}

/** The release manifest written by content:build: commit, content version and the status of every check. Null if it is missing. */
export const getRelease = cache(async (): Promise<ReleaseManifest | null> => {
  try {
    return JSON.parse(await readFile(join(root, 'release.json'), 'utf8')) as ReleaseManifest;
  } catch {
    return null;
  }
});

export async function getDomainEntries(domain: Domain): Promise<UseCaseIndexEntry[]> {
  return (await getIndex()).filter((e) => e.domain === domain);
}

/** Read + re-validate a blueprint. Validation at read time guards against hand-edited generated files. */
export const getUseCase = cache(async (slug: string): Promise<UseCase | null> => {
  if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(slug)) return null;
  try {
    const raw = await readFile(join(root, 'uc', `${slug}.json`), 'utf8');
    return UseCaseSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
});

export async function getNeighbours(
  slug: string,
): Promise<{ prev: UseCaseIndexEntry | null; next: UseCaseIndexEntry | null; related: UseCaseIndexEntry[] }> {
  const all = await getIndex();
  const i = all.findIndex((e) => e.slug === slug);
  if (i < 0) return { prev: null, next: null, related: [] };
  const me = all[i]!;
  const same = all.filter((e) => e.domain === me.domain);
  const j = same.findIndex((e) => e.slug === slug);
  const overlap = (e: UseCaseIndexEntry) =>
    e.mlParadigms.filter((p) => me.mlParadigms.includes(p)).length + (e.latencySLA === me.latencySLA ? 1 : 0);
  const related = all
    .filter((e) => e.slug !== slug)
    .map((e) => ({ e, s: overlap(e) + (e.domain === me.domain ? 0.5 : 0) }))
    .sort((a, b) => b.s - a.s || a.e.title.localeCompare(b.e.title))
    .slice(0, 5)
    .map((x) => x.e);
  return { prev: same[j - 1] ?? null, next: same[j + 1] ?? null, related };
}

export interface PatternHub {
  id: PatternId;
  label: string;
  summary: string;
  target: string;
  runtime: string;
  run: string[];
  expected: string;
  headline: Record<string, string>;
  lessons: { trap: string; evidence: string; at: string }[];
  files: { path: string; purpose: string }[];
}

let tracksMemo: Promise<Record<string, ResolvedDomainTracks>> | null = null;
export function getTracks(domain: Domain): Promise<ResolvedDomainTracks> {
  tracksMemo ??= readFile(join(root, 'tracks.json'), 'utf8').then(
    (t) => JSON.parse(t) as Record<string, ResolvedDomainTracks>,
  );
  return tracksMemo.then((m) => m[domain]!);
}

let patternsMemo: Promise<PatternHub[]> | null = null;
export function getPatterns(): Promise<PatternHub[]> {
  patternsMemo ??= readFile(join(root, 'patterns.json'), 'utf8').then((t) => JSON.parse(t) as PatternHub[]);
  return patternsMemo;
}
