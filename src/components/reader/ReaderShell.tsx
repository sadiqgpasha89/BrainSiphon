'use client';

import { Eye, EyeOff, FileText } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CopyButton } from '../CopyButton';
import { withBase } from '../../lib/site';
import { ROLE_IDS, ROLE_META, combineRoles, isRoleId, sectionsForRoles, type RoleId } from '../../lib/roles';

export interface TocItem {
  id: string;
  label: string;
  prose?: boolean;
}

const STORAGE_KEY = 'bs:pure-signal';
const ROLE_KEY = 'bs:roles';
const LEGACY_ROLE_KEY = 'bs:role';
const ROLE_BY_KEY = new Map<string, RoleId>(ROLE_IDS.map((r) => [ROLE_META[r].key, r]));

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
  const [roles, setRolesState] = useState<RoleId[]>([]);
  const rolesRef = useRef<RoleId[]>([]);
  rolesRef.current = roles;

  useEffect(() => {
    try {
      setPure(localStorage.getItem(STORAGE_KEY) === '1');
      const saved = (localStorage.getItem(ROLE_KEY) ?? localStorage.getItem(LEGACY_ROLE_KEY) ?? '')
        .split(',')
        .filter(isRoleId);
      if (saved.length) setRolesState(ROLE_IDS.filter((r) => saved.includes(r)));
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

  const setRoles = useCallback((next: RoleId[]) => {
    const ordered = ROLE_IDS.filter((r) => next.includes(r));
    setRolesState(ordered);
    try {
      localStorage.setItem(ROLE_KEY, ordered.length ? ordered.join(',') : 'all');
    } catch {
      /* storage unavailable */
    }
    // the layout just changed: bring the first section the combined lens cares about back into view
    if (ordered.length) {
      const first = sectionsForRoles(ordered)[0];
      if (first)
        requestAnimationFrame(() => document.getElementById(first)?.scrollIntoView({ block: 'start' }));
    }
  }, []);
  const toggleRole = useCallback(
    (r: RoleId) =>
      setRoles(
        rolesRef.current.includes(r) ? rolesRef.current.filter((x) => x !== r) : [...rolesRef.current, r],
      ),
    [setRoles],
  );

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
      else if (e.key === '0') setRoles([]);
      else {
        const r = ROLE_BY_KEY.get(e.key.toLowerCase());
        if (r) toggleRole(r);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [set, setRoles, toggleRole]);

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

  const combined = roles.length ? combineRoles(roles) : null;
  const visible = combined?.sections ?? [];

  return (
    <div
      className={`mx-auto grid max-w-7xl gap-10 px-4 pt-8 lg:grid-cols-[14rem_minmax(0,1fr)] ${pure ? 'pure-signal' : ''}`}
      data-pure={pure ? 'true' : 'false'}
      data-role={roles.length ? roles.join(' ') : 'all'}
      data-sel={roles.join(' ')}
      data-filtered={roles.length ? 'true' : 'false'}
      data-testid="reader"
    >
      <aside className="hidden lg:block">
        <nav aria-label="On this page" className="sticky top-20">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-dim">On this page</p>
          <ul className="space-y-0.5 border-l border-line">
            {toc
              .filter((t) => !roles.length || visible.includes(t.id))
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
              <span className="kbd">1</span>–<span className="kbd">9</span>, <span className="kbd">a</span>–
              <span className="kbd">e</span> add or remove a role · <span className="kbd">0</span> all
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
              className={`chip cursor-pointer ${roles.length === 0 ? 'chip-signal' : ''}`}
              aria-pressed={roles.length === 0}
              onClick={() => setRoles([])}
              data-testid="role-all"
            >
              <span className="text-dim">0</span> All
            </button>
            {ROLE_IDS.map((r) => (
              <button
                key={r}
                type="button"
                className={`chip cursor-pointer ${roles.includes(r) ? 'chip-signal' : ''}`}
                aria-pressed={roles.includes(r)}
                onClick={() => toggleRole(r)}
                title={ROLE_META[r].focus}
                data-testid={`role-${r}`}
              >
                <span className="text-dim">{ROLE_META[r].key}</span> {ROLE_META[r].label}
              </button>
            ))}
            {roles.length > 0 && (
              <span className="ml-2 text-xs text-dim">
                {roles.length} {roles.length === 1 ? 'role' : 'roles'} ·{' '}
                {visible.filter((id) => toc.some((t) => t.id === id)).length} of {toc.length} sections
              </span>
            )}
          </div>
        </div>
        {combined && <CombinedView view={combined} />}
        {children}
      </div>
    </div>
  );
}

/** What the selected roles do together: every lifecycle phase they touch, and the handoffs at the edge of the combination. */
function CombinedView({ view }: { view: ReturnType<typeof combineRoles> }) {
  const name = (r: RoleId) => ROLE_META[r].label;
  return (
    <div className="card mb-8 p-4" data-testid="combined-view" aria-label="Combined responsibilities">
      <p className="font-mono text-[11px] uppercase tracking-wider text-dim">
        {view.roles.length === 1 ? 'Your role' : `Combined view of ${view.roles.length} roles`}
      </p>
      <h2 className="mt-1 text-base font-semibold text-ink">{view.roles.map(name).join(' + ')}</h2>
      <ol className="mt-3 space-y-3" data-testid="combined-phases">
        {view.phases.map((p) => (
          <li key={p.id} data-testid={`phase-${p.id}`}>
            <p className="text-sm font-semibold text-ink">
              {p.label}
              {p.mandatory && <span className="chip chip-signal ml-2">compulsory</span>}
            </p>
            <ul className="mt-1 space-y-1 text-sm text-mute">
              {p.items.map((i) => (
                <li key={i.role}>
                  {view.roles.length > 1 && <span className="font-medium text-ink">{name(i.role)}: </span>}
                  {i.text}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3" data-testid="combined-handoffs">
        <div>
          <p className="font-semibold text-ink">Handled inside your combination</p>
          {view.internalHandoffs.length ? (
            <ul className="mt-1 space-y-1 text-mute">
              {view.internalHandoffs.map((h) => (
                <li key={`${h.from}-${h.to}`}>
                  {name(h.from)} → {name(h.to)}: {h.artefact}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-mute">No handoff between the roles you picked.</p>
          )}
        </div>
        <div>
          <p className="font-semibold text-ink">You receive from others</p>
          <ul className="mt-1 space-y-1 text-mute">
            {view.inbound.map((h) => (
              <li key={`${h.from}-${h.to}`}>
                {name(h.from)}: {h.artefact}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-ink">You hand over to others</p>
          <ul className="mt-1 space-y-1 text-mute">
            {view.outbound.map((h) => (
              <li key={`${h.from}-${h.to}`}>
                {name(h.to)}: {h.artefact}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
