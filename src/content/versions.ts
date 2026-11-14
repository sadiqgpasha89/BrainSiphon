import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface VersionEntry {
  id: string;
  component: string;
  version: string;
  status: 'supported' | 'review' | 'deprecated';
  supportEnds: string | null;
  extendedSupportEnds?: string;
  checkedOn: string;
  reviewBy: string;
  verified: boolean;
  source: string;
  usedIn: { file: string; mustContain: string }[];
  note: string;
}
export interface VersionRegistry {
  reviewCadence: string;
  entries: VersionEntry[];
}

export const WARN_DAYS = 90;

export function loadVersionRegistry(root = process.cwd()): VersionRegistry {
  return JSON.parse(readFileSync(join(root, 'content', 'version-registry.json'), 'utf8')) as VersionRegistry;
}

const day = 86_400_000;
const t = (d: string) => Date.parse(`${d}T00:00:00Z`);

/**
 * Errors fail the build: a version past the end of its support, a review that is overdue, a file that no longer contains the version it is
 * registered for. Warnings are versions whose support ends within WARN_DAYS.
 */
export function checkVersions(
  reg: VersionRegistry,
  root = process.cwd(),
  now: Date = new Date(),
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (const e of reg.entries) {
    if (e.supportEnds) {
      const left = Math.floor((t(e.supportEnds) - today) / day);
      if (left < 0) errors.push(`${e.id} ${e.version}: support ended ${e.supportEnds}`);
      else if (left <= WARN_DAYS) warnings.push(`${e.id} ${e.version}: support ends in ${left} days (${e.supportEnds})`);
    }
    if (t(e.reviewBy) < today) errors.push(`${e.id}: review was due ${e.reviewBy}`);
    if (e.status === 'deprecated') errors.push(`${e.id} ${e.version}: marked deprecated but still registered as pinned`);
    for (const u of e.usedIn) {
      const f = join(root, u.file);
      if (!existsSync(f)) errors.push(`${e.id}: ${u.file} does not exist`);
      else if (!readFileSync(f, 'utf8').includes(u.mustContain))
        errors.push(`${e.id}: ${u.file} no longer contains ${JSON.stringify(u.mustContain)}`);
    }
  }
  return { errors, warnings };
}
