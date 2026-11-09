/**
 * Release gate: the published content must correspond to a validated release.
 *
 * Fails unless, for exactly this checkout (same commit, same content digest):
 *   - validate:content passed (schema, KaTeX, Mermaid, tracks, architecture feasibility) and left its report in .release/
 *   - test:playbooks ran every starter kit, all passed, and left its report in .release/
 *   - the release manifest built from them agrees with both
 * In strict mode (BS_RELEASE_STRICT=1, or --strict) it also needs a known commit SHA and a clean working tree.
 *
 *   npm run release:check              # report problems for the current build
 *   BS_RELEASE_STRICT=1 npm run release:check
 */
import { releaseProblems } from '../src/content/release';
import {
  computeContentDigest,
  discoverKits,
  gitInfo,
  readKitReport,
  readManifest,
  readValidationReport,
} from '../src/content/release-io';

export function checkRelease(root = process.cwd(), strict = process.env.BS_RELEASE_STRICT === '1'): string[] {
  const manifest = readManifest(root);
  if (!manifest) return ['content/generated/release.json is missing: run npm run content:build'];
  const git = gitInfo(root);
  return releaseProblems({
    manifest,
    validation: readValidationReport(root),
    kits: readKitReport(root),
    currentDigest: computeContentDigest(root),
    currentCommit: git.commit,
    currentDirty: git.dirty,
    requiredKits: discoverKits(root).map((k) => k.name),
    strict,
  });
}

if (process.argv[1]?.endsWith('release-check.ts')) {
  const strict = process.env.BS_RELEASE_STRICT === '1' || process.argv.includes('--strict');
  const problems = checkRelease(process.cwd(), strict);
  if (problems.length) {
    console.error(
      `release:check ✖ ${problems.length} problem(s): the published content would not correspond to a validated release`,
    );
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(
    `release:check ✔ validation and starter-kit reports match this ${strict ? 'clean commit' : 'content'}`,
  );
}
