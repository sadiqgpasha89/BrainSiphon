import { ALL_STEPS, partyLabel } from '../content/delivery';
import { ENVIRONMENTS_SPEC, RECOVERY_TIERS, type EnvironmentSpec } from '../content/deployment-profiles';
import { makeZip } from './zip';

export type Cloud = 'aws' | 'azure' | 'gcp';
export type Family = 'realtime-decisioning' | 'batch-forecasting' | 'rag-assistant' | 'agentic-workflow';
export type EnvId = EnvironmentSpec['id'];
export type Runtime = 'kubernetes' | 'managed-containers' | 'serverless-batch' | 'durable-workflow';

export interface PackageInput {
  projectName: string;
  family: Family;
  cloud: Cloud;
  environment: EnvId;
  tier: 'T0' | 'T1' | 'T2' | 'T3';
  peakRps: number;
  platformTeam: boolean;
  selfHostedModel: boolean;
  regulated: boolean;
  region: string;
  vpcCidr: string;
}

export const FAMILY_LABEL: Record<Family, string> = {
  'realtime-decisioning': 'Real-time decisioning (card and UPI fraud reference)',
  'batch-forecasting': 'Batch forecasting (demand sensing reference)',
  'rag-assistant': 'Retrieval-augmented generation (developer documentation reference)',
  'agentic-workflow': 'Agentic workflow (SOC alert triage reference)',
};

export interface Recommendation {
  runtime: Runtime;
  summary: string;
  reasons: string[];
  rejected: { option: string; why: string }[];
}

const RUNTIME_LABEL: Record<Runtime, string> = {
  kubernetes: 'Managed Kubernetes (EKS / AKS / GKE) with Helm',
  'managed-containers': 'Managed container service (ECS Fargate / Container Apps / Cloud Run)',
  'serverless-batch': 'Serverless batch jobs with a managed orchestrator',
  'durable-workflow': 'Durable workflow engine plus managed containers for tools',
};
export { RUNTIME_LABEL };

/** The decision rule behind the assistant. Deliberately simple and written down, so an engineer can disagree with it and say why. */
export function recommend(i: PackageInput): Recommendation {
  const reasons: string[] = [];
  const rejected: { option: string; why: string }[] = [];
  let runtime: Runtime;
  if (i.family === 'batch-forecasting') {
    runtime = 'serverless-batch';
    reasons.push(
      'Batch work is bursty and tolerant of delay: pay for compute only while a partition is processing.',
    );
    rejected.push({
      option: RUNTIME_LABEL.kubernetes,
      why: 'An always-on cluster for a nightly job is cost and operations you do not need unless you already run the orchestrator there.',
    });
  } else if (i.family === 'agentic-workflow') {
    runtime = 'durable-workflow';
    reasons.push(
      'Agent runs are long, stateful and need approval pauses and resumption after failure; durable state matters more than the container platform.',
    );
    rejected.push({
      option: 'Stateless serverless functions only',
      why: 'They cannot hold a run across an approval that takes hours, or resume it after a crash.',
    });
  } else if (i.family === 'rag-assistant' && !i.selfHostedModel) {
    runtime = 'managed-containers';
    reasons.push(
      'With a provider-hosted model the service is a thin, stateless retrieval and orchestration layer.',
    );
    rejected.push({
      option: RUNTIME_LABEL.kubernetes,
      why: 'No GPUs to schedule and few services to isolate: Kubernetes adds operational cost without a matching benefit.',
    });
  } else if (
    i.peakRps >= 200 ||
    i.tier === 'T3' ||
    (i.tier === 'T2' && i.platformTeam) ||
    i.selfHostedModel
  ) {
    runtime = 'kubernetes';
    reasons.push(
      i.peakRps >= 200
        ? `Peak ${i.peakRps} requests per second benefits from horizontal autoscaling and fine-grained network policy.`
        : 'The recovery tier or model hosting needs scheduling, network policy and controlled rollouts.',
    );
    if (!i.platformTeam)
      reasons.push(
        'Warning: no platform team was selected. Kubernetes without one tends to become the project’s main risk; consider managed containers until you have one.',
      );
    rejected.push({
      option: RUNTIME_LABEL['managed-containers'],
      why: 'Simpler to run, but less control over rollout, isolation and GPU scheduling at this load.',
    });
  } else {
    runtime = 'managed-containers';
    reasons.push(
      `At ${i.peakRps} requests per second, a managed container service meets the load with far less to operate.`,
    );
    rejected.push({
      option: RUNTIME_LABEL.kubernetes,
      why: 'Worth revisiting when load, number of services or isolation needs grow.',
    });
  }
  if (i.regulated)
    reasons.push(
      'Regulated data: keep traffic on private endpoints, use customer-managed keys, and require FIPS 140-3 validated modules where your framework asks for them. This is a design aid, not a compliance determination.',
    );
  return { runtime, summary: RUNTIME_LABEL[runtime], reasons, rejected };
}

