'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpRight, SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildMiniSearch, passesFilters, type Filters } from '../lib/search/engine';
import {
  DIFFICULTIES,
  LATENCY_LABEL,
  LATENCY_SLAS,
  ML_PARADIGMS,
  PARADIGM_LABEL,
  type Difficulty,
  type LatencySLA,
  type Paradigm,
  type UseCaseIndexEntry,
} from '../schemas/usecase.schema';
import { DifficultyChip, LatencyChip, ParadigmChips } from './Badges';

type Sort = 'relevance' | 'title' | 'complexity' | 'latency';
const DIFF_RANK: Record<Difficulty, number> = {
  foundational: 0,
  'production-grade': 1,
  'staff-principal': 2,
};
const LAT_RANK: Record<LatencySLA, number> = { 'sub-10ms': 0, 'sub-100ms': 1, seconds: 2, batch: 3 };

function Chip<T extends string>({
  value,
  active,
  onClick,
  children,
  count,
}: {
  value: T;
  active: boolean;
  onClick: (v: T | undefined) => void;
  children: React.ReactNode;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(active ? undefined : value)}
      aria-pressed={active}
      disabled={count === 0 && !active}
      className={`rounded-full border px-3 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'border-signal bg-signal-soft text-signal'
          : 'border-line bg-raised text-mute hover:border-mute hover:text-ink'
      }`}
    >
      {children} <span className="font-mono opacity-70">{count}</span>
    </button>
  );
}

