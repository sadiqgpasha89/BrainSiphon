import {
  ArrowRight,
  Blocks,
  Boxes,
  Gauge,
  GitBranch,
  Layers,
  ListTree,
  Network,
  Sigma,
  Table2,
  Users,
  TriangleAlert,
  Workflow,
} from 'lucide-react';
import Link from 'next/link';
import { SearchTrigger } from '../components/SearchTrigger';
import { getIndex } from '../lib/content';
import { DOMAINS, DOMAIN_META, ML_PARADIGMS, PARADIGM_LABEL, type Paradigm } from '../schemas/usecase.schema';
import { ROLE_IDS, ROLE_META } from '../lib/roles';
import { PRIMITIVES } from '../content/primitives';

export const revalidate = 86400;

const SECTIONS = [
  {
    icon: Table2,
    title: 'Signal vs. Noise matrix',
    body: 'The true signal, the textbook trap, and why engineers fall for it.',
  },
  {
    icon: Sigma,
    title: 'Problem & loss',
    body: 'Business objective, ML objective as rendered math, hard constraints.',
  },
  {
    icon: ListTree,
    title: 'Features & leakage',
    body: 'High-signal features with their leakage risk; the noisy ones to delete.',
  },
  {
    icon: Workflow,
    title: 'Pipeline blueprint',
    body: 'Baseline first, then the production model and serving stack.',
  },
  {
    icon: Network,
    title: 'HLD for 10M users',
    body: 'Stateless inference active-active; regulated or tenant state pinned. Budgets per hop.',
  },
  {
    icon: GitBranch,
    title: 'Sequence diagram',
    body: 'Deadline-propagating request path with the degradation branch.',
  },
  {
    icon: Layers,
    title: 'Low-level design',
    body: 'API contract, DDL, classes, hot-path code, config, fallback ladder.',
  },
  {
    icon: Boxes,
    title: 'End-to-end breakdown',
    body: 'Ten phases from decision framing to ROI, with deliverables.',
  },
  {
    icon: Gauge,
    title: 'Capacity model',
    body: 'QPS, nodes, partitions, storage and cost per 1,000 decisions, with a live what-if calculator.',
  },
  {
    icon: TriangleAlert,
    title: 'Edge cases',
    body: 'Scenario → failure mode → mitigation, from real production incidents.',
  },
  {
    icon: Users,
    title: 'Role lenses',
    body: 'Production gaps for six personas, from AI architect to inference engineer.',
  },
  {
    icon: Blocks,
    title: 'Reference primitives',
    body: `${PRIMITIVES.length} canonical mechanisms (pacers, PIT joins, shedding) linked, not repeated.`,
  },
];

export default async function Home() {
  const all = await getIndex();
  const featuredSlugs = [
    'fintech/real-time-card-upi-fraud-detection',
    'retail/personalized-search-ranking',
    'healthcare/sepsis-early-warning',
    'adtech/real-time-bidding-bid-optimization',
    'cybersecurity/llm-prompt-injection-detection',
    'saas/in-app-ai-copilot',
  ];
  const featured = featuredSlugs
    .map((s) => all.find((e) => e.slug === s))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  return (
    <div className="mx-auto max-w-7xl px-4">
      <section className="py-16 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
          Knowledge platform for AI/ML engineers
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Signal in. <span className="text-noise line-through decoration-2">Noise</span> out.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-mute">
          {all.length} production-grade blueprints across {DOMAINS.length} industries. Each one teaches the
          exact signals that move the metric, names the noise that wastes your quarter, and designs the whole
          system for <strong className="text-ink">10 million users</strong> — HLD, LLD, sequence diagram,
          rollout and cost.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/fintech" className="btn !border-signal !bg-signal-soft !text-signal no-underline">
            Start with FinTech <ArrowRight size={14} aria-hidden />
          </Link>
          <SearchTrigger />
          <span className="text-sm text-dim">
            Inside a blueprint press <span className="kbd">[</span> for Pure Signal ·{' '}
            <span className="kbd">]</span> for full detail · <span className="kbd">1</span>–
            <span className="kbd">6</span> to read as your role
          </span>
        </div>
        <dl className="mt-12 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            [String(all.length), 'blueprints'],
            [String(DOMAINS.length), 'domains × 50 each'],
            [String(all.length * 6), 'system diagrams'],
            [String(ML_PARADIGMS.length), 'ML paradigms'],
          ].map(([n, l]) => (
            <div key={l}>
              <dt className="text-sm text-mute">{l}</dt>
              <dd className="font-mono text-3xl font-semibold text-ink">{n}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="domains" className="py-8">
        <h2 id="domains" className="h-section">
          Pick a domain
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DOMAINS.map((d) => {
            const items = all.filter((e) => e.domain === d);
            // the paradigms this domain actually uses most, not the first three that happen to appear
            const counts = new Map<Paradigm, number>();
            for (const e of items) for (const p of e.mlParadigms) counts.set(p, (counts.get(p) ?? 0) + 1);
            const para = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
            return (
              <Link
                key={d}
                href={`/${d}`}
                className="card group flex flex-col p-5 no-underline transition hover:border-signal/60 hover:bg-raised/50"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-semibold text-ink group-hover:text-signal">{DOMAIN_META[d].short}</h3>
                  <span className="font-mono text-xs text-mute">{items.length}</span>
                </div>
                <p className="mt-2 flex-1 text-sm text-mute">{DOMAIN_META[d].blurb}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {para.map(([p, n]) => (
                    <span key={p} className="chip" title={`${n} of ${items.length} blueprints`}>
                      {PARADIGM_LABEL[p]}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="inside" className="py-12">
        <h2 id="inside" className="h-section">
          What every blueprint contains
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {SECTIONS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="card p-4">
              <Icon size={18} className="text-signal" aria-hidden />
              <h3 className="mt-3 text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-mute">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="roles" className="py-8">
        <h2 id="roles" className="h-section">
          Read it as your role
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-mute">
          Inside any blueprint, press the number key (or use the Lens bar) to keep only the sections that role
          needs, and read the role&apos;s checklist of production gaps at the end.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="role-cards">
          {ROLE_IDS.map((r) => (
            <li key={r} className="card p-4">
              <p className="text-sm font-semibold text-ink">
                <span className="kbd mr-2">{ROLE_META[r].key}</span>
                {ROLE_META[r].label}
              </p>
              <p className="mt-2 text-sm text-mute">{ROLE_META[r].focus}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="featured" className="py-8">
        <h2 id="featured" className="h-section">
          Start here
        </h2>
        <ul className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((e) => (
            <li key={e.id}>
              <Link
                href={`/${e.slug}`}
                className="card block h-full p-4 no-underline transition hover:border-signal/60"
              >
                <p className="font-mono text-[11px] uppercase tracking-wider text-dim">
                  {DOMAIN_META[e.domain].short}
                </p>
                <h3 className="mt-1 font-semibold text-ink">{e.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-mute">{e.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
