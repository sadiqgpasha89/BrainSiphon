'use client';

import { Eye, EyeOff, FileText } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CopyButton } from '../CopyButton';
import { withBase } from '../../lib/site';

export interface TocItem {
  id: string;
  label: string;
  prose?: boolean;
}

const STORAGE_KEY = 'bs:pure-signal';

export function ReaderShell({
  toc,
  slug,
  markdownText,
  children,
}: {
  toc: TocItem[];
  slug: string;
  markdownText?: string;
  children: React.ReactNode;
}) {
  const [pure, setPure] = useState(false);
  const [active, setActive] = useState(toc[0]?.id ?? '');

  useEffect(() => {
    try {
      setPure(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      /* storage unavailable */
    }
  }, []);

  const set = useCallback((v: boolean) => {
    setPure(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }, []);

  // "[" → Pure Signal (collapse to tables, diagrams, math, code); "]" → full detail.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '[') set(true);
      else if (e.key === ']') set(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [set]);

  useEffect(() => {
    const targets = toc.map((t) => document.getElementById(t.id)).filter((x): x is HTMLElement => Boolean(x));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-90px 0px -65% 0px' },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [toc]);

  return (
    <div
      className={`mx-auto grid max-w-7xl gap-10 px-4 pt-8 lg:grid-cols-[14rem_minmax(0,1fr)] ${pure ? 'pure-signal' : ''}`}
      data-pure={pure ? 'true' : 'false'}
      data-testid="reader"
    >
      <aside className="hidden lg:block">
        <nav aria-label="On this page" className="sticky top-20">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-dim">On this page</p>
          <ul className="space-y-0.5 border-l border-line">
            {toc.map((t) => (
              <li key={t.id} {...(t.prose ? { 'data-prose-section': true } : {})}>
                <a
                  href={`#${t.id}`}
                  aria-current={active === t.id ? 'location' : undefined}
                  className={`-ml-px block border-l px-3 py-1.5 text-sm no-underline transition ${active === t.id ? 'border-signal text-signal' : 'border-transparent text-mute hover:border-mute hover:text-ink'}`}
                >
                  {t.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-2 text-xs text-dim">
            <p>
              <span className="kbd">[</span> pure signal
            </p>
            <p>
              <span className="kbd">]</span> full detail
            </p>
            <p>
              <span className="kbd">⌘K</span> search
            </p>
          </div>
        </nav>
      </aside>

      <div className="min-w-0">
        <div
          className="sticky top-14 z-30 -mx-4 mb-6 flex flex-wrap items-center gap-2 border-b border-line bg-bg/90 px-4 py-2 backdrop-blur"
          role="toolbar"
          aria-label="Reader controls"
        >
          <button
            className={`btn ${pure ? '!border-signal !bg-signal-soft !text-signal' : ''}`}
            onClick={() => set(!pure)}
            aria-pressed={pure}
            data-testid="pure-toggle"
          >
            {pure ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
            Pure Signal {pure ? 'on' : 'off'}
          </button>
          <a className="btn no-underline" href={withBase(`/${slug}.md`)} data-testid="md-link">
            <FileText size={14} aria-hidden /> .md
          </a>
          {markdownText && <CopyButton text={markdownText} label="Copy for LLM" />}
          <span className="ml-auto hidden text-xs text-dim sm:inline">
            {pure ? 'Prose hidden — tables, diagrams, math and code only' : 'Full blueprint'}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
