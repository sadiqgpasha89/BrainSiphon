'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  Zap,
  CheckCircle2,
  XCircle,
  Layers,
  ArrowRight,
  ChevronDown,
  Activity,
  Cpu,
  Database,
  LineChart,
  Bot,
  Gauge,
  Briefcase,
  FileCheck,
} from 'lucide-react';

/* ── Persona Data ── */
interface PersonaGuide {
  id: string;
  name: string;
  roleKey: string;
  icon: React.ElementType;
  badge: string;
  focus: string;
  keySections: string[];
  recommendedSteps: string[];
  sampleSlug: string;
  sampleTitle: string;
  deliverable: string;
}

const PERSONAS: PersonaGuide[] = [
  {
    id: 'ai-architect',
    name: 'AI Architect',
    roleKey: '3',
    icon: Compass,
    badge: 'Enterprise AI & Governance',
    focus:
      'High-level solution architecture, AI feasibility assessment, paradigm selection, build vs. buy economics, C4 diagrams, and regulatory governance.',
    keySections: [
      'Enterprise Solution Context (C4 models, ADRs)',
      'AI Decision Matrix (Why AI? Why not rules?)',
      'High-Level Architecture (10M-user topology)',
      'Governance & Guardrails (6-layer matrix)',
    ],
    recommendedSteps: [
      'Phase 0, Step 1: AI Feasibility & Paradigm Assessment',
      'Phase 0, Step 3: Risk Classification & Regulatory Tiering',
      'Phase 1, Step 12: C4 System Architecture Definition',
      'Phase 1, Step 19: Architecture Decision Records (ADRs)',
    ],
    sampleSlug: 'fintech/real-time-card-upi-fraud-detection',
    sampleTitle: 'Real-Time Card & UPI Fraud Detection',
    deliverable: 'C4 System Diagrams, Risk Assessment Matrix, Architecture Decision Records',
  },
  {
    id: 'solution-architect',
    name: 'Solution Architect',
    roleKey: '2',
    icon: Layers,
    badge: 'Integration & NFRs',
    focus:
      'Enterprise application boundaries, data contracts, API specifications (OpenAPI/AsyncAPI), Non-Functional Requirements (NFRs), and latency budgets.',
    keySections: [
      'Integration Matrix (Protocols, SLAs, fallbacks)',
      'NFR Matrix (Availability, P99 latency, throughput)',
      'Sequence Diagrams (Mermaid workflow)',
      'Low-Level Design (LLD microservices)',
    ],
    recommendedSteps: [
      'Phase 1, Step 13: Service Boundary & Interface Definitions',
      'Phase 1, Step 14: OpenAPI 3.1 & AsyncAPI 3.0 Specifications',
      'Phase 1, Step 15: NFR & Latency Budget Allocation',
      'Phase 5, Step 52: Enterprise System Integration & Contract Validation',
    ],
    sampleSlug: 'retail/personalized-search-ranking',
    sampleTitle: 'Personalized Search Ranking',
    deliverable: 'OpenAPI 3.1 & AsyncAPI Contracts, NFR Compliance Verification, Integration Matrix',
  },
  {
    id: 'data-scientist',
    name: 'Data Scientist',
    roleKey: '6',
    icon: LineChart,
    badge: 'Statistical Modeling & Evaluation',
    focus:
      'Problem formulation, mathematical loss functions, feature engineering, offline validation protocols, calibration, and bias checks.',
    keySections: [
      'Problem Formulation & Loss Functions',
      'Statistical Validation & Baseline Protocols',
      'Offline Evaluation & Release Thresholds',
      'Metrics Catalogue (Model, Data & Fairness layers)',
    ],
    recommendedSteps: [
      'Phase 0, Step 4: Metric Tree & North Star Formulation',
      'Phase 3, Step 31: Baseline Heuristic & Benchmark Model',
      'Phase 3, Step 35: Offline Evaluation & Validation Protocol',
      'Phase 3, Step 38: Model Fairness, Bias & Calibration Checks',
    ],
    sampleSlug: 'healthcare/sepsis-early-warning',
    sampleTitle: 'Sepsis Early Warning System',
    deliverable: 'Model Validation Report, Mathematical Loss Formulations, Calibration Curves',
  },
  {
    id: 'ai-engineer',
    name: 'AI / LLM Engineer',
    roleKey: '8',
    icon: Bot,
    badge: 'Generative AI & Agentic Systems',
    focus:
      'LLM integration, RAG pipelines, prompt engineering, agentic decomposition, tool sandboxing, hallucination mitigation, and structured outputs.',
    keySections: [
      'Agentic Systems & Tool-Calling Schemas',
      'Guarded RAG & Citation Verification',
      'LLM Evaluation Metrics (Ragas, Context Recall)',
      'Runtime Guardrails (Prompt injection, jailbreaks)',
    ],
    recommendedSteps: [
      'Phase 1, Step 17: Agentic Tool & Sandbox Specification',
      'Phase 3, Step 36: RAG Chunking, Embeddings & Retrieval Tuning',
      'Phase 3, Step 37: LLM & Agent Evaluation Suite',
      'Phase 5, Step 54: Guardrails & Prompt Injection Testing',
    ],
    sampleSlug: 'cybersecurity/llm-prompt-injection-detection',
    sampleTitle: 'LLM Prompt Injection Detection',
    deliverable: 'Guarded RAG Pipeline, Agent Tool Definitions, Prompt Injection Test Suite',
  },
  {
    id: 'data-engineer',
    name: 'Data Engineer',
    roleKey: '5',
    icon: Database,
    badge: 'Data Pipelines & Feature Stores',
    focus:
      'Streaming and batch ingestion (Kafka/Redpanda), Change Data Capture (CDC), data contracts, feature store topologies (Feast/Redis), and lakehouses.',
    keySections: [
      'Data Architecture & Ingestion Topology',
      'Data Quality SLA & OpenDataContract Spec',
      'Feature Pipelines (Online/Offline store sync)',
      'Metrics Catalogue (Data Freshness & Volume layers)',
    ],
    recommendedSteps: [
      'Phase 1, Step 16: OpenDataContract & Schema Evolution Rules',
      'Phase 2, Step 22: CDC & Stream Ingestion Pipeline (Kafka)',
      'Phase 2, Step 26: Feature Store Setup (Feast & Redis)',
      'Phase 2, Step 30: Automated Data Quality & Drift Gate',
    ],
    sampleSlug: 'supply-chain/demand-forecasting-inventory-optimization',
    sampleTitle: 'Demand Forecasting & Inventory Optimization',
    deliverable: 'OpenDataContract Schemas, Feature Store Configurations, Great Expectations Suites',
  },
  {
    id: 'inference-engineer',
    name: 'Inference & Platform Engineer',
    roleKey: 'a',
    icon: Cpu,
    badge: 'Sub-15ms Serving & Hardware',
    focus:
      'Ultra-low-latency model serving, GPU/CPU hardware allocation, quantization, batching policies, memory optimization, and capacity sizing.',
    keySections: [
      'Live Scale & Capacity Calculator (10M users)',
      'Serving Layer Architecture (FastAPI/Triton/vLLM)',
      'Hardware Sizing & Cloud Cost Breakdown',
      'Metrics Catalogue (System P95/P99 latency, QPS)',
    ],
    recommendedSteps: [
      'Phase 1, Step 18: Inference Engine & Hardware Profiling',
      'Phase 4, Step 42: Serving Microservice Implementation (FastAPI)',
      'Phase 4, Step 45: P99 Latency & Concurrency Stress Testing',
      'Phase 4, Step 48: Dynamic Autoscaling & GPU Slicing Config',
    ],
    sampleSlug: 'adtech/real-time-bidding-bid-optimization',
    sampleTitle: 'Real-Time Bidding & Bid Optimization',
    deliverable: 'FastAPI Serving Microservice, Docker Stacks, Triton Configs, Kubernetes HPA',
  },
  {
    id: 'mlops-sre',
    name: 'MLOps & SRE Engineer',
    roleKey: '9',
    icon: Gauge,
    badge: 'Day-2 Operations & Incident Response',
    focus:
      'CI/CD/CT pipelines, automated drift detection, model registries, canary rollouts, SLO/SLI error budgets, and 10 production incident runbooks.',
    keySections: [
      'MLOps Lifecycle (9 gates and artifacts)',
      'Production Operations & SRE (10 failure scenarios)',
      '10 Incident Runbooks (Prometheus triggers & mitigations)',
      'Telemetry & Logging Specifications',
    ],
    recommendedSteps: [
      'Phase 4, Step 46: Model Registry & Artifact Versioning',
      'Phase 6, Step 60: Canary Deployment & Shadow Traffic Rollout',
      'Phase 7, Step 66: Real-Time Drift & Degradation Alerting',
      'Phase 7, Step 68: Operational Incident Runbook Validation',
    ],
    sampleSlug: 'saas/in-app-ai-copilot',
    sampleTitle: 'In-App AI Copilot',
    deliverable: 'Prometheus Alert Rules, Incident Runbooks (RB-01 to RB-10), Canary Rollout Manifests',
  },
  {
    id: 'delivery-lead',
    name: 'Delivery Lead & Product Manager',
    roleKey: '1',
    icon: Briefcase,
    badge: 'Roadmap & Governance',
    focus:
      'End-to-end delivery roadmap, 7-phase milestone sign-off gates, RACI matrix, cross-functional dependencies, and regulatory compliance mapping.',
    keySections: [
      'Business Problem Formulation & KPIs',
      '7-Phase Universal Delivery Guide (/delivery)',
      'Regulatory Framework Crosswalk (EU AI Act, NIST AI RMF)',
      'Metrics Catalogue (Business & ROI layers)',
    ],
    recommendedSteps: [
      'Phase 0, Step 2: Production BRD & Acceptance Criteria',
      'Phase 0, Step 5: Stakeholder Alignment & RACI Sign-off',
      'Phase 5, Step 58: Regulatory Compliance & AI Act Audit',
      'Phase 6, Step 64: Executive Go/No-Go Decision Gate',
    ],
    sampleSlug: 'delivery',
    sampleTitle: 'Universal Delivery Guide',
    deliverable: 'Production BRD, RACI Assignment Matrix, Phase Sign-off Certificates',
  },
];

