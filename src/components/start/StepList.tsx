'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { GuideStep } from '../../content/start-guide';

const KEY = 'brainsiphon.start.progress.v1';

/** Steps a reader has ticked off. Browser-local: it is not synchronised and not sent anywhere. */
function useTicked(): [Set<string>, (id: string) => void] {
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setTicked(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* storage blocked: the page works without it */
    }
    const onStorage = () => {
      try {
        setTicked(new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('brainsiphon:start-progress', onStorage);
    return () => window.removeEventListener('brainsiphon:start-progress', onStorage);
  }, []);
  const toggle = useCallback((id: string) => {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]));
        window.dispatchEvent(new Event('brainsiphon:start-progress'));
      } catch {
        /* storage blocked */
      }
      return next;
    });
  }, []);
  return [ticked, toggle];
}

const isExternal = (href: string) => /^https?:/.test(href);

export function StepList({ steps }: { steps: GuideStep[] }) {
  const [ticked, toggle] = useTicked();
  return (
    <ol className="m-0 list-none space-y-3 p-0" data-testid="step-list">
      {steps.map((s, i) => (
        <li key={s.id} className="card flex gap-3 p-4" data-testid={`start-step-${s.id}`}>
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 accent-signal"
            checked={ticked.has(s.id)}
            onChange={() => toggle(s.id)}
            aria-label={`Done: ${s.title}`}
          />
          <div className="min-w-0">
            <p className="font-medium text-ink">
              <span className="font-mono text-xs text-dim">{i + 1}. </span>
              {isExternal(s.href) ? (
                <a
                  href={s.href}
                  className="text-ink underline decoration-line underline-offset-4 hover:decoration-signal"
                  rel="noreferrer"
                >
                  {s.title}
                </a>
              ) : (
                <Link
                  href={s.href}
                  className="text-ink underline decoration-line underline-offset-4 hover:decoration-signal"
                >
                  {s.title}
                </Link>
              )}{' '}
              <span className="font-mono text-xs text-dim">· about {s.minutes} min</span>
            </p>
            <p className="mt-1 text-sm text-mute">{s.read}</p>
            <p className="mt-1 text-sm text-ink/90">
              <span className="font-mono text-[11px] uppercase text-dim">You have it when </span>
              {s.checkpoint}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Overall progress across the guide, from the same browser-local ticks. */
export function ProgressSummary({ ids }: { ids: string[] }) {
  const [ticked] = useTicked();
  const done = ids.filter((i) => ticked.has(i)).length;
  return (
    <p className="font-mono text-xs text-mute" data-testid="start-progress" role="status">
      {done} of {ids.length} steps ticked off in this browser
    </p>
  );
}
