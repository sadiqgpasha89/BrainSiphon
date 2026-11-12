import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Gauge,
  Layers,
  Shield,
  Terminal,
  Workflow,
  Zap,
  ExternalLink,
  Server,
  Calculator,
  Compass,
  AlertTriangle,
} from 'lucide-react';
import { AboutInteractive } from '../../components/about/AboutInteractive';
import { withBase } from '../../lib/site';
import { DOMAINS, DOMAIN_META } from '../../schemas/usecase.schema';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'About BrainSiphon — Zero-Noise Enterprise AI Architecture & Delivery',
  description:
    'Learn what BrainSiphon is, the Signal vs. Noise engineering philosophy, blueprint anatomy, role-based usage guides, and how to deliver production AI systems that survive 10 million users.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-16 px-4 py-10 sm:py-14">
      {/* ── Hero Section ── */}
      <header className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-signal-line bg-signal-soft px-3 py-1 font-mono text-xs font-medium text-signal">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-signal" aria-hidden />
          <span>Zero-Noise AI/ML Architecture &amp; Delivery Platform</span>
        </div>

        <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          Signal in. <span className="text-noise line-through decoration-2">Noise</span> out.{' '}
          <span className="mt-2 block text-2xl font-normal text-mute sm:text-3xl lg:text-4xl">
            Blueprints for AI/ML systems that survive 10 million users.
          </span>
        </h1>

        <p className="max-w-3xl text-lg leading-relaxed text-mute">
          BrainSiphon is an open, production-grade engineering reference platform containing{' '}
          <strong className="text-ink">500 complete AI/ML system blueprints</strong> across 10 industry
          domains, coupled with a universal{' '}
          <strong className="text-ink">7-phase, 69-step delivery guide</strong>. Every blueprint separates the
          technical signal that moves the needle from the hype that wastes quarters.
        </p>

        {/* Quick Jump Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
          <a href="#what-is-brainsiphon" className="btn !py-1 text-xs no-underline">
            What is BrainSiphon?
          </a>
          <a href="#core-pillars" className="btn !py-1 text-xs no-underline">
            Blueprint Anatomy
          </a>
          <a href="#delivery-framework" className="btn !py-1 text-xs no-underline">
            Delivery Framework
          </a>
          <a href="#role-guide" className="btn !py-1 text-xs no-underline">
            Role Lenses
          </a>
          <a href="#signal-noise" className="btn !py-1 text-xs no-underline">
            Signal vs. Noise
          </a>
          <a href="#agent-first" className="btn !py-1 text-xs no-underline">
            AI Assistant Integration
          </a>
          <a href="#faqs" className="btn !py-1 text-xs no-underline">
            FAQ
          </a>
        </div>
      </header>

      {/* ── Key Metrics Strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-testid="about-stats">
        <div className="card p-4 text-center">
          <p className="font-mono text-2xl font-bold text-signal sm:text-3xl">500</p>
          <p className="mt-1 text-xs text-mute">Production Blueprints</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-mono text-2xl font-bold text-signal sm:text-3xl">10</p>
          <p className="mt-1 text-xs text-mute">Industry Domains</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-mono text-2xl font-bold text-signal sm:text-3xl">10M</p>
          <p className="mt-1 text-xs text-mute">Users Baseline Scale</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-mono text-2xl font-bold text-signal sm:text-3xl">69</p>
          <p className="mt-1 text-xs text-mute">Delivery Steps (7 Phases)</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-mono text-2xl font-bold text-signal sm:text-3xl">14</p>
          <p className="mt-1 text-xs text-mute">Specialized Role Lenses</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-mono text-2xl font-bold text-signal sm:text-3xl">10</p>
          <p className="mt-1 text-xs text-mute">SRE Incident Runbooks</p>
        </div>
      </div>

      {/* ── Section: What is BrainSiphon & Why Was It Created? ── */}
      <section id="what-is-brainsiphon" className="scroll-mt-20 space-y-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-signal">The Mission</p>
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">What is BrainSiphon?</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="card space-y-4 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <AlertTriangle size={18} className="text-warn" /> The Industry Failure
            </h3>
            <p className="text-sm leading-relaxed text-mute">
              Most AI/ML engineering resources fall into one of two traps:
            </p>
            <ul className="space-y-2 text-sm text-mute">
              <li className="flex items-start gap-2">
                <span className="font-bold text-noise">•</span>
                <span>
                  <strong className="text-ink">Toy Tutorials:</strong> Five-minute tutorials that show how to
                  call an LLM API or fit an XGBoost model on a clean CSV, ignoring latency SLAs, data leakage,
                  security guardrails, and cost.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-noise">•</span>
                <span>
                  <strong className="text-ink">Academic Theory:</strong> Research papers with theoretical
                  bounds that leave the engineer stranded when sizing GPU memory, building feature stores,
                  handling cold starts, or surviving P99 latency spikes.
                </span>
              </li>
            </ul>
            <p className="text-sm leading-relaxed text-mute">
              When projects transition to production, systems break because no one designed for 10 million
              concurrent users, data drift, regulatory scrutiny (EU AI Act, NIST AI RMF), or operational
              outages.
            </p>
          </div>

          <div className="card space-y-4 border-signal-line/40 bg-signal-soft/10 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <Zap size={18} className="text-signal" /> The BrainSiphon Answer
            </h3>
            <p className="text-sm leading-relaxed text-mute">
              BrainSiphon provides{' '}
              <strong className="text-ink">battle-tested, zero-noise engineering blueprints</strong>. Every
              blueprint bridges the chasm between business intent and production delivery:
            </p>
            <ul className="space-y-2 text-sm text-ink">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-signal" />
                <span>
                  <strong>Full Architectural Depth:</strong> From C4 models and integration matrices to
                  Mermaid sequence diagrams and low-level designs.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-signal" />
                <span>
                  <strong>Transparent Capacity &amp; Cost Modeling:</strong> Sized for 10M users with a live
                  in-browser calculator.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-signal" />
                <span>
                  <strong>Governance &amp; Operations:</strong> 6-layer guardrails, 10-layer metrics catalog,
                  and SRE incident runbooks.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Section: The Blueprint Anatomy (6 Pillars) ── */}
      <section id="core-pillars" className="scroll-mt-20 space-y-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-signal">Blueprint 2.0 Standard</p>
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            What Every Single Blueprint Contains
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-mute">
            Across all 500 use cases, each blueprint follows a strict, comprehensive structure consisting of 6
            core engineering pillars divided into 22 dedicated sections:
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card space-y-2 p-5">
            <div className="flex items-center gap-2 text-signal">
              <Compass size={18} />
              <h3 className="text-base font-semibold text-ink">1. Enterprise Context</h3>
            </div>
            <p className="text-xs leading-relaxed text-mute">
              Business goals, AS-IS vs. TO-BE workflows, C4 context and container diagrams, integration
              matrix, Non-Functional Requirements (NFRs), Architecture Decision Records (ADRs), and
              build-vs-buy economic analysis.
            </p>
          </div>

          <div className="card space-y-2 p-5">
            <div className="flex items-center gap-2 text-signal">
              <Workflow size={18} />
              <h3 className="text-base font-semibold text-ink">2. AI Decision Matrix</h3>
            </div>
            <p className="text-xs leading-relaxed text-mute">
              Rigorous justification: Why AI? Why not heuristic rules? Why this specific paradigm? Alternative
              approaches, what would invalidate this choice, human oversight model, and cost-benefit
              trade-offs.
            </p>
          </div>

          <div className="card space-y-2 p-5">
            <div className="flex items-center gap-2 text-signal">
              <Layers size={18} />
              <h3 className="text-base font-semibold text-ink">3. HLD, Sequence &amp; LLD</h3>
            </div>
            <p className="text-xs leading-relaxed text-mute">
              High-Level Design topology for 10 million users, Mermaid sequence diagrams, low-level
              microservice specifications, streaming CDC ingestion (Kafka/Redpanda), and online/offline
              feature store configurations.
            </p>
          </div>

          <div className="card space-y-2 p-5">
            <div className="flex items-center gap-2 text-signal">
              <Calculator size={18} />
              <h3 className="text-base font-semibold text-ink">4. Scale &amp; Cost Calculator</h3>
            </div>
            <p className="text-xs leading-relaxed text-mute">
              Interactive live calculator in the page: tune Daily Active Users, requests per second, payload
              size, and retention to see instant CPU/GPU node counts, RAM, network bandwidth, and monthly
              cloud cost projections.
            </p>
          </div>

          <div className="card space-y-2 p-5">
            <div className="flex items-center gap-2 text-signal">
              <Gauge size={18} />
              <h3 className="text-base font-semibold text-ink">5. 10-Layer Metrics &amp; Eval</h3>
            </div>
            <p className="text-xs leading-relaxed text-mute">
              Metrics across 10 layers: business, model, data, system, cost, safety, RAG, LLM, and agents.
              Paired with offline evaluation protocols, release thresholds, guardrail metrics, and online A/B
              testing plans.
            </p>
          </div>

          <div className="card space-y-2 p-5">
            <div className="flex items-center gap-2 text-signal">
              <Shield size={18} />
              <h3 className="text-base font-semibold text-ink">6. Governance &amp; SRE Ops</h3>
            </div>
            <p className="text-xs leading-relaxed text-mute">
              6-layer defense model (hard constraints, runtime controls, outcome guardrails, human oversight,
              graceful degradation, rollback). Plus SLIs/SLOs and 10 production failure scenarios with
              detection, mitigation, and recovery.
            </p>
          </div>
        </div>

        <div className="card flex flex-col items-center justify-between gap-3 bg-raised/40 p-4 text-xs text-mute sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="chip chip-signal">Live Blueprint Example</span>
            <span>Inspect the complete Blueprint 2.0 structure in action:</span>
          </div>
          <Link
            href="/fintech/real-time-card-upi-fraud-detection"
            className="inline-flex items-center gap-1 font-medium text-signal hover:underline"
          >
            Real-Time Card &amp; UPI Fraud Detection <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      {/* ── Section: The Universal Delivery Framework (/delivery) ── */}
      <section id="delivery-framework" className="scroll-mt-20 space-y-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-signal">Universal Execution</p>
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            The 7-Phase, 69-Step Delivery Guide
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-mute">
            A blueprint shows <em>what</em> to build. The{' '}
            <Link href="/delivery" className="text-signal hover:underline">
              Delivery Guide
            </Link>{' '}
            dictates <em>how and when</em> to do the work. It provides a standardized order of operations
            applicable to all 500 use cases, ensuring nothing is missed from discovery to Day-2 operations.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card p-4">
            <span className="font-mono text-xs text-signal">Phase 0 · 11 Steps</span>
            <h4 className="mt-1 text-sm font-semibold text-ink">Scoping &amp; Discovery</h4>
            <p className="mt-1 text-xs text-mute">
              Feasibility assessment, production BRD, risk tiering, metric tree, and stakeholder RACI
              sign-off.
            </p>
          </div>

          <div className="card p-4">
            <span className="font-mono text-xs text-signal">Phase 1 · 10 Steps</span>
            <h4 className="mt-1 text-sm font-semibold text-ink">Solution Design</h4>
            <p className="mt-1 text-xs text-mute">
              C4 system architecture, service interfaces, OpenAPI 3.1 &amp; AsyncAPI 3.0 specs,
              OpenDataContract schemas, and ADRs.
            </p>
          </div>

          <div className="card p-4">
            <span className="font-mono text-xs text-signal">Phase 2 · 9 Steps</span>
            <h4 className="mt-1 text-sm font-semibold text-ink">Data Engineering</h4>
            <p className="mt-1 text-xs text-mute">
              CDC streaming pipelines, lakehouse schema evolution, Feast/Redis feature store sync, and
              automated quality gates.
            </p>
          </div>

          <div className="card p-4">
            <span className="font-mono text-xs text-signal">Phase 3 · 11 Steps</span>
            <h4 className="mt-1 text-sm font-semibold text-ink">Model Development</h4>
            <p className="mt-1 text-xs text-mute">
              Baseline benchmarks, offline validation protocols, RAG tuning, agent evaluation suites, and
              fairness/bias checks.
            </p>
          </div>

          <div className="card p-4">
            <span className="font-mono text-xs text-signal">Phase 4 · 10 Steps</span>
            <h4 className="mt-1 text-sm font-semibold text-ink">Production Engineering</h4>
            <p className="mt-1 text-xs text-mute">
              FastAPI microservices, model registry packaging, stress testing, GPU allocation, and autoscaling
              HPA.
            </p>
          </div>

          <div className="card p-4">
            <span className="font-mono text-xs text-signal">Phase 5 · 8 Steps</span>
            <h4 className="mt-1 text-sm font-semibold text-ink">Security &amp; Compliance</h4>
            <p className="mt-1 text-xs text-mute">
              Enterprise contract validation, prompt injection penetration testing, and EU AI Act / NIST AI
              RMF regulatory audits.
            </p>
          </div>

          <div className="card p-4">
            <span className="font-mono text-xs text-signal">Phase 6 · 6 Steps</span>
            <h4 className="mt-1 text-sm font-semibold text-ink">Deployment &amp; Rollout</h4>
            <p className="mt-1 text-xs text-mute">
              Canary deployment, shadow traffic evaluation, online A/B experimentation, fallback verification,
              and go/no-go gate.
            </p>
          </div>

          <div className="card p-4">
            <span className="font-mono text-xs text-signal">Phase 7 · 4 Steps</span>
            <h4 className="mt-1 text-sm font-semibold text-ink">Day-2 Operations &amp; SRE</h4>
            <p className="mt-1 text-xs text-mute">
              Real-time drift alerting, automated retraining triggers, operational incident runbooks, and
              post-launch reviews.
            </p>
          </div>
        </div>

        <div className="card flex flex-col items-center justify-between gap-3 bg-raised/40 p-4 text-xs text-mute sm:flex-row">
          <span>
            Every step names its owner, who takes part, when, how, the output deliverable, and the blueprint
            section to read.
          </span>
          <Link
            href="/delivery"
            className="btn shrink-0 !border-signal !bg-signal-soft !text-signal no-underline"
          >
            Open Interactive Delivery Guide <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      {/* ── Section: Guided Implementation Workspace & Patterns ── */}
      <section className="scroll-mt-20 space-y-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-signal">Implementation Assets</p>
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Workspace, Reference Implementations &amp; Runbooks
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Implementation Workspace */}
          <div className="card space-y-3 p-6">
            <div className="flex items-center gap-2 text-signal">
              <Server size={18} />
              <h3 className="text-lg font-semibold text-ink">Guided Implementation Workspace (/workspace)</h3>
            </div>
            <p className="text-sm leading-relaxed text-mute">
              A dedicated hub for Forward Deployed Engineers (FDEs) and solution architects to configure and
              verify production deployments:
            </p>
            <ul className="space-y-2 text-xs text-mute">
              <li className="flex items-start gap-2">
                <span className="font-bold text-signal">•</span>
                <span>
                  <strong className="text-ink">4 Deployment Profiles:</strong> Local Dev (Docker Compose),
                  Cloud-Native (EKS/GKE with Kafka), Private VPC Enclave (air-gapped vLLM/Triton), and
                  Regulated (FIPS 140-2, HIPAA/PCI-DSS).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-signal">•</span>
                <span>
                  <strong className="text-ink">Technology Decision Trees:</strong> Guided trade-off selection
                  for Kafka vs. SQS, Feast vs. Redis, Kubernetes vs. Serverless, and RAG vs. Fine-tuning.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-signal">•</span>
                <span>
                  <strong className="text-ink">8 Golden Path Starters:</strong> Runnable FastAPI
                  microservices, OpenAPI 3.1 &amp; AsyncAPI 3.0 contracts, and automated test suites.
                </span>
              </li>
            </ul>
            <div className="pt-2">
              <Link
                href="/workspace"
                className="inline-flex items-center gap-1 text-xs font-medium text-signal hover:underline"
              >
                Explore Workspace Profiles &amp; Decision Trees <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* SRE Runbooks & Patterns */}
          <div className="card space-y-3 p-6">
            <div className="flex items-center gap-2 text-signal">
              <Terminal size={18} />
              <h3 className="text-lg font-semibold text-ink">
                Operational Runbooks &amp; Patterns (/patterns)
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-mute">
              Standardized architectural building blocks and operational emergency response procedures:
            </p>
            <ul className="space-y-2 text-xs text-mute">
              <li className="flex items-start gap-2">
                <span className="font-bold text-signal">•</span>
                <span>
                  <strong className="text-ink">10 Production Incident Runbooks (RB-01 to RB-10):</strong> Real
                  Prometheus triggers, sub-5m triage steps, sub-15m mitigation commands, and post-incident
                  root cause procedures.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-signal">•</span>
                <span>
                  <strong className="text-ink">11 Canonical Patterns:</strong> Recommenders, real-time
                  scoring, guarded RAG, hierarchical demand sensing, ReAct autonomous agents, and RTB
                  auctions.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-signal">•</span>
                <span>
                  <strong className="text-ink">Architectural Primitives:</strong> Reusable mechanisms written
                  once (circuit breakers, dead letter queues, PID budget pacers, token buckets).
                </span>
              </li>
            </ul>
            <div className="pt-2">
              <Link
                href="/patterns"
                className="inline-flex items-center gap-1 text-xs font-medium text-signal hover:underline"
              >
                Browse Patterns &amp; Primitives <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Sections: Personas, Signal vs Noise, Shortcuts, FAQ ── */}
      <AboutInteractive />

      {/* ── Section: AI Assistant Integration (Agent-First) ── */}
      <section id="agent-first" className="card scroll-mt-20 space-y-4 p-6 sm:p-8">
        <div className="flex items-center gap-2 text-signal">
          <Bot size={20} />
          <h2 className="text-xl font-semibold text-ink">
            Built for AI Coding Assistants &amp; Autonomous Agents
          </h2>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-mute">
          BrainSiphon is completely agent-accessible. You can stream any blueprint directly into Cursor,
          Claude Code, Antigravity, GitHub Copilot, or ChatGPT with zero web scraping overhead or HTML
          clutter:
        </p>

        <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-line bg-raised p-4">
            <span className="font-mono font-semibold text-signal">1. Instant Clean Markdown Twin (.md)</span>
            <p className="text-mute">
              Append <code className="kbd">.md</code> to any blueprint URL to get clean, unbloated Markdown
              formatted specifically for LLM context windows:
            </p>
            <code className="block overflow-x-auto rounded bg-bg p-2 font-mono text-ink">
              curl https://sadiqgpasha89.github.io/BrainSiphon/fintech/real-time-card-upi-fraud-detection.md
            </code>
          </div>

          <div className="space-y-2 rounded-lg border border-line bg-raised p-4">
            <span className="font-mono font-semibold text-signal">
              2. Comprehensive Agent Index (/llms.txt)
            </span>
            <p className="text-mute">
              Feed{' '}
              <a href={withBase('/llms.txt')} className="text-signal underline">
                /llms.txt
              </a>{' '}
              into your agent for an instant machine-readable index of all 500 blueprints and canonical
              architectural primitives:
            </p>
            <code className="block overflow-x-auto rounded bg-bg p-2 font-mono text-ink">
              curl https://sadiqgpasha89.github.io/BrainSiphon/llms.txt
            </code>
          </div>
        </div>
      </section>

      {/* ── Section: The 10 Industry Domains ── */}
      <section className="space-y-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-signal">Domain Coverage</p>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            500 Use Cases Across 10 Industries
          </h2>
          <p className="mt-1 text-sm text-mute">
            Each domain features exactly 50 production-grade blueprints, grouped into specialized industry
            tracks:
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {DOMAINS.map((domain) => (
            <Link
              key={domain}
              href={`/${domain}`}
              className="card group p-3.5 no-underline transition hover:border-signal/50 hover:bg-raised/40"
            >
              <span className="text-xs font-semibold text-ink transition group-hover:text-signal">
                {DOMAIN_META[domain].short}
              </span>
              <p className="mt-1 line-clamp-2 text-[11px] text-mute">{DOMAIN_META[domain].blurb}</p>
              <span className="mt-2 block font-mono text-[10px] text-dim">50 Blueprints →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Section: Provenance & Creator ── */}
      <section className="card flex flex-col items-start justify-between gap-6 border-line bg-panel p-6 sm:p-8 md:flex-row md:items-center">
        <div className="max-w-2xl space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-signal">
            Provenance &amp; Open Source
          </p>
          <h3 className="text-xl font-semibold text-ink">Crafted by Sadiq Pasha</h3>
          <p className="text-sm leading-relaxed text-mute">
            BrainSiphon is an independent, open-source initiative created by{' '}
            <strong className="text-ink">Sadiq Pasha</strong> (
            <a
              href="https://github.com/sadiqgpasha89"
              target="_blank"
              rel="noreferrer"
              className="text-signal hover:underline"
            >
              @sadiqgpasha89
            </a>
            ). Built with Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide icons, KaTeX, and Mermaid.js.
            Deploys statically with zero user tracking or data harvesting.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <a
            href="https://github.com/sadiqgpasha89/BrainSiphon"
            target="_blank"
            rel="noreferrer"
            className="btn inline-flex items-center gap-2 no-underline"
          >
            <ExternalLink size={14} /> GitHub Repository
          </a>
          <Link href="/deployment" className="btn no-underline">
            Deployment Modes
          </Link>
        </div>
      </section>

      {/* ── Bottom Call to Action ── */}
      <section className="card space-y-4 border-signal-line/30 bg-gradient-to-b from-panel to-raised p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Ready to Deliver Real AI Engineering?
        </h2>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-mute">
          Pick a blueprint close to your problem, follow the 7-phase delivery guide, and size your workload
          with zero guesswork.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/delivery"
            className="btn !border-signal !bg-signal-soft font-medium !text-signal no-underline"
          >
            Start with the Delivery Guide <ArrowRight size={14} />
          </Link>
          <a href="#what-is-brainsiphon" className="btn no-underline">
            Back to top
          </a>
          <Link href="/workspace" className="btn no-underline">
            Open Workspace
          </Link>
        </div>
      </section>
    </div>
  );
}
