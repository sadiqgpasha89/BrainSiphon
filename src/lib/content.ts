import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cache } from 'react';
import { UseCaseSchema, type Domain, type UseCase, type UseCaseIndexEntry } from '../schemas/usecase.schema';

const root = join(process.cwd(), 'content', 'generated');

let indexMemo: Promise<UseCaseIndexEntry[]> | null = null;

export function getIndex(): Promise<UseCaseIndexEntry[]> {
  indexMemo ??= readFile(join(root, 'index.json'), 'utf8').then((t) => JSON.parse(t) as UseCaseIndexEntry[]);
  return indexMemo;
}

export async function getDomainEntries(domain: Domain): Promise<UseCaseIndexEntry[]> {
  return (await getIndex()).filter((e) => e.domain === domain);
}

/** Read + re-validate a blueprint. Validation at read time guards against hand-edited generated files. */
export const getUseCase = cache(async (slug: string): Promise<UseCase | null> => {
  if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(slug)) return null;
  try {
    const raw = await readFile(join(root, 'uc', `${slug}.json`), 'utf8');
    return UseCaseSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
});

export async function getNeighbours(
  slug: string,
): Promise<{ prev: UseCaseIndexEntry | null; next: UseCaseIndexEntry | null; related: UseCaseIndexEntry[] }> {
  const all = await getIndex();
  const i = all.findIndex((e) => e.slug === slug);
  if (i < 0) return { prev: null, next: null, related: [] };
  const me = all[i]!;
  const same = all.filter((e) => e.domain === me.domain);
  const j = same.findIndex((e) => e.slug === slug);
  const overlap = (e: UseCaseIndexEntry) =>
    e.mlParadigms.filter((p) => me.mlParadigms.includes(p)).length + (e.latencySLA === me.latencySLA ? 1 : 0);
  const related = all
    .filter((e) => e.slug !== slug)
    .map((e) => ({ e, s: overlap(e) + (e.domain === me.domain ? 0.5 : 0) }))
    .sort((a, b) => b.s - a.s || a.e.title.localeCompare(b.e.title))
    .slice(0, 5)
    .map((x) => x.e);
  return { prev: same[j - 1] ?? null, next: same[j + 1] ?? null, related };
}
