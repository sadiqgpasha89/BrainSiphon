import MiniSearch from 'minisearch';
import type {
  Domain,
  Difficulty,
  LatencySLA,
  Paradigm,
  UseCaseIndexEntry,
} from '../../schemas/usecase.schema';

export interface Filters {
  domain?: Domain;
  paradigm?: Paradigm;
  latency?: LatencySLA;
  difficulty?: Difficulty;
}

export const passesFilters = (e: UseCaseIndexEntry, f: Filters): boolean =>
  (!f.domain || e.domain === f.domain) &&
  (!f.paradigm || e.mlParadigms.includes(f.paradigm)) &&
  (!f.latency || e.latencySLA === f.latency) &&
  (!f.difficulty || e.difficulty === f.difficulty);

export function buildMiniSearch(entries: UseCaseIndexEntry[]): MiniSearch<UseCaseIndexEntry> {
  const ms = new MiniSearch<UseCaseIndexEntry>({
    idField: 'id',
    fields: ['title', 'summary', 'keywords', 'mlParadigmsText'],
    storeFields: [],
    extractField: (doc, field) =>
      field === 'mlParadigmsText'
        ? doc.mlParadigms.join(' ')
        : String((doc as unknown as Record<string, unknown>)[field] ?? ''),
    searchOptions: { boost: { title: 3, summary: 1.5 }, prefix: true, fuzzy: 0.2, combineWith: 'AND' },
  });
  ms.addAll(entries);
  return ms;
}

export interface StaticSearchResult {
  items: UseCaseIndexEntry[];
  total: number;
  nextCursor: number | null;
}

/** Pure, DB-free search used by the build-time fallback index and the client palette. */
export function staticSearch(
  ms: MiniSearch<UseCaseIndexEntry>,
  entries: UseCaseIndexEntry[],
  q: string,
  filters: Filters,
  cursor = 0,
  limit = 20,
): StaticSearchResult {
  const byId = new Map(entries.map((e) => [e.id, e]));
  let matched: UseCaseIndexEntry[];
  if (q.trim()) {
    let hits = ms.search(q, { filter: (r) => passesFilters(byId.get(String(r.id))!, filters) });
    if (hits.length === 0)
      hits = ms.search(q, {
        combineWith: 'OR',
        fuzzy: 0.25,
        filter: (r) => passesFilters(byId.get(String(r.id))!, filters),
      });
    matched = hits.map((h) => byId.get(String(h.id))!).filter(Boolean);
  } else {
    matched = entries.filter((e) => passesFilters(e, filters));
  }
  const items = matched.slice(cursor, cursor + limit);
  const end = cursor + items.length;
  return { items, total: matched.length, nextCursor: end < matched.length ? end : null };
}