export interface GeneratedFile {
  path: string;
  content: string;
  /** how far this file has been checked */
  status: 'static-checked' | 'unvalidated';
}

const env = (id: EnvId) => ENVIRONMENTS_SPEC.find((e) => e.id === id)!;
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'project';
const csv = (v: string) => `"${v.replace(/"/g, '""')}"`;

function helmValues(i: PackageInput): string {
  const prodShaped = i.environment === 'preprod' || i.environment === 'production';
  const e = env(i.environment);
  const replicas = i.environment === 'dev' ? 1 : i.environment === 'staging' ? 2 : 6;
  return `# Generated by BrainSiphon for ${i.projectName}. Environment: ${i.environment}. Review every value before applying.
replicaCount: ${replicas}
image:
  repository: REPLACE-ME/${slug(i.projectName)}-serving   # build from reference-implementations/${i.family}
  tag: REPLACE-ME                                         # an immutable tag or digest; :latest is rejected by policy
serviceAccount:
  annotations:
    # AWS: eks.amazonaws.com/role-arn   Azure: azure.workload.identity/client-id   GCP: iam.gke.io/gcp-service-account
    REPLACE-ME: REPLACE-ME
resources:
  limits: { cpu: '${prodShaped ? '8000m' : i.environment === 'staging' ? '2000m' : '1000m'}', memory: '${prodShaped ? '16Gi' : i.environment === 'staging' ? '4Gi' : '2Gi'}' }
  requests: { cpu: '${prodShaped ? '4000m' : i.environment === 'staging' ? '1000m' : '500m'}', memory: '${prodShaped ? '8Gi' : i.environment === 'staging' ? '2Gi' : '1Gi'}' }
autoscaling:
  enabled: ${i.environment !== 'dev'}
  minReplicas: ${replicas}
  maxReplicas: ${prodShaped ? 24 : 6}
env:
  ENVIRONMENT: ${i.environment}
  USE_CASE: ${i.family}
  LOG_LEVEL: ${i.environment === 'dev' ? 'debug' : 'info'}
  LATENCY_BUDGET_MS: '${e.helm.latencyBudgetMs}'
`;
}

function envFile(i: PackageInput): string {
  return `# Non-secret configuration for ${i.environment}. Secrets are NOT here: reference them from your secrets manager.
ENVIRONMENT=${i.environment}
USE_CASE=${i.family}
CLOUD=${i.cloud}
REGION=${i.region}
# Secrets (resolve at deploy time, never commit):
#   DATABASE_URL        -> ${i.cloud === 'aws' ? 'AWS Secrets Manager' : i.cloud === 'azure' ? 'Azure Key Vault' : 'GCP Secret Manager'}
#   REDIS_AUTH_TOKEN    -> same store
#   MODEL_PROVIDER_KEY  -> same store (only for LLM use cases)
OIDC_ISSUER=REPLACE-ME
OIDC_AUDIENCE=REPLACE-ME
`;
}