/* ── Paradigm Comparison Data ── */
interface SignalNoiseParadigm {
  id: string;
  title: string;
  signal: string[];
  noise: string[];
}

const PARADIGMS: SignalNoiseParadigm[] = [
  {
    id: 'realtime-scoring',
    title: 'Real-Time Scoring & Fraud',
    signal: [
      'Sub-15ms feature retrieval via local Redis / Feast cluster with in-memory indexes.',
      'Three-action decision policy: ALLOW, STEP_UP (MFA), and BLOCK with explicit false-positive budget.',
      'Append-only Write-Ahead Log (WAL) decision ledger with cryptographic SHA-256 hash chains.',
      'Calibrated decision thresholding based on dynamic risk curves, not arbitrary 0.5 cuts.',
      'Graceful degradation: hardcoded fast heuristic rule engine when model service times out.',
    ],
    noise: [
      'Running heavy deep transformers with 120ms latency on the synchronous card swipe path.',
      'Remote multi-hop database joins during live transaction evaluation.',
      'Evaluating models purely on raw accuracy on 99.8% imbalanced negative data.',
      'Treating fraud detection as a black box with zero auditable decision trail.',
      'Overfitting to historical fraud patterns while lacking real-time velocity counters.',
    ],
  },
  {
    id: 'rag-agents',
    title: 'Guarded RAG & Agentic Copilots',
    signal: [
      'Guarded hybrid retrieval: BM25 keyword matching + dense embeddings fused via Reciprocal Rank Fusion.',
      'Strict chunk citation verification with character-level source span attribution before response display.',
      'Hard cycle and recursion limiters preventing agent infinite execution loops.',
      'Structured Pydantic / Zod schema extraction with temperature=0.0 for deterministic tool payloads.',
      'Dual-authorization approval gate for destructive actions (database write, credential change).',
    ],
    noise: [
      'Unconstrained multi-agent swarms debating autonomously with no termination condition.',
      'Premature fine-tuning of 70B models for retrieval tasks when prompt engineering and RAG suffice.',
      'Pure cosine vector search without metadata filtering, tenant isolation, or freshness weighting.',
      'Vanity demo bots with no evaluation datasets, ignoring hallucination rates and context recall.',
      'Directly exposing unsanitized LLM output to raw system shell execution.',
    ],
  },
  {
    id: 'recs-search',
    title: 'Two-Stage Recommenders & Search',
    signal: [
      'Two-stage architecture: lightweight candidate retrieval (ANN / Two-Tower) + heavy reranking model.',
      'Real-time in-session intent features overriding stale long-term profile data.',
      'Diversity and serendipity guardrails preventing echo-chamber over-concentration.',
      'Strict bot crawler traffic filtering prior to training data ingestion and feature generation.',
      'Multi-objective loss balancing short-term click-through rate with long-term retention and returns.',
    ],
    noise: [
      'Scoring an entire 5-million-item catalog through a deep ranking model on every user click.',
      'Optimizing exclusively for raw CTR, causing clickbait saturation and post-purchase churn.',
      'Training models on unfiltered web scraper traffic that skews item popularity distributions.',
      'Ignoring cold-start items and sellers by having zero exploration / bandit mechanism.',
      'Re-indexing embeddings synchronously on every item edit instead of using decoupled batch updates.',
    ],
  },
  {
    id: 'forecasting',
    title: 'Demand Sensing & Time-Series',
    signal: [
      'Hierarchical forecast reconciliation (MinT / OLS) ensuring consistency across SKU, store, and regional tiers.',
      'Order-book leading indicators and customer pre-orders prioritizing predictive weight over historical sales.',
      'Asymmetric quantile loss functions penalizing stockouts 10x higher than excess inventory holding.',
      'Explicit calendar, promotion, weather, and lead-time lag feature engineering.',
      'Structural break detection isolating supply shock anomalies from true trend changes.',
    ],
    noise: [
      'Feeding raw uncleaned sales history into generic LSTM/Transformers without modeling out-of-stock periods.',
      'Evaluating models on symmetric Mean Squared Error (MSE) where under-predicting and over-predicting carry identical penalties.',
      'Generating SKU forecasts that do not mathematically sum to regional or enterprise warehouse totals.',
      'Ignoring vendor lead-time variability and minimum order quantities in downstream inventory orders.',
      'Retraining daily on noisy demand jitter instead of tracking persistent concept drift.',
    ],
  },
];

