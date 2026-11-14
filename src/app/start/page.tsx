import type { Metadata } from 'next';
import Link from 'next/link';
import { ProgressSummary, StepList } from '../../components/start/StepList';
import { ALL_STEPS, DELIVERY_TEMPLATES } from '../../content/delivery';
import {
  CAPSTONE,
  EXAMPLE,
  FIRST_HOUR,
  SECTION_PURPOSE,
  SHORTCUTS,
  STUCK,
  WEEKS,
} from '../../content/start-guide';
import { ROLE_IDS, ROLE_META, ROLE_SECTIONS, SECTION_GROUPS } from '../../lib/roles';
import { withBase } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Start here: a reading sequence for engineers',
  description:
    'A first-hour path, a four-week reading and building sequence, a fast path for each of the fifteen roles, and where to look when you are stuck.',
  alternates: { canonical: '/start' },
};

const H2 = 'scroll-mt-24 text-2xl font-semibold tracking-tight text-ink';
const KICK = 'font-mono text-xs uppercase tracking-wider text-signal';

const allStepIds = [...FIRST_HOUR, ...WEEKS.flatMap((w) => w.steps)].map((s) => s.id);
const hours = (m: number) => `${(m / 60).toFixed(m % 60 ? 1 : 0)} h`;

export default function StartPage() {
  const sectionOrder = SECTION_GROUPS.flatMap((g) => g.sections);
  return (
    <div className="mx-auto max-w-5xl space-y-14 px-4 py-14" data-testid="start-guide">
      <header>
        <p className={KICK}>Getting started</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Start here: how an engineer gets from the first page to real expertise
        </h1>
        <p className="mt-4 max-w-3xl text-mute">
          BrainSiphon has 500 blueprints, a delivery guide, patterns, reference implementations, deployment
          kits and templates. You do not read it all. You pick one use case and move through the material in a
          fixed order, each step ending in something you can check. This page is that order.
        </p>
        <ul className="mt-5 flex flex-wrap gap-2 text-sm">
          {[
            ['#first-hour', 'First hour'],
            ['#four-weeks', 'Four-week sequence'],
            ['#one-blueprint', 'Reading one blueprint'],
            ['#by-role', 'Fast path by role'],
            ['#stuck', 'When you are stuck'],
            ['#trust', 'How far to trust it'],
          ].map(([h, l]) => (
            <li key={h}>
              <a href={h} className="chip no-underline">
                {l}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <ProgressSummary ids={allStepIds} />
        </div>
      </header>

      <section aria-labelledby="first-hour" className="space-y-4">
        <p className={KICK}>If you have one hour</p>
        <h2 id="first-hour" className={H2}>
          The first hour
        </h2>
        <p className="max-w-3xl text-sm text-mute">
          Five steps, about {hours(FIRST_HOUR.reduce((n, s) => n + s.minutes, 0))}. At the end you have chosen
          a use case, read it once, and know which steps of the delivery guide are yours. Ticks are kept in
          this browser only.
        </p>
        <StepList steps={FIRST_HOUR} />
      </section>

      <section aria-labelledby="four-weeks" className="space-y-8">
        <div>
          <p className={KICK}>If you want to become good at this</p>
          <h2 id="four-weeks" className={H2}>
            The four-week sequence
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-mute">
            Each week reads, then builds, then asks one question you should be able to answer before moving
            on. The examples use{' '}
            <Link href={`/${EXAMPLE}`} className="underline">
              the card-fraud blueprint
            </Link>
            ; swap in the slug of your own use case. A week is roughly 8 to 10 hours of focused work, not
            calendar time.
          </p>
        </div>
        {WEEKS.map((w) => (
          <article
            key={w.id}
            className="space-y-3"
            aria-labelledby={`${w.id}-h`}
            data-testid={`start-${w.id}`}
          >
            <h3 id={`${w.id}-h`} className="text-xl font-semibold text-ink">
              {w.title}{' '}
              <span className="font-mono text-xs font-normal text-dim">
                · about {hours(w.steps.reduce((n, s) => n + s.minutes, 0))} reading
              </span>
            </h3>
            <p className="max-w-3xl text-sm text-ink/90">
              <span className="font-mono text-[11px] uppercase text-dim">Goal </span>
              {w.goal}
            </p>
            <StepList steps={w.steps} />
            <div className="card border-signal-line p-4 text-sm">
              <p className="font-mono text-[11px] uppercase tracking-wider text-signal">Build this</p>
              <p className="mt-1 text-ink/90">{w.exercise}</p>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-dim">
                Before you move on
              </p>
              <p className="mt-1 text-ink/90">{w.question}</p>
            </div>
          </article>
        ))}
        <div className="card p-4 text-sm" data-testid="start-capstone">
          <p className="text-ink/90">{CAPSTONE}</p>
        </div>
      </section>

      <section aria-labelledby="one-blueprint" className="space-y-4">
        <p className={KICK}>The order inside every blueprint</p>
        <h2 id="one-blueprint" className={H2}>
          Reading one blueprint: 22 sections in four groups
        </h2>
        <p className="max-w-3xl text-sm text-mute">
          Every blueprint has the same sections in the same order, so what you learn on one transfers to the
          next. Read Understand and Design before Prove, and Prove before Ship and run. Links go to the
          example blueprint.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {SECTION_GROUPS.map((g) => (
            <div key={g.id} className="card p-4" data-testid={`start-group-${g.id}`}>
              <p className="font-semibold text-ink">{g.label}</p>
              <p className="text-xs text-mute">{g.blurb}</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
                {g.sections.map((id) => (
                  <li key={id}>
                    <Link
                      href={`/${EXAMPLE}#${id}`}
                      className="font-medium text-ink underline decoration-line underline-offset-4"
                    >
                      {id}
                    </Link>
                    <span className="text-mute"> · {SECTION_PURPOSE[id]}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <p className="text-sm text-mute">
          Tip: the reading order above is also the page order ({sectionOrder.length} sections). Press a role
          key on a blueprint to hide what that role does not need.
        </p>
      </section>

      <section aria-labelledby="by-role" className="space-y-4">
        <p className={KICK}>If you already know your job</p>
        <h2 id="by-role" className={H2}>
          A fast path for each of the fifteen roles
        </h2>
        <p className="max-w-3xl text-sm text-mute">
          Read in this order. Sections are the ones that role is shown on a blueprint; steps are the
          delivery-guide steps that role owns; templates are the deliverables that role produces. All three
          are generated from the same data the rest of the site uses, so they cannot drift.
        </p>
        <div className="space-y-3">
          {ROLE_IDS.map((r) => {
            const steps = ALL_STEPS.filter((s) => s.owner === r);
            const templates = DELIVERY_TEMPLATES.filter((t) => t.ownerRole === r);
            return (
              <details key={r} className="card p-4" data-testid={`start-role-${r}`}>
                <summary className="cursor-pointer font-medium text-ink">
                  {ROLE_META[r].label}{' '}
                  <span className="font-mono text-xs font-normal text-dim">
                    · key {ROLE_META[r].key} · {steps.length} steps own
                  </span>
                </summary>
                <p className="mt-2 text-sm text-mute">{ROLE_META[r].focus}</p>
                <p className="mt-3 font-mono text-[11px] uppercase text-dim">
                  1. Read these blueprint sections, in this order
                </p>
                <p className="mt-1 text-sm">
                  {ROLE_SECTIONS[r].map((id, i) => (
                    <span key={id}>
                      {i > 0 && ' → '}
                      <Link
                        href={`/${EXAMPLE}#${id}`}
                        className="text-ink underline decoration-line underline-offset-4"
                      >
                        {id}
                      </Link>
                    </span>
                  ))}
                </p>
                <p className="mt-3 font-mono text-[11px] uppercase text-dim">2. Then do the steps you own</p>
                {steps.length ? (
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink/90">
                    {steps.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/delivery#${s.id.split('.')[0] === '0' ? 'p0' : `p${s.id.split('.')[0]}`}`}
                          className="underline decoration-line underline-offset-4"
                        >
                          {s.id}
                        </Link>{' '}
                        {s.title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-mute">
                    This role owns no step on its own; it works through the steps it takes part in. Filter the
                    delivery guide to this role to see them.
                  </p>
                )}
                {templates.length > 0 && (
                  <>
                    <p className="mt-3 font-mono text-[11px] uppercase text-dim">3. Templates you produce</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink/90">
                      {templates.map((t) => (
                        <li key={t.code}>
                          <a
                            href={withBase(`/downloads/${t.file}`)}
                            className="underline decoration-line underline-offset-4"
                            download
                          >
                            {t.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </details>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="stuck" className="space-y-4">
        <p className={KICK}>Referring back</p>
        <h2 id="stuck" className={H2}>
          When you are stuck, look here
        </h2>
        <div className="overflow-x-auto">
          <table className="bs-table w-full text-sm" data-testid="start-stuck">
            <thead>
              <tr>
                <th>Your question</th>
                <th>Go to</th>
              </tr>
            </thead>
            <tbody>
              {STUCK.map((r) => (
                <tr key={r.question}>
                  <td className="align-top font-medium text-ink">{r.question}</td>
                  <td className="align-top">
                    <ul className="m-0 list-none space-y-1 p-0">
                      {r.where.map((w) => (
                        <li key={w.href + w.label}>
                          {w.href.includes('.txt') ? (
                            <a
                              href={withBase(w.href)}
                              className="underline decoration-line underline-offset-4"
                            >
                              {w.label}
                            </a>
                          ) : (
                            <Link href={w.href} className="underline decoration-line underline-offset-4">
                              {w.label}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="pt-2 text-lg font-semibold text-ink">Shortcuts and exports</h3>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[14rem_1fr]">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="contents">
              <dt className="font-mono text-xs text-ink">{s.keys}</dt>
              <dd className="m-0 text-mute">{s.does}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="trust" className="space-y-3">
        <p className={KICK}>Read the numbers correctly</p>
        <h2 id="trust" className={H2}>
          How far to trust what you read
        </h2>
        <ul className="max-w-3xl list-disc space-y-2 pl-5 text-sm text-ink/90">
          <li>
            Every blueprint is a <strong>reference design</strong>. Its latencies, capacities, costs and
            thresholds are modelled starting points. Replace each with your own baseline before you rely on
            it.
          </li>
          <li>
            The{' '}
            <Link href="/release" className="underline">
              release report
            </Link>{' '}
            and each blueprint&apos;s Validation section say what was checked: schema, internal consistency of
            the numbers, and whether a starter kit ran on <em>synthetic</em> data. Passing those shows a page
            is complete and coherent; it does not show the design works in your environment.
          </li>
          <li>
            Code you can run (starter kits, reference implementations) says what is simulated. Infrastructure
            code says on the{' '}
            <Link href="/deployment#validation" className="underline">
              deployment page
            </Link>{' '}
            what has and has not been validated; targets for recovery are targets until you have drilled them.
          </li>
          <li>
            High-risk blueprints are not suitable for real-world deployment as published. Compliance and
            regulatory text is orientation, not legal advice.
          </li>
        </ul>
      </section>
    </div>
  );
}
