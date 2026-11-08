/**
 * Tracks and "start here" paths.
 *
 * `content/tracks.json` groups each domain's use cases into 7-8 tracks and names three to read first. Items refer to the
 * position (1-based) of a use case in its domain's authored order, written as "1-6,20,50". The resolver insists that the
 * tracks of a domain partition its use cases exactly (every one in one track), so a new use case cannot be forgotten.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Domain } from '../schemas/usecase.schema';

export interface TrackSpec {
  id: string;
  name: string;
  blurb: string;
  items: string;
}
export interface DomainTracksSpec {
  tracks: TrackSpec[];
  startHere: { intro: string; steps: { n: number; why: string }[] };
}
export type TracksFile = Record<string, DomainTracksSpec>;

export interface ResolvedTrack {
  id: string;
  name: string;
  blurb: string;
  slugs: string[];
}
export interface ResolvedDomainTracks {
  tracks: ResolvedTrack[];
  startHere: { intro: string; steps: { slug: string; why: string }[] };
}

export function loadTracksFile(root = process.cwd()): TracksFile {
  return JSON.parse(readFileSync(join(root, 'content', 'tracks.json'), 'utf8')) as TracksFile;
}

export function parseItems(spec: string): number[] {
  const out: number[] = [];
  for (const part of spec.split(',').map((p) => p.trim())) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!m) throw new Error(`bad track item "${part}" in "${spec}"`);
    const a = Number(m[1]);
    const b = Number(m[2] ?? m[1]);
    if (b < a) throw new Error(`bad range "${part}" in "${spec}"`);
    for (let i = a; i <= b; i++) out.push(i);
  }
  return out;
}

/** `slugs` are the domain's use cases in authored order. Throws unless the tracks partition them exactly. */
export function resolveTracks(domain: Domain, file: TracksFile, slugs: string[]): ResolvedDomainTracks {
  const spec = file[domain];
  if (!spec) throw new Error(`content/tracks.json has no entry for domain "${domain}"`);
  const seen = new Map<number, string>();
  const ids = new Set<string>();
  const tracks = spec.tracks.map((t) => {
    if (ids.has(t.id)) throw new Error(`${domain}: duplicate track id "${t.id}"`);
    ids.add(t.id);
    const items = parseItems(t.items);
    for (const n of items) {
      if (n < 1 || n > slugs.length) throw new Error(`${domain}/${t.id}: item ${n} is outside 1..${slugs.length}`);
      if (seen.has(n)) throw new Error(`${domain}: item ${n} is in both "${seen.get(n)}" and "${t.id}"`);
      seen.set(n, t.id);
    }
    return { id: t.id, name: t.name, blurb: t.blurb, slugs: items.map((n) => slugs[n - 1]!) };
  });
  const missing = slugs.map((_, i) => i + 1).filter((n) => !seen.has(n));
  if (missing.length)
    throw new Error(`${domain}: use cases ${missing.join(', ')} are in no track (${missing.map((n) => slugs[n - 1]).join(', ')})`);
  if (spec.startHere.steps.length < 3) throw new Error(`${domain}: a start-here path needs at least 3 steps`);
  const steps = spec.startHere.steps.map((s) => {
    const slug = slugs[s.n - 1];
    if (!slug) throw new Error(`${domain}: start-here step ${s.n} is outside 1..${slugs.length}`);
    return { slug, why: s.why };
  });
  return { tracks, startHere: { intro: spec.startHere.intro, steps } };
}
