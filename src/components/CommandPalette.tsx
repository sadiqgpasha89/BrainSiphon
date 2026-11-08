'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { CornerDownLeft, Search } from 'lucide-react';
import type MiniSearch from 'minisearch';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { buildMiniSearch, staticSearch } from '../lib/search/engine';
import { SEARCH_MODE, withBase } from '../lib/site';
import { DOMAIN_META, DOMAINS, LATENCY_LABEL, type UseCaseIndexEntry } from '../schemas/usecase.schema';

export const OPEN_PALETTE_EVENT = 'bs:open-palette';

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UseCaseIndexEntry[]>([]);
  const [source, setSource] = useState<string>('');
  const [selected, setSelected] = useState('');
  const index = useRef<{ entries: UseCaseIndexEntry[]; ms: MiniSearch<UseCaseIndexEntry> } | null>(null);
  const loading = useRef<Promise<void> | null>(null);

  const ensureIndex = useCallback(() => {
    loading.current ??= fetch(withBase('/search-index.json'))
      .then((r) => r.json() as Promise<UseCaseIndexEntry[]>)
      .then((entries) => {
        index.current = { entries, ms: buildMiniSearch(entries) };
      })
      .catch(() => {
        loading.current = null;
      });
    return loading.current;
  }, []);

  // Global shortcuts: Cmd/Ctrl+K toggles; "/" opens when not typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) void ensureIndex();
    else setQuery('');
  }, [open, ensureIndex]);

  // Query → results. API mode tries the hybrid endpoint first and degrades to the local index on any failure.
  useEffect(() => {
    if (!open) return;
    const ac = new AbortController();
    const run = async () => {
      if (SEARCH_MODE === 'api' && query.trim().length > 1) {
        try {
          const r = await fetch(
            `${withBase('/api/search')}?${new URLSearchParams({ q: query.trim(), limit: '12' })}`,
            { signal: ac.signal },
          );
          if (r.ok) {
            const j = (await r.json()) as { items: UseCaseIndexEntry[]; source: string };
            setResults(j.items);
            setSource(j.source);
            return;
          }
        } catch {
          if (ac.signal.aborted) return;
        }
      }
      await ensureIndex();
      if (ac.signal.aborted || !index.current) return;
      const r = staticSearch(index.current.ms, index.current.entries, query, {}, 0, 12);
      setResults(r.items);
      setSource('local index');
    };
    const t = setTimeout(() => void run(), query ? 90 : 0);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [open, query, ensureIndex]);

  // With filtering disabled cmdk cannot know when async results land, so keep the top result selected ourselves.
  useEffect(() => {
    setSelected(query ? (results[0]?.slug ?? '') : DOMAINS[0]);
  }, [query, results]);

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[10vh] z-50 w-[min(680px,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-panel shadow-2xl"
        >
          <Dialog.Title className="sr-only">Search blueprints</Dialog.Title>
          <Command
            shouldFilter={false}
            loop
            label="Search blueprints"
            value={selected}
            onValueChange={setSelected}
          >
            <div className="flex items-center gap-2 border-b border-line px-4">
              <Search size={16} className="text-mute" aria-hidden />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search 500 blueprints — fraud, ranking, RAG, forecasting…"
                className="h-12 w-full bg-transparent text-sm text-ink outline-none placeholder:text-dim"
                aria-label="Search blueprints"
              />
              <span className="kbd">esc</span>
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-sm text-mute">
                No blueprint matches “{query}”.
              </Command.Empty>
              {!query && (
                <Command.Group
                  heading="Domains"
                  className="px-1 py-1 text-[11px] font-medium uppercase tracking-wider text-dim [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
                >
                  {DOMAINS.map((d) => (
                    <Command.Item
                      key={d}
                      value={d}
                      onSelect={() => go(`/${d}`)}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm normal-case tracking-normal text-ink aria-selected:bg-raised"
                    >
                      <span>{DOMAIN_META[d].name}</span>
                      <CornerDownLeft size={14} className="text-dim" aria-hidden />
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {query && results.length > 0 && (
                <Command.Group
                  heading={`Blueprints · ${source}`}
                  className="px-1 py-1 text-[11px] font-medium uppercase tracking-wider text-dim [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
                >
                  {results.map((e) => (
                    <Command.Item
                      key={e.id}
                      value={e.slug}
                      onSelect={() => go(`/${e.slug}`)}
                      className="flex cursor-pointer flex-col gap-0.5 rounded-lg px-3 py-2 normal-case tracking-normal aria-selected:bg-raised"
                    >
                      <span className="text-sm font-medium text-ink">{e.title}</span>
                      <span className="flex flex-wrap items-center gap-2 text-xs text-mute">
                        <span>{DOMAIN_META[e.domain].short}</span>
                        <span aria-hidden>·</span>
                        <span>{LATENCY_LABEL[e.latencySLA]}</span>
                        <span aria-hidden>·</span>
                        <span>{e.difficulty}</span>
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
