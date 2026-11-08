/**
 * Runs every playbook starter kit's pytest suite in its own directory. A starter kit is part of the product:
 * its tests are the executable exit gates quoted in the playbook, so a failing kit fails CI.
 *   PYTHON=python3 npm run test:playbooks            # default interpreter: $PYTHON or python3
 *   npm run test:playbooks -- fintech                # only kits under one domain
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'content', 'playbooks');
const python = process.env.PYTHON ?? 'python3';
const only = process.argv[2];

const kits: string[] = [];
const kitRoot = join(process.cwd(), 'content', 'kits');
if (existsSync(kitRoot) && (!only || only === 'kits'))
  for (const k of readdirSync(kitRoot, { withFileTypes: true }).filter((x) => x.isDirectory()))
    if (existsSync(join(kitRoot, k.name, 'test_starter.py'))) kits.push(join(kitRoot, k.name));
for (const d of readdirSync(root, { withFileTypes: true }).filter((x) => x.isDirectory())) {
  if (only && d.name !== only) continue;
  for (const k of readdirSync(join(root, d.name), { withFileTypes: true }).filter((x) => x.isDirectory())) {
    const dir = join(root, d.name, k.name, 'starter');
    if (existsSync(join(dir, 'test_starter.py'))) kits.push(dir);
  }
}
if (!kits.length) {
  console.error('no starter kits found');
  process.exit(1);
}

let failed = 0;
for (const dir of kits) {
  const name = dir.startsWith(kitRoot)
    ? `kits/${dir.slice(kitRoot.length + 1)}`
    : dir.slice(root.length + 1).replace('/starter', '');
  const t0 = Date.now();
  const r = spawnSync(python, ['-m', 'pytest', '-q', '-p', 'no:cacheprovider'], {
    cwd: dir,
    encoding: 'utf8',
  });
  const tail = (r.stdout + r.stderr).trim().split('\n').slice(-1)[0] ?? '';
  console.log(
    `${r.status === 0 ? '✔' : '✖'} ${name.padEnd(62)} ${tail} (${((Date.now() - t0) / 1000).toFixed(1)}s)`,
  );
  if (r.status !== 0) {
    failed++;
    console.log((r.stdout + r.stderr).split('\n').slice(-40).join('\n'));
  }
}
if (failed) {
  console.error(`${failed} of ${kits.length} starter kits failed`);
  process.exit(1);
}
console.log(`test:playbooks ✔ ${kits.length} starter kits`);
