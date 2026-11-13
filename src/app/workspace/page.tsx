'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Server,
  Shield,
  Layers,
  Terminal,
  FileCode,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Activity,
} from 'lucide-react';

interface DeploymentProfile {
  id: string;
  name: string;
  badge: string;
  description: string;
  idealFor: string;
  infrastructure: string[];
  securityControls: string[];
}

const PROFILES: DeploymentProfile[] = [
  {
    id: 'profile-a',
    name: 'Profile A: Local Dev & Quickstart',
    badge: 'Local Dev',
    description:
      'Hermetic, zero-cloud-spend developer workstation environment running fully in Docker containers.',
    idealFor: 'PoC development, synthetic milestone verification, and rapid local iteration.',
    infrastructure: [
      'Docker Compose fullstack runtime',
      'Local PostgreSQL 16 + pgvector container',
      'Local Redis 7.2 alpine cache',
      'Local Redpanda Kafka-compatible streaming broker',
    ],
    securityControls: [
      'Local loopback network isolation',
      'Ephemeral test secrets (.env.local)',
      'Synthetic mock APIs and telemetry',
    ],
  },
  {
    id: 'profile-b',
    name: 'Profile B: Cloud-Native Production',
    badge: 'Multi-Cloud',
    description:
      'High-availability, horizontally-autoscaling cloud deployment on AWS (EKS), GCP (GKE), or Azure (AKS).',
    idealFor: 'High-throughput enterprise production systems with P99 < 15ms latency constraints.',
    infrastructure: [
      'Managed Kubernetes (EKS / GKE / AKS) with HPA',
      'Multi-AZ Aurora PostgreSQL / Cloud SQL with pgvector',
      'AWS ElastiCache / GCP Memorystore Redis cluster',
      'Managed Kafka (AWS MSK / Confluent Cloud)',
    ],
    securityControls: [
      'Cloud Workload Identity & IAM Roles for Service Accounts',
      'KMS Envelope Encryption at rest (AES-256)',
      'Kubernetes least-privilege NetworkPolicies',
      'Automated Trivy container & SBOM vulnerability scanning',
    ],
  },
  {
    id: 'profile-c',
    name: 'Profile C: Private Cloud & VPC Enclave',
    badge: 'Private Cloud',
    description: 'Hardened corporate private VPC or on-premise OpenShift cluster with restricted egress.',
    idealFor: 'Proprietary IP, internal enterprise knowledge bases, and air-gapped models.',
    infrastructure: [
      'Private EKS/GKE cluster without public ingress',
      'Self-hosted open-weights LLMs via vLLM / Triton on GPU',
      'Internal Harbor container & MLflow model registries',
      'Private VPC peering and PrivateLink endpoints',
    ],
    securityControls: [
      'Zero internet egress without proxy inspection',
      'HashiCorp Vault dynamic database & token injection',
      'mTLS service mesh (Istio / Linkerd)',
    ],
  },
  {
    id: 'profile-d',
    name: 'Profile D: Regulated & Jurisdiction-Pinned',
    badge: 'Regulated / FIPS',
    description:
      'Zero-trust architecture meeting HIPAA, PCI-DSS, SOC 2 Type II, and data sovereignty regulations.',
    idealFor: 'Banking payments, clinical diagnostics, and jurisdiction-pinned patient records.',
    infrastructure: [
      'FIPS 140-2 validated cryptographic modules',
      'Jurisdiction-pinned state stores with localized standby',
      'Append-only Write-Ahead Log (WAL) with SHA-256 hash chains',
      'Automated disaster recovery with RPO=0 and RTO < 5m',
    ],
    securityControls: [
      'Dual physician / dual analyst four-eyes authorization gate',
      'Real-time prompt injection and exfiltration WAF filters',
      'Immutable WORM audit storage with cryptographic verification',
    ],
  },
];

