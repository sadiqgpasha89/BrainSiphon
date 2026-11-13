/**
 * Runs every playbook starter kit's pytest suite in its own directory. A starter kit is part of the product:
 * its tests are the executable exit gates quoted in the playbook, so a failing kit fails CI.
 *   PYTHON=python3 npm run test:playbooks            # default interpreter: $PYTHON or python3
 *   npm run test:playbooks -- fintech                # only kits under one domain
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
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
// line coverage is recorded when pytest-cov is installed (it is in content/playbooks/requirements.txt); without it the report says "not measured"
const hasCov = spawnSync(python, ['-c', 'import pytest_cov'], { encoding: 'utf8' }).status === 0;
const covArgs = hasCov ? ['--cov=.', '--cov-report=term'] : [];
const LOG_LINES = 60;

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
  // counts come from the JUnit report, not the summary line: a kit's own pytest options can suppress that line
  const junit = join(tmpdir(), `bs-junit-${process.pid}.xml`);
  rmSync(junit, { force: true });
  const r = spawnSync(
    python,
    ['-m', 'pytest', '-q', '-p', 'no:cacheprovider', `--junitxml=${junit}`, ...covArgs],
    {
      cwd: dir,
      encoding: 'utf8',
      // the coverage data file is an output of the run, not content: keep it out of the kit directory
      env: { ...process.env, COVERAGE_FILE: join(tmpdir(), `bs-coverage-${process.pid}`) },
    },
  );
  const output = (r.stdout + r.stderr).trim();
  const tail = output.split('\n').slice(-1)[0] ?? '';
  const suite = existsSync(junit) ? readFileSync(junit, 'utf8') : '';
  const attr = (name: string) =>
    Number(new RegExp(`<testsuite [^>]*\\b${name}="(\\d+)"`).exec(suite)?.[1] ?? 0);
  const bad = attr('failures') + attr('errors');
  const total = /^TOTAL\s.*?(\d+)%\s*$/m.exec(output);
  console.log(
    `${r.status === 0 ? '✔' : '✖'} ${name.padEnd(62)} ${suite ? `${attr('tests') - bad - attr('skipped')} passed, ${bad} failed` : tail}${total ? `, ${total[1]}% lines` : ''} (${((Date.now() - t0) / 1000).toFixed(1)}s)`,
  );
  results.push({
    name,
    status: r.status === 0 ? 'passed' : 'failed',
    seconds: Math.round((Date.now() - t0) / 100) / 10,
    ...(suite
      ? { tests: { passed: attr('tests') - bad - attr('skipped'), failed: bad, skipped: attr('skipped') } }
      : {}),
    coveragePct: total ? Number(total[1]) : null,
    log: [
      `$ python -m pytest -q ${covArgs.join(' ')}`.trim(),
      `# ${name}`,
      ...output.split('\n').slice(-LOG_LINES),
    ].join('\n'),
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
