import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { SearchBar } from '../components/SearchTrigger';
import { ManifestSummary } from '../components/ReleaseReport';
import { ALL_STEPS, DELIVERY_PHASES } from '../content/delivery';
import { getIndex, getRelease } from '../lib/content';
import { TEMPLATES_URL } from '../lib/nav';
import { SECTION_GROUPS } from '../lib/roles';
import { DOMAINS, DOMAIN_META } from '../schemas/usecase.schema';

export const revalidate = 86400;

/** A few well-rounded blueprints for someone who does not know where to begin. */
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
  const release = await getRelease();
  const featured = FEATURED.map((s) => all.find((e) => e.slug === s)).filter(
    (e): e is NonNullable<typeof e> => Boolean(e),
  );

  const steps = [
    {
      title: 'Pick a blueprint',
      body: `${DOMAINS.length} industries, 50 solved use cases in each. Take the one closest to your problem.`,
      href: '#industries',
      cta: 'Browse industries',
      testId: 'cta-industries',
    },
    {
      title: 'Follow the delivery guide',
      body: `${DELIVERY_PHASES.length} phases and ${ALL_STEPS.length} steps from scoping to monitoring. Each step says who does it and what it produces.`,
      href: '/delivery',
      cta: 'Open the guide',
      testId: 'cta-guide',
    },
    {
      title: 'Build from the blueprint',
      body: 'Every step points to the part of the blueprint you need: signals, architecture, data, evaluation and operations.',
      href: `/${FEATURED[0]}`,
      cta: 'See an example blueprint',
      testId: 'cta-example',
    },
  ];

  return (
    <div>
      {/* ── 1. What is this, and what do I do first? ── */}
      <section className="hero-glow border-b border-line/60">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-14 pt-12 sm:pb-20 sm:pt-20 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
              Signal in. <span className="text-noise line-through decoration-2">Noise</span> out.
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Build AI systems that work in production
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-mute">
              {all.length} ready-made blueprints across {DOMAINS.length} industries, and one step-by-step
              guide that takes any of them from idea to a monitored, live system. Free to read.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/start" className="btn-primary w-full sm:w-auto" data-testid="cta-start">
                New here? Start here <ArrowRight size={16} aria-hidden />
              </Link>
              <a href="#industries" className="btn-secondary w-full sm:w-auto" data-testid="cta-browse">
                Browse blueprints
              </a>
            </div>
            <div className="mt-5">
              <SearchBar />
            </div>

            <dl
              className="mt-10 grid grid-cols-2 gap-x-8 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-10"
              data-testid="home-stats"
            >
              {[
                [String(all.length), 'blueprints'],
                [String(DOMAINS.length), 'industries'],
                [String(ALL_STEPS.length), 'step delivery guide'],
                ['Free', 'to read, always'],
              ].map(([n, l]) => (
                <div key={l} className="flex items-baseline gap-2">
                  <dt className="text-2xl font-semibold text-ink">{n}</dt>
                  <dd className="m-0 text-sm text-mute">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* what a blueprint is, shown rather than described */}
          <aside
            className="card hidden p-6 lg:block"
            aria-label="What is inside a blueprint"
            data-testid="home-anatomy"
          >
            <p className="font-mono text-[11px] uppercase tracking-wider text-dim">Inside every blueprint</p>
            <ol className="mt-5 space-y-5">
              {SECTION_GROUPS.map((g) => (
                <li key={g.id} className="border-l-2 border-signal-line pl-4">
                  <p className="font-semibold text-ink">{g.label}</p>
                  <p className="mt-0.5 text-sm text-mute">{g.blurb}</p>
                </li>
              ))}
            </ol>
            <Link
              href={`/${FEATURED[0]}`}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-signal no-underline hover:underline"
            >
              Open an example <ArrowRight size={14} aria-hidden />
            </Link>
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4">
        {/* ── 2. How does it work? ── */}
        <section aria-labelledby="how" className="py-14">
          <p className="section-kicker">How it works</p>
          <h2 id="how" className="section-title">
            Three steps from a problem to a plan
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3" data-testid="how-it-works">
            {steps.map((s, i) => (
              <li key={s.title} className="card flex flex-col p-6">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-soft font-mono text-sm font-semibold text-signal"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-mute">{s.body}</p>
                <Link
                  href={s.href}
                  data-testid={s.testId}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-signal no-underline hover:underline"
                >
                  {s.cta} <ArrowRight size={14} aria-hidden />
                </Link>
              </li>
            ))}
          </ol>

          <div className="mt-8">
            <p className="text-sm text-mute">
              The delivery guide has the same {DELIVERY_PHASES.length} phases for every use case. Each ends in
              a gate that named people sign.
            </p>
            <ol
              className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"
              data-testid="home-phases"
            >
              {DELIVERY_PHASES.map((p) => (
                <li key={p.id}>
                  <Link href={`/delivery#${p.id}`} className="card-link h-full p-3">
                    <span className="font-mono text-xs text-signal">Phase {p.n}</span>
                    <span className="mt-0.5 block font-semibold text-ink">{p.short}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── 3. Where do I begin? ── */}
        <section
          id="industries"
          aria-labelledby="industries-h"
          className="scroll-mt-20 border-t border-line/60 py-14"
        >
          <p className="section-kicker">Blueprints</p>
          <h2 id="industries-h" className="section-title">
            Pick an industry
          </h2>
          <p className="section-lead">
            Each one has 50 solved blueprints. Open the one closest to your work.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
            {DOMAINS.map((d) => (
              <Link key={d} href={`/${d}`} className="card-link group flex h-full flex-col p-4 sm:p-5">
                <h3 className="font-semibold text-ink group-hover:text-signal">{DOMAIN_META[d].short}</h3>
                <p className="mt-2 flex-1 text-sm text-mute">{DOMAIN_META[d].topics}</p>
                <p className="mt-3 font-mono text-xs text-dim">
                  {all.filter((e) => e.domain === d).length} blueprints
                </p>
              </Link>
            ))}
          </div>

          <h3 className="mt-12 text-lg font-semibold text-ink">Not sure? Start with one of these</h3>
          <ul className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((e) => (
              <li key={e.id}>
                <Link href={`/${e.slug}`} className="card-link h-full p-4">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-dim">
                    {DOMAIN_META[e.domain].short}
                  </p>
                  <p className="mt-1 font-semibold text-ink">{e.title}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-mute">{e.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 4. Everything is free ── */}
        <section aria-labelledby="free-all" className="border-t border-line/60 py-14">
          <p className="section-kicker">Free</p>
          <h2 id="free-all" className="section-title">
            Every blueprint, and a worked template for each one.
          </h2>
          <p className="section-lead">
            Nothing here is paid. Read the blueprints, then take the worked template for your use case from the
            repository and run it.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2" data-testid="home-free">
            <div className="card flex flex-col p-6">
              <p className="chip chip-signal self-start">Free</p>
              <h3 className="mt-3 text-xl font-semibold text-ink">Read, learn and plan</h3>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-ink/90">
                {[
                  `All ${all.length} blueprints`,
                  `The ${ALL_STEPS.length}-step delivery guide and its templates`,
                  'Pattern kits with runnable code',
                  'Reference implementations and customer implementation packs',
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-signal" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <Link href="/start" className="btn-secondary mt-6 self-start">
                Start here
              </Link>
            </div>
            <div className="card flex flex-col p-6">
              <p className="chip chip-signal self-start">Free</p>
              <h3 className="mt-3 text-xl font-semibold text-ink">Start building on day one</h3>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-ink/90">
                {[
                  `A worked template for each of the ${all.length} use cases`,
                  'Filled-in project documents, contracts and deployment sizing',
                  'Starter engines with tests and gates, under the MIT licence',
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-signal" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <a href={TEMPLATES_URL} className="btn-secondary mt-6 self-start">
                Browse the templates
              </a>
            </div>
          </div>
        </section>

        {/* ── 5. Can I trust it? ── */}
        <section aria-labelledby="trust" className="border-t border-line/60 py-14">
          <p className="section-kicker">Honesty</p>
          <h2 id="trust" className="section-title">
            What has been checked
          </h2>
          <p className="section-lead">
            Every blueprint is checked for completeness and internal consistency, and says what evidence it
            has. This is exactly what that does and does not prove, so you can see what to adapt and test in
            your own environment.
          </p>
          <div className="mt-8">
            <ManifestSummary release={release} />
          </div>
        </section>
      </div>
    </div>
  );
}
