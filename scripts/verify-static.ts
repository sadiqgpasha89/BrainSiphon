/**
 * Post-build check for the static (GitHub Pages) export. Fails if anything an agent or IDE is told to fetch is not
 * actually in ./out at the base-path-prefixed route we advertise:
 *   - /llms.txt exists and every link in it resolves to a file or page in out/
 *   - every blueprint has a clean <slug>.md next to its <slug>/index.html
 *   - the footer link and the per-page .md link carry the base path
 *
 * Run after `npm run build:static` (it is also called from there). Reads NEXT_PUBLIC_BASE_PATH and NEXT_PUBLIC_SITE_URL.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadAllUseCases } from '../src/content/load';
import { PRIMITIVE_IDS } from '../src/content/primitives';
import { STATUS_LABEL, type ReleaseManifest } from '../src/content/release';
import { computeContentDigest, gitInfo } from '../src/content/release-io';

export function verifyStatic(
  root = process.cwd(),
  basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '',
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  strict = process.env.BS_RELEASE_STRICT === '1',
): string[] {
  const out = join(root, 'out');
  const errors: string[] = [];
  const fail = (m: string) => errors.push(m);
  const nonEmpty = (p: string) => existsSync(p) && statSync(p).isFile() && statSync(p).size > 0;
  const origin = `${siteUrl.replace(/\/$/, '')}${basePath}`;

  if (!existsSync(out)) return [`out/ does not exist: run npm run build:static first`];
  if (!existsSync(join(out, '.nojekyll')))
    fail('out/.nojekyll is missing (GitHub Pages would run Jekyll over the export)');

  // 1. llms.txt at the root of out/, which GitHub Pages serves at <basePath>/llms.txt
  const llmsPath = join(out, 'llms.txt');
  if (!nonEmpty(llmsPath)) fail('out/llms.txt is missing or empty');
  else {
    const llms = readFileSync(llmsPath, 'utf8');
    if (!llms.startsWith('# BrainSiphon')) fail('out/llms.txt does not start with "# BrainSiphon"');
    const links = [...llms.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]!);
    if (links.length === 0) fail('out/llms.txt contains no links');
    for (const url of links) {
      if (!url.startsWith(`${origin}/`)) {
        fail(`llms.txt link is not under ${origin}/: ${url}`);
        continue;
      }
      const rel = decodeURIComponent(url.slice(origin.length + 1));
      const file = rel.endsWith('.md') ? join(out, rel) : join(out, rel, 'index.html');
      if (!nonEmpty(file)) fail(`llms.txt links to ${url} but ${file.slice(root.length + 1)} is missing`);
    }
  }

  // 2. one clean markdown file and one page per blueprint, one page per primitive
  const all = loadAllUseCases(root);
  for (const u of all) {
    const md = join(out, `${u.slug}.md`);
    if (!nonEmpty(md)) fail(`missing out/${u.slug}.md`);
    else if (!readFileSync(md, 'utf8').startsWith(`# ${u.title}`))
      fail(`out/${u.slug}.md does not start with its title`);
    if (!nonEmpty(join(out, u.slug, 'index.html'))) fail(`missing page out/${u.slug}/index.html`);
  }
  for (const id of PRIMITIVE_IDS)
    if (!nonEmpty(join(out, 'patterns', 'primitives', id, 'index.html')))
      fail(`missing primitive page for ${id}`);

  // 2b. the export carries its own release manifest, it matches the checkout, and no page makes a blanket "verified" claim
  const relPath = join(out, 'release.json');
  if (!nonEmpty(relPath)) fail('out/release.json is missing: the deployment cannot be matched to a commit');
  else {
    const m = JSON.parse(readFileSync(relPath, 'utf8')) as ReleaseManifest;
    if (m.contentDigest !== computeContentDigest(root))
      fail('out/release.json was built from different content than this checkout');
    if (strict) {
      if (!m.sourceCommit) fail('out/release.json has no source commit');
      if (m.sourceCommit !== gitInfo(root).commit)
        fail(`out/release.json commit ${m.sourceCommit} is not this checkout`);
      if (!m.deployedAt) fail('out/release.json has no deployment timestamp');
      if (!m.validatedAt) fail('out/release.json has no validation timestamp');
      if (m.checks.executable.status !== 'passed')
        fail(`out/release.json executable-test status is ${m.checks.executable.status}`);
      if (m.checks.feasibility.status !== 'passed')
        fail(`out/release.json feasibility status is ${m.checks.feasibility.status}`);
    }
    for (const u of all) {
      const md = join(out, `${u.slug}.md`);
      if (!nonEmpty(md)) continue;
      const text = readFileSync(md, 'utf8');
      if (!text.includes(`Release ${m.contentVersion}`))
        fail(`out/${u.slug}.md does not carry release ${m.contentVersion}`);
      if (/Verified against|Automated checks passed/i.test(text.split('\n').slice(0, 6).join('\n')))
        fail(`out/${u.slug}.md still makes a single combined verification claim`);
      for (const label of Object.values(STATUS_LABEL))
        if (!text.includes(label)) fail(`out/${u.slug}.md is missing the "${label}" status`);
    }
    const sampleSlug = all[0]?.slug;
    const samplePage = sampleSlug ? join(out, sampleSlug, 'index.html') : '';
    if (nonEmpty(samplePage)) {
      const html = readFileSync(samplePage, 'utf8');
      if (!html.includes(m.contentVersion))
        fail(`${sampleSlug} page does not show content version ${m.contentVersion}`);
      for (const id of Object.keys(STATUS_LABEL))
        if (!html.includes(`data-testid="status-${id}"`))
          fail(`${sampleSlug} page is missing the ${id} status`);
      if (
        html.includes('data-testid="verified-badge"') ||
        /Verified against|Automated checks passed/i.test(html)
      )
        fail(`${sampleSlug} page still shows a combined verification badge`);
    }
  }

  // 3. advertised links carry the base path
  const home = join(out, 'index.html');
  if (nonEmpty(home)) {
    const html = readFileSync(home, 'utf8');
    if (!html.includes(`href="${basePath}/llms.txt"`))
      fail(`out/index.html footer does not link to ${basePath}/llms.txt`);
  } else fail('out/index.html is missing');
  const sample = all[0];
  if (sample) {
    const page = join(out, sample.slug, 'index.html');
    if (nonEmpty(page) && !readFileSync(page, 'utf8').includes(`href="${basePath}/${sample.slug}.md"`))
      fail(`${sample.slug} page does not link to ${basePath}/${sample.slug}.md`);
  }
  return errors;
}

if (process.argv[1]?.endsWith('verify-static.ts')) {
  const errs = verifyStatic();
  if (errs.length) {
    console.error(`verify:static ✖ ${errs.length} problem(s)`);
    for (const e of errs.slice(0, 40)) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log('verify:static ✔ llms.txt, every .md route and the base-path links are in ./out');
}
