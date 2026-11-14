import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { makeZip, type ZipEntry } from '../lib/zip';

import { DOWNLOAD_BUNDLES, type BundleId } from './downloads-meta';
export { DOWNLOAD_BUNDLES };
export type { BundleId };

const SKIP = new Set(['.terraform', 'node_modules', '__pycache__', '.DS_Store']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir).sort()) {
    if (SKIP.has(name) || name.endsWith('.tfstate') || name.endsWith('.tfstate.backup')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

export interface DownloadFile {
  /** repository path, which is also the path under /downloads/ */
  path: string;
  bytes: number;
  sha256: string;
  bundle: BundleId;
}

export function collectDownloads(root: string): { files: DownloadFile[]; data: Map<string, Buffer> } {
  const files: DownloadFile[] = [];
  const data = new Map<string, Buffer>();
  for (const b of DOWNLOAD_BUNDLES) {
    for (const abs of walk(join(root, b.dir))) {
      const path = relative(root, abs).split('\\').join('/');
      const buf = readFileSync(abs);
      data.set(path, buf);
      files.push({ path, bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex'), bundle: b.id });
    }
  }
  return { files, data };
}

export function bundleZip(bundle: BundleId, files: DownloadFile[], data: Map<string, Buffer>): Uint8Array {
  const entries: ZipEntry[] = files.filter((f) => f.bundle === bundle).map((f) => ({ path: f.path, data: data.get(f.path)! }));
  return makeZip(entries);
}
