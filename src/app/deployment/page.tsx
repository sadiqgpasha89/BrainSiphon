import type { Metadata } from 'next';
import { CheckCircle2, Cpu, FileCode, Server } from 'lucide-react';
import {
  ComplianceNotice,
  EnvironmentMatrix,
  InfraValidationStatus,
  RecoveryTiers,
  VersionRegistryTable,
  WorkloadVariants,
} from '../../components/deployment/Sections';
import { withBase } from '../../lib/site';

export const revalidate = 86400;
export const metadata: Metadata = {
  title: 'Deployment Architecture & Infrastructure as Code — BrainSiphon',
  description:
    'Distinguish between deploying BrainSiphon itself and deploying an enterprise AI/ML solution described by BrainSiphon. Complete reference architectures, Terraform IaC, Helm charts, and operational runbooks for AWS, Azure, and GCP.',
};

type Row = { capability: string; staticMode: string; docker: string; cloud: string };

const ROWS: Row[] = [
  {
    capability: 'All 500 blueprints, diagrams, role lenses and sizing calculator',
    staticMode: 'Yes, prebuilt HTML and client-side code',
    docker: 'Yes',
    cloud: 'Yes',
  },
  {
    capability: 'Clean markdown twin of every blueprint and /llms.txt',
    staticMode: 'Yes, written at build time',
    docker: 'Yes',
    cloud: 'Yes',
  },
  {
    capability: 'Search Engine',
    staticMode: 'Build-time MiniSearch index in browser (keyword ranking)',
    docker: 'Postgres full-text + pgvector hybrid, Reciprocal Rank Fusion, circuit breaker fallback',
    cloud: 'Managed Postgres (Aurora / Cloud SQL / Flexible Server) with pgvector',
  },
  {
    capability: 'API routes (/api/search, /api/og, health checks)',
    staticMode: 'Not available: export is static HTML',
    docker: 'Yes, Next.js server runtime',
    cloud: 'Yes, behind enterprise API gateway / ALB',
  },
  {
    capability: 'Rate limiting & Token Buckets',
    staticMode: 'None; CDN or WAF must provide it',
    docker: 'Redis sliding window with in-memory fallback',
    cloud: 'Managed Redis cluster + edge Cloudflare/CloudFront WAF',
  },
  {
    capability: 'Security headers (CSP, HSTS) & redirects',
    staticMode: 'Client-side 404 handler only',
    docker: 'Next.js Edge Middleware',
    cloud: 'Edge WAF + Kubernetes Ingress + Middleware',
  },
  {
    capability: 'Telemetry and structured logs',
    staticMode: 'None server-side',
    docker: 'OpenTelemetry + Pino JSON logs with traceparent',
    cloud: 'Prometheus / Datadog / OpenTelemetry collector export',
  },
  {
    capability: 'Target Infrastructure Stack',
    staticMode: 'GitHub Pages or static S3/GCS bucket',
    docker: 'Local Docker Compose (App, Postgres+pgvector, Redis)',
    cloud: 'Dedicated multi-AZ Kubernetes cluster, managed DB, secrets vault',
  },
];

