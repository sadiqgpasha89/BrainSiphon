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

const H2 = 'scroll-mt-24 text-2xl font-semibold tracking-tight text-ink';
const KICK = 'font-mono text-xs uppercase tracking-wider text-signal';

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

export default function ProPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-14 px-4 py-14" data-testid="pro-page">
      <header>
        <p className={KICK}>BrainSiphon Pro</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          A worked template for every one of the {PRO_PACK_COUNT} use cases
        </h1>
        <p className="mt-4 max-w-3xl text-mute">
          The blueprints tell you what to build and what to avoid. Pro gives you the first week of the build,
          already done for your use case: a runnable starter on synthetic data with its tests, the project
          documents filled in from the blueprint, the contracts, and the deployment sizing. The free site
          keeps one complete worked example so you can judge the quality before you buy.
        </p>
        <p className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={PRO_CTA_HREF}
            data-testid="pro-cta-top"
            className="text-canvas rounded-md bg-signal px-4 py-2 text-sm font-medium no-underline hover:opacity-90"
            {...(PRO_CHECKOUT_LIVE ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {PRO_CHECKOUT_LIVE ? 'Get BrainSiphon Pro' : 'Ask for early access'}
          </a>
          <Link href={`/${FREE_WORKED_EXAMPLE}`} className="text-sm text-mute hover:text-ink">
            See the free worked example
          </Link>
        </p>
        <dl className="mt-8 grid gap-3 sm:grid-cols-4">
          {[
            [String(PRO_PACK_COUNT), 'worked templates'],
            [String(PRO_ENGINE_COUNT), 'starter engines, plus hand-written starters'],
            [totalFiles.toLocaleString('en-US'), 'files in the repository'],
            ['10', 'domains, 50 use cases each'],
          ].map(([n, l]) => (
            <div key={l} className="card p-4">
              <dt className="text-2xl font-semibold text-ink">{n}</dt>
              <dd className="mt-1 text-xs text-mute">{l}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section aria-labelledby="inside" className="space-y-4">
        <p className={KICK}>Every template contains</p>
        <h2 id="inside" className={H2}>
          What is inside one worked template
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PRO_PACK_CONTENTS.map((c) => (
            <li key={c.path} className="card p-4">
              <p className="font-mono text-xs text-signal">{c.path}</p>
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

      <section aria-labelledby="compare" className="space-y-4">
        <p className={KICK}>Free and Pro</p>
        <h2 id="compare" className={H2}>
          What stays free
        </h2>
        <div className="overflow-x-auto">
          <table className="bs-table" data-testid="pro-compare">
            <thead>
              <tr>
                <th>Included</th>
                <th>Free</th>
                <th className="!text-signal">Pro</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([what, free, pro]) => (
                <tr key={what}>
                  <td>{what}</td>
                  <td>{free}</td>
                  <td className="text-signal/90">{pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="engines" className="space-y-4">
        <p className={KICK}>How the starters are built</p>
        <h2 id="engines" className={H2}>
          {PRO_ENGINE_COUNT} engines, one for each kind of problem
        </h2>
        <p className="max-w-3xl text-sm text-mute" data-prose>
          Each use case runs the engine that implements its problem type, with a seed and settings drawn from
          the use case itself, so every template reports its own numbers. An engine plants the traps the
          blueprint warns about: late labels, leakage, drift, censoring, a channel that changes, a layout the
          model has never seen.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2" data-testid="pro-engines">
          {engines.map(([id, e]) => (
            <li key={id} className="card flex items-baseline justify-between gap-3 p-3 text-sm">
              <span className="text-ink/90">{e.label}</span>
              <span className="shrink-0 font-mono text-xs text-mute">{e.n} use cases</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pricing" className="space-y-4">
        <p className={KICK}>Pricing</p>
        <h2 id="pricing" className={H2}>
          One payment, no subscription
        </h2>
        <div className="grid gap-4 sm:grid-cols-2" data-testid="pro-plans">
          {PRO_PLANS.map((p) => (
            <div key={p.id} className="card flex flex-col p-5">
              <p className="text-sm font-medium text-ink">{p.name}</p>
              <p className="mt-2 text-3xl font-semibold text-ink">
                {PRO_CURRENCY === 'USD' ? '$' : ''}
                {p.price}
                <span className="ml-2 text-sm font-normal text-mute">once · {p.seats}</span>
              </p>
              <p className="mt-2 text-sm text-mute" data-prose>
                {p.summary}
              </p>
              <ul className="mt-3 space-y-1 text-sm text-ink/90">
                {p.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <a
                href={PRO_CTA_HREF}
                className="text-canvas mt-5 self-start rounded-md bg-signal px-4 py-2 text-sm font-medium no-underline hover:opacity-90"
                {...(PRO_CHECKOUT_LIVE ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {PRO_CHECKOUT_LIVE ? `Buy ${p.name}` : 'Ask for early access'}
              </a>
            </div>
          ))}
        </div>
        {!PRO_CHECKOUT_LIVE && (
          <p className="text-sm text-mute" data-prose>
            Checkout is not open yet. The button sends an email request and you will get the repository
            invitation by return.
          </p>
        )}
      </section>

      <section aria-labelledby="honest" className="space-y-4">
        <p className={KICK}>Before you buy</p>
        <h2 id="honest" className={H2}>
          What a worked template is not
        </h2>
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

      <section aria-labelledby="faq" className="space-y-4">
        <p className={KICK}>Questions</p>
        <h2 id="faq" className={H2}>
          How buying works
        </h2>
        <dl className="max-w-3xl space-y-4 text-sm">
          {[
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
          ].map(([q, a]) => (
            <div key={q}>
              <dt className="font-medium text-ink">{q}</dt>
              <dd className="mt-1 text-mute" data-prose>
                {a}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