const DECISION_TREES = [
  {
    topic: 'Streaming Broker Architecture',
    question: 'Kafka / Redpanda vs Cloud-Managed PubSub / SQS?',
    recommendation:
      'Choose Redpanda/Kafka for ordered partition keys, event replay, and P99 < 5ms ingestion.',
    options: [
      {
        tech: 'Apache Kafka / Redpanda',
        verdict: 'Recommended for High-Scale & Exact Ordering',
        reasons: [
          'Strict partition key ordering (e.g. all transactions for card_id go to same partition)',
          'Durable log replay allows retraining models and replaying dead-letter queues',
          'Sub-5ms consumer latency matches real-time feature store streaming sinks',
        ],
      },
      {
        tech: 'Cloud SQS / PubSub',
        verdict: 'Recommended for Low-Ops Fan-Out',
        reasons: [
          'Zero cluster maintenance and auto-scaling to zero',
          'Simpler operational model if strict partition ordering is not required',
        ],
      },
    ],
  },
  {
    topic: 'Feature Store Storage Engine',
    question: 'Feast + Redis vs Pure Database Key-Value?',
    recommendation: 'Use Feast + Redis to prevent offline/online training-serving skew.',
    options: [
      {
        tech: 'Feast + Redis Dual Store',
        verdict: 'Mandatory for Production ML',
        reasons: [
          'Single feature definition generates both offline Parquet lakehouse and online Redis keys',
          'Point-in-time ASOF joins prevent historical data leakage during training set creation',
          'Sub-2ms Redis read latency satisfies P99 < 15ms scoring budgets',
        ],
      },
      {
        tech: 'Direct PostgreSQL Queries',
        verdict: 'Prototype / Evaluation Only',
        reasons: [
          'Saturates relational connection pools at > 1,000 QPS',
          'High risk of offline/online feature definition drift',
        ],
      },
    ],
  },
  {
    topic: 'Model Serving Runtime',
    question: 'Kubernetes Microservice vs Cloud Serverless (Lambda / Cloud Run)?',
    recommendation:
      'Use Kubernetes with warm model memory for predictable P99 latencies without cold starts.',
    options: [
      {
        tech: 'Kubernetes (EKS / GKE) with Warm Replicas',
        verdict: 'Required for Sub-100ms Latency SLAs',
        reasons: [
          'Zero cold start latency (model weights stay pre-loaded in memory/VRAM)',
          'Predictable CPU/GPU allocation with horizontal pod autoscaling',
          'Least-privilege internal network policies and service mesh telemetry',
        ],
      },
      {
        tech: 'Serverless Functions (AWS Lambda)',
        verdict: 'Asynchronous / Batch Scenarios Only',
        reasons: [
          'Cold starts (500ms - 5s) violate real-time scoring SLAs',
          'Container size limits restrict large models and embedding libraries',
        ],
      },
    ],
  },
  {
    topic: 'Generative AI Architecture',
    question: 'Retrieval-Augmented Generation (RAG) vs Model Fine-Tuning?',
    recommendation: 'Start with Guarded Hybrid RAG (BM25 + Dense + Citation Verifier) before fine-tuning.',
    options: [
      {
        tech: 'Guarded Hybrid RAG',
        verdict: 'Default Starting Point (85% of Use Cases)',
        reasons: [
          'Immediate knowledge updates without expensive GPU retraining runs',
          'Precise citation grounding enables deterministic verification and hallucination detection',
          'Respects dynamic user and tenant document access permissions (ACLs)',
        ],
      },
      {
        tech: 'Domain Fine-Tuning (LoRA / SFT)',
        verdict: 'Style, Vocabulary & Specialized Syntax Only',
        reasons: [
          'Teaches reasoning structure or specific terminology, not dynamic real-time facts',
          'Cannot cite source documents and retains stale training data until next retraining',
        ],
      },
    ],
  },
];

const RUNBOOKS_PREVIEW = [
  {
    id: 'RB-01',
    title: 'Model Performance Degradation & PR-AUC Collapse',
    severity: 'P1 - Critical',
    symptom: 'PR-AUC drops > 15% or false decline rate exceeds 0.3% constraint.',
    triageCmd: 'kubectl logs -l app=scoring-service --tail=200 | grep "METRIC_REGRESSION"',
    mitigation:
      'Execute canary rollback to previous model checkpoint v1.1.0: `kubectl rollout undo deployment/fraud-scoring`',
  },
  {
    id: 'RB-03',
    title: 'Inference Latency Spike (P99 Breach)',
    severity: 'P1 - Latency SLA',
    symptom: 'Scoring latency exceeds 15ms target for > 3 consecutive minutes.',
    triageCmd: 'redis-cli -h $REDIS_HOST --latency-history',
    mitigation:
      'Activate circuit breaker fallback to allow/step-up heuristic and clamp downstream timeouts to 8ms.',
  },
  {
    id: 'RB-04',
    title: 'LLM Provider Outage & 5xx Rate Limits',
    severity: 'P2 - High',
    symptom: 'Primary LLM API returns 502/503 or 429 quota exhaustion.',
    triageCmd: 'curl -i http://localhost:8000/metrics | grep "llm_provider_errors"',
    mitigation:
      'Flip traffic router to secondary provider (Anthropic -> OpenAI or self-hosted vLLM fallback).',
  },
  {
    id: 'RB-08',
    title: 'Security Incident: Prompt Injection & Adversarial Attack',
    severity: 'P1 - Security Threat',
    symptom: 'Attacker injects system-override instructions into log streams or document corpus.',
    triageCmd: 'grep -E "ignore previous instructions|system prompt" /var/log/audit/access.log',
    mitigation: 'Revoke active session tokens, isolate target host, and trigger WAF IP block rule.',
  },
];

