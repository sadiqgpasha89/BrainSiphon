'use client';

import { Check, ChevronDown, FileText, RotateCcw, ShieldCheck, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ALL_STEPS,
  DELIVERY_PHASES,
  HOW_TO_USE,
  PARTNER_IDS,
  PARTY_IDS,
  REFERENCE_PLAN_NOTE,
  isPartnerId,
  partyLabel,
  raciFor,
  stepInvolves,
  type DeliveryPhase,
  type DeliveryStep,
  type PartyId,
} from '../../content/delivery';
import { ROLE_IDS, ROLE_LIFECYCLE } from '../../lib/roles';
import { BlueprintRefs, GuideContext, stepAnchor } from './GuideLinks';
import { withBase } from '../../lib/site';
import { DOMAINS, DOMAIN_META, type Domain } from '../../schemas/usecase.schema';

export interface GuideEntry {
  slug: string;
  title: string;
  domain: Domain;
}

const UC_KEY = 'bs:delivery:uc';
const PARTY_KEY = 'bs:delivery:party';
const doneKey = (uc: string) => `bs:delivery:done:${uc || 'any'}`;

const REFERENCE_TOC = [
  { id: 'assurance', label: 'Evaluation & guardrails' },
  { id: 'frameworks', label: 'Frameworks & regulations' },
  { id: 'people', label: 'Who is involved' },
  { id: 'raci', label: 'RACI by phase' },
  { id: 'rhythm', label: 'Meeting rhythm' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'adapt', label: 'Adapting the guide' },
  { id: 'glossary', label: 'Glossary' },
];
const TOC_IDS = ['start', ...DELIVERY_PHASES.map((p) => p.id), ...REFERENCE_TOC.map((r) => r.id)];

const RACI_WORD: Record<string, string> = {
  A: 'You are accountable for this phase',
  'A/R': 'You are accountable for this phase and do part of the work',
  R: 'You own steps in this phase',
  C: 'You take part in this phase',
  I: 'You are kept informed in this phase',
};

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // storage unavailable
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
};