export function Catalog({ entries, domainName }: { entries: UseCaseIndexEntry[]; domainName: string }) {
  const [q, setQ] = useState('');
  const [paradigm, setParadigm] = useState<Paradigm | undefined>();
  const [latency, setLatency] = useState<LatencySLA | undefined>();
  const [difficulty, setDifficulty] = useState<Difficulty | undefined>();
  const [sort, setSort] = useState<Sort>('relevance');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  // Restore state from the URL once (client-only, keeps pages statically renderable).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const para = p.get('paradigm');
    const lat = p.get('latency');
    const dif = p.get('difficulty');
    if (para && (ML_PARADIGMS as readonly string[]).includes(para)) setParadigm(para as Paradigm);
    if (lat && (LATENCY_SLAS as readonly string[]).includes(lat)) setLatency(lat as LatencySLA);
    if (dif && (DIFFICULTIES as readonly string[]).includes(dif)) setDifficulty(dif as Difficulty);
    setQ((p.get('q') ?? '').slice(0, 120));
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (paradigm) p.set('paradigm', paradigm);
    if (latency) p.set('latency', latency);
    if (difficulty) p.set('difficulty', difficulty);
    const qs = p.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  }, [q, paradigm, latency, difficulty]);

  const ms = useMemo(() => buildMiniSearch(entries), [entries]);

  const filters: Filters = useMemo(
    () => ({ paradigm, latency, difficulty }),
    [paradigm, latency, difficulty],
  );

  const results = useMemo(() => {
    let list: UseCaseIndexEntry[];
    if (q.trim()) {
      const byId = new Map(entries.map((e) => [e.id, e]));
      let hits = ms.search(q);
      if (!hits.length) hits = ms.search(q, { combineWith: 'OR', fuzzy: 0.25 });
      list = hits.map((h) => byId.get(String(h.id))!).filter((e) => e && passesFilters(e, filters));
    } else list = entries.filter((e) => passesFilters(e, filters));
    if (sort === 'title') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'complexity')
      list = [...list].sort(
        (a, b) => DIFF_RANK[b.difficulty] - DIFF_RANK[a.difficulty] || a.title.localeCompare(b.title),
      );
    if (sort === 'latency')
      list = [...list].sort(
        (a, b) => LAT_RANK[a.latencySLA] - LAT_RANK[b.latencySLA] || a.title.localeCompare(b.title),
      );
    return list;
  }, [entries, ms, q, filters, sort]);

  // facet counts ignore the facet's own selection so users can see what switching would yield
  const count = <K extends keyof Filters>(key: K, value: NonNullable<Filters[K]>) =>
    entries.filter(
      (e) => passesFilters(e, { ...filters, [key]: undefined }) && passesFilters(e, { [key]: value }),
    ).length;

  const virtual = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 132,
    overscan: 8,
    getItemKey: (i) => results[i]!.id,
  });

  const activeCount = [paradigm, latency, difficulty].filter(Boolean).length;
  const clear = () => {
    setParadigm(undefined);
    setLatency(undefined);
    setDifficulty(undefined);
    setQ('');
  };

  const filterPanel = (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">ML paradigm</legend>
        <div className="flex flex-wrap gap-1.5">
          {ML_PARADIGMS.map((p) => (
            <Chip
              key={p}
              value={p}
              active={paradigm === p}
              onClick={setParadigm}
              count={count('paradigm', p)}
            >
              {PARADIGM_LABEL[p]}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">Latency tier</legend>
        <div className="flex flex-wrap gap-1.5">
          {LATENCY_SLAS.map((l) => (
            <Chip key={l} value={l} active={latency === l} onClick={setLatency} count={count('latency', l)}>
              {LATENCY_LABEL[l]}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">Complexity</legend>
        <div className="flex flex-wrap gap-1.5">
          {DIFFICULTIES.map((d) => (
            <Chip
              key={d}
              value={d}
              active={difficulty === d}
              onClick={setDifficulty}
              count={count('difficulty', d)}
            >
              {d}
            </Chip>
          ))}
        </div>
      </fieldset>
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <aside className="lg:sticky lg:top-20 lg:self-start" aria-label="Filters">
        <div className="mb-3 flex gap-2 lg:hidden">
          <button className="btn" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
            <SlidersHorizontal size={14} aria-hidden /> Filters{' '}
            {activeCount > 0 && <span className="chip chip-signal">{activeCount}</span>}
          </button>
        </div>
        <div className={`${filtersOpen ? 'block' : 'hidden'} card p-4 lg:block`}>{filterPanel}</div>
      </aside>

      <section aria-label={`${domainName} use cases`}>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Filter use cases</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value.slice(0, 120))}
              placeholder={`Search ${entries.length} ${domainName} use cases…`}
              className="h-10 w-full rounded-lg border border-line bg-panel px-3 text-sm text-ink placeholder:text-dim focus:border-signal"
              data-testid="catalog-search"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-mute">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-10 rounded-lg border border-line bg-panel px-2 text-sm text-ink"
            >
              <option value="relevance">{q ? 'Relevance' : 'Curated'}</option>
              <option value="title">Title</option>
              <option value="complexity">Complexity</option>
              <option value="latency">Latency</option>
            </select>
          </label>
          {(activeCount > 0 || q) && (
            <button className="btn" onClick={clear}>
              <X size={14} aria-hidden /> Clear
            </button>
          )}
        </div>
        <p className="mb-2 font-mono text-xs text-mute" aria-live="polite" data-testid="result-count">
          {results.length} of {entries.length} use cases
        </p>

        <div
          ref={parentRef}
          className="relative h-[72vh] overflow-auto rounded-xl border border-line bg-panel/40"
          data-testid="catalog-list"
        >
          {results.length === 0 ? (
            <div className="grid h-full place-items-center p-8 text-center text-mute">
              <div>
                <p className="text-ink">Nothing matches those filters.</p>
                <button className="btn mx-auto mt-3" onClick={clear}>
                  Reset filters
                </button>
              </div>
            </div>
          ) : (
            <ul style={{ height: virtual.getTotalSize(), position: 'relative' }}>
              {virtual.getVirtualItems().map((v) => {
                const e = results[v.index]!;
                return (
                  <li
                    key={v.key}
                    data-index={v.index}
                    ref={virtual.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${v.start}px)`,
                    }}
                  >
                    <Link
                      href={`/${e.slug}`}
                      className="group block border-b border-line/70 px-4 py-4 no-underline transition hover:bg-raised/70 focus-visible:bg-raised/70"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-[15px] font-semibold leading-snug text-ink group-hover:text-signal">
                          {e.title}
                        </h3>
                        <ArrowUpRight
                          size={16}
                          className="mt-0.5 shrink-0 text-dim transition group-hover:text-signal"
                          aria-hidden
                        />
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-mute">{e.summary}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <ParadigmChips paradigms={e.mlParadigms} />
                        <LatencyChip latency={e.latencySLA} />
                        <DifficultyChip difficulty={e.difficulty} />
                        {e.playbook && (
                          <span
                            className="chip !border-signal/50 !bg-signal-soft !text-signal"
                            title="Includes a Build Playbook with a runnable starter kit"
                          >
                            Playbook
                          </span>
                        )}
                        <span className="chip chip-signal ml-auto">{e.signalCount} signals</span>
                        <span className="chip chip-noise">{e.noiseCount} noise</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