export default function WorkspacePage() {
  const [activeTab, setActiveTab] = useState<'setup' | 'artifacts' | 'decisions' | 'runbooks'>('setup');
  const [selectedProfile, setSelectedProfile] = useState<string>('profile-b');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const currentProfile = PROFILES.find((p) => p.id === selectedProfile) || PROFILES[1];

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="border-b border-line pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-signal">
              Forward Deployed Engineer Hub
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Guided Implementation Workspace
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-mute">
              Bridge the gap from architecture guidance to turnkey engineering delivery. Configure deployment
              profiles, download delivery templates, resolve technology trade-offs, and inspect incident
              runbooks.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/delivery"
              className="bg-surface inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-mute no-underline hover:border-signal hover:text-ink"
            >
              <BookOpen size={14} />
              7-Phase Delivery Guide
            </Link>
            <Link
              href="/deployment"
              className="inline-flex items-center gap-1.5 rounded-md bg-signal px-3.5 py-1.5 text-xs font-semibold text-white no-underline shadow-sm hover:opacity-90"
            >
              <Server size={14} />
              Infrastructure Docs
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-line/50 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab('setup')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition ${
              activeTab === 'setup'
                ? 'bg-signal text-white shadow-sm'
                : 'hover:bg-surface bg-raised text-mute hover:text-ink'
            }`}
          >
            <Layers size={14} />
            1. Deployment Profiles
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('artifacts')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition ${
              activeTab === 'artifacts'
                ? 'bg-signal text-white shadow-sm'
                : 'hover:bg-surface bg-raised text-mute hover:text-ink'
            }`}
          >
            <FileCode size={14} />
            2. Architecture Packages
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('decisions')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition ${
              activeTab === 'decisions'
                ? 'bg-signal text-white shadow-sm'
                : 'hover:bg-surface bg-raised text-mute hover:text-ink'
            }`}
          >
            <HelpCircle size={14} />
            3. Decision Assistant
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('runbooks')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition ${
              activeTab === 'runbooks'
                ? 'bg-signal text-white shadow-sm'
                : 'hover:bg-surface bg-raised text-mute hover:text-ink'
            }`}
          >
            <Activity size={14} />
            4. Operational Runbooks
          </button>
        </div>
      </div>

      {/* TAB 1: DEPLOYMENT PROFILES */}
      {activeTab === 'setup' && (
        <section className="mt-8 space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-ink">Choose Target Deployment Profile</h2>
            <p className="mt-1 text-sm text-mute">
              BrainSiphon provides verified implementation architectures for four enterprise operating
              environments. Select your organization&apos;s infrastructure boundary below.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {PROFILES.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedProfile(p.id)}
                className={`cursor-pointer rounded-lg border p-5 transition ${
                  selectedProfile === p.id
                    ? 'border-signal bg-raised/50 shadow-md ring-1 ring-signal'
                    : 'bg-surface border-line hover:border-signal/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold uppercase text-signal">{p.badge}</span>
                  {selectedProfile === p.id && (
                    <span className="flex items-center gap-1 rounded bg-signal/10 px-2 py-0.5 text-xs font-medium text-signal">
                      <CheckCircle2 size={12} /> Active Selection
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-ink">{p.name}</h3>
                <p className="mt-1 text-sm text-mute">{p.description}</p>
                <p className="mt-2 text-xs font-medium text-ink">
                  <span className="text-dim">Ideal for: </span>
                  {p.idealFor}
                </p>

                <div className="mt-4 border-t border-line/60 pt-3">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-dim">
                    Core Infrastructure Stack
                  </p>
                  <ul className="mt-1.5 space-y-1 text-xs text-mute">
                    {p.infrastructure.map((inf, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                        {inf}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-3 border-t border-line/60 pt-3">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-dim">
                    Security & Governance Boundary
                  </p>
                  <ul className="mt-1.5 space-y-1 text-xs text-mute">
                    {p.securityControls.map((sec, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <Shield size={12} className="text-signal" />
                        {sec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Quickstart Command Box */}
          <div className="card rounded-lg p-6">
            <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
              <Terminal size={18} className="text-signal" />
              Spin Up {currentProfile.badge} Stack
            </h3>
            <p className="mt-1 text-xs text-mute">
              Execute this command in your terminal to bootstrap the verified reference stack for{' '}
              {currentProfile.name}.
            </p>
            <div className="bg-canvas mt-3 flex items-center justify-between rounded border border-line p-3 font-mono text-xs text-ink">
              <code>
                {currentProfile.id === 'profile-a'
                  ? 'docker compose -f deployment/docker/docker-compose.fullstack.yml up -d'
                  : currentProfile.id === 'profile-b'
                    ? 'cd deployment/terraform/environments/production && terraform init && terraform plan'
                    : currentProfile.id === 'profile-c'
                      ? 'kubectl apply -k deployment/kubernetes/base/'
                      : 'bash deployment/security/trivy-scan.sh && kubectl apply -f deployment/kubernetes/base/'}
              </code>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    'cmd-spinup',
                    currentProfile.id === 'profile-a'
                      ? 'docker compose -f deployment/docker/docker-compose.fullstack.yml up -d'
                      : currentProfile.id === 'profile-b'
                        ? 'cd deployment/terraform/environments/production && terraform init && terraform plan'
                        : currentProfile.id === 'profile-c'
                          ? 'kubectl apply -k deployment/kubernetes/base/'
                          : 'bash deployment/security/trivy-scan.sh && kubectl apply -f deployment/kubernetes/base/',
                  )
                }
                className="ml-3 rounded bg-raised px-2.5 py-1 text-xs text-mute hover:text-ink"
              >
                {copiedKey === 'cmd-spinup' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: ARCHITECTURE DELIVERABLES */}
      {activeTab === 'artifacts' && (
        <section className="mt-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-ink">
              Standardized Architecture Deliverables & Code Assets
            </h2>
            <p className="mt-1 text-sm text-mute">
              All deliverables follow industry specifications (OpenAPI 3.1, AsyncAPI 3.0, OpenDataContract, C4
              Model, STRIDE Threat Modeling).
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card rounded-lg p-4">
              <span className="chip chip-signal text-[11px]">Phase 0 · Scope</span>
              <h3 className="mt-2 text-sm font-semibold text-ink">Client Discovery Questionnaire</h3>
              <p className="mt-1 text-xs text-mute">
                40-point standardized interview script covering decision cadence, stakeholders, and latency
                expectations.
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-2 font-mono text-[11px] text-dim">
                <span>01-client-discovery.md</span>
                <span className="text-signal">40 Questions</span>
              </div>
            </div>

            <div className="card rounded-lg p-4">
              <span className="chip chip-signal text-[11px]">Phase 0 · Scope</span>
              <h3 className="mt-2 text-sm font-semibold text-ink">Business Requirements Document (BRD)</h3>
              <p className="mt-1 text-xs text-mute">
                BRD template with numerical business targets, false decline ceilings, and acceptance gates.
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-2 font-mono text-[11px] text-dim">
                <span>02-business-requirements.md</span>
                <span className="text-signal">Template</span>
              </div>
            </div>

            <div className="card rounded-lg p-4">
              <span className="chip chip-signal text-[11px]">Phase 1 · Design</span>
              <h3 className="mt-2 text-sm font-semibold text-ink">C4 Architecture Specification Suite</h3>
              <p className="mt-1 text-xs text-mute">
                Complete C1 Context, C2 Container, C3 Component, and C4 Deployment Mermaid diagram models.
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-2 font-mono text-[11px] text-dim">
                <span>01-c4-architecture-suite.md</span>
                <span className="text-signal">Mermaid Models</span>
              </div>
            </div>

            <div className="card rounded-lg p-4">
              <span className="chip chip-signal text-[11px]">Phase 1 · Design</span>
              <h3 className="mt-2 text-sm font-semibold text-ink">OpenAPI 3.1 & AsyncAPI 3.0 Specs</h3>
              <p className="mt-1 text-xs text-mute">
                Production REST and streaming contracts including RFC 7807 error models and schema evolution
                rules.
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-2 font-mono text-[11px] text-dim">
                <span>contracts/openapi.yaml</span>
                <span className="text-signal">OpenAPI 3.1</span>
              </div>
            </div>

            <div className="card rounded-lg p-4">
              <span className="chip chip-signal text-[11px]">Phase 2 · Data</span>
              <h3 className="mt-2 text-sm font-semibold text-ink">Transactional Outbox & CDC Pattern</h3>
              <p className="mt-1 text-xs text-mute">
                PostgreSQL outbox table DDL and Debezium change data capture configuration preventing
                dual-write inconsistency.
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-2 font-mono text-[11px] text-dim">
                <span>outbox-cdc-pattern.sql</span>
                <span className="text-signal">Zero Dual-Write</span>
              </div>
            </div>

            <div className="card rounded-lg p-4">
              <span className="chip chip-signal text-[11px]">Phase 3 · Build</span>
              <h3 className="mt-2 text-sm font-semibold text-ink">High-Performance Serving Microservice</h3>
              <p className="mt-1 text-xs text-mute">
                Sub-15ms FastAPI service with circuit breaking, deadline propagation, and Prometheus metrics.
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-2 font-mono text-[11px] text-dim">
                <span>fastapi-inference-service.py</span>
                <span className="text-signal">P99 &lt; 15ms</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: DECISION ASSISTANT */}
      {activeTab === 'decisions' && (
        <section className="mt-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-ink">Interactive Technology Decision Assistant</h2>
            <p className="mt-1 text-sm text-mute">
              Critical architecture trade-offs evaluated with clear engineering rationale and default
              recommendations.
            </p>
          </div>

          <div className="space-y-6">
            {DECISION_TREES.map((d, idx) => (
              <div key={idx} className="card rounded-lg p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs uppercase text-signal">Decision Matrix · {d.topic}</span>
                  <span className="rounded bg-signal/10 px-2 py-0.5 text-xs font-semibold text-signal">
                    Recommended
                  </span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-ink">{d.question}</h3>
                <p className="mt-1 text-xs font-medium text-mute">
                  <strong className="text-ink">Verdict: </strong>
                  {d.recommendation}
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {d.options.map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      className={`rounded-md border p-3.5 ${
                        oIdx === 0 ? 'border-signal/50 bg-raised/30' : 'bg-surface border-line'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-ink">{opt.tech}</h4>
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                            oIdx === 0 ? 'bg-signal/15 font-semibold text-signal' : 'bg-mute/15 text-mute'
                          }`}
                        >
                          {opt.verdict}
                        </span>
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-mute">
                        {opt.reasons.map((r, rIdx) => (
                          <li key={rIdx} className="flex items-start gap-1.5">
                            <ArrowRight size={12} className="mt-0.5 shrink-0 text-signal" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 4: OPERATIONAL RUNBOOKS */}
      {activeTab === 'runbooks' && (
        <section className="mt-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-ink">Production Incident Runbooks (RB-01 to RB-10)</h2>
            <p className="mt-1 text-sm text-mute">
              Actionable operational incident runbooks designed for on-call engineers. Each runbook includes
              detection, triage commands, immediate mitigation, and permanent recovery steps.
            </p>
          </div>

          <div className="space-y-4">
            {RUNBOOKS_PREVIEW.map((rb) => (
              <div key={rb.id} className="card rounded-lg p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-signal">{rb.id}</span>
                    <h3 className="text-sm font-semibold text-ink">{rb.title}</h3>
                  </div>
                  <span className="rounded bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-500">
                    {rb.severity}
                  </span>
                </div>

                <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                  <div>
                    <span className="font-mono text-[11px] uppercase text-dim">Symptom</span>
                    <p className="mt-0.5 text-mute">{rb.symptom}</p>
                  </div>
                  <div>
                    <span className="font-mono text-[11px] uppercase text-dim">Immediate Mitigation</span>
                    <p className="mt-0.5 font-medium text-ink">{rb.mitigation}</p>
                  </div>
                </div>

                <div className="bg-canvas mt-3 flex items-center justify-between rounded border border-line p-2.5 font-mono text-xs text-ink">
                  <span className="truncate">{rb.triageCmd}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`cmd-${rb.id}`, rb.triageCmd)}
                    className="ml-2 shrink-0 rounded bg-raised px-2 py-0.5 text-[11px] text-mute hover:text-ink"
                  >
                    {copiedKey === `cmd-${rb.id}` ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-surface rounded-lg border border-line p-4 text-center">
            <p className="text-xs text-mute">
              All 10 production runbooks (RB-01 to RB-10) are version-controlled in the repository at{' '}
              <code className="font-mono text-ink">deployment/runbooks/</code>.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
