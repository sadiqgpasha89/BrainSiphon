import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { SearchTrigger } from '../components/SearchTrigger';
import { tocFor } from '../components/reader/Sections';
import { ALL_STEPS, DELIVERY_PHASES } from '../content/delivery';
import { getIndex } from '../lib/content';
import { ROLE_IDS, ROLE_META, ROLE_OWNS, SECTION_GROUPS } from '../lib/roles';
import { DOMAINS, DOMAIN_META, PARADIGM_LABEL, type Paradigm } from '../schemas/usecase.schema';

export const revalidate = 86400;

const FEATURED = [
  'fintech/real-time-card-upi-fraud-detection',
  'retail/personalized-search-ranking',
  'healthcare/sepsis-early-warning',
  'adtech/real-time-bidding-bid-optimization',
  'cybersecurity/llm-prompt-injection-detection',
  'saas/in-app-ai-copilot',
];

export default async function Home() {
  const all = await getIndex();
  const featured = FEATURED.map((s) => all.find((e) => e.slug === s)).filter(
    (e): e is NonNullable<typeof e> => Boolean(e),
  );
  const sectionLabel = new Map(tocFor(true).map((t) => [t.id, t.label]));

  const steps = [
    {
      title: 'Pick a use case',
      body: `${DOMAINS.length} industries, 50 solved use cases in each. Take the one closest to your problem.`,
      href: '#domains',
      cta: 'Browse the domains',
    },
    {
      title: 'Follow the delivery guide',
      body: `${DELIVERY_PHASES.length} phases and ${ALL_STEPS.length} steps from scoping to monitoring. Each step names who does it, with whom, when, how and what it produces.`,
      href: '/delivery',
      cta: 'Open the guide',
    },
    {
      title: 'Build from the blueprint',
      body: 'Each step links to the section of the blueprint you need: signals, architecture, data, evaluation, operations and, where one fits, a starter kit.',
      href: `/${FEATURED[0]}`,
      cta: 'See an example blueprint',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4">
      <section className="py-14 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
          Solved AI/ML use cases, and how to deliver them
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Signal in. <span className="text-noise line-through decoration-2">Noise</span> out.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-mute">
          {all.length} production-grade blueprints across {DOMAINS.length} industries, and{' '}
          <strong className="text-ink">one delivery guide</strong> that takes any of them from project scoping
          to a monitored system in production.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/delivery"
            className="btn !border-signal !bg-signal-soft !text-signal no-underline"
            data-testid="cta-guide"
          >
            Start with the delivery guide <ArrowRight size={14} aria-hidden />
          </Link>
          <a href="#domains" className="btn no-underline">
            Browse use cases
          </a>
          <SearchTrigger />
        </div>
      </section>

      <section aria-labelledby="how" className="pb-6">
        <h2 id="how" className="h-section">
          How it works
        </h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3" data-testid="how-it-works">
          {steps.map((s, i) => (
            <li key={s.title} className="card flex flex-col p-5">
              <span className="font-mono text-sm text-signal">Step {i + 1}</span>
              <h3 className="mt-1 text-lg font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 flex-1 text-sm text-mute">{s.body}</p>
              <Link href={s.href} className="mt-4 inline-flex items-center gap-1 text-sm text-signal">
                {s.cta} <ArrowRight size={13} aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="domains" className="py-10">
        <h2 id="domains" className="h-section">
          Pick a domain
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DOMAINS.map((d) => {
            const items = all.filter((e) => e.domain === d);
            // the paradigms this domain actually uses most, not the first three that happen to appear
            const counts = new Map<Paradigm, number>();
            for (const e of items) for (const p of e.mlParadigms) counts.set(p, (counts.get(p) ?? 0) + 1);
            const para = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
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
                <p className="mt-3 text-xs text-dim">{para.map(([p]) => PARADIGM_LABEL[p]).join(' · ')}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="featured" className="py-10">
        <h2 id="featured" className="h-section">
          Not sure? Start with one of these
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
                <p className="mt-2 line-clamp-2 text-sm text-mute">{e.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="path" className="py-10">
        <h2 id="path" className="h-section">
          The delivery path
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-mute">
          The same seven phases for every use case. Each ends in a gate that named people sign.
        </p>
        <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" data-testid="home-phases">
          {DELIVERY_PHASES.map((p) => (
            <li key={p.id}>
              <Link
                href={`/delivery#${p.id}`}
                className="card block h-full p-3 no-underline transition hover:border-signal/60"
              >
                <span className="font-mono text-xs text-signal">Phase {p.n}</span>
                <span className="mt-0.5 block font-semibold text-ink">{p.short}</span>
                <span className="mt-1 block text-xs text-mute">{p.name}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="inside" className="py-10">
        <h2 id="inside" className="h-section">
          What every blueprint contains
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SECTION_GROUPS.map((g) => (
            <li key={g.id} className="card p-5">
              <h3 className="font-semibold text-ink">{g.label}</h3>
              <p className="mt-1 text-sm text-mute">{g.blurb}</p>
              <ul className="mt-3 space-y-1 text-sm text-ink/90">
                {g.sections.map((id) => (
                  <li key={id} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-signal" aria-hidden />
                    {sectionLabel.get(id)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="roles" className="py-10">
        <h2 id="roles" className="h-section">
          Read it as your role
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-mute">
          Inside a blueprint, the Role lens keeps only the sections your role needs. In the delivery guide,
          “Your role” keeps only your steps. Pick several roles if you hold several.
        </p>
        <details className="card mt-5 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            The {ROLE_IDS.length} roles and what each one owns
          </summary>
          <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="role-cards">
            {ROLE_IDS.map((r) => (
              <li key={r} className="text-sm">
                <p className="font-medium text-ink">
                  <span className="kbd mr-2">{ROLE_META[r].key}</span>
                  {ROLE_META[r].label}
                </p>
                <p className="mt-0.5 text-mute">{ROLE_OWNS[r]}</p>
              </li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  );
}
