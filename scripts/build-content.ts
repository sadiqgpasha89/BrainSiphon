/**
 * Content build: .uc sources → validated JSON per use case, slim catalog index,
 * static search index (MiniSearch fallback), markdown exports and llms.txt.
 * Fails (non-zero exit) on any schema violation.
 */
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadAllUseCases, toIndexEntry } from '../src/content/load';
import { toMarkdown } from '../src/content/markdown';
import { DOMAIN_META, DOMAINS } from '../src/schemas/usecase.schema';

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
write(join(gen, 'index.json'), JSON.stringify(index));
write(join(pub, 'search-index.json'), JSON.stringify(index));

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
write(join(pub, 'llms.txt'), `${llms.join('\n')}\n`);

if (!existsSync(join(root, 'content', 'slug-history.json')))
  write(join(root, 'content', 'slug-history.json'), '{}\n');

const perDomain = DOMAINS.map((d) => `${d}=${all.filter((u) => u.domain === d).length}`).join(' ');
console.log(`content:build ✔ ${all.length} use cases (${perDomain}) in ${Date.now() - t0} ms`);
