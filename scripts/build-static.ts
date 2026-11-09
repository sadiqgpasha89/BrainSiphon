/**
 * Static export for CDN/GitHub Pages. Server-only features (API routes, middleware, OpenTelemetry) cannot
 * exist in a static export, so they are moved aside for the duration of the build and always restored.
 * Search falls back to the build-time MiniSearch index; slug redirects are handled client-side in not-found.tsx.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { verifyStatic } from './verify-static';
import { checkRelease } from './release-check';
import { gitInfo } from '../src/content/release-io';

const root = process.cwd();
const stash = join(root, '.static-stash');
const moves: [string, string][] = [
  ['src/app/api', 'api'],
  ['src/middleware.ts', 'middleware.ts'],
  ['src/instrumentation.ts', 'instrumentation.ts'],
];

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
// Strict mode is the deployment: it re-runs the content gate itself and refuses to build unless the validation and starter-kit
// reports were produced for this exact commit and content. A local export (not strict) shows missing checks as "not run".
const strict = process.env.BS_RELEASE_STRICT === '1';
// the state of the checkout before any file is moved aside below
const git = gitInfo(root);
process.env.BS_GIT_COMMIT = git.commit ?? '';
process.env.BS_GIT_DIRTY = git.dirty ? '1' : '0';

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
  if (strict) run('npx', ['tsx', 'scripts/validate-content.ts']);
  run('npx', ['tsx', 'scripts/build-content.ts'], {
    SITE_URL: `${siteUrl}${basePath}`,
    ...(strict ? { BS_DEPLOY: '1' } : {}),
  });
  if (strict) {
    const release = checkRelease(root, true);
    if (release.length)
      throw new Error(
        `release gate failed: the published content would not correspond to a validated release:\n  - ${release.join('\n  - ')}`,
      );
  }
  rmSync(join(root, 'out'), { recursive: true, force: true });
  run('npx', ['next', 'build'], {
    BS_STATIC: '1',
    NEXT_PUBLIC_STATIC: '1',
    NEXT_PUBLIC_SEARCH_MODE: 'static',
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_SITE_URL: `${siteUrl}${basePath}`,
  });
  writeFileSync(join(root, 'out', '.nojekyll'), '');
  const problems = verifyStatic(root, basePath, siteUrl, strict);
  if (problems.length)
    throw new Error(`static export verification failed:\n  - ${problems.slice(0, 20).join('\n  - ')}`);
  console.log('build:static ✔ output in ./out');
} finally {
  for (const [src, name] of moved) renameSync(join(stash, name), join(root, src));
  rmSync(stash, { recursive: true, force: true });
}