function commands(i: PackageInput, r: Recommendation): string {
  const tfvars = i.environment === 'production' ? 'prod' : i.environment;
  const login =
    i.cloud === 'aws'
      ? `aws eks update-kubeconfig --name ${i.environment}-aiml-cluster --region ${i.region}`
      : i.cloud === 'azure'
        ? `az aks get-credentials --resource-group rg-${i.environment}-aiml --name aks-${i.environment}-aiml`
        : `gcloud container clusters get-credentials ${i.environment}-aiml-gke-cluster --region ${i.region}`;
  const k8s = r.runtime === 'kubernetes';
  return `# Deploy and tear down: ${i.projectName} (${i.environment}, ${i.cloud})
# Recommended runtime: ${r.summary}
# NOTHING HERE HAS BEEN RUN AGAINST A LIVE ACCOUNT BY BRAINSIPHON. Read each command; run it in your own account.

# 1. Validate with no credentials
npm run validate:infra && npm run check:versions     # from the BrainSiphon repository
terraform -chdir=deployment/terraform/${i.cloud} init -backend=false && terraform -chdir=deployment/terraform/${i.cloud} validate

# 2. Plan, review, apply
terraform -chdir=deployment/terraform/${i.cloud} init -backend-config=backend.${i.environment}.hcl
terraform -chdir=deployment/terraform/${i.cloud} plan -var-file=../environments/${tfvars}.tfvars -out=${i.environment}.plan
terraform -chdir=deployment/terraform/${i.cloud} apply ${i.environment}.plan
${
  k8s
    ? `
# 3. Deploy the workload (values file generated alongside this one)
${login}
helm template ${slug(i.projectName)} deployment/helm/ai-solution -f helm/values-${i.environment}.yaml | conftest test --policy deployment/policy -
helm upgrade --install ${slug(i.projectName)} deployment/helm/ai-solution -f helm/values-${i.environment}.yaml -n ${slug(i.projectName)}-${i.environment} --create-namespace --atomic --timeout 5m
`
    : `
# 3. Deploy the workload on: ${r.summary}
#    The Helm chart in this kit targets Kubernetes and does not apply to this runtime. Deploy the container built from
#    reference-implementations/${i.family} using your cloud's service, with the same environment variables as .env.${i.environment}.
`
}
# 4. Smoke test
bash deployment/smoke-test.sh https://REPLACE-ME ${env(i.environment).helm.latencyBudgetMs}

# Rollback and teardown
${k8s ? `helm rollback ${slug(i.projectName)} 0 -n ${slug(i.projectName)}-${i.environment}` : '# redeploy the previous image tag'}
terraform -chdir=deployment/terraform/${i.cloud} destroy -var-file=../environments/${tfvars}.tfvars   # not for production: deletion protection is on
`;
}

function adr(i: PackageInput, r: Recommendation, override?: { runtime: Runtime; reason: string }): string {
  const chosen = override ? override.runtime : r.runtime;
  const tier = RECOVERY_TIERS.find((t) => t.id === i.tier)!;
  return `# ADR-0001: Runtime and recovery profile for ${i.projectName}

- Status: Proposed
- Date: ${new Date().toISOString().slice(0, 10)}
- Deciders: [names]

## Context
Use case family: ${FAMILY_LABEL[i.family]}. Cloud: ${i.cloud}. Environment generated: ${i.environment}. Peak load assumed: ${i.peakRps} requests per second.
Platform team available: ${i.platformTeam ? 'yes' : 'no'}. Self-hosted model: ${i.selfHostedModel ? 'yes' : 'no'}. Regulated data: ${i.regulated ? 'yes' : 'no'}.

## Decision
Runtime: **${RUNTIME_LABEL[chosen]}**.
Recovery tier: **${tier.id} (${tier.name})** with targets of availability ${tier.availability}, RPO ${tier.rpo}, RTO ${tier.rto}. These are targets, not measured results.

## BrainSiphon's recommendation and reasoning
Recommended: ${r.summary}.
${r.reasons.map((x) => `- ${x}`).join('\n')}

${
  override
    ? `## Override
This decision departs from the recommendation. Reason given by the team:

> ${override.reason || '(no reason given: an override without a reason should not be accepted)'}
`
    : ''
}
## Alternatives considered and rejected
${r.rejected.map((x) => `- **${x.option}**: ${x.why}`).join('\n')}

## Consequences
- Operating cost and staffing follow the runtime chosen. Revisit when load or the number of services changes.
- Recovery behaviour: ${tier.failover}
- Split-brain control: ${tier.splitBrain}
- Evidence needed before relying on the targets: a restore test and a failover drill, measured and recorded in the handover package.
`;
}

