import type { Metadata } from 'next';
import Link from 'next/link';
import proCatalog from '../../../content/pro-catalog.json';
import {
  FREE_WORKED_EXAMPLE,
  PRO_CHECKOUT_LIVE,
  PRO_CTA_HREF,
  PRO_CURRENCY,
  PRO_ENGINE_COUNT,
  PRO_PACK_CONTENTS,
  PRO_PACK_COUNT,
  PRO_PLANS,
  type ProCatalogEntry,
} from '../../lib/pro';

export const metadata: Metadata = {
  title: 'BrainSiphon Pro: 500 worked templates',
  description:
    'A runnable worked template for every one of the 500 blueprints: its own starter and results, filled-in project documents, contracts and deployment sizing. The free site keeps one complete worked example.',
  alternates: { canonical: '/pro' },
};

const packs = proCatalog.packs as ProCatalogEntry[];
const totalFiles = packs.reduce((a, p) => a + p.files, 0);
const engines = Object.entries(
  packs.reduce<Record<string, { label: string; n: number }>>((acc, p) => {
    if (p.engine === 'authored') return acc;
    acc[p.engine] = { label: p.engineLabel, n: (acc[p.engine]?.n ?? 0) + 1 };
    return acc;
  }, {}),
).sort((a, b) => b[1].n - a[1].n);
const handWritten = packs.filter((p) => p.authoredStarter).length;
const withImplementationPack = packs.filter((p) => p.fdePack).length;

const COMPARE: [string, string, string][] = [
  ['All 500 blueprints, signal versus noise, HLD, LLD, capacity and metrics', 'Yes', 'Yes'],
  ['Delivery guide (7 phases, 73 steps), delivery templates, deployment kit, FDE toolkit', 'Yes', 'Yes'],
  ['Build playbook: milestones, gates, tests, decisions, pitfalls', 'Yes', 'Yes'],
  ['Pattern kits: runnable code for each kind of problem', 'Yes', 'Yes'],
  [
    'A complete worked use case with its own starter, results and reference implementation',
    '1 (card and UPI fraud)',
    `All ${PRO_PACK_COUNT}`,
  ],
  [
    'A worked template per use case: filled-in documents, contracts, deployment sizing',
    '—',
    `All ${PRO_PACK_COUNT}`,
  ],
  [
    'Starter with this use case’s own synthetic world, tests, gates and saved results',
    '—',
    `All ${PRO_PACK_COUNT}`,
  ],
  ['Customer implementation packs and the other reference implementations', '1', 'All'],
];

const STEPS: [string, string][] = [
  PRO_CHECKOUT_LIVE
    ? ['Choose a plan', 'Pay once. There is no subscription, and updates to version 1 are included.']
    : [
        'Ask for early access',
        'Checkout is not open yet, so the button sends an email request and you get the repository invitation by return.',
      ],
  [
    'Receive the repository',
    'You get the whole private repository: every worked template, the starter engines and the generator.',
  ],
  [
    'Open your use case',
    'Each use case has its own folder. Read WORKED_EXAMPLE.md, then run its starter on synthetic data.',
  ],
];

const FAQ: [string, string][] = [
  [
    'What do I receive?',
    'A download of the whole repository, with all worked templates, the engines and the generator, and every update to version 1, sent through the checkout provider.',
  ],
  [
    'Can I use it for client work?',
    'Yes, inside the licence: one engineer on the Individual plan, up to ten engineers in one company on the Team plan. You may not resell or republish the templates or the repository.',
  ],
  [
    'Is there a refund?',
    'If a template does not run as described, write to the contact address and it will be fixed or refunded.',
  ],
  [
    'Do the free pages go away?',
    'No. The blueprints, delivery guide, deployment kit and the one complete worked example stay free.',
  ],
];

const CTA_ATTRS = PRO_CHECKOUT_LIVE ? { target: '_blank', rel: 'noopener noreferrer' } : {};

