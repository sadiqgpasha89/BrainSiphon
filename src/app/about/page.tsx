import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Calculator,
  CheckCircle2,
  Code2,
  Compass,
  ExternalLink,
  Gauge,
  GitBranch,
  Layers,
  Mail,
  Server,
  Shield,
  Terminal,
  Workflow,
  Zap,
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
          BrainSiphon is an open, verified engineering reference platform containing{' '}
          <strong className="text-ink">500 complete AI/ML system blueprints</strong> across 10 industry
          domains, evaluated against a transparent{' '}
          <strong className="text-ink">7-level implementation maturity framework</strong>, and coupled with a
          universal <strong className="text-ink">7-phase, 69-step delivery guide</strong>. Every blueprint
          separates the technical signal that moves the needle from the hype that wastes quarters.
        </p>

        {/* Quick Jump Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
          <a href="#what-is-brainsiphon" className="btn !py-1 text-xs no-underline">
            What is BrainSiphon?
          </a>
          <a href="#maturity-framework" className="btn !py-1 text-xs no-underline">
            7-Level Maturity Framework
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
          <a href="#author" className="btn !py-1 text-xs no-underline">
            About the Creator
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
          <p className="mt-1 text-xs text-mute">Enterprise Blueprints</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-mono text-2xl font-bold text-signal sm:text-3xl">10</p>
          <p className="mt-1 text-xs text-mute">Industry Domains</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-mono text-2xl font-bold text-signal sm:text-3xl">7</p>
          <p className="mt-1 text-xs text-mute">Maturity Scorecard Levels</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-mono text-2xl font-bold text-signal sm:text-3xl">69</p>
          <p className="mt-1 text-xs text-mute">Delivery Steps (7 Phases)</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-mono text-2xl font-bold text-signal sm:text-3xl">15</p>
          <p className="mt-1 text-xs text-mute">Delivery Role Lenses (inc. FDE)</p>
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

      {/* ── Section: 7-Level Implementation Maturity Framework & Validation Transparency ── */}
      <section id="maturity-framework" className="scroll-mt-20 space-y-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-signal">Validation Rigour</p>
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            7-Level Implementation Maturity Framework
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-mute">
            BrainSiphon explicitly rejects ambiguous labels such as &ldquo;production-grade&rdquo; where live
            production evidence does not exist. A schema validation pass is never conflated with
            implementation readiness. Every use case is classified against seven strict maturity levels:
          </p>
        </div>

        <div className="grid gap-3 font-mono text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div className="card border-signal/40 bg-signal/5 p-3">
            <span className="font-bold text-signal">L1 · Conceptual Architecture</span>
            <p className="mt-1 text-[11px] text-mute">
              Mathematical loss formulation, component boundaries, and SLA envelopes verified.
            </p>
            <span className="mt-2 inline-block font-semibold text-signal">500 / 500 Passed</span>
          </div>
          <div className="card border-signal/40 bg-signal/5 p-3">
            <span className="font-bold text-signal">L2 · Schema Validation</span>
            <p className="mt-1 text-[11px] text-mute">
              100% compliant with strict TypeScript Zod type contracts in CI builds.
            </p>
            <span className="mt-2 inline-block font-semibold text-signal">500 / 500 Passed</span>
          </div>
          <div className="card border-signal/40 bg-signal/5 p-3">
            <span className="font-bold text-signal">L3 · Architecture Feasibility</span>
            <p className="mt-1 text-[11px] text-mute">
              4,781 structural constraints checked (budgets, hardware memory, cost sanity).
            </p>
            <span className="mt-2 inline-block font-semibold text-signal">4,774 Pass · 7 Warn</span>
          </div>
          <div className="card border-signal/40 bg-signal/5 p-3">
            <span className="font-bold text-signal">L4 · Synthetic Implementation</span>
            <p className="mt-1 text-[11px] text-mute">
              End-to-end runnable starters and pattern kits tested in automated pytest CI.
            </p>
            <span className="mt-2 inline-block font-semibold text-signal">11 Kits · 8 Pilot Apps</span>
          </div>
          <div className="card bg-surface border-line p-3">
            <span className="font-bold text-mute">L5 · Domain Expert Review</span>
            <p className="mt-1 text-[11px] text-dim">
              Clinical intensivist, PCI-DSS QSA, or certified CISSP auditor sign-off.
            </p>
            <span className="mt-2 inline-block font-semibold text-mute">0 / 500 (Unreviewed)</span>
          </div>
          <div className="card bg-surface border-line p-3">
            <span className="font-bold text-mute">L6 · Platform Integration</span>
            <p className="mt-1 text-[11px] text-dim">
              Customer enterprise VPC, CDC streaming, and identity provider federation.
            </p>
            <span className="mt-2 inline-block font-semibold text-mute">Target Infrastructure Needed</span>
          </div>
          <div className="card bg-surface border-line p-3">
            <span className="font-bold text-mute">L7 · Production Deployed</span>
            <p className="mt-1 text-[11px] text-dim">
              Live customer traffic, canary rollout telemetry, and measured business ROI.
            </p>
            <span className="mt-2 inline-block font-semibold text-mute">
              0 / 500 (Requires Customer Rollout)
            </span>
          </div>
          <div className="card border-warn/40 bg-warn/10 p-3">
            <span className="font-bold text-warn">High-Risk Safeguard</span>
            <p className="mt-1 text-[11px] text-ink/80">
              Clinical and financial systems are blocked from live deployment until L5–L7 sign-off.
            </p>
            <span className="mt-2 inline-block font-semibold text-warn">Mandatory Policy Gate</span>
          </div>
        </div>

        {/* The 7 Feasibility Warnings Registry */}
        <div className="card bg-surface space-y-3 border-warn/30 p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
              <AlertTriangle size={18} className="text-warn" /> The 7 Feasibility Warnings &amp; Recommended
              Remediation
            </h3>
            <span className="font-mono text-xs text-dim">Automated Feasibility Engine Audit</span>
          </div>
          <p className="text-xs text-mute">
            The release validator caught 7 designs where default assumptions require explicit engineering
            remediation before production:
          </p>
          <div className="overflow-x-auto">
            <table className="bs-table w-full text-xs">
              <thead>
                <tr>
                  <th>Blueprint</th>
                  <th>Category</th>
                  <th>Observed Constraint</th>
                  <th>Recommended Remediation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-mono text-ink">fintech/transaction-monitoring-alert-triage-llm</td>
                  <td>Model memory vs serving hardware</td>
                  <td>70B FP16 requires ~140 GB; does not fit single 80 GB GPU.</td>
                  <td>
                    Quantise weights to INT8/FP8 (~70 GB VRAM) or shard via Tensor Parallelism (tp=2 or tp=4)
                    across 2-4 GPUs, or implement an 8B screening cascade.
                  </td>
                </tr>
                <tr>
                  <td className="font-mono text-ink">healthcare/pathology-slide-cancer-detection</td>
                  <td>Cost vs expected traffic</td>
                  <td>$243.76 per 1,000 decisions at 30k events/day ($219k/mo).</td>
                  <td>
                    Implement a two-stage tile cascade with low-res normal tile filtering, asynchronous PACS
                    queue batching, and spot GPU autoscaling.
                  </td>
                </tr>
                <tr>
                  <td className="font-mono text-ink">
                    healthcare/genomic-variant-pathogenicity-classification
                  </td>
                  <td>Cost vs expected traffic</td>
                  <td>$411.51 per 1,000 decisions for 150 events/day.</td>
                  <td>
                    Shift from warm dedicated nodes to event-driven serverless container workers (Cloud Run /
                    AWS Batch) scaling to zero when idle.
                  </td>
                </tr>
                <tr>
                  <td className="font-mono text-ink">healthcare/polygenic-risk-scoring</td>
                  <td>Cost vs expected traffic</td>
                  <td>$897.48 per 1,000 decisions for 60 events/day.</td>
                  <td>
                    Execute PRS variant calculations as scheduled nightly batch pipelines on preemptible CPU
                    compute instead of idle online services.
                  </td>
                </tr>
                <tr>
                  <td className="font-mono text-ink">healthcare/single-cell-rna-cell-type-annotation</td>
                  <td>Cost vs expected traffic</td>
                  <td>$1,795.39 per 1,000 decisions for 30 events/day.</td>
                  <td>
                    Run scRNA samples in batch mode on spot GPU worker fleets; cache high-dimensional
                    reference atlas embeddings in a vector store.
                  </td>
                </tr>
                <tr>
                  <td className="font-mono text-ink">healthcare/surgical-video-phase-recognition</td>
                  <td>Cost vs expected traffic</td>
                  <td>$243.76 per 1,000 decisions at 30k events/day.</td>
                  <td>
                    Shift inference to on-premise hospital edge workstations (NVIDIA IGX/RTX 6000), downsample
                    to 1fps keyframe sampling, and compile TensorRT INT8.
                  </td>
                </tr>
                <tr>
                  <td className="font-mono text-ink">healthcare/radiotherapy-autocontouring</td>
                  <td>Cost vs expected traffic</td>
                  <td>$105.24 per 1,000 decisions at 30k events/day.</td>
                  <td>
                    Queue volumetric DICOM CT series to asynchronous worker queues, apply TensorRT
                    quantization to 3D U-Net, and autoscale based on clinic hours.
                  </td>
                </tr>
              </tbody>
            </table>
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

      {/* ── Section: About the Creator & Provenance ── */}
      <section
        id="author"
        aria-labelledby="author-heading"
        className="card scroll-mt-20 space-y-6 border-line bg-panel p-6 sm:p-10"
      >
        <div className="flex flex-col gap-6 border-b border-line pb-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-signal-line bg-signal-soft px-3 py-1 font-mono text-xs font-medium text-signal">
              <Code2 size={12} aria-hidden />
              <span>Creator &amp; Systems Architect</span>
            </div>
            <h2 id="author-heading" className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Sadiq G Pasha
            </h2>
            <p className="font-mono text-xs text-mute">
              AI Systems Architect · ML Platform Engineer · Open Source Creator
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="https://github.com/sadiqgpasha89"
              target="_blank"
              rel="noreferrer"
              className="btn inline-flex items-center gap-2 text-xs no-underline hover:text-signal"
            >
              <ExternalLink size={13} aria-hidden /> GitHub (@sadiqgpasha89)
            </a>
            <a
              href="mailto:sadiqgpasha89@gmail.com"
              className="btn inline-flex items-center gap-2 text-xs no-underline hover:text-signal"
            >
              <Mail size={13} aria-hidden /> sadiqgpasha89@gmail.com
            </a>
            <a
              href="https://github.com/sadiqgpasha89/BrainSiphon"
              target="_blank"
              rel="noreferrer"
              className="btn inline-flex items-center gap-2 !border-signal !bg-signal-soft text-xs !text-signal no-underline"
            >
              <GitBranch size={13} aria-hidden /> GitHub Repository
            </a>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-3 text-sm leading-relaxed text-mute md:col-span-2">
            <h3 className="text-base font-semibold text-ink">Background &amp; Mission</h3>
            <p>
              Sadiq G Pasha is an AI systems architect and builder dedicated to bridging the gap between
              theoretical machine learning and mission-critical production engineering. Frustrated by the
              proliferation of superficial vendor marketing, single-prompt toy demos, and academic prototypes
              that ignore latency budgets, failure ladders, and schema drift, he designed{' '}
              <strong className="text-ink">BrainSiphon</strong> to give engineering teams an open,
              transparent, and mathematically grounded blueprint reference.
            </p>
            <p>
              His work focuses on high-throughput streaming architectures (Kafka, Flink, Debezium CDC),
              low-latency feature stores, ReAct agentic harnesses with prompt-injection defense, and
              regulatory AI compliance under supervisory frameworks like Federal Reserve SR 11-7 and the EU AI
              Act.
            </p>
            <p>
              Beyond BrainSiphon, Sadiq actively develops open-source solutions across financial crime
              detection (Sentinel AML), clinical early-warning systems, conversational intelligence, and local
              privacy-preserving LLM applications.
            </p>
          </div>

          <div className="card space-y-3 bg-raised/50 p-4 text-xs">
            <h4 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-signal">
              Core Engineering Focus
            </h4>
            <ul className="space-y-2 text-mute">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                <span>
                  <strong className="text-ink">Ultra-Low Latency Serving:</strong> Microservices optimized for
                  sub-15ms P99 SLAs with circuit breakers and fallback degradation.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                <span>
                  <strong className="text-ink">Agentic AI Governance:</strong> Guarded ReAct state machines
                  with two-person human approval gates for disruptive actions.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                <span>
                  <strong className="text-ink">Data Lineage &amp; Contracts:</strong> Point-in-time
                  correctness, outbox CDC patterns, and automated Great Expectations data quality suites.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                <span>
                  <strong className="text-ink">FinOps &amp; Capacity Modeling:</strong> Realistic GPU VRAM
                  sizing, KV-cache budgets, and cost-per-decision optimization.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4 text-xs text-dim">
          <span>Static Next.js 15 deployment · Zero user tracking · MIT Licensed</span>
          <div className="flex gap-4">
            <Link href="/deployment" className="hover:text-ink">
              Deployment Guide
            </Link>
            <Link href="/delivery" className="hover:text-ink">
              Delivery Framework
            </Link>
            <Link href="/workspace" className="hover:text-ink">
              Workspace
            </Link>
          </div>
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
