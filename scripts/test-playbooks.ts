/**
 * Runs every playbook starter kit's pytest suite in its own directory. A starter kit is part of the product:
 * its tests are the executable exit gates quoted in the playbook, so a failing kit fails CI.
 *   PYTHON=python3 npm run test:playbooks            # default interpreter: $PYTHON or python3
 *   npm run test:playbooks -- fintech                # only kits under one domain
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  discoverKits,
  clearReport,
  computeContentDigest,
  gitInfo,
  KIT_REPORT,
  writeReport,
} from '../src/content/release-io';
import { RELEASE_SCHEMA_VERSION, type KitResult } from '../src/content/release';

const rawPython =
  process.env.PYTHON ??
  (existsSync(resolve(process.cwd(), '.venv/bin/python')) ? '.venv/bin/python' : 'python3');
const python = rawPython.includes('/') ? resolve(process.cwd(), rawPython) : rawPython;
const only = process.argv[2];

const all = discoverKits();
const kits = all.filter(
  (k) => !only || (only === 'kits' ? k.name.startsWith('kits/') : k.name.startsWith(`${only}/`)),
);
if (!kits.length) {
  console.error('no starter kits found');
  process.exit(1);
}
// only a full run can vouch for a release; a filtered run leaves the last full report alone
if (!only) clearReport(process.cwd(), KIT_REPORT);

let failed = 0;
const results: KitResult[] = [];
for (const { name, dir } of kits) {
  const t0 = Date.now();
  const r = spawnSync(python, ['-m', 'pytest', '-q', '-p', 'no:cacheprovider'], {
    cwd: dir,
    encoding: 'utf8',
  });
  const tail = (r.stdout + r.stderr).trim().split('\n').slice(-1)[0] ?? '';
  console.log(
    `${r.status === 0 ? '✔' : '✖'} ${name.padEnd(62)} ${tail} (${((Date.now() - t0) / 1000).toFixed(1)}s)`,
  );
  results.push({
    name,
    status: r.status === 0 ? 'passed' : 'failed',
    seconds: Math.round((Date.now() - t0) / 100) / 10,
  });
  if (r.status !== 0) {
    failed++;
    console.log((r.stdout + r.stderr).split('\n').slice(-40).join('\n'));
  }
}
if (!only) {
  const git = gitInfo();
  writeReport(process.cwd(), KIT_REPORT, {
    schemaVersion: RELEASE_SCHEMA_VERSION,
    commit: git.commit,
    dirty: git.dirty,
    contentDigest: computeContentDigest(),
    ranAt: new Date().toISOString(),
    kits: results,
  });
}
if (failed) {
  console.error(`${failed} of ${kits.length} starter kits failed`);
  process.exit(1);
}
console.log(`test:playbooks ✔ ${kits.length} starter kits`);