/** The implementation backlog, generated from the 69 delivery steps and the chosen family; Jira-style columns. */
export function backlogCsv(i: PackageInput): string {
  const rows: string[][] = [
    [
      'Summary',
      'Description',
      'Issue Type',
      'Labels',
      'Priority',
      'Owner role',
      'Depends on',
      'Acceptance criteria',
      'Estimate (days)',
      'External dependency',
    ],
  ];
  let prev: string | undefined;
  for (const s of ALL_STEPS) {
    const phase = s.id.split('.')[0]!;
    const same = prev && prev.split('.')[0] === phase ? prev : '';
    const external = s.with.some((w) =>
      ['data-owner', 'risk-compliance', 'security-engineer', 'sponsor', 'forward-deployed-engineer'].includes(
        w,
      ),
    )
      ? 'yes'
      : 'no';
    rows.push([
      `[${s.id}] ${s.title}`,
      s.how.join(' '),
      'Task',
      `phase-${phase};${i.family};${i.cloud}`,
      phase === '0' || phase === '1' ? 'High' : 'Medium',
      partyLabel(s.owner),
      same,
      s.output,
      '',
      external,
    ]);
    prev = s.id;
  }
  const extra: [string, string, string][] = [
    [
      'Build the serving image from the reference implementation',
      `Start from reference-implementations/${i.family}; replace synthetic data and stubs; push an immutable tag.`,
      'ML Engineer',
    ],
    [
      'Replace the placeholder IRSA/workload-identity role and image in the Helm values',
      'Values files carry REPLACE-ME markers; the policy check fails on :latest.',
      'Platform Engineer',
    ],
    [
      'Run a restore test and a failover drill and record measured RTO/RPO',
      `Targets for ${i.tier}: see the ADR. Record measured values in the handover package.`,
      'SRE / DevOps Engineer',
    ],
  ];
  for (const [t, d, o] of extra)
    rows.push([
      t,
      d,
      'Task',
      `${i.family};${i.cloud};generated`,
      'High',
      o,
      '',
      'Measured result recorded with a link to evidence',
      '',
      'no',
    ]);
  return rows.map((r) => r.map(csv).join(',')).join('\n') + '\n';
}

function githubIssuesScript(i: PackageInput): string {
  return `#!/usr/bin/env bash
# Creates one GitHub issue per backlog row. Needs the gh CLI, authenticated, run inside the target repository.
# Review backlog.csv first: this script CREATES ISSUES, which is visible to everyone with access to the repository.
set -euo pipefail
python3 - <<'PY'
import csv, subprocess
for r in csv.DictReader(open('backlog.csv')):
    body = f"{r['Description']}\\n\\n**Owner role:** {r['Owner role']}\\n**Depends on:** {r['Depends on'] or 'none'}\\n**Acceptance:** {r['Acceptance criteria']}"
    subprocess.run(['gh','issue','create','--title',r['Summary'],'--body',body,'--label','${i.family}'],check=True)
PY
`;
}

function validationNote(i: PackageInput): string {
  return `# What has and has not been validated for this package

Generated for ${i.projectName} (${i.environment}, ${i.cloud}) by the BrainSiphon workspace.

| File | Status |
| --- | --- |
| tfvars | The same variables are checked by \`npm run validate:infra\`; a value you changed (region, CIDR) is not |
| helm/values-${i.environment}.yaml | Shape matches the chart; placeholders (REPLACE-ME) must be filled; run \`helm template\` and \`conftest\` before applying |
| .env.${i.environment} | Not validated: it is a template |
| COMMANDS.md | Not run by BrainSiphon against a live account |
| adr/0001-runtime-and-recovery.md | A proposal. It becomes a decision when your named deciders accept it |
| backlog.csv | Generated from the delivery guide; estimates and dates are yours to add |

No recovery target in this package has been measured. Passing the checks above does not make a system production-ready.
Maturity levels and what each needs: delivery/templates/phase-5-release/maturity-gap-checklist.md in the templates bundle.
`;
}

export function generatePackage(
  i: PackageInput,
  override?: { runtime: Runtime; reason: string },
): GeneratedFile[] {
  const r = recommend(i);
  const tfvars = i.environment === 'production' ? 'prod' : i.environment;
  const f: GeneratedFile[] = [
    {
      path: `terraform/${tfvars}.tfvars`,
      status: 'static-checked',
      content: `environment = "${i.environment}"\nregion      = "${i.region}"\nvpc_cidr    = "${i.vpcCidr}"\n`,
    },
    { path: `helm/values-${i.environment}.yaml`, status: 'unvalidated', content: helmValues(i) },
    { path: `.env.${i.environment}`, status: 'unvalidated', content: envFile(i) },
    {
      path: 'COMMANDS.md',
      status: 'unvalidated',
      content: commands(
        i,
        override ? { ...r, runtime: override.runtime, summary: RUNTIME_LABEL[override.runtime] } : r,
      ),
    },
    { path: 'adr/0001-runtime-and-recovery.md', status: 'unvalidated', content: adr(i, r, override) },
    { path: 'backlog.csv', status: 'unvalidated', content: backlogCsv(i) },
    { path: 'create-github-issues.sh', status: 'unvalidated', content: githubIssuesScript(i) },
    { path: 'VALIDATION.md', status: 'unvalidated', content: validationNote(i) },
  ];
  return f;
}

export function packageZip(files: GeneratedFile[]): Uint8Array {
  return makeZip(files.map((x) => ({ path: x.path, data: x.content })));
}