/* ── FAQ Data ── */
interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: 'What is BrainSiphon and why was it created?',
    a: 'BrainSiphon is a zero-noise engineering reference for AI/ML systems. Its blueprints are reference designs: checked for completeness and internal consistency, not reviewed by domain specialists and not run in production. It was built to solve a critical industry failure: most AI content is either simplistic 5-minute toy tutorials or abstract academic papers that completely ignore enterprise realities like 10M-user concurrency, P99 latency budgets, cloud compute costs, data quality contracts, compliance frameworks (EU AI Act), and operational failure runbooks. BrainSiphon provides 500 complete, end-to-end blueprints that bridge the gap from business problem to reliable production deployment.',
  },
  {
    q: 'How are the 500 blueprints generated and validated?',
    a: 'Every blueprint is defined against a strict, typed TypeScript specification (Zod schema) and validated against automated consistency gates: mathematical loss formulation checks, Mermaid sequence diagram syntax validation, KaTeX equation validation, and scale/capacity arithmetic verification. Starters and contracts are tested for consistency, guaranteeing zero broken cross-references. Blueprints provide a comprehensive, modeled engineering starting point and framework for cross-functional teams.',
  },
  {
    q: 'Why are all capacity models sized for 10 million users?',
    a: 'Ten million users is the enterprise benchmark where naive architectures fail. At 10M users, single-node databases melt, un-indexed vector search crashes, unbatched LLM inference blows up cloud budgets, and latency SLAs breach. By modeling every use case at this scale with an interactive calculator, BrainSiphon forces transparent architectural honesty around memory, bandwidth, node counts, and monthly cloud spend before you write the first line of code.',
  },
  {
    q: 'How do I use BrainSiphon with AI coding assistants (Cursor, Claude Code, Antigravity)?',
    a: 'BrainSiphon is built agent-first. You can append `.md` to any blueprint URL (for example: `/fintech/real-time-card-upi-fraud-detection.md`) or the delivery guide (`/delivery.md`) to get a clean, zero-bloat Markdown document formatted specifically for LLM context windows. Additionally, `/llms.txt` provides a complete manifest of all 500 blueprints and architectural primitives, enabling agents to autonomously discover and reference the exact design patterns you need.',
  },
  {
    q: 'Can our engineering team use these blueprints and templates for commercial projects?',
    a: 'Yes. BrainSiphon is designed as an open engineering reference and implementation framework. You are free to adopt the C4 architectures, ADRs, data contracts, OpenAPI/AsyncAPI specifications, delivery checklists, and runbooks directly inside your organization.',
  },
  {
    q: 'What is the difference between this GitHub Pages site and the Docker deployment?',
    a: 'The public GitHub Pages site is a static export: it runs precomputed MiniSearch indexes in the browser and requires no server infrastructure, making it ultra-fast and accessible worldwide. The Docker deployment (available in the repository via docker-compose) includes the full production backend stack: PostgreSQL with pgvector for hybrid semantic search, Redis for rate limiting and caching, OpenTelemetry instrumentation, and live REST API routes.',
  },
  {
    q: 'Who built BrainSiphon and where can I contribute?',
    a: 'BrainSiphon was created by Sadiq Pasha (@sadiqgpasha89). The project is hosted openly on GitHub at https://github.com/sadiqgpasha89/BrainSiphon. Contributions, blueprint enhancements, and community feedback are welcomed via GitHub issues and pull requests.',
  },
];