export function DeliveryGuide({ entries, children }: { entries: GuideEntry[]; children: React.ReactNode }) {
  const bySlug = useMemo(() => new Map(entries.map((e) => [e.slug, e])), [entries]);

  const [uc, setUcState] = useState('');
  const [domain, setDomain] = useState<Domain | ''>('');
  const [party, setPartyState] = useState<PartyId | ''>('');
  const [done, setDone] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [active, setActive] = useState('start');

  // The use case comes from the link that brought the reader here, else from their last visit. Read from the address bar after
  // mount (not useSearchParams) so the whole guide is in the static HTML rather than behind a Suspense fallback.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('uc') ?? '';
    const saved = read(UC_KEY) ?? '';
    const slug = bySlug.has(fromUrl) ? fromUrl : bySlug.has(saved) ? saved : '';
    setUcState(slug);
    setDomain(slug ? bySlug.get(slug)!.domain : '');
    if (slug) write(UC_KEY, slug);
    const p = read(PARTY_KEY) ?? '';
    if ((PARTY_IDS as readonly string[]).includes(p)) setPartyState(p as PartyId);
  }, [bySlug]);

  // progress is kept per use case, so two deliveries do not share ticks
  useEffect(() => {
    const ids = new Set(ALL_STEPS.map((s) => s.id));
    setDone(new Set((read(doneKey(uc)) ?? '').split(',').filter((id) => ids.has(id))));
  }, [uc]);

  const setUc = useCallback((slug: string) => {
    setUcState(slug);
    write(UC_KEY, slug || null);
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set('uc', slug);
    else url.searchParams.delete('uc');
    window.history.replaceState(null, '', url);
  }, []);
  const setParty = useCallback((p: PartyId | '') => {
    setPartyState(p);
    write(PARTY_KEY, p || null);
  }, []);
  const toggleDone = useCallback(
    (id: string) =>
      setDone((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        write(doneKey(uc), [...next].join(','));
        return next;
      }),
    [uc],
  );
  const resetDone = useCallback(() => {
    setDone(new Set());
    write(doneKey(uc), null);
  }, [uc]);
  const toggleOpen = useCallback(
    (ids: string[], value?: boolean) =>
      setOpen((prev) => {
        const next = new Set(prev);
        const on = value ?? !ids.every((id) => next.has(id));
        for (const id of ids) {
          if (on) next.add(id);
          else next.delete(id);
        }
        return next;
      }),
    [],
  );

  // A link to a step (#s3.9, from the reference tables or from outside) opens that step. If the role filter is hiding it,
  // the filter is cleared: the reader asked for this step. Declared after the effect that restores the saved role, so the
  // update below sees it.
  useEffect(() => {
    const openFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const step = ALL_STEPS.find((s) => stepAnchor(s.id) === id);
      if (!step) return;
      setPartyState((p) => (p && !stepInvolves(step, p) ? '' : p));
      setOpen((prev) => new Set(prev).add(step.id));
      requestAnimationFrame(() =>
        requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' })),
      );
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, []);

  // which part of the guide is on screen, for the side navigation
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      let current = TOC_IDS[0]!;
      for (const id of TOC_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 160) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const guideContext = useMemo(() => ({ uc }), [uc]);
  const entry = uc ? bySlug.get(uc) : undefined;
  const inDomain = domain ? entries.filter((e) => e.domain === domain) : [];
  const mine = party ? ALL_STEPS.filter((s) => stepInvolves(s, party)) : ALL_STEPS;
  const mineDone = mine.filter((s) => done.has(s.id)).length;

  const navLink = (id: string, label: React.ReactNode) => (
    <a
      href={`#${id}`}
      aria-current={active === id ? 'location' : undefined}
      className={`-ml-px flex items-baseline justify-between gap-2 border-l px-3 py-1.5 text-sm no-underline transition ${active === id ? 'border-signal text-signal' : 'border-transparent text-mute hover:border-mute hover:text-ink'}`}
    >
      {label}
    </a>
  );

  return (
    <div
      className="mx-auto grid max-w-7xl gap-10 px-4 pt-8 lg:grid-cols-[14rem_minmax(0,1fr)]"
      data-testid="delivery-guide"
      data-uc={uc}
      data-party={party || 'all'}
    >
      <aside className="hidden lg:block">
        <nav aria-label="On this page" className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-dim">The path</p>
          <ul className="border-l border-line">
            <li>{navLink('start', 'Start here')}</li>
            {DELIVERY_PHASES.map((p) => {
              const n = p.steps.filter((s) => done.has(s.id)).length;
              return (
                <li key={p.id}>
                  {navLink(
                    p.id,
                    <>
                      <span>
                        <span className="font-mono text-xs text-dim">{p.n}</span> {p.short}
                      </span>
                      <span
                        className={`font-mono text-[11px] ${n === p.steps.length ? 'text-signal' : 'text-dim'}`}
                      >
                        {n}/{p.steps.length}
                      </span>
                    </>,
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mb-3 mt-6 font-mono text-[11px] uppercase tracking-wider text-dim">Reference</p>
          <ul className="border-l border-line">
            {REFERENCE_TOC.map((r) => (
              <li key={r.id}>{navLink(r.id, r.label)}</li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0">
        <header id="start" className="scroll-mt-24">
          <p className="font-mono text-xs uppercase tracking-wider text-signal">Delivery guide</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            From project scoping to deployment and monitoring
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-mute">
            One path for any of the {entries.length} use cases: {DELIVERY_PHASES.length} phases,{' '}
            {ALL_STEPS.length} steps. Each step says who does it, who takes part, when, how, what it produces
            and where to read in the blueprint.
          </p>

          <div className="card mt-6 grid gap-4 p-4 md:grid-cols-3" data-testid="guide-setup">
            <div className="md:col-span-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-dim">1 · Your use case</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <select
                  className="guide-select"
                  aria-label="Domain"
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value as Domain | '');
                    setUc('');
                  }}
                  data-testid="guide-domain"
                >
                  <option value="">Domain…</option>
                  {DOMAINS.map((d) => (
                    <option key={d} value={d}>
                      {DOMAIN_META[d].short}
                    </option>
                  ))}
                </select>
                <select
                  className="guide-select"
                  aria-label="Use case"
                  value={uc}
                  disabled={!domain}
                  onChange={(e) => setUc(e.target.value)}
                  data-testid="guide-uc"
                >
                  <option value="">{domain ? 'Use case…' : 'Pick a domain first'}</option>
                  {inDomain.map((e) => (
                    <option key={e.slug} value={e.slug}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-sm text-mute" data-testid="guide-uc-status">
                {entry ? (
                  <>
                    Every “Read” link below opens{' '}
                    <Link href={`/${entry.slug}`} className="text-signal">
                      {entry.title}
                    </Link>{' '}
                    at the right section.
                  </>
                ) : (
                  'Optional. Pick one and every step links straight into that blueprint.'
                )}
              </p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-dim">2 · Your role</p>
              <select
                className="guide-select mt-2 w-full"
                aria-label="Show steps for"
                value={party}
                onChange={(e) => setParty(e.target.value as PartyId | '')}
                data-testid="guide-party"
              >
                <option value="">Everyone (all steps)</option>
                <optgroup label="Delivery roles">
                  {ROLE_IDS.map((r) => (
                    <option key={r} value={r}>
                      {partyLabel(r)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Business partners">
                  {PARTNER_IDS.map((r) => (
                    <option key={r} value={r}>
                      {partyLabel(r)}
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-mute">
                <span data-testid="guide-progress">
                  {mineDone} of {mine.length} {party ? 'of your steps' : 'steps'} done
                </span>
                {done.size > 0 && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-dim underline hover:text-ink"
                    onClick={resetDone}
                  >
                    <RotateCcw size={11} aria-hidden /> reset
                  </button>
                )}
              </p>
            </div>
          </div>

          <ol className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" data-testid="phase-rail">
            {DELIVERY_PHASES.map((p) => {
              const n = p.steps.filter((s) => done.has(s.id)).length;
              return (
                <li key={p.id}>
                  <a
                    href={`#${p.id}`}
                    className="card block h-full p-3 no-underline transition hover:border-signal/60"
                  >
                    <span className="font-mono text-xs text-signal">Phase {p.n}</span>
                    <span className="mt-0.5 block font-semibold text-ink">{p.short}</span>
                    <span className="mt-1 block text-xs text-dim">{p.weeks.split(',')[0]}</span>
                    <span
                      className="mt-2 block h-1 overflow-hidden rounded-full bg-raised"
                      role="img"
                      aria-label={`${n} of ${p.steps.length} steps done`}
                    >
                      <span
                        className="block h-full rounded-full bg-signal"
                        style={{ width: `${(n / p.steps.length) * 100}%` }}
                      />
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-xs text-dim">{REFERENCE_PLAN_NOTE}</p>

          <details className="card mt-6 p-4" open>
            <summary className="cursor-pointer text-sm font-semibold text-ink">How to use this guide</summary>
            <ol className="mt-3 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              {HOW_TO_USE.map((h, i) => (
                <li key={h.title} className="flex gap-3">
                  <span className="font-mono text-signal">{i + 1}</span>
                  <span>
                    <strong className="text-ink">{h.title}.</strong>{' '}
                    <span className="text-mute">{h.body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-mute">
              <a className="btn no-underline" href={withBase('/delivery.md')} data-testid="guide-md">
                <FileText size={14} aria-hidden /> The whole guide as .md
              </a>
              <span>for printing, your own wiki or an LLM.</span>
            </p>
          </details>
        </header>

        {DELIVERY_PHASES.map((p) => (
          <Phase
            key={p.id}
            phase={p}
            party={party}
            uc={uc}
            done={done}
            open={open}
            toggleDone={toggleDone}
            toggleOpen={toggleOpen}
          />
        ))}

        <GuideContext.Provider value={guideContext}>{children}</GuideContext.Provider>
      </div>
    </div>
  );
}

function Phase({
  phase: p,
  party,
  uc,
  done,
  open,
  toggleDone,
  toggleOpen,
}: {
  phase: DeliveryPhase;
  party: PartyId | '';
  uc: string;
  done: Set<string>;
  open: Set<string>;
  toggleDone: (id: string) => void;
  toggleOpen: (ids: string[], value?: boolean) => void;
}) {
  const steps = party ? p.steps.filter((s) => stepInvolves(s, party)) : p.steps;
  const ids = steps.map((s) => s.id);
  const allOpen = ids.length > 0 && ids.every((id) => open.has(id));
  const raci = party ? raciFor(p, party) : '';
  const lifecycle = party && !isPartnerId(party) ? ROLE_LIFECYCLE[party][p.id] : undefined;

  return (
    <section
      id={p.id}
      aria-labelledby={`${p.id}-h`}
      className="mt-12 scroll-mt-24 border-t border-line pt-10"
      data-testid={`guide-${p.id}`}
    >
      <p className="font-mono text-xs uppercase tracking-wider text-signal">
        Phase {p.n} · {p.weeks}
      </p>
      <h2 id={`${p.id}-h`} className="mt-1 text-2xl font-semibold tracking-tight text-ink">
        {p.name}
      </h2>
      <p className="mt-2 max-w-3xl text-mute">{p.goal}</p>
      <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-dim">Led by</dt>
          <dd className="text-ink">{partyLabel(p.lead)}</dd>
        </div>
        <div>
          <dt className="text-dim">Accountable</dt>
          <dd className="text-ink">{partyLabel(p.accountable)}</dd>
        </div>
        <div>
          <dt className="text-dim">Before you start</dt>
          <dd className="text-ink">{p.entry}</dd>
        </div>
      </dl>

      {party && (
        <p
          className="mt-4 rounded-lg border border-signal-line bg-signal-soft px-3 py-2 text-sm text-ink"
          data-testid={`guide-${p.id}-yours`}
        >
          <strong className="text-signal">{partyLabel(party)}.</strong>{' '}
          {raci ? RACI_WORD[raci] : 'You have no part in this phase'}
          {steps.length > 0 && `: ${steps.length} of its ${p.steps.length} steps involve you`}.
          {lifecycle && ` ${lifecycle}`}
        </p>
      )}

      {steps.length > 0 && (
        <>
          <div className="mt-6 flex items-center justify-between">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-dim">
              {party ? 'Your steps' : 'Steps'}
            </h3>
            <button
              type="button"
              className="text-xs text-dim underline hover:text-ink"
              onClick={() => toggleOpen(ids, !allOpen)}
            >
              {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
          </div>
          <ol className="mt-2 space-y-2">
            {steps.map((s) => (
              <Step
                key={s.id}
                step={s}
                party={party}
                uc={uc}
                done={done.has(s.id)}
                open={open.has(s.id)}
                onDone={() => toggleDone(s.id)}
                onOpen={() => toggleOpen([s.id])}
              />
            ))}
          </ol>
        </>
      )}

      <div
        className="mt-6 rounded-xl border border-signal-line bg-signal-soft/40 p-4"
        data-testid={`gate-${p.id}`}
      >
        <p className="flex items-center gap-2 font-semibold text-ink">
          <ShieldCheck size={16} className="text-signal" aria-hidden /> {p.gate.name}
        </p>
        <p className="mt-1 text-sm text-mute">
          Called by {partyLabel(p.gate.convenedBy)}. Signed by {p.gate.signedBy.map(partyLabel).join(', ')}.
          Every line is evidence that must exist.
        </p>
        <ul className="mt-3 grid gap-x-8 gap-y-1.5 text-sm text-ink/90 md:grid-cols-2">
          {p.gate.checks.map((c) => (
            <li key={c} className="flex gap-2">
              <Check size={14} className="mt-0.5 shrink-0 text-signal" aria-hidden />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      <details className="mt-3 rounded-xl border border-line px-4 py-3">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
          <TriangleAlert size={14} className="text-warn" aria-hidden /> {p.traps.length} common mistakes in
          this phase
        </summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-mute">
          {p.traps.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function Step({
  step: s,
  party,
  uc,
  done,
  open,
  onDone,
  onOpen,
}: {
  step: DeliveryStep;
  party: PartyId | '';
  uc: string;
  done: boolean;
  open: boolean;
  onDone: () => void;
  onOpen: () => void;
}) {
  const panel = `step-${s.id}-panel`;
  return (
    <li
      id={stepAnchor(s.id)}
      className={`card scroll-mt-24 ${done ? 'opacity-70' : ''}`}
      data-testid={`step-${s.id}`}
      data-done={done}
    >
      <div className="flex items-start gap-3 px-3 py-2.5">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[rgb(var(--c-signal))]"
          checked={done}
          onChange={onDone}
          aria-label={`Step ${s.id} done`}
        />
        <button
          type="button"
          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left"
          aria-expanded={open}
          aria-controls={panel}
          onClick={onOpen}
        >
          <span className="font-mono text-xs text-dim">{s.id}</span>
          <span className={`min-w-0 flex-1 basis-56 font-medium text-ink ${done ? 'line-through' : ''}`}>
            {s.title}
          </span>
          <span className={`chip ${party && s.owner === party ? 'chip-signal' : ''}`}>
            {partyLabel(s.owner)}
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-dim transition ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      </div>
      <div id={panel} hidden={!open} className="border-t border-line px-3 pb-4 pt-3 sm:pl-10">
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <dt className="text-dim">With</dt>
            <dd className="text-ink">{s.with.map(partyLabel).join(', ')}</dd>
          </div>
          <div>
            <dt className="text-dim">When</dt>
            <dd className="text-ink">{s.when}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-dim">How</p>
        <ol className="mt-1 list-decimal space-y-1.5 pl-5 text-sm text-ink/90">
          {s.how.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ol>
        <p className="mt-3 text-sm">
          <span className="text-dim">Output </span>
          <span className="font-medium text-ink">{s.output}</span>
        </p>
        {s.note && (
          <p className="mt-2 text-sm text-mute">
            <span className="text-dim">Variation </span>
            {s.note}
          </p>
        )}
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
          <span className="mr-1 text-dim">Read in the blueprint</span>
          <GuideContext.Provider value={{ uc }}>
            <BlueprintRefs anchors={s.read} />
          </GuideContext.Provider>
        </p>
      </div>
    </li>
  );
}
