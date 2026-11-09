/**
 * Node-only half of release provenance: hash the content inputs, ask Git which commit this is, discover the starter kits, and
 * read and write the reports under `.release/`. The rules that use these values are in `release.ts`.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { KitReport, ReleaseManifest, ValidationReport } from './release';

export const RELEASE_DIR = '.release';
export const VALIDATION_REPORT = join(RELEASE_DIR, 'validation.json');
export const KIT_REPORT = join(RELEASE_DIR, 'kit-results.json');

/** Everything that decides what a published page says. A change to any of these invalidates earlier reports. */
const DIGEST_ROOTS = ['content', 'src/content', 'src/schemas'];
const SKIP_DIRS = new Set(['generated', '__pycache__', '.pytest_cache', '.venv', 'node_modules']);
// outputs of running a starter kit are not content
const SKIP_FILE = /(\.pyc|\.csv)$|(^|\/)report\.json$/;

function walk(root: string, rel: string, out: string[]) {
  for (const e of readdirSync(join(root, rel), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const r = `${rel}/${e.name}`;
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(root, r, out);
    } else if (e.isFile() && !SKIP_FILE.test(r)) out.push(r);
  }
}

export function computeContentDigest(root = process.cwd()): string {
  const files: string[] = [];
  for (const d of DIGEST_ROOTS) if (existsSync(join(root, d))) walk(root, d, files);
  const h = createHash('sha256');
  for (const f of files) {
    h.update(f);
    h.update('\0');
    h.update(readFileSync(join(root, f)));
    h.update('\0');
  }
  return h.digest('hex');
}

const git = (root: string, args: string[]) => {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};

export function gitInfo(root = process.cwd()): { commit: string | null; dirty: boolean } {
  // build:static moves server-only files aside while it works, which would look like uncommitted changes; it records the
  // state of the checkout before touching anything and hands it to the steps it runs through these variables
  if (process.env.BS_GIT_DIRTY !== undefined)
    return { commit: process.env.BS_GIT_COMMIT || null, dirty: process.env.BS_GIT_DIRTY === '1' };
  const env = process.env.GITHUB_SHA || process.env.GIT_SHA;
  const commit = env && /^[0-9a-f]{7,40}$/i.test(env) ? env.toLowerCase() : git(root, ['rev-parse', 'HEAD']);
  const status = git(root, ['status', '--porcelain']);
  return { commit: commit || null, dirty: status === null ? false : status.length > 0 };
}

export const packageVersion = (root = process.cwd()): string =>
  (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string }).version;

/** Every starter kit in the repository, named exactly as the kit report names them. */
export function discoverKits(root = process.cwd()): { name: string; dir: string }[] {
  const kits: { name: string; dir: string }[] = [];
  const kitRoot = join(root, 'content', 'kits');
  if (existsSync(kitRoot))
    for (const k of readdirSync(kitRoot, { withFileTypes: true }).filter((x) => x.isDirectory()))
      if (existsSync(join(kitRoot, k.name, 'test_starter.py'))) kits.push({ name: `kits/${k.name}`, dir: join(kitRoot, k.name) });
  const pb = join(root, 'content', 'playbooks');
  for (const d of readdirSync(pb, { withFileTypes: true }).filter((x) => x.isDirectory()))
    for (const k of readdirSync(join(pb, d.name), { withFileTypes: true }).filter((x) => x.isDirectory())) {
      const dir = join(pb, d.name, k.name, 'starter');
      if (existsSync(join(dir, 'test_starter.py'))) kits.push({ name: `${d.name}/${k.name}`, dir });
    }
  return kits;
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

export const readValidationReport = (root = process.cwd()) => readJson<ValidationReport>(join(root, VALIDATION_REPORT));
export const readKitReport = (root = process.cwd()) => readJson<KitReport>(join(root, KIT_REPORT));
export const readManifest = (root = process.cwd()) => readJson<ReleaseManifest>(join(root, 'content', 'generated', 'release.json'));

export function writeReport(root: string, file: string, report: ValidationReport | KitReport) {
  mkdirSync(join(root, RELEASE_DIR), { recursive: true });
  writeFileSync(join(root, file), `${JSON.stringify(report, null, 2)}\n`);
}

/** A failed run must not leave an older pass behind. */
export const clearReport = (root: string, file: string) => rmSync(join(root, file), { force: true });