export default function ProPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-16 px-4 py-14" data-testid="pro-page">
      <header>
        <p className="section-kicker !text-warn">BrainSiphon Pro</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
          A worked template for every one of the {PRO_PACK_COUNT} use cases
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-mute">
          The free blueprints tell you what to build. Pro gives you the first week of the build, already done
          for your use case: a runnable starter on synthetic data, the project documents filled in, the
          contracts and the deployment sizing.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <a
            href={PRO_CTA_HREF}
            data-testid="pro-cta-top"
            className="btn-pro w-full sm:w-auto"
            {...CTA_ATTRS}
          >
            {PRO_CHECKOUT_LIVE ? 'Get BrainSiphon Pro' : 'Ask for early access'}
          </a>
          <Link href={`/${FREE_WORKED_EXAMPLE}`} className="btn-secondary w-full sm:w-auto">
            Try the free worked example first
          </Link>
        </div>
        <p className="mt-4 max-w-2xl text-sm text-mute">
          Looking to learn or plan? Everything for that is free: all {PRO_PACK_COUNT} blueprints, the delivery
          guide and one complete worked example. Pro is for when you are ready to build.
        </p>
        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [String(PRO_PACK_COUNT), 'worked templates'],
            [String(PRO_ENGINE_COUNT), 'starter engines, plus hand-written starters'],
            [totalFiles.toLocaleString('en-US'), 'files in the repository'],
            ['10', 'industries, 50 use cases each'],
          ].map(([n, l]) => (
            <div key={l} className="card p-4">
              <dt className="text-2xl font-semibold text-ink">{n}</dt>
              <dd className="mt-1 text-xs text-mute">{l}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section aria-labelledby="inside" className="space-y-5">
        <div>
          <p className="section-kicker">Every template contains</p>
          <h2 id="inside" className="section-title">
            What is inside one worked template
          </h2>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PRO_PACK_CONTENTS.map((c) => (
            <li key={c.path} className="card p-4">
              <p className="font-mono text-xs text-warn">{c.path}</p>
              <p className="mt-1 text-sm text-ink/90" data-prose>
                {c.what}
              </p>
            </li>
          ))}
        </ul>
        <p className="max-w-3xl text-sm text-mute" data-prose>
          {handWritten} use cases also carry a hand-written starter with its own serving layer, and{' '}
          {withImplementationPack} have a customer implementation pack with integration code, fixtures and
          customer-facing documents. The repository includes the generator, so you can rebuild a template
          after you change a blueprint.
        </p>
      </section>

      <section aria-labelledby="how-buying" className="space-y-5">
        <div>
          <p className="section-kicker">How you get it</p>
          <h2 id="how-buying" className="section-title">
            Three steps, no account to manage
          </h2>
        </div>
        <ol className="grid gap-4 md:grid-cols-3" data-testid="pro-steps">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="card p-5">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-warn/15 font-mono text-sm font-semibold text-warn"
                aria-hidden
              >
                {i + 1}
              </span>
              <h3 className="mt-3 font-semibold text-ink">{title}</h3>
              <p className="mt-1 text-sm text-mute" data-prose>
                {body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="compare" className="space-y-5">
        <div>
          <p className="section-kicker">Free and Pro</p>
          <h2 id="compare" className="section-title">
            What stays free
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="bs-table" data-testid="pro-compare">
            <thead>
              <tr>
                <th>Included</th>
                <th>Free</th>
                <th className="!text-warn">Pro</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([what, free, pro]) => (
                <tr key={what}>
                  <td>{what}</td>
                  <td>{free}</td>
                  <td className="font-medium text-warn">{pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="pricing" className="space-y-5">
        <div>
          <p className="section-kicker">Pricing</p>
          <h2 id="pricing" className="section-title">
            One payment, no subscription
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2" data-testid="pro-plans">
          {PRO_PLANS.map((p) => (
            <div key={p.id} className="card flex flex-col p-6">
              <p className="text-sm font-medium text-ink">{p.name}</p>
              <p className="mt-2 text-4xl font-semibold text-ink">
                {PRO_CURRENCY === 'USD' ? '$' : ''}
                {p.price}
                <span className="ml-2 text-sm font-normal text-mute">once · {p.seats}</span>
              </p>
              <p className="mt-3 text-sm text-mute" data-prose>
                {p.summary}
              </p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-ink/90">
                {p.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <a href={PRO_CTA_HREF} className="btn-pro mt-6 self-start" {...CTA_ATTRS}>
                {PRO_CHECKOUT_LIVE ? `Buy ${p.name}` : 'Ask for early access'}
              </a>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="honest" className="space-y-5">
        <div>
          <p className="section-kicker">Before you buy</p>
          <h2 id="honest" className="section-title">
            What a worked template is not
          </h2>
        </div>
        <ul className="max-w-3xl list-disc space-y-2 pl-5 text-sm text-ink/90" data-prose>
          <li>
            The starter runs on synthetic data. It plants the traps the blueprint names so each lesson is
            shown, not asserted. It does not contain your population, and results on real data will be lower.
          </li>
          <li>
            Documents are generated from the blueprint’s structured fields and reorganised as working
            documents. Capacity and cost figures are modelled at on-demand list prices, not measured.
          </li>
          <li>
            A starter is not production code: no serving layer for most use cases, no authentication, no
            secrets handling. Milestones M5 and M6 (serving and rollout) are always your platform.
          </li>
          <li>
            Compliance is established by your own controls, evidence and assessment. The governance register
            supports that work; it does not replace it.
          </li>
        </ul>
      </section>

      <section aria-labelledby="faq" className="space-y-5">
        <div>
          <p className="section-kicker">Questions</p>
          <h2 id="faq" className="section-title">
            Good to know
          </h2>
        </div>
        <div className="max-w-3xl space-y-2" data-testid="pro-faq">
          {FAQ.map(([q, a]) => (
            <details key={q} className="card group p-4">
              <summary className="cursor-pointer font-medium text-ink">{q}</summary>
              <p className="mt-2 text-sm text-mute" data-prose>
                {a}
              </p>
            </details>
          ))}
        </div>

        <details className="card max-w-3xl p-4" data-testid="pro-engines-details">
          <summary className="cursor-pointer font-medium text-ink" data-testid="pro-engines-toggle">
            How the starters are built: {PRO_ENGINE_COUNT} engines, one for each kind of problem
          </summary>
          <p className="mt-3 text-sm text-mute" data-prose>
            Each use case runs the engine that implements its problem type, with a seed and settings drawn
            from the use case itself, so every template reports its own numbers. An engine plants the traps
            the blueprint warns about: late labels, leakage, drift, censoring, a channel that changes, a
            layout the model has never seen.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="pro-engines">
            {engines.map(([id, e]) => (
              <li
                key={id}
                className="flex items-baseline justify-between gap-3 rounded-lg border border-line p-3 text-sm"
              >
                <span className="text-ink/90">{e.label}</span>
                <span className="shrink-0 font-mono text-xs text-mute">{e.n} use cases</span>
              </li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  );
}
