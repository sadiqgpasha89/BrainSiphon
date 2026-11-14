/**
 * What differs between environments, what each class of workload should run on, and what recovery targets are defensible for each class.
 * The environment figures are read off the Terraform and Helm files (a test compares them); the recovery tiers are TARGETS, and the page
 * says so: no failover or restore drill has been run against these stacks.
 */
export interface EnvironmentSpec {
  id: 'dev' | 'staging' | 'preprod' | 'production';
  label: string;
  purpose: string;
  data: string;
  tfvars: string;
  helmValues: string;
  /** AWS reference stack figures, from deployment/terraform/aws/main.tf */
  aws: { nodes: string; db: string; cache: string; apiEndpoint: string; deletionProtection: boolean };
  /** Helm figures, from the values file */
  helm: { replicas: string; latencyBudgetMs: number };
  approval: string;
  cloudAccount: string;
}

export const ENVIRONMENTS_SPEC: EnvironmentSpec[] = [
  {
    id: 'dev',
    label: 'Development',
    purpose: 'Build and debug. Throw-away; recreated at will.',
    data: 'Synthetic only',
    tfvars: 'deployment/terraform/environments/dev.tfvars',
    helmValues: 'deployment/helm/ai-solution/values-dev.yaml',
    aws: { nodes: '1–4 × c6i.xlarge', db: 'Aurora Serverless v2 0.5–4 ACU, 1 instance', cache: 'cache.t4g.medium', apiEndpoint: 'public (restricted CIDR)', deletionProtection: false },
    helm: { replicas: '1, no autoscaling', latencyBudgetMs: 50 },
    approval: 'None: any engineer may apply',
    cloudAccount: 'Shared dev account',
  },
  {
    id: 'staging',
    label: 'Staging',
    purpose: 'Functional and integration tests against stand-ins for upstream and downstream systems.',
    data: 'Masked or synthetic',
    tfvars: 'deployment/terraform/environments/staging.tfvars',
    helmValues: 'deployment/helm/ai-solution/values-staging.yaml',
    aws: { nodes: '1–4 × c6i.xlarge', db: 'Aurora Serverless v2 0.5–4 ACU, 1 instance', cache: 'cache.t4g.medium', apiEndpoint: 'private', deletionProtection: false },
    helm: { replicas: '2–6 (HPA)', latencyBudgetMs: 20 },
    approval: 'One reviewer on the pull request; plan output attached',
    cloudAccount: 'Non-production account',
  },
  {
    id: 'preprod',
    label: 'Pre-production',
    purpose: 'Production-shaped. Load, failover and restore drills; the shadow run; the dress rehearsal of every release.',
    data: 'Production-like, masked, or a read-only mirror',
    tfvars: 'deployment/terraform/environments/preprod.tfvars',
    helmValues: 'deployment/helm/ai-solution/values-preprod.yaml',
    aws: { nodes: '3–18 × c6i.4xlarge', db: 'Aurora Serverless v2 2–32 ACU, 3 instances', cache: 'cache.m6g.xlarge', apiEndpoint: 'private', deletionProtection: true },
    helm: { replicas: '6–24 (HPA)', latencyBudgetMs: 15 },
    approval: 'Two reviewers; same pipeline as production',
    cloudAccount: 'Own account, separate from production',
  },
  {
    id: 'production',
    label: 'Production',
    purpose: 'Serves real decisions.',
    data: 'Live',
    tfvars: 'deployment/terraform/environments/prod.tfvars',
    helmValues: 'deployment/helm/ai-solution/values-prod.yaml',
    aws: { nodes: '3–18 × c6i.4xlarge', db: 'Aurora Serverless v2 2–32 ACU, 3 instances', cache: 'cache.m6g.xlarge', apiEndpoint: 'private', deletionProtection: true },
    helm: { replicas: '6–24 (HPA)', latencyBudgetMs: 15 },
    approval: 'Two reviewers and the customer change ticket; only the pipeline applies',
    cloudAccount: 'Own account with break-glass access only',
  },
];

export interface RecoveryTier {
  id: string;
  name: string;
  example: string;
  availability: string;
  rpo: string;
  rto: string;
  replication: string;
  failover: string;
  splitBrain: string;
  justification: string;
  test: string;
}

