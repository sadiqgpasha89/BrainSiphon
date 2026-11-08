/**
 * Content build: .uc sources → validated JSON per use case, slim catalog index,
 * static search index (MiniSearch fallback), markdown exports and llms.txt.
 * Fails (non-zero exit) on any schema violation.
 */
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadAllUseCases, toIndexEntry } from '../src/content/load';
import { toMarkdown } from '../src/content/markdown';
import { DOMAIN_META, DOMAINS, PATTERN_IDS } from '../src/schemas/usecase.schema';
import { PRIMITIVES } from '../src/content/primitives';
import { loadTracksFile, resolveTracks, type ResolvedDomainTracks } from '../src/content/tracks';
import { readFileSync } from 'node:fs';

const root = process.cwd();
const gen = join(root, 'content', 'generated');
const pub = join(root, 'public');
const origin = process.env.SITE_URL ?? 'https://brainsiphon.com';

const write = (p: string, data: string) => {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, data);
};

const t0 = Date.now();
const all = loadAllUseCases(root);

rmSync(gen, { recursive: true, force: true });
for (const d of DOMAINS) rmSync(join(pub, d), { recursive: true, force: true });
for (const u of all) {
  write(join(gen, 'uc', `${u.slug}.json`), JSON.stringify(u));
  write(join(pub, `${u.slug}.md`), toMarkdown(u, origin));
}
const index = all.map(toIndexEntry);

// tracks: group each domain's use cases (in authored order) into sub-areas and name the ones to read first
const tracksFile = loadTracksFile(root);
const tracksOut: Record<string, ResolvedDomainTracks> = {};
for (const d of DOMAINS) {
  const entries = index.filter((e) => e.domain === d);
  const resolved = resolveTracks(
    d,
    tracksFile,
    entries.map((e) => e.slug),
  );
  tracksOut[d] = resolved;
  for (const t of resolved.tracks)
    for (const slug of t.slugs) {
      const e = entries.find((x) => x.slug === slug)!;
      e.trackId = t.id;
      e.trackName = t.name;
    }
}
write(join(gen, 'tracks.json'), JSON.stringify(tracksOut));

// pattern hubs: what each of the 11 reference kits teaches, taken from its kit.json
const patternsOut = PATTERN_IDS.map((id) => {
  const k = JSON.parse(readFileSync(join(root, 'content', 'kits', id, 'kit.json'), 'utf8')) as Record<
    string,
    unknown
  >;
  return {
    id,
    label: k.label,
    summary: k.summary,
    target: k.target,
    runtime: k.runtime,
    run: k.run,
    expected: k.expected,
    headline: k.headline,
    lessons: k.lessons,
    files: k.files,
  };
});
write(join(gen, 'patterns.json'), JSON.stringify(patternsOut));
write(join(gen, 'index.json'), JSON.stringify(index));
// the search index is shipped to browsers: keep it slim (primitive links are only needed by the pattern pages)
write(join(pub, 'search-index.json'), JSON.stringify(index.map((e) => ({ ...e, primitives: undefined }))));

const llms: string[] = [
  '# BrainSiphon',
  '',
  '> Zero-noise engineering blueprints for AI/ML systems: signal vs. noise, HLD, LLD, sequence diagrams, end-to-end breakdowns and 10M-user capacity models. Append `.md` to any use-case URL for clean markdown.',
  '',
];
for (const d of DOMAINS) {
  llms.push(`## ${DOMAIN_META[d].name}`, '');
  for (const u of all.filter((x) => x.domain === d))
    llms.push(`- [${u.title}](${origin}/${u.slug}.md): ${u.summary}`);
  llms.push('');
}
llms.push(
  '## Architectural primitives',
  '',
  'Canonical write-ups of mechanisms that repeat across blueprints; blueprints link here instead of repeating them.',
  '',
);
for (const p of PRIMITIVES) llms.push(`- [${p.title}](${origin}/patterns/primitives/${p.id}): ${p.summary}`);
llms.push('');
write(join(pub, 'llms.txt'), `${llms.join('\n')}\n`);

if (!existsSync(join(root, 'content', 'slug-history.json')))
  write(join(root, 'content', 'slug-history.json'), '{}\n');

const perDomain = DOMAINS.map((d) => `${d}=${all.filter((u) => u.domain === d).length}`).join(' ');
console.log(`content:build ✔ ${all.length} use cases (${perDomain}) in ${Date.now() - t0} ms`);