export function AboutInteractive() {
  const [activePersona, setActivePersona] = useState<string>('ai-architect');
  const [activeParadigm, setActiveParadigm] = useState<string>('realtime-scoring');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const persona = PERSONAS.find((p) => p.id === activePersona) ?? PERSONAS[0]!;
  const paradigm = PARADIGMS.find((p) => p.id === activeParadigm) ?? PARADIGMS[0]!;

  return (
    <div className="space-y-16">
      {/* ── Section: Interactive Persona & Role Guide ── */}
      <section aria-labelledby="role-guide" className="scroll-mt-20">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-signal">Persona-Driven Reading</p>
            <h2 id="role-guide" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              How to Read BrainSiphon by Role
            </h2>
          </div>
          <span className="chip chip-signal">14 Role Lenses · Keyboard Keys 1–9, a–e</span>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-mute">
          Every blueprint contains 22 deep engineering sections spanning business, architecture, modeling,
          sizing, governance, and operations. Instead of getting bogged down in 4,000 words of details outside
          your immediate scope, activate your role lens to filter only what moves your needle.
        </p>

        {/* Persona Selector Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-line pb-4">
          {PERSONAS.map((p) => {
            const Icon = p.icon;
            const selected = p.id === activePersona;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePersona(p.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${
                  selected
                    ? 'border border-signal-line bg-signal-soft text-signal'
                    : 'border border-line bg-panel text-mute hover:border-mute hover:text-ink'
                }`}
              >
                <Icon size={16} aria-hidden />
                <span>{p.name}</span>
                <span className="kbd ml-1">Key {p.roleKey}</span>
              </button>
            );
          })}
        </div>

        {/* Active Persona Card */}
        <div className="card mt-6 p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="chip chip-accent">{persona.badge}</span>
                <span className="font-mono text-xs text-dim">
                  Press <kbd className="kbd">{persona.roleKey}</kbd> on any blueprint
                </span>
              </div>
              <h3 className="text-xl font-semibold text-ink">{persona.name} Guide</h3>
              <p className="max-w-2xl text-sm leading-relaxed text-mute">{persona.focus}</p>
            </div>
            <div className="shrink-0 rounded-lg border border-line bg-raised p-4 text-xs">
              <span className="font-mono uppercase text-dim">Primary Output Deliverable</span>
              <p className="mt-1 max-w-xs font-medium text-ink">{persona.deliverable}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {/* Key Blueprint Sections to Read */}
            <div className="rounded-lg border border-line bg-raised/50 p-5">
              <h4 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-signal">
                <FileCheck size={14} /> Blueprint Sections to Focus On
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-ink">
                {persona.keySections.map((sec) => (
                  <li key={sec} className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-signal" />
                    <span>{sec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended Delivery Guide Steps */}
            <div className="rounded-lg border border-line bg-raised/50 p-5">
              <h4 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-accent">
                <Activity size={14} /> Delivery Guide Steps Owned / Consulted
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-ink">
                {persona.recommendedSteps.map((step) => (
                  <li key={step} className="flex items-start gap-2">
                    <ArrowRight size={15} className="mt-0.5 shrink-0 text-accent" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Featured Starter Blueprint for this role */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-mute">Try this persona on:</span>
              <Link
                href={persona.sampleSlug === 'delivery' ? '/delivery' : `/${persona.sampleSlug}`}
                className="font-medium text-signal hover:underline"
              >
                {persona.sampleTitle} →
              </Link>
            </div>
            <Link
              href="/delivery"
              className="inline-flex items-center gap-1.5 text-xs text-mute hover:text-ink"
            >
              <span>View full 15-role RACI in the Delivery Guide</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section: Signal vs Noise In-Depth ── */}
      <section aria-labelledby="signal-noise" className="scroll-mt-20">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-signal">
              The Engineering Philosophy
            </p>
            <h2 id="signal-noise" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Signal vs. Noise Across Archetypes
            </h2>
          </div>
          <span className="chip chip-noise">Pure Signal Mode: Press [</span>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-mute">
          In machine learning, 80% of engineering effort is routinely squandered on architectural noise that
          does not move the production metric. BrainSiphon explicitly catalogs the real invariants (Signal)
          versus the costly distractions (Noise) for every major AI paradigm.
        </p>

        {/* Paradigm Selector */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-line pb-4">
          {PARADIGMS.map((p) => {
            const selected = p.id === activeParadigm;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveParadigm(p.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                  selected
                    ? 'border border-signal-line bg-signal-soft text-signal'
                    : 'border border-line bg-panel text-mute hover:border-mute hover:text-ink'
                }`}
              >
                {p.title}
              </button>
            );
          })}
        </div>

        {/* Signal vs Noise Grid */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Signal Column */}
          <div className="card border-signal-line/50 bg-signal-soft/10 p-6">
            <div className="flex items-center gap-2 text-signal">
              <Zap size={18} />
              <h3 className="font-semibold tracking-tight">Pure Signal (What Moves the Metric)</h3>
            </div>
            <p className="mt-1 text-xs text-mute">
              Architectural invariants, resilient data contracts, and hard operational controls.
            </p>
            <ul className="mt-4 space-y-3 text-sm text-ink">
              {paradigm.signal.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-signal" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Noise Column */}
          <div className="card border-noise-line/50 bg-noise-soft/10 p-6">
            <div className="flex items-center gap-2 text-noise">
              <XCircle size={18} />
              <h3 className="font-semibold tracking-tight">The Noise (What Wastes the Quarter)</h3>
            </div>
            <p className="mt-1 text-xs text-mute">
              Premature optimizations, buzzword architecture, and vanity metrics that fail in production.
            </p>
            <ul className="mt-4 space-y-3 text-sm text-ink">
              {paradigm.noise.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <XCircle size={16} className="mt-0.5 shrink-0 text-noise" />
                  <span className="text-mute line-through decoration-noise/60">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Section: Interactive Keyboard Shortcuts ── */}
      <section aria-labelledby="shortcuts" className="scroll-mt-20">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-signal">Productivity & Efficiency</p>
          <h2 id="shortcuts" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Keyboard Shortcuts &amp; Power Tools
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-mute">
            BrainSiphon is designed for engineers who navigate by keyboard. Use these global shortcuts
            anywhere on the site to jump between contexts, roles, and search queries instantly.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card flex items-start gap-3 p-4">
            <kbd className="kbd shrink-0 text-sm font-semibold">⌘K / /</kbd>
            <div>
              <p className="text-sm font-medium text-ink">Instant Universal Search</p>
              <p className="mt-0.5 text-xs text-mute">
                Searches across all 500 blueprints, 10 domains, and 11 architectural patterns instantly.
              </p>
            </div>
          </div>

          <div className="card flex items-start gap-3 p-4">
            <kbd className="kbd shrink-0 text-sm font-semibold">[</kbd>
            <div>
              <p className="text-sm font-medium text-ink">Toggle Pure Signal Mode</p>
              <p className="mt-0.5 text-xs text-mute">
                Strips away all secondary narrative and exposes strictly the core architectural invariants.
              </p>
            </div>
          </div>

          <div className="card flex items-start gap-3 p-4">
            <kbd className="kbd shrink-0 text-sm font-semibold">1 .. 9, a .. e</kbd>
            <div>
              <p className="text-sm font-medium text-ink">Activate Role Lens</p>
              <p className="mt-0.5 text-xs text-mute">
                Switches the blueprint view to only the sections relevant to your engineering specialty.
              </p>
            </div>
          </div>

          <div className="card flex items-start gap-3 p-4">
            <kbd className="kbd shrink-0 text-sm font-semibold">T</kbd>
            <div>
              <p className="text-sm font-medium text-ink">Toggle Theme</p>
              <p className="mt-0.5 text-xs text-mute">
                Switches instantly between dark high-contrast mode and clean light mode.
              </p>
            </div>
          </div>

          <div className="card flex items-start gap-3 p-4">
            <kbd className="kbd shrink-0 text-sm font-semibold">Esc</kbd>
            <div>
              <p className="text-sm font-medium text-ink">Dismiss Overlay</p>
              <p className="mt-0.5 text-xs text-mute">
                Closes the search palette, role lens drawers, or mobile dropdown menu.
              </p>
            </div>
          </div>

          <div className="card flex items-start gap-3 p-4">
            <kbd className="kbd shrink-0 text-sm font-semibold">.md</kbd>
            <div>
              <p className="text-sm font-medium text-ink">Clean Markdown for LLMs</p>
              <p className="mt-0.5 text-xs text-mute">
                Append <code className="text-signal">.md</code> to any URL for raw markdown for Cursor,
                Claude, or Antigravity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Frequently Asked Questions ── */}
      <section aria-labelledby="faqs" className="scroll-mt-20">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-signal">Common Questions</p>
          <h2 id="faqs" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-mute">
            Everything you need to know about BrainSiphon&apos;s architectural validity, implementation scope,
            and open-source usage.
          </p>
        </div>

        <div className="mt-6 divide-y divide-line rounded-xl border border-line bg-panel">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="p-5 sm:p-6">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 text-left font-medium text-ink transition hover:text-signal"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg">{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 transition-transform ${isOpen ? 'rotate-180 text-signal' : 'text-mute'}`}
                    aria-hidden
                  />
                </button>
                {isOpen && (
                  <p className="mt-3 border-t border-line/40 pt-3 text-sm leading-relaxed text-mute">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