export const RECOVERY_TIERS: RecoveryTier[] = [
  {
    id: 'T0',
    name: 'Batch and offline analytics',
    example: 'Nightly forecasts, reports, model training',
    availability: '99.0%',
    rpo: '24 h',
    rto: '24 h',
    replication: 'Daily snapshots; object storage versioning',
    failover: 'None. Re-run the pipeline from the last good partition, in the same or another region.',
    splitBrain: 'Not applicable (single writer, idempotent re-runs)',
    justification: 'A late forecast costs less than the standby capacity that would prevent it.',
    test: 'Restore a snapshot and replay one partition, twice a year',
  },
  {
    id: 'T1',
    name: 'Internal decision support',
    example: 'Analyst copilots, internal RAG assistants',
    availability: '99.5%',
    rpo: '1 h',
    rto: '4 h',
    replication: 'Multi-AZ database with point-in-time recovery; vector index rebuilt from source',
    failover: 'Automatic across AZs. Region loss: rebuild from IaC and backups; staff use the manual process meanwhile.',
    splitBrain: 'Single-region writer; no cross-region write path',
    justification: 'People can wait or work around it; rebuild is cheaper than a warm region.',
    test: 'AZ failure drill and a restore test, each half-yearly',
  },
  {
    id: 'T2',
    name: 'Customer-facing online inference',
    example: 'Recommendations, search ranking, in-app copilots',
    availability: '99.9%',
    rpo: '5 min',
    rto: '30 min',
    replication: 'Multi-AZ synchronous in-region; asynchronous cross-region replica for the database; stateless serving',
    failover: 'AZ: automatic. Region: promote the replica and shift traffic by DNS, executed from the runbook (RB-10).',
    splitBrain: 'Promote exactly one writer; fence the old primary (revoke its credentials and security-group access) before traffic moves',
    justification: 'Revenue impact justifies a warm replica; asynchronous replication keeps write latency flat at the cost of seconds of lag.',
    test: 'Region-failover game day quarterly in pre-production; restore test quarterly',
  },
  {
    id: 'T3',
    name: 'Financial or safety-critical real-time decisioning',
    example: 'Card-fraud authorisation, clinical alerting',
    availability: '99.95%',
    rpo: '0 within a region; ≤ 1 min across regions',
    rto: '< 5 min for an AZ; ≤ 30 min for a region',
    replication: 'Synchronous across AZs; asynchronous across regions. RPO 0 across regions would need synchronous cross-region commits (a round trip of tens of milliseconds on every write), which the reference stacks do not provide.',
    failover: 'AZ: automatic, no operator action. Region: operator-approved promotion; the decision API falls back to the rules-only path while the database moves.',
    splitBrain: 'Quorum-based leader election inside the region; cross-region promotion is manual, fenced and logged to the decision ledger',
    justification: 'A missed decision has a direct financial or safety cost, so the stack pays for synchronous in-region commits and a rehearsed fallback. Do not adopt RPO 0 unless the cost of losing one decision exceeds the cost of the added write latency and standby capacity.',
    test: 'Monthly AZ-failure chaos test; quarterly region failover; restore test monthly. Record the measured values next to these targets.',
  },
];

export interface WorkloadVariant {
  id: string;
  workload: string;
  runsOn: string;
  kubernetes: string;
  serverless: string;
  hardware: string;
  sizing: string;
  selfHostedVsManaged: string;
}