export default function DeploymentPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-10">
      {/* ── Page Header ── */}
      <header className="max-w-4xl space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-signal-line bg-signal-soft px-3 py-1 font-mono text-xs font-medium text-signal">
          <Server size={14} aria-hidden />
          <span>Infrastructure &amp; Operations Architecture</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
          Deploying BrainSiphon vs. Deploying an AI/ML Solution
        </h1>
        <p className="text-lg leading-relaxed text-mute">
          A critical architectural distinction that every engineering team must understand: there are two
          completely different deployment targets in this ecosystem.
        </p>
      </header>

      {/* ── Core Distinction Card Grid ── */}
      <section className="grid gap-6 md:grid-cols-2" data-testid="deployment-distinction">
        <div className="card bg-surface/50 space-y-4 border-line p-6">
          <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase text-dim">
            <FileCode size={16} className="text-dim" />
            <span>Target A: Documentation Platform</span>
          </div>
          <h2 className="text-xl font-bold text-ink">Deploying BrainSiphon Itself</h2>
          <p className="text-sm leading-relaxed text-mute">
            BrainSiphon is a web application and knowledge portal containing 500 system blueprints, delivery
            guides, and reference models. It can be deployed in three documentation modes:
          </p>
          <ul className="space-y-2 text-xs text-mute">
            <li className="flex items-start gap-2">
              <span className="font-bold text-signal">1.</span>
              <span>
                <strong className="text-ink">Static Reference Site:</strong> Prebuilt HTML/CSS/JS export on
                GitHub Pages or CDN without dynamic server infrastructure.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-signal">2.</span>
              <span>
                <strong className="text-ink">Internal Team Docker:</strong> Full-stack Next.js app with
                Postgres (pgvector) and Redis containers (<code>docker-compose.yml</code>).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-signal">3.</span>
              <span>
                <strong className="text-ink">Enterprise Knowledge Host:</strong> Deployed as an internal
                portal behind corporate SSO (Okta) for internal architecture review.
              </span>
            </li>
          </ul>
        </div>

        <div className="card space-y-4 border-signal/50 bg-signal/5 p-6">
          <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase text-signal">
            <Cpu size={16} className="text-signal" />
            <span>Target B: Enterprise AI Workload</span>
          </div>
          <h2 className="text-xl font-bold text-ink">Deploying an AI/ML Solution Described by BrainSiphon</h2>
          <p className="text-sm leading-relaxed text-mute">
            The actual production machine learning and generative AI system specified in a blueprint (e.g.
            Card Fraud, Sepsis Early Warning, or Personalized Search). This requires production
            infrastructure:
          </p>
          <ul className="space-y-2 text-xs text-ink/90">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-signal" />
              <span>
                <strong>Multi-AZ Kubernetes Compute:</strong> EKS / AKS / GKE cluster with auto-scaling
                GPU/CPU node pools and P99 &lt; 15ms latency budgets.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-signal" />
              <span>
                <strong>Low-Latency Feature Store:</strong> Feast online Redis cluster with sub-2ms reads and
                point-in-time lakehouse joins.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-signal" />
              <span>
                <strong>Real-Time Event Ingestion:</strong> Kafka / Redpanda streaming broker with ordered
                partitioning and transactional outbox CDC.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-signal" />
              <span>
                <strong>Zero-Trust Security &amp; CMEK:</strong> Cloud KMS envelope encryption, private
                endpoints, and Workload Identity federation.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* ── Table: BrainSiphon Platform Modes ── */}
      <section className="space-y-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-signal">Target A Modes</span>
          <h2 className="text-2xl font-semibold text-ink">Platform Documentation Hosting Modes</h2>
          <p className="mt-1 text-sm text-mute">
            Comparison of features available across static hosting, containerized Docker, and cloud
            deployments of the BrainSiphon platform itself.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-line" data-testid="deployment-table">
          <table className="bs-table w-full text-xs">
            <thead>
              <tr>
                <th>Capability</th>
                <th>Static Export (Pages)</th>
                <th>Full-Stack Docker</th>
                <th>Cloud Enterprise Host</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.capability} className="align-top">
                  <th className="font-medium text-ink">{r.capability}</th>
                  <td>{r.staticMode}</td>
                  <td>{r.docker}</td>
                  <td>{r.cloud}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Multi-Cloud Production Reference Architectures ── */}
      <section className="space-y-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-signal">
            Target B Infrastructure
          </span>
          <h2 className="text-2xl font-semibold text-ink">
            Multi-Cloud AI/ML Production Reference Architectures
          </h2>
          <p className="mt-1 text-sm text-mute">
            Reference Infrastructure as Code (IaC) templates for AWS, Azure, and GCP. Each is written for
            multi-AZ high availability, private network isolation, CMEK encryption, and automated failover.
            They are starting points: none has been applied to a live cloud account by this project, so review
            and test them in your own before relying on them.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* AWS Architecture */}
          <div className="card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase text-signal">
                AWS Reference Stack
              </span>
              <span className="rounded bg-raised px-2 py-0.5 font-mono text-[11px] text-mute">
                EKS / Aurora
              </span>
            </div>
            <h3 className="text-base font-bold text-ink">AWS Production Topology</h3>
            <ul className="space-y-1.5 text-xs text-mute">
              <li>
                • <strong>VPC:</strong> 3 AZs with public, private app, and isolated data subnets.
              </li>
              <li>
                • <strong>Compute:</strong> Amazon EKS 1.36 with IRSA workload identity (version tracked in
                the registry below).
              </li>
              <li>
                • <strong>Feature Store:</strong> ElastiCache Redis 7.2 Multi-AZ with Auto-Failover.
              </li>
              <li>
                • <strong>Database:</strong> Aurora PostgreSQL 16 Serverless v2 + pgvector.
              </li>
              <li>
                • <strong>Storage:</strong> S3 Lakehouse with SSE-KMS customer-managed keys.
              </li>
              <li>
                • <strong>Streaming:</strong> Amazon MSK (Managed Streaming for Kafka).
              </li>
            </ul>
            <div className="bg-canvas rounded border border-line p-3 font-mono text-[11px]">
              <p className="text-dim"># Bootstrap AWS Stack</p>
              <code>
                cd deployment/terraform/aws && terraform init && terraform apply
                -var-file=../environments/prod.tfvars # see the commands section for the full, per-environment
                sequence
              </code>
            </div>
          </div>

          {/* Azure Architecture */}
          <div className="card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase text-signal">
                Azure Reference Stack
              </span>
              <span className="rounded bg-raised px-2 py-0.5 font-mono text-[11px] text-mute">
                AKS / FlexServer
              </span>
            </div>
            <h3 className="text-base font-bold text-ink">Azure Production Topology</h3>
            <ul className="space-y-1.5 text-xs text-mute">
              <li>
                • <strong>VNet:</strong> 3 AZs with Azure Application Gateway WAF v2.
              </li>
              <li>
                • <strong>Compute:</strong> Azure Kubernetes Service (AKS) with Azure CNI.
              </li>
              <li>
                • <strong>Feature Store:</strong> Azure Cache for Redis Premium with clustering.
              </li>
              <li>
                • <strong>Database:</strong> Azure Database for PostgreSQL Flexible Server + pgvector.
              </li>
              <li>
                • <strong>Storage:</strong> ADLS Gen2 with Key Vault customer-managed key.
              </li>
              <li>
                • <strong>Streaming:</strong> Azure Event Hubs (Kafka 3.8 protocol head).
              </li>
            </ul>
            <div className="bg-canvas rounded border border-line p-3 font-mono text-[11px]">
              <p className="text-dim"># Bootstrap Azure Stack</p>
              <code>
                cd deployment/terraform/azure && terraform init && terraform apply
                -var-file=../environments/prod.tfvars # see the commands section for the full, per-environment
                sequence
              </code>
            </div>
          </div>

          {/* GCP Architecture */}
          <div className="card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase text-signal">
                GCP Reference Stack
              </span>
              <span className="rounded bg-raised px-2 py-0.5 font-mono text-[11px] text-mute">
                GKE / Cloud SQL
              </span>
            </div>
            <h3 className="text-base font-bold text-ink">GCP Production Topology</h3>
            <ul className="space-y-1.5 text-xs text-mute">
              <li>
                • <strong>VPC:</strong> Custom VPC with Cloud NAT &amp; Private Google Access.
              </li>
              <li>
                • <strong>Compute:</strong> Private GKE Cluster with Shielded Nodes &amp; Workload Identity.
              </li>
              <li>
                • <strong>Feature Store:</strong> Cloud Memorystore for Redis Standard HA.
              </li>
              <li>
                • <strong>Database:</strong> Cloud SQL for PostgreSQL 16 (Regional HA + pgvector).
              </li>
              <li>
                • <strong>Storage:</strong> Google Cloud Storage with Cloud KMS CMEK.
              </li>
              <li>
                • <strong>Streaming:</strong> Cloud Pub/Sub with Dead-Letter Queues.
              </li>
            </ul>
            <div className="bg-canvas rounded border border-line p-3 font-mono text-[11px]">
              <p className="text-dim"># Bootstrap GCP Stack</p>
              <code>
                cd deployment/terraform/gcp && terraform init && terraform apply
                -var-file=../environments/prod.tfvars # see the commands section for the full, per-environment
                sequence
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* ── Kubernetes & Helm Deployment Section ── */}
      <section className="space-y-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-signal">
            Container Orchestration
          </span>
          <h2 className="text-2xl font-semibold text-ink">Kubernetes Deployment &amp; Helm Manifests</h2>
          <p className="mt-1 text-sm text-mute">
            Every production workload runs inside hardened Kubernetes containers with least-privilege
            NetworkPolicies, horizontal autoscaling (HPA), and non-root security contexts.
          </p>
        </div>

        <div className="card space-y-4 border-line p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <span className="font-mono text-xs font-semibold text-ink">deployment/helm/ai-solution</span>
            <span className="font-mono text-xs text-signal">Helm v3 Package</span>
          </div>

          <div className="grid gap-4 text-xs md:grid-cols-2">
            <div>
              <p className="font-mono font-semibold text-ink">Deploy to Staging Environment:</p>
              <div className="bg-canvas mt-1.5 rounded border border-line p-3 font-mono text-[11px]">
                <code>
                  helm upgrade --install aiml-scoring deployment/helm/ai-solution -f
                  deployment/helm/ai-solution/values-staging.yaml --namespace aiml-staging --create-namespace
                </code>
              </div>
            </div>
            <div>
              <p className="font-mono font-semibold text-ink">Deploy to Production Environment:</p>
              <div className="bg-canvas mt-1.5 rounded border border-line p-3 font-mono text-[11px]">
                <code>
                  helm upgrade --install aiml-scoring deployment/helm/ai-solution -f
                  deployment/helm/ai-solution/values-prod.yaml --namespace aiml-prod --create-namespace
                </code>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <p className="font-mono text-xs font-semibold text-ink">Run Pre-Flight Smoke Test Suite:</p>
            <div className="bg-canvas mt-1.5 flex items-center justify-between rounded border border-line p-3 font-mono text-[11px]">
              <code>bash deployment/smoke-test.sh http://scoring.internal.enterprise.com 15</code>
              <span className="font-semibold text-signal">
                Checks Liveness, Readiness &amp; P99 &lt; 15ms
              </span>
            </div>
          </div>
        </div>
      </section>

      <ComplianceNotice />
      <EnvironmentMatrix />
      <WorkloadVariants />
      <RecoveryTiers />
      <VersionRegistryTable />
      <InfraValidationStatus />

      {/* ── Deploy and tear down ── */}
      <section className="space-y-4" id="commands" data-testid="deploy-commands">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-signal">Commands</span>
          <h2 className="text-2xl font-semibold text-ink">Deploy, verify and tear down one environment</h2>
          <p className="mt-1 max-w-3xl text-sm text-mute">
            Replace <code>ENV</code> with <code>dev</code>, <code>staging</code>, <code>preprod</code> or{' '}
            <code>production</code> (the variable file for production is <code>prod.tfvars</code>). The image
            in the Helm values is a placeholder: build it from{' '}
            <code>reference-implementations/realtime-decisioning</code> and set <code>image.repository</code>{' '}
            and <code>image.tag</code>, and replace the placeholder IRSA role ARN. Nothing below has been run
            against a live cloud account by this project.
          </p>
        </div>
        <pre className="overflow-x-auto rounded border border-line bg-raised/50 p-4 font-mono text-[11px] leading-relaxed">
          {`# 0. once per environment: remote state with locking and encryption (AWS; Azure and GCP use native backends)
ENV=dev REGION=us-east-1 ./deployment/terraform/bootstrap-state.sh
cp deployment/terraform/backend.example.hcl deployment/terraform/aws/backend.dev.hcl   # edit the names it printed

# 1. validate with no credentials
npm run validate:infra && npm run check:versions
terraform -chdir=deployment/terraform/aws fmt -check -recursive
terraform -chdir=deployment/terraform/aws init -backend=false && terraform -chdir=deployment/terraform/aws validate
tflint --chdir deployment/terraform/aws
checkov -d deployment/terraform/aws --config-file deployment/policy/checkov.yaml

# 2. plan, review, apply (the plan file is what gets reviewed and applied)
terraform -chdir=deployment/terraform/aws init -backend-config=backend.dev.hcl
terraform -chdir=deployment/terraform/aws plan  -var-file=../environments/dev.tfvars -out=dev.plan
terraform -chdir=deployment/terraform/aws apply dev.plan

# 3. deploy the workload and verify policy first
aws eks update-kubeconfig --name dev-aiml-cluster --region us-east-1
helm template aiml deployment/helm/ai-solution -f deployment/helm/ai-solution/values-dev.yaml | conftest test --policy deployment/policy -
helm upgrade --install aiml deployment/helm/ai-solution -f deployment/helm/ai-solution/values-dev.yaml -n aiml-dev --create-namespace --atomic --timeout 5m

# 4. smoke test: liveness, readiness, a real prediction against the contract, latency against the budget
bash deployment/smoke-test.sh https://YOUR-ENDPOINT 50

# rollback of the workload (the previous Helm revision) and teardown of the infrastructure
helm rollback aiml 0 -n aiml-dev
helm uninstall aiml -n aiml-dev
terraform -chdir=deployment/terraform/aws destroy -var-file=../environments/dev.tfvars   # dev and staging only; production has deletion protection on`}
        </pre>
        <p className="text-sm text-mute">
          Azure: <code>deployment/terraform/azure</code> with <code>az aks get-credentials</code>. GCP:{' '}
          <code>deployment/terraform/gcp</code> with <code>gcloud container clusters get-credentials</code>.
          The whole kit is one{' '}
          <a className="text-signal underline" href={withBase('/downloads/brainsiphon-deployment-kit.zip')}>
            download
          </a>
          .
        </p>
      </section>
    </div>
  );
}
