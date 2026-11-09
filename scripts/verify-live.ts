/**
 * Post-deploy check: the site that is actually being served must be the release that was validated.
 * GitHub Pages sits behind a CDN, so a stale artefact or cache would otherwise go unnoticed. Fetches <site>/release.json and compares
 * it with this checkout, retrying while the new deployment propagates.
 *
 *   SITE=https://owner.github.io/Repo/ EXPECTED_SHA=<sha> npx tsx scripts/verify-live.ts
 */
import { computeContentDigest, gitInfo } from '../src/content/release-io';
import type { ReleaseManifest } from '../src/content/release';

const site = (process.env.SITE ?? '').replace(/\/?$/, '/');
const expectedSha = process.env.EXPECTED_SHA ?? gitInfo().commit;
const attempts = Number(process.env.ATTEMPTS ?? 12);
const delayMs = Number(process.env.DELAY_MS ?? 15_000);

async function once(): Promise<string[]> {
  const res = await fetch(`${site}release.json?cb=${Date.now()}`, {
    headers: { 'cache-control': 'no-cache' },
  });
  if (!res.ok) return [`${site}release.json returned HTTP ${res.status}`];
  const live = (await res.json()) as ReleaseManifest;
  const problems: string[] = [];
  if (live.sourceCommit !== expectedSha)
    problems.push(`live site was built from ${live.sourceCommit}, expected ${expectedSha}`);
  const digest = computeContentDigest();
  if (live.contentDigest !== digest)
    problems.push(
      `live content digest ${live.contentDigest.slice(0, 12)} differs from this checkout ${digest.slice(0, 12)}`,
    );
  if (!live.deployedAt) problems.push('live manifest has no deployment timestamp');
  if (!live.validatedAt) problems.push('live manifest has no validation timestamp');
  if (live.checks.executable.status !== 'passed')
    problems.push(`live executable-test status is ${live.checks.executable.status}`);
  if (live.checks.feasibility.fail > 0)
    problems.push(`live site carries ${live.checks.feasibility.fail} failed feasibility checks`);
  const home = await fetch(`${site}?cb=${Date.now()}`).then((r) => r.text());
  if (!home.includes(live.contentVersion))
    problems.push('the home page footer does not show the release.json content version');
  return problems;
}

async function main() {
  if (!site.startsWith('http') || !expectedSha) {
    console.error('verify:live needs SITE (the deployed URL) and EXPECTED_SHA (or a Git checkout)');
    process.exit(2);
  }
  let problems: string[] = [];
  for (let i = 1; i <= attempts; i++) {
    problems = await once().catch((e) => [`fetch failed: ${(e as Error).message}`]);
    if (!problems.length) {
      console.log(`verify:live ✔ ${site} serves commit ${expectedSha.slice(0, 7)} with matching content`);
      return;
    }
    console.warn(`attempt ${i}/${attempts}: ${problems.join('; ')}`);
    if (i < attempts) await new Promise((r) => setTimeout(r, delayMs));
  }
  console.error('verify:live ✖ the published site does not correspond to the validated release');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

void main();
