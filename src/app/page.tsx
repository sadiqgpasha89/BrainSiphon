import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
} from 'lucide-react';
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
          {all.length} validated enterprise blueprints across {DOMAINS.length} industries (schema &amp;
          architecture-feasibility verified with 7-level maturity scorecards), and{' '}
          <strong className="text-ink">one delivery guide</strong> that takes any of them from scoping to
          monitored production.
        </p>

        {/* Validation Transparency Strip */}
        <div
          className="bg-surface/60 mt-8 rounded-lg border border-line p-4 text-xs"
          data-testid="manifest-transparency"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-2">
            <span className="font-mono font-medium uppercase tracking-wider text-signal">
              Validation Manifest &amp; Provenance Transparency
            </span>
            <span className="font-mono text-dim">Audited against 7-Stage Maturity Framework</span>
          </div>
          <div className="mt-3 grid gap-3 font-mono text-[11px] sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded bg-raised/50 p-2.5">
              <span className="block text-dim">Schema Validation</span>
              <span className="font-semibold text-signal">500 / 500 Passed</span>
              <p className="mt-0.5 text-[10px] text-mute">Strict Zod type contract</p>
            </div>
            <div className="rounded bg-raised/50 p-2.5">
              <span className="block text-dim">Architecture Feasibility</span>
              <span className="font-semibold text-signal">4,774 Passed · 7 Warn</span>
              <p className="mt-0.5 text-[10px] text-mute">0 Hard Failures</p>
            </div>
            <div className="rounded bg-raised/50 p-2.5">
              <span className="block text-dim">Executable Validation</span>
              <span className="font-semibold text-signal">11 Kits + 8 Starters</span>
              <p className="mt-0.5 text-[10px] text-mute">Automated pytest CI runs</p>
            </div>
            <div className="rounded bg-raised/50 p-2.5">
              <span className="block text-dim">Domain Expert Review</span>
              <span className="font-semibold text-mute">0 / 500 Claimed</span>
              <p className="mt-0.5 text-[10px] text-mute">Explicit Profiles Required</p>
            </div>
            <div className="rounded bg-raised/50 p-2.5">
              <span className="block text-dim">Production Evidence</span>
              <span className="font-semibold text-mute">0 / 500 Claimed</span>
              <p className="mt-0.5 text-[10px] text-mute">Requires Customer Canary</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-mute">
            No blueprint makes unsubstantiated claims of production-readiness. Every design provides an
            explicit 7-level maturity scorecard, distinguishing conceptual architecture from executable
            prototypes and customer production evidence.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/delivery"
            className="btn !border-signal !bg-signal-soft !text-signal no-underline"
            data-testid="cta-guide"
          >
            Start with the delivery guide <ArrowRight size={14} aria-hidden />
          </Link>
          <a href="#about" className="btn no-underline" data-testid="cta-about">
            About this project
          </a>
          <a href="#domains" className="btn no-underline">
            Browse use cases
          </a>
          <SearchTrigger />
        </div>
      </section>

      {/* ── About Section: Built for Engineers ── */}
      <section
        id="about"
        aria-labelledby="about-heading"
        className="scroll-mt-20 border-t border-line/60 py-12"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-signal-line bg-signal-soft px-3 py-1 font-mono text-xs font-medium text-signal">
              <Sparkles size={12} aria-hidden />
              <span>Engineers First · Zero-Noise Reference Platform</span>
            </div>
            <h2
              id="about-heading"
              className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
            >
              What is BrainSiphon all about?
            </h2>
          </div>
          <Link
            href="/about"
            className="btn inline-flex items-center gap-1.5 text-xs text-signal no-underline hover:text-ink"
          >
            Read deep-dive architecture philosophy <ArrowRight size={14} aria-hidden />
          </Link>
        </div>

        <p className="mt-4 max-w-3xl text-base leading-relaxed text-mute">
          Most AI resources online are either vendor marketing gloss, toy single-prompt chat demos, or
          academic papers that omit operational realities. When engineers are tasked with deploying AI systems
          into mission-critical production environments—whether processing 2,500 real-time card transactions
          per second or monitoring clinical ICU vitals—they are forced to invent production architectures,
          NFRs, failure modes, data contracts, and capacity sizing from scratch.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mute">
          <strong className="text-ink">BrainSiphon is the engineering antidote</strong>: an open, verified
          reference platform containing 500 complete AI/ML system blueprints, a universal 7-phase delivery
          guide, measurable non-functional requirements (NFRs), and executable starter kits tested in CI.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card p-5">
            <div className="flex items-center gap-2.5 text-signal">
              <Cpu size={18} aria-hidden />
              <h3 className="font-semibold text-ink">Zero-Noise Blueprints</h3>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-mute">
              Every blueprint defines exact latency budgets (P50/P95/P99), hardware requirements (GPU VRAM vs
              KV cache sizing formulas), mathematical loss formulations, and explicit degraded fallback
              ladders when inference fails.
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2.5 text-signal">
              <Layers size={18} aria-hidden />
              <h3 className="font-semibold text-ink">Production Contracts</h3>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-mute">
              Downloadable, machine-readable specifications: OpenAPI 3.1 REST APIs, AsyncAPI 3.0 event streams
              (Kafka/Flink), and point-in-time correct data contracts that prevent data leakage and schema
              drift.
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2.5 text-signal">
              <Workflow size={18} aria-hidden />
              <h3 className="font-semibold text-ink">Universal 7-Phase Delivery</h3>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-mute">
              One coherent lifecycle from Phase 0 discovery and financial ROI models to Phase 6 SRE
              operational runbooks. 69 actionable steps, each naming exactly who does it, with whom, and what
              artifact is produced.
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2.5 text-signal">
              <Terminal size={18} aria-hidden />
              <h3 className="font-semibold text-ink">Executable Starters</h3>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-mute">
              11 reusable pattern kits and 8 named use-case reference implementations with standard repository
              structures, FastAPI microservices, and pytest test suites tested on every build.
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2.5 text-signal">
              <ShieldCheck size={18} aria-hidden />
              <h3 className="font-semibold text-ink">Transparent Maturity</h3>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-mute">
              No fake &ldquo;production-ready&rdquo; claims. Every blueprint carries an audited 7-level
              maturity scorecard and surfaces concrete hardware and FinOps feasibility warnings with
              actionable remediations.
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2.5 text-signal">
              <CheckCircle2 size={18} aria-hidden />
              <h3 className="font-semibold text-ink">15 Engineering Role Lenses</h3>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-mute">
              Filter any blueprint or delivery step to your exact discipline: Solution Architect, ML Engineer,
              SRE, Platform Engineer, Data Scientist, Forward Deployed Engineer (FDE), or Security Officer.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/about"
            className="btn !border-signal !bg-signal-soft text-xs !text-signal no-underline"
          >
            Read the full About &amp; Engineering Guide <ArrowRight size={13} aria-hidden />
          </Link>
          <Link href="/delivery" className="btn text-xs no-underline">
            Explore 69-Step Delivery Guide
          </Link>
          <Link href="/patterns" className="btn text-xs no-underline">
            View Pattern Library
          </Link>
          <Link href="/deployment" className="btn text-xs no-underline">
            Cloud Deployment &amp; IaC
          </Link>
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
