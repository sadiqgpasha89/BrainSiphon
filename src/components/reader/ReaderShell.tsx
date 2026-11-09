'use client';

import { Eye, EyeOff, FileText } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CopyButton } from '../CopyButton';
import { withBase } from '../../lib/site';
import { ROLE_IDS, ROLE_META, ROLE_SECTIONS, isRoleId, type RoleId } from '../../lib/roles';

export interface TocItem {
  id: string;
  label: string;
  prose?: boolean;
}

const STORAGE_KEY = 'bs:pure-signal';
const ROLE_KEY = 'bs:role';

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
  const [role, setRoleState] = useState<RoleId | null>(null);
  const roleRef = useRef<RoleId | null>(null);
  roleRef.current = role;

  useEffect(() => {
    try {
      setPure(localStorage.getItem(STORAGE_KEY) === '1');
      const r = localStorage.getItem(ROLE_KEY);
      if (isRoleId(r)) setRoleState(r);
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

  const setRole = useCallback((r: RoleId | null) => {
    setRoleState(r);
    try {
      localStorage.setItem(ROLE_KEY, r ?? 'all');
    } catch {
      /* storage unavailable */
    }
    // the layout just changed: bring the first section this role cares about back into view
    if (r)
      requestAnimationFrame(() =>
        document.getElementById(ROLE_SECTIONS[r][0]!)?.scrollIntoView({ block: 'start' }),
      );
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
      else if (e.key >= '1' && e.key <= String(ROLE_IDS.length)) {
        const r = ROLE_IDS[Number(e.key) - 1]!;
        setRole(roleRef.current === r ? null : r);
      } else if (e.key === '0') setRole(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [set, setRole]);

  // Which section is current: the last one whose top has passed the sticky header. Scroll-driven (and re-queried
  // on every event) rather than an IntersectionObserver set up at mount, because streamed sections may not exist yet then.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      let current = toc[0]?.id ?? '';
      for (const t of toc) {
        const el = document.getElementById(t.id);
        if (el && el.offsetParent !== null && el.getBoundingClientRect().top <= 230) current = t.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('hashchange', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('hashchange', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [toc]);

  // Diagrams render lazily and push content down after the browser has already jumped to a #section.
  // Keep the target aligned while the layout settles, until the reader scrolls or touches the page themselves.
  useEffect(() => {
    let cleanup = () => {};
    const settle = () => {
      cleanup();
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      let touched = false;
      const stop = () => {
        touched = true;
      };
      const events = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;
      events.forEach((e) => window.addEventListener(e, stop, { passive: true, once: true }));
      const align = () => {
        if (!touched) document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
      };
      const ro = new ResizeObserver(align);
      ro.observe(document.body);
      const timer = window.setTimeout(() => ro.disconnect(), 4000);
      cleanup = () => {
        ro.disconnect();
        window.clearTimeout(timer);
        events.forEach((e) => window.removeEventListener(e, stop));
      };
    };
    settle();
    window.addEventListener('hashchange', settle);
    return () => {
      window.removeEventListener('hashchange', settle);
      cleanup();
    };
  }, []);

  return (
    <div
      className={`mx-auto grid max-w-7xl gap-10 px-4 pt-8 lg:grid-cols-[14rem_minmax(0,1fr)] ${pure ? 'pure-signal' : ''}`}
      data-pure={pure ? 'true' : 'false'}
      data-role={role ?? 'all'}
      data-testid="reader"
    >
      <aside className="hidden lg:block">
        <nav aria-label="On this page" className="sticky top-20">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-dim">On this page</p>
          <ul className="space-y-0.5 border-l border-line">
            {toc
              .filter((t) => !role || ROLE_SECTIONS[role].includes(t.id))
              .map((t) => (
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
              <span className="kbd">1</span>–<span className="kbd">{ROLE_IDS.length}</span> role lens ·{' '}
              <span className="kbd">0</span> all
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
          <div
            className="flex w-full flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Role lens"
            data-testid="role-lens"
          >
            <span className="mr-1 font-mono text-[11px] uppercase tracking-wider text-dim">Lens</span>
            <button
              type="button"
              className={`chip cursor-pointer ${role === null ? 'chip-signal' : ''}`}
              aria-pressed={role === null}
              onClick={() => setRole(null)}
              data-testid="role-all"
            >
              <span className="text-dim">0</span> All
            </button>
            {ROLE_IDS.map((r) => (
              <button
                key={r}
                type="button"
                className={`chip cursor-pointer ${role === r ? 'chip-signal' : ''}`}
                aria-pressed={role === r}
                onClick={() => setRole(role === r ? null : r)}
                title={ROLE_META[r].focus}
                data-testid={`role-${r}`}
              >
                <span className="text-dim">{ROLE_META[r].key}</span> {ROLE_META[r].label}
              </button>
            ))}
            {role && (
              <span className="ml-2 text-xs text-dim">
                {ROLE_SECTIONS[role].filter((id) => toc.some((t) => t.id === id)).length} of {toc.length}{' '}
                sections
              </span>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
