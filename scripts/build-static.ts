/**
 * Static export for CDN/GitHub Pages. Server-only features (API routes, middleware, OpenTelemetry) cannot
 * exist in a static export, so they are moved aside for the duration of the build and always restored.
 * Search falls back to the build-time MiniSearch index; slug redirects are handled client-side in not-found.tsx.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { verifyStatic } from './verify-static';

const root = process.cwd();
const stash = join(root, '.static-stash');
const moves: [string, string][] = [
  ['src/app/api', 'api'],
  ['src/middleware.ts', 'middleware.ts'],
  ['src/instrumentation.ts', 'instrumentation.ts'],
];

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

function run(cmd: string, args: string[], env: Record<string, string> = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env }, cwd: root });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited with ${r.status}`);
}

mkdirSync(stash, { recursive: true });
const moved: [string, string][] = [];
try {
  for (const [src, name] of moves) {
    if (existsSync(join(root, src))) {
      renameSync(join(root, src), join(stash, name));
      moved.push([src, name]);
    }
  }
  run('npx', ['tsx', 'scripts/build-content.ts'], { SITE_URL: `${siteUrl}${basePath}` });
  rmSync(join(root, 'out'), { recursive: true, force: true });
  run('npx', ['next', 'build'], {
    BS_STATIC: '1',
    NEXT_PUBLIC_STATIC: '1',
    NEXT_PUBLIC_SEARCH_MODE: 'static',
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_SITE_URL: `${siteUrl}${basePath}`,
  });
  writeFileSync(join(root, 'out', '.nojekyll'), '');
  const problems = verifyStatic(root, basePath, siteUrl);
  if (problems.length)
    throw new Error(`static export verification failed:\n  - ${problems.slice(0, 20).join('\n  - ')}`);
  console.log('build:static ✔ output in ./out');
} finally {
  for (const [src, name] of moved) renameSync(join(stash, name), join(root, src));
  rmSync(stash, { recursive: true, force: true });
}