export const WORKLOAD_VARIANTS: WorkloadVariant[] = [
  {
    id: 'online-inference',
    workload: 'Online ML inference (tabular, trees, small neural nets)',
    runsOn: 'Containers behind an API gateway; feature cache; managed relational database',
    kubernetes: 'Worth it above a handful of services or when you need HPA, network policy and multi-tenant isolation. For one model at low volume a managed container service is simpler.',
    serverless: 'Cloud Run / Fargate / Container Apps: fine below sustained load; cold starts hurt a tight latency budget unless you keep instances warm.',
    hardware: 'CPU. A GPU is rarely justified for gradient-boosted trees.',
    sizing: 'Replicas = ceil(peak requests per second × p95 service time in seconds ÷ target utilisation). Measure service time with your own model; the blueprint figure is a modelled start.',
    selfHostedVsManaged: 'Self-hosted FastAPI/BentoML/Seldon, or a managed endpoint (SageMaker, Vertex AI, Azure ML). Managed saves operations, costs more per request at scale.',
  },
  {
    id: 'batch-ml',
    workload: 'Batch ML and forecasting',
    runsOn: 'Workflow orchestrator plus ephemeral compute; object storage; a warehouse',
    kubernetes: 'Usually unnecessary. Use managed batch compute or a warehouse job; add Kubernetes only if you already run the orchestrator there.',
    serverless: 'Yes: AWS Batch/Step Functions, Cloud Run jobs, Azure Batch. Pay only while the job runs.',
    hardware: 'CPU, with spot or preemptible capacity and checkpointing.',
    sizing: 'Workers = ceil(partitions × minutes per partition ÷ the time window). Size the window from the downstream deadline, not the other way round.',
    selfHostedVsManaged: 'Managed orchestration (Cloud Composer, MWAA, Data Factory) unless you have a platform team.',
  },
  {
    id: 'streaming',
    workload: 'Streaming analytics and scoring',
    runsOn: 'Managed Kafka-compatible broker; a stream processor; state store',
    kubernetes: 'Reasonable for stateful processors, but a managed stream service removes most of the operational load.',
    serverless: 'Kinesis/Lambda, Dataflow, Stream Analytics fit modest throughput and stateless transforms.',
    hardware: 'CPU, memory-heavy for stateful windows.',
    sizing: 'Partitions ≥ peak events per second ÷ per-partition throughput you measured; consumers ≤ partitions.',
    selfHostedVsManaged: 'Managed broker almost always; self-hosting Kafka is a staffing decision, not a technical one.',
  },
  {
    id: 'computer-vision',
    workload: 'Computer vision and document extraction',
    runsOn: 'GPU or accelerator-backed inference; object storage for images; a queue for asynchronous jobs',
    kubernetes: 'Helpful when you share GPUs across models; otherwise a managed GPU endpoint is simpler.',
    serverless: 'Serverless GPU is possible but cold starts are long; batch the work through a queue.',
    hardware: 'GPU for deep models; CPU with ONNX/OpenVINO for small ones. Check model memory against GPU memory first.',
    sizing: 'GPUs = ceil(peak images per second ÷ images per second per GPU at your batch size). Benchmark, do not assume.',
    selfHostedVsManaged: 'Managed OCR/vision APIs for commodity tasks; self-host where data cannot leave your boundary or unit cost dominates.',
  },
  {
    id: 'rag',
    workload: 'Retrieval-augmented generation',
    runsOn: 'Gateway; retrieval service; vector index (pgvector or a managed vector store); LLM provider or self-hosted model',
    kubernetes: 'Only if you self-host the model or need network policy around many tools. A managed provider API plus a small container service is the usual starting point.',
    serverless: 'Yes for the retrieval and orchestration layer; the model is the latency and cost driver.',
    hardware: 'None for provider-hosted models; GPU for self-hosted ones.',
    sizing: 'Cost per query = prompt tokens × input price + completion tokens × output price + retrieval cost. Track tokens, not requests.',
    selfHostedVsManaged: 'Provider API first (with a fallback provider); self-host for residency, volume or latency reasons that you have measured.',
  },
  {
    id: 'agentic',
    workload: 'Agentic workflows',
    runsOn: 'Durable workflow engine or checkpointed graph runtime; tool gateway with identity propagation; approval queue; audit log',
    kubernetes: 'Not required. What is required is durable state, idempotent tools and an approval path. Choose the runtime for those, not for the container platform.',
    serverless: 'Yes for stateless tools; long-running workflows need a durable engine (Step Functions, Temporal, Durable Functions).',
    hardware: 'None, unless the model is self-hosted.',
    sizing: 'Concurrent runs × steps per run × (model latency + tool latency). Set an execution budget (steps, tokens, wall clock) per run and alert on it.',
    selfHostedVsManaged: 'Managed workflow service if it can express your approvals; otherwise an open-source engine you can operate.',
  },
  {
    id: 'training',
    workload: 'Model training',
    runsOn: 'Ephemeral GPU/CPU jobs; object storage; experiment tracker and registry',
    kubernetes: 'Worth it only when sharing a GPU pool across teams. Single-team training is simpler on a managed training service.',
    serverless: 'Managed training jobs (SageMaker, Vertex, Azure ML) are the serverless option.',
    hardware: 'Size by memory first (parameters, optimiser state, activations), then throughput.',
    sizing: 'Training cost = GPU hours × price × (1 + re-run factor). Record the real re-run factor of your team.',
    selfHostedVsManaged: 'Managed jobs for most teams.',
  },
  {
    id: 'optimisation',
    workload: 'Optimisation and solvers',
    runsOn: 'Solver service or batch job; scenario data in a warehouse',
    kubernetes: 'Rarely needed. Solver licences and memory dominate the sizing.',
    serverless: 'Batch jobs, with the time limit checked against the worst-case solve time.',
    hardware: 'CPU, memory-heavy; some solvers use GPUs.',
    sizing: 'Worst-case solve time on your largest instance, not the average, sets the timeout and the worker count.',
    selfHostedVsManaged: 'Open-source solvers self-hosted; commercial solvers follow their licence model.',
  },
];

export const COMPLIANCE_NOTICE =
  'Selecting a deployment profile does not make an organisation compliant with any regulation or standard. These profiles are architectures that are designed to support the technical controls those frameworks ask for. Compliance is established by your own controls, evidence, independent assessment and, where the framework requires it, certification or attestation. This page is engineering guidance, not legal or compliance advice.';
