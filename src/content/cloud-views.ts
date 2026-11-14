/**
 * The same solution on four platforms. Each blueprint's diagrams are written cloud-neutral (Kafka, Redis, a lakehouse, a model server).
 * This module maps every building block to the service that fills the role on AWS, Azure, GCP and OpenStack, rewrites the blueprint's own
 * Mermaid diagrams with those services, and explains how the services connect for that use case. It is pure: no I/O, so the browser runs
 * it on the diagram text the page already carries.
 *
 * Service names are the common managed (or, on OpenStack, self-run) option for a role, not a recommendation or a price comparison. Cloud
 * catalogues change; check the vendor's current documentation before committing to one.
 */
export const CLOUD_IDS = ['aws', 'azure', 'gcp', 'openstack'] as const;
export type CloudId = (typeof CLOUD_IDS)[number];
export type ViewId = 'neutral' | CloudId;

export const CLOUDS: Record<CloudId, { label: string; blurb: string; region: string }> = {
  aws: { label: 'AWS', blurb: 'Amazon Web Services', region: 'AWS Regions, three AZs each' },
  azure: { label: 'Azure', blurb: 'Microsoft Azure', region: 'Azure regions with availability zones' },
  gcp: { label: 'GCP', blurb: 'Google Cloud', region: 'GCP regions, three zones each' },
  openstack: {
    label: 'OpenStack',
    blurb: 'Private or sovereign cloud on OpenStack',
    region: 'OpenStack regions with availability zones',
  },
};

export type CapId =
  | 'edge' | 'gateway' | 'compute' | 'modelServing' | 'llmGateway' | 'llmModel' | 'featureStore' | 'eventBus'
  | 'lakehouse' | 'dataProcessing' | 'training' | 'registry' | 'monitoring' | 'orchestrator' | 'cdc' | 'dataQuality'
  | 'warehouse' | 'servingTables' | 'ledgerDb' | 'wormStore' | 'auditLog' | 'tenantState' | 'vectorIndex' | 'reviewQueue'
  | 'agentRuntime' | 'toolGateway' | 'verifier' | 'approval' | 'batchCompute'
  | 'secrets' | 'network' | 'identity' | 'cicd';

interface Cap {
  label: string;
  svc: Record<CloudId, string>;
  /** on OpenStack: a native OpenStack service, or software you deploy and operate yourself */
  openstack: 'native' | 'self';
}

/** No double quotes, hash signs, angle brackets or ampersands: these strings go inside quoted Mermaid labels. */
export const CAPS: Record<CapId, Cap> = {
  edge: {
    label: 'Edge, CDN and WAF',
    svc: {
      aws: 'CloudFront + AWS WAF + Route 53',
      azure: 'Azure Front Door + WAF',
      gcp: 'Cloud CDN + Cloud Armor + global Application Load Balancer',
      openstack: 'Octavia + Envoy or NGINX with a WAF (ModSecurity, Coraza) + Designate DNS, external CDN',
    },
    openstack: 'self',
  },
  gateway: {
    label: 'API gateway and authentication',
    svc: {
      aws: 'Application Load Balancer or API Gateway + Cognito',
      azure: 'Application Gateway or API Management + Entra ID',
      gcp: 'Cloud Load Balancing or API Gateway or Apigee + Identity Platform',
      openstack: 'Envoy or Kong behind Octavia + Keystone or Keycloak (OIDC)',
    },
    openstack: 'self',
  },
  compute: {
    label: 'Stateless service compute',
    svc: {
      aws: 'Amazon EKS (or ECS on Fargate)',
      azure: 'Azure Kubernetes Service (or Container Apps)',
      gcp: 'Google Kubernetes Engine (or Cloud Run)',
      openstack: 'Kubernetes on Magnum (or Nova VMs)',
    },
    openstack: 'native',
  },
  modelServing: {
    label: 'Model serving',
    svc: {
      aws: 'SageMaker real-time endpoint, or Triton or KServe on EKS',
      azure: 'Azure ML online endpoint, or Triton or KServe on AKS',
      gcp: 'Vertex AI endpoint, or Triton or KServe on GKE',
      openstack: 'KServe or Triton on Magnum, GPU flavours through Nova',
    },
    openstack: 'self',
  },
  llmGateway: {
    label: 'LLM gateway',
    svc: {
      aws: 'LiteLLM-style gateway on EKS in front of Amazon Bedrock',
      azure: 'API Management AI gateway in front of Azure OpenAI',
      gcp: 'Gateway on Cloud Run or GKE in front of Vertex AI',
      openstack: 'LiteLLM-style gateway on Magnum in front of vLLM or an external provider',
    },
    openstack: 'self',
  },
  llmModel: {
    label: 'LLM',
    svc: {
      aws: 'Amazon Bedrock models (or vLLM on EKS GPU nodes)',
      azure: 'Azure OpenAI models (or vLLM on AKS GPU nodes)',
      gcp: 'Vertex AI models (or vLLM on GKE GPU nodes)',
      openstack: 'vLLM on GPU nodes, no managed model API',
    },
    openstack: 'self',
  },
  featureStore: {
    label: 'Online feature store and cache',
    svc: {
      aws: 'ElastiCache for Redis (or Valkey) + SageMaker Feature Store online',
      azure: 'Azure Managed Redis',
      gcp: 'Memorystore for Redis + Vertex AI Feature Store',
      openstack: 'Redis via an operator on Magnum + Feast definitions',
    },
    openstack: 'self',
  },
  eventBus: {
    label: 'Event bus and streaming',
    svc: {
      aws: 'Amazon MSK (Kafka), or Kinesis Data Streams',
      azure: 'Event Hubs with the Kafka endpoint',
      gcp: 'Pub/Sub, or Managed Service for Apache Kafka',
      openstack: 'Kafka via Strimzi on Magnum (or RabbitMQ)',
    },
    openstack: 'self',
  },
  lakehouse: {
    label: 'Lakehouse and object storage',
    svc: {
      aws: 'S3 + Glue Data Catalog + Iceberg, queried by Athena or EMR',
      azure: 'ADLS Gen2 + Delta or Iceberg, queried by Fabric, Synapse or Databricks',
      gcp: 'Cloud Storage + BigQuery and BigLake (Iceberg)',
      openstack: 'Ceph RGW or Swift + Iceberg, queried by Trino or Spark',
    },
    openstack: 'native',
  },
  dataProcessing: {
    label: 'Batch and stream processing',
    svc: {
      aws: 'EMR or AWS Glue, Managed Service for Apache Flink for streams',
      azure: 'Databricks or Fabric Spark, Stream Analytics for streams',
      gcp: 'Dataproc or Dataflow',
      openstack: 'Spark or Flink on Magnum',
    },
    openstack: 'self',
  },
  training: {
    label: 'Training and evaluation',
    svc: {
      aws: 'SageMaker Training (or EMR or EKS jobs)',
      azure: 'Azure Machine Learning compute clusters',
      gcp: 'Vertex AI Training',
      openstack: 'Ray or Spark jobs on Magnum with GPU flavours',
    },
    openstack: 'self',
  },
  registry: {
    label: 'Model registry and image registry',
    svc: {
      aws: 'SageMaker Model Registry + Amazon ECR',
      azure: 'Azure ML registries + Azure Container Registry',
      gcp: 'Vertex AI Model Registry + Artifact Registry',
      openstack: 'MLflow registry + Harbor',
    },
    openstack: 'self',
  },
  monitoring: {
    label: 'Monitoring, tracing and alerting',
    svc: {
      aws: 'CloudWatch + Managed Prometheus and Grafana + X-Ray',
      azure: 'Azure Monitor + Managed Prometheus and Grafana + Application Insights',
      gcp: 'Cloud Monitoring + Managed Service for Prometheus + Cloud Trace',
      openstack: 'Prometheus + Grafana + Loki + Tempo, Ceilometer for infrastructure metering',
    },
    openstack: 'self',
  },
  orchestrator: {
    label: 'Pipeline orchestration',
    svc: {
      aws: 'Amazon MWAA (Airflow) or Step Functions',
      azure: 'Data Factory or Fabric pipelines',
      gcp: 'Cloud Composer or Workflows',
      openstack: 'Airflow or Dagster on Magnum',
    },
    openstack: 'self',
  },
  cdc: {
    label: 'Change data capture and ingestion',
    svc: {
      aws: 'AWS DMS or Debezium on MSK Connect',
      azure: 'Data Factory change data capture or Debezium',
      gcp: 'Datastream',
      openstack: 'Debezium on Kafka Connect',
    },
    openstack: 'self',
  },
  dataQuality: {
    label: 'Data-quality gate',
    svc: {
      aws: 'AWS Glue Data Quality',
      azure: 'Microsoft Purview + Great Expectations',
      gcp: 'Dataplex data quality',
      openstack: 'Great Expectations or Soda inside the pipeline',
    },
    openstack: 'self',
  },
  warehouse: {
    label: 'Analytical warehouse',
    svc: {
      aws: 'Amazon Redshift or Athena tables',
      azure: 'Fabric or Synapse warehouse',
      gcp: 'BigQuery',
      openstack: 'Trino or ClickHouse on Magnum',
    },
    openstack: 'self',
  },
  servingTables: {
    label: 'Serving tables',
    svc: {
      aws: 'DynamoDB or Aurora + sync to Redis',
      azure: 'Cosmos DB or Azure SQL + sync to Redis',
      gcp: 'Bigtable or AlloyDB + sync to Redis',
      openstack: 'PostgreSQL on Trove + sync to Redis',
    },
    openstack: 'native',
  },
  ledgerDb: {
    label: 'Transactional state and ledger',
    svc: {
      aws: 'Aurora PostgreSQL Multi-AZ',
      azure: 'PostgreSQL Flexible Server, zone redundant',
      gcp: 'AlloyDB or Spanner',
      openstack: 'PostgreSQL on Trove, replicated (or Patroni)',
    },
    openstack: 'native',
  },
  wormStore: {
    label: 'Immutable decision ledger',
    svc: {
      aws: 'S3 Object Lock (compliance mode)',
      azure: 'Immutable Blob Storage (WORM)',
      gcp: 'Cloud Storage Bucket Lock',
      openstack: 'Ceph RGW with S3 Object Lock',
    },
    openstack: 'native',
  },
  auditLog: {
    label: 'Audit log',
    svc: {
      aws: 'CloudTrail + S3 Object Lock',
      azure: 'Azure Monitor logs + immutable storage',
      gcp: 'Cloud Audit Logs + Bucket Lock',
      openstack: 'Loki or OpenSearch + Ceph RGW Object Lock',
    },
    openstack: 'self',
  },
  tenantState: {
    label: 'Per-tenant state and keys',
    svc: {
      aws: 'Aurora row-level security + KMS key per tenant',
      azure: 'PostgreSQL row-level security + Key Vault key per tenant',
      gcp: 'AlloyDB row-level security + Cloud KMS key per tenant',
      openstack: 'PostgreSQL row-level security + Barbican key per tenant',
    },
    openstack: 'native',
  },
  vectorIndex: {
    label: 'Vector and hybrid search index',
    svc: {
      aws: 'OpenSearch Service k-NN or Aurora pgvector',
      azure: 'Azure AI Search or PostgreSQL pgvector',
      gcp: 'Vertex AI Vector Search or AlloyDB pgvector',
      openstack: 'pgvector on Trove, or OpenSearch or Milvus on Magnum',
    },
    openstack: 'self',
  },
  reviewQueue: {
    label: 'Human review queue',
    svc: {
      aws: 'SQS + review app on EKS',
      azure: 'Service Bus + review app on AKS',
      gcp: 'Pub/Sub or Cloud Tasks + review app on GKE',
      openstack: 'RabbitMQ or Zaqar + review app on Magnum',
    },
    openstack: 'self',
  },
  agentRuntime: {
    label: 'Agent runtime and durable workflow',
    svc: {
      aws: 'Bedrock AgentCore, or Step Functions + Lambda or EKS',
      azure: 'Azure AI Foundry Agent Service, or Durable Functions',
      gcp: 'Vertex AI Agent Engine, or Cloud Run + Workflows',
      openstack: 'LangGraph or Temporal on Magnum',
    },
    openstack: 'self',
  },
  toolGateway: {
    label: 'Tool and MCP gateway',
    svc: {
      aws: 'API Gateway or ALB in front of tool services on EKS',
      azure: 'API Management in front of tool services on AKS',
      gcp: 'API Gateway or Apigee in front of tool services on GKE',
      openstack: 'Envoy or Kong in front of tool services on Magnum',
    },
    openstack: 'self',
  },
  verifier: {
    label: 'Verifier (claims checked against evidence)',
    svc: {
      aws: 'Judge model on Bedrock + rule checks',
      azure: 'Judge model on Azure OpenAI + rule checks',
      gcp: 'Judge model on Vertex AI + rule checks',
      openstack: 'Judge model on vLLM + rule checks',
    },
    openstack: 'self',
  },
  approval: {
    label: 'Human approval gate',
    svc: {
      aws: 'Step Functions callback task + SNS + review UI',
      azure: 'Durable Functions human interaction or Logic Apps approval',
      gcp: 'Workflows callback + Pub/Sub + review UI',
      openstack: 'Temporal signals + review UI',
    },
    openstack: 'self',
  },
  batchCompute: {
    label: 'Batch and solver compute',
    svc: {
      aws: 'AWS Batch on Spot',
      azure: 'Azure Batch on Spot',
      gcp: 'Cloud Batch on Spot VMs',
      openstack: 'Kubernetes jobs on Magnum, or Slurm',
    },
    openstack: 'self',
  },
  secrets: {
    label: 'Keys and secrets',
    svc: {
      aws: 'KMS + Secrets Manager',
      azure: 'Key Vault (Managed HSM)',
      gcp: 'Cloud KMS + Secret Manager',
      openstack: 'Barbican (plus Vault if you need dynamic secrets)',
    },
    openstack: 'native',
  },
  network: {
    label: 'Private networking',
    svc: {
      aws: 'VPC, three AZs, PrivateLink, security groups',
      azure: 'VNet, availability zones, Private Link, NSGs',
      gcp: 'VPC, three zones, Private Service Connect, firewall policies',
      openstack: 'Neutron networks and security groups + Octavia + Calico or Cilium network policy',
    },
    openstack: 'native',
  },
  identity: {
    label: 'Workload identity',
    svc: {
      aws: 'IAM roles for workloads (EKS Pod Identity)',
      azure: 'Managed identities with Workload Identity',
      gcp: 'Workload Identity Federation for GKE',
      openstack: 'Keystone application credentials, SPIFFE or Vault for workloads',
    },
    openstack: 'native',
  },
  cicd: {
    label: 'CI/CD and infrastructure as code',
    svc: {
      aws: 'CodePipeline or GitHub Actions + Argo CD, Terraform',
      azure: 'Azure DevOps or GitHub Actions + Argo CD, Terraform',
      gcp: 'Cloud Build and Cloud Deploy + Argo CD, Terraform',
      openstack: 'GitLab CI or Zuul + Argo CD, Heat or Terraform',
    },
    openstack: 'self',
  },
};

/** Capabilities every deployment needs whether or not a node in the diagram names them. */
export const ALWAYS: CapId[] = ['network', 'identity', 'secrets', 'cicd'];

/* ---------------------------------------------------------------------------------------- classify a diagram node */

const BY_ID: Record<string, CapId> = {
  EDGE: 'edge', GW: 'gateway', FS: 'featureStore', BUS: 'eventBus', LAKE: 'lakehouse', TRN: 'training', REG: 'registry',
  MON: 'monitoring', LEDGER: 'ledgerDb', WORM: 'wormStore', TCELL: 'tenantState', LLMGW: 'llmGateway', CDC: 'cdc',
  DQ: 'dataQuality', PUB: 'warehouse', SERVE: 'servingTables', PIPE: 'dataProcessing', LED: 'wormStore', ORC: 'agentRuntime', ORCH: 'orchestrator',
  VER: 'verifier', APP: 'approval', LOG: 'auditLog', Q: 'reviewQueue', CHK: 'dataQuality',
};
/** Nodes that are people, systems of the customer or pure text, never a cloud service. */
const SKIP_IDS = new Set(['U', 'UP', 'DN', 'SOR', 'SRC', 'APPS', 'EXT', 'AI', 'MLP', 'TRG', 'ACT', 'ESC', 'IN', 'OUT', 'C', 'R', 'SP', 'DP', 'STP', 'TEN', 'DEC', 'END']);

const RULES: [RegExp, CapId][] = [
  [/\b(lookup|online feature|feature store|cache|cached|redis|key-value|session state|working memory)\b/, 'featureStore'],
  [/\b(retriev\w*|vector (search|index|store|db)|hybrid search|rerank\w*|re-rank\w*|corpus|knowledge base|search index)\b/, 'vectorIndex'],
  [/\b(llm|generat|prompt|summar|copilot|chat|citation)\w*/, 'llmModel'],
  [/\b(trainer|training|fine-tun\w*|retrain\w*)\b/, 'training'],
  [/\b(dashboard|bi|reports?|metrics|monitor\w*|observab\w*)\b/, 'monitoring'],
  [/\b(batch|reconcil\w*|nightly)\b/, 'batchCompute'],
  [/\b(spark|flink|stream|etl|feature builder|pipeline|transform|ingest)\w*/, 'dataProcessing'],
  [/\b(model|scor|classif|rank|predict|detect|forecast|embedding|recogni|segment|vision|ocr|transformer|gnn|boost|inference|regress|ensemble|nlp|speech|asr|tts|graph)\w*/, 'modelServing'],
  [/\b(queue|review|case|human|analyst|ticket|triage|approver)\w*/, 'reviewQueue'],
  [/\b(ledger|audit)\w*/, 'auditLog'],
  [/\b(label|feedback|outcome|archive|lakehouse|warehouse)\w*/, 'lakehouse'],
  [/\b(solver|optimi|milp|schedul|route|constraint)\w*/, 'batchCompute'],
  [/\b(gateway|auth|api)\b/, 'gateway'],
];

export function capForNode(id: string, label: string): CapId | null {
  if (SKIP_IDS.has(id)) return null;
  if (/^T\d+$/.test(id)) return 'toolGateway';
  const byId = BY_ID[id];
  if (byId) return byId;
  const l = label.replace(/<br\/>/g, ' ').toLowerCase();
  // a person or an upstream/downstream system of the customer is not part of the cloud design
  if (/\b(customer|user|client|upstream|downstream|consumer|source system|storefront|enterprise landscape)\b/.test(l) && !/\b(model|gateway|queue)\b/.test(l)) return null;
  // systems that belong to a partner or the customer, not to the cloud design
  if (/\b(ssp|dsp|exchange|ad server|marketing ui|studio|portal|crm|erp|ehr|wms|lms|siem|ad platform)\b/.test(l)) return null;
  // log and event stores: a Kafka-backed one is the event bus, any other is the lake
  if (/\b(logs?|logging|events?|analytics)\b/.test(l) && !/\b(model|scor|queue)\b/.test(l)) return /\bkafka|stream\b/.test(l) ? 'eventBus' : 'lakehouse';
  for (const [re, cap] of RULES) if (re.test(l)) return cap;
  return /^(S|C|A)\d+$/.test(id) ? 'compute' : null;
}

/* ------------------------------------------------------------------------------------------- rewrite a diagram */

const NODE = /\b([A-Za-z][A-Za-z0-9]*)(\[\(|\(\[|\[\[|\[|\{\{|\{|\()"([^"]*)"/g;
const BULLET = '▸';

/** Appends the service for each node's capability to the node's own label. Structure, ids and edges are untouched. */
export function relabelFlowchart(src: string, cloud: CloudId): { code: string; caps: CapId[] } {
  const caps: CapId[] = [];
  const seen = new Set<string>();
  const code = src.replace(NODE, (m, id: string, open: string, label: string) => {
    if (id === 'subgraph' || /^(R|SP)$/.test(id)) {
      // plane titles get the platform's own words for "region"
      return id === 'R' ? `${id}${open}"${label} · ${CLOUDS[cloud].region}"` : m;
    }
    const cap = capForNode(id, label);
    if (!cap) return m;
    if (!seen.has(cap)) {
      seen.add(cap);
      caps.push(cap);
    }
    return `${id}${open}"${label}<br/>${BULLET} ${CAPS[cap].svc[cloud]}"`;
  });
  return { code, caps };
}

const PARTICIPANT = /^(\s*(?:participant|actor)\s+)([A-Za-z][A-Za-z0-9]*)(\s+as\s+)(.+)$/gm;

/** Same for a sequence diagram: each participant's alias gains the service name on a second line. */
export function relabelSequence(src: string, cloud: CloudId): { code: string; caps: CapId[] } {
  const caps: CapId[] = [];
  const seen = new Set<string>();
  const code = src.replace(PARTICIPANT, (m, a: string, id: string, as: string, alias: string) => {
    const cap = capForNode(id === 'P' ? 'ORC' : id === 'V' ? 'VER' : id === 'H' ? 'APP' : id === 'L' ? 'LOG' : id === 'S' ? 'S1' : id === 'T' ? 'T1' : id, alias);
    if (!cap || id === 'C' || id === 'U') return m;
    if (!seen.has(cap)) {
      seen.add(cap);
      caps.push(cap);
    }
    return `${a}${id}${as}${alias.trim()}<br/>${BULLET} ${CAPS[cap].svc[cloud]}`;
  });
  return { code, caps };
}

/* ----------------------------------------------------------------------------------------- how services connect */

type Wire = { caps: CapId[]; text: Record<CloudId, string> };

/** Connections in the order a request and its data travel. A line appears only when every capability it joins is in the diagram. */
const WIRING: Wire[] = [
  {
    caps: ['edge', 'gateway'],
    text: {
      aws: 'Route 53 sends traffic to CloudFront with AWS WAF attached. CloudFront reaches an internal load balancer or API Gateway through a VPC origin, so the application subnets never get a public address.',
      azure: 'Front Door with WAF terminates TLS and reaches Application Gateway or API Management through Private Link, so the application network has no public front door.',
      gcp: 'Cloud DNS points at the global Application Load Balancer, where Cloud Armor and Cloud CDN are attached. Backends are reached on private addresses, with serverless NEGs or GKE NEGs as targets.',
      openstack: 'Designate DNS points at your edge VIPs. Octavia terminates TLS and hands traffic to Envoy or NGINX running a WAF. There is no managed CDN: put one in front, or accept that static assets are served from your own edge.',
    },
  },
  {
    caps: ['gateway', 'compute'],
    text: {
      aws: 'The load balancer targets pods on EKS by IP through the AWS Load Balancer Controller. Pods sit in private subnets spread over three AZs behind security groups for pods.',
      azure: 'Application Gateway for Containers or the AKS ingress sends requests to pods on Azure CNI. Nodes are spread over availability zones in a private subnet.',
      gcp: 'The load balancer uses container-native NEGs to send traffic straight to pods on a VPC-native, private GKE cluster, with nodes in three zones.',
      openstack: 'Octavia fronts an ingress controller on a Magnum cluster, with worker nodes pinned to different availability zones by Nova server groups (anti-affinity).',
    },
  },
  {
    caps: ['compute', 'identity'],
    text: {
      aws: 'Workloads assume IAM roles through EKS Pod Identity, so no access keys exist. Secrets Manager and KMS are reached through the Secrets Store CSI driver.',
      azure: 'Workloads use managed identities through Workload Identity federation; Key Vault is mounted with the Secrets Store CSI driver. No client secret is stored.',
      gcp: 'Workload Identity Federation for GKE maps Kubernetes service accounts to Google service accounts. Secret Manager is reached through the CSI driver.',
      openstack: 'Pods get short-lived credentials from SPIFFE or Vault, and call OpenStack APIs with Keystone application credentials scoped to one project. Barbican holds keys; External Secrets syncs them into the cluster.',
    },
  },
  {
    caps: ['compute', 'featureStore'],
    text: {
      aws: 'Serving pods read ElastiCache over the VPC with TLS and AUTH. A Multi-AZ replication group keeps reads inside the AZ where possible.',
      azure: 'Pods reach Azure Managed Redis through a private endpoint in the VNet; zone redundancy keeps a replica in another zone.',
      gcp: 'Pods reach Memorystore over private services access in the same VPC; the Standard tier gives a replica in another zone.',
      openstack: 'You run Redis with an operator on the same Magnum cluster or on dedicated Nova VMs with Cinder volumes. Replication and failover are yours to configure and test.',
    },
  },
  {
    caps: ['compute', 'modelServing'],
    text: {
      aws: 'The model runs either in the cluster (Triton or KServe on GPU or CPU nodes) or on a SageMaker endpoint that pods call over a PrivateLink interface endpoint.',
      azure: 'The model runs in the cluster, or on an Azure ML online endpoint that pods call over a private endpoint with managed identity.',
      gcp: 'The model runs in the cluster, or on a Vertex AI endpoint that pods reach through Private Service Connect.',
      openstack: 'The model runs on KServe or Triton inside the Magnum cluster. GPU nodes come from Nova flavours with PCI passthrough or vGPU, and there is no managed endpoint to fall back on.',
    },
  },
  {
    caps: ['compute', 'llmGateway', 'llmModel'],
    text: {
      aws: 'The gateway applies quotas, caching and routing, then calls Amazon Bedrock through a PrivateLink endpoint. A second provider is reached only through an egress allow-list on the NAT path.',
      azure: 'API Management applies token quotas and routing, then calls Azure OpenAI through a private endpoint. A second provider goes out through Azure Firewall with an FQDN allow-list.',
      gcp: 'The gateway applies quotas and routing, then calls Vertex AI through Private Service Connect. A second provider goes out through Cloud NAT with a firewall allow-list.',
      openstack: 'The gateway routes to vLLM running on your GPU nodes. If you also use an external provider, it leaves through a controlled egress proxy; plan GPU capacity yourself because it cannot burst.',
    },
  },
  {
    caps: ['compute', 'vectorIndex'],
    text: {
      aws: 'Retrieval pods query OpenSearch or Aurora pgvector inside the VPC. Index builds run as jobs and swap an alias, so serving never reads a half-built index.',
      azure: 'Retrieval pods query Azure AI Search or PostgreSQL over private endpoints. Index builds go to a new index and an alias swap, so serving never reads a half-built one.',
      gcp: 'Retrieval pods query Vertex AI Vector Search or AlloyDB over Private Service Connect. New index versions are deployed to the endpoint and traffic is moved after checks.',
      openstack: 'Retrieval pods query pgvector on Trove, or OpenSearch or Milvus that you run on Magnum. Index builds are your jobs; the alias swap is yours to implement.',
    },
  },
  {
    caps: ['compute', 'eventBus'],
    text: {
      aws: 'Services publish decisions and outcomes to MSK with IAM authentication, keyed by entity. An MSK Connect S3 sink or Firehose lands the same stream in the lake.',
      azure: 'Services publish to Event Hubs over the Kafka endpoint with managed identity. Event Hubs Capture or a Fabric eventstream lands the stream in the lake.',
      gcp: 'Services publish to Pub/Sub with ordering keys per entity. A BigQuery or Cloud Storage subscription lands the stream in the lake without a consumer to run.',
      openstack: 'Services publish to Kafka run by Strimzi, with brokers on Cinder or Ceph RBD volumes spread over availability zones. A Kafka Connect sink writes to Ceph RGW or Swift.',
    },
  },
  {
    caps: ['eventBus', 'lakehouse'],
    text: {
      aws: 'Iceberg tables on S3 are registered in the Glue Data Catalog. Athena and EMR read them over an S3 gateway endpoint, so the data never crosses the internet.',
      azure: 'Delta or Iceberg tables sit on ADLS Gen2. Fabric, Synapse or Databricks read them over private endpoints with Entra ID access control.',
      gcp: 'Iceberg tables on Cloud Storage are exposed through BigLake. BigQuery and Dataproc read them over Private Google Access.',
      openstack: 'Iceberg tables live on Ceph RGW or Swift, with the catalog in PostgreSQL. Trino and Spark on Magnum read them over the storage network.',
    },
  },
  {
    caps: ['lakehouse', 'training'],
    text: {
      aws: 'Training jobs read the lake over an S3 endpoint, write artifacts back, and log runs to the registry. Spot capacity cuts the bill; checkpoints make interruption safe.',
      azure: 'Azure ML compute reads ADLS through a private endpoint, writes artifacts and registers the model. Low-priority or spot nodes need checkpoints.',
      gcp: 'Vertex AI Training reads Cloud Storage or BigQuery over Private Google Access and registers the model. Spot VMs need checkpoints.',
      openstack: 'Ray or Spark jobs on Magnum read Ceph or Swift. GPU flavours are scarce on a private cloud, so queue jobs and set quotas per project.',
    },
  },
  {
    caps: ['training', 'registry'],
    text: {
      aws: 'The pipeline registers a model package with an approval status in SageMaker Model Registry and pushes the serving image to ECR. Approval is an event that starts the release pipeline.',
      azure: 'The pipeline registers the model in Azure ML and pushes the image to ACR. A pipeline approval promotes it between workspaces.',
      gcp: 'The pipeline registers the model in the Vertex AI Model Registry and pushes the image to Artifact Registry. A Cloud Deploy promotion moves it forward.',
      openstack: 'The pipeline logs to MLflow, stores artifacts on Ceph RGW and pushes the image to Harbor. Image signing and promotion gates are your CI configuration.',
    },
  },
  {
    caps: ['registry', 'compute'],
    text: {
      aws: 'Argo CD (or CodePipeline) deploys the approved, signed image to EKS as a canary and widens only when the guardrail metrics hold.',
      azure: 'Argo CD or an Azure DevOps release deploys the approved image to AKS as a canary; Azure Policy blocks images that are not signed.',
      gcp: 'Cloud Deploy or Argo CD rolls the approved image out to GKE as a canary; Binary Authorization blocks images that are not signed.',
      openstack: 'Argo CD deploys the approved image to Magnum as a canary; an admission policy (Kyverno or OPA Gatekeeper) blocks unsigned images.',
    },
  },
  {
    caps: ['cdc', 'orchestrator'],
    text: {
      aws: 'DMS or Debezium reads the source database log and writes to the raw zone on S3. MWAA schedules the pipeline and can re-run any partition.',
      azure: 'Data Factory change data capture or Debezium reads the source log and writes to the raw zone on ADLS. Data Factory triggers re-run any partition.',
      gcp: 'Datastream reads the source log and writes to Cloud Storage or BigQuery. Cloud Composer schedules the pipeline and can re-run any partition.',
      openstack: 'Debezium on Kafka Connect reads the source log into Kafka and onward to Ceph RGW. Airflow schedules the pipeline and can re-run any partition.',
    },
  },
  {
    caps: ['orchestrator', 'dataQuality'],
    text: {
      aws: 'A Glue Data Quality ruleset runs as a pipeline step. A failing partition stops the publish and raises an alarm instead of loading bad data.',
      azure: 'Great Expectations (with Purview lineage) runs as a pipeline step. A failing partition stops the publish.',
      gcp: 'Dataplex data-quality scans run as a pipeline step. A failing partition stops the publish.',
      openstack: 'Great Expectations or Soda run as an Airflow task. A failing partition stops the publish.',
    },
  },
  {
    caps: ['dataQuality', 'warehouse'],
    text: {
      aws: 'Only validated partitions are written, by overwrite, to Redshift or Athena tables, so a re-run is idempotent.',
      azure: 'Only validated partitions are written, by overwrite, to the warehouse, so a re-run is idempotent.',
      gcp: 'Only validated partitions are written, by partition overwrite, to BigQuery, so a re-run is idempotent.',
      openstack: 'Only validated partitions are written, by overwrite, to Trino or ClickHouse tables, so a re-run is idempotent.',
    },
  },
  {
    caps: ['warehouse', 'servingTables'],
    text: {
      aws: 'A sync job copies the latest features from the warehouse to DynamoDB or Redis for low-latency reads.',
      azure: 'A sync job copies the latest features from the warehouse to Cosmos DB or Redis for low-latency reads.',
      gcp: 'A sync job copies the latest features from BigQuery to Bigtable or Redis for low-latency reads.',
      openstack: 'A sync job copies the latest features from the warehouse to PostgreSQL on Trove or Redis for low-latency reads.',
    },
  },
  {
    caps: ['ledgerDb', 'wormStore'],
    text: {
      aws: 'Each decision is written to Aurora in the same transaction as the counters it changes, and appended to S3 with Object Lock. A hash chain makes tampering detectable.',
      azure: 'Each decision is written to PostgreSQL in the same transaction as its counters, and appended to immutable blob storage. A hash chain makes tampering detectable.',
      gcp: 'Each decision is written to AlloyDB or Spanner in the same transaction as its counters, and appended to a bucket with a retention lock. A hash chain makes tampering detectable.',
      openstack: 'Each decision is written to PostgreSQL in the same transaction as its counters, and appended to a Ceph RGW bucket with Object Lock. A hash chain makes tampering detectable.',
    },
  },
  {
    caps: ['tenantState', 'secrets'],
    text: {
      aws: 'Each tenant has its own KMS key, and row-level security keeps tenants apart. Deleting a tenant\'s key makes its data unreadable.',
      azure: 'Each tenant has its own Key Vault key, and row-level security keeps tenants apart. Disabling a tenant\'s key makes its data unreadable.',
      gcp: 'Each tenant has its own Cloud KMS key, and row-level security keeps tenants apart. Destroying a tenant\'s key version makes its data unreadable.',
      openstack: 'Each tenant has its own Barbican key, and row-level security keeps tenants apart. Deleting a tenant\'s key makes its data unreadable.',
    },
  },
  {
    caps: ['reviewQueue', 'compute'],
    text: {
      aws: 'Cases above the threshold go to an SQS queue with a dead-letter queue; the review application on EKS reads them and writes decisions back as labels.',
      azure: 'Cases above the threshold go to Service Bus with a dead-letter queue; the review application on AKS reads them and writes decisions back as labels.',
      gcp: 'Cases above the threshold go to Pub/Sub with a dead-letter topic; the review application on GKE reads them and writes decisions back as labels.',
      openstack: 'Cases above the threshold go to RabbitMQ with a dead-letter exchange; the review application on Magnum reads them and writes decisions back as labels.',
    },
  },
  {
    caps: ['agentRuntime', 'toolGateway'],
    text: {
      aws: 'The agent runtime calls tools only through the gateway, which forwards the end user\'s identity (token exchange) so a tool can never do more than that user may.',
      azure: 'The agent runtime calls tools only through API Management, which forwards the end user\'s identity (on-behalf-of flow) so a tool can never do more than that user may.',
      gcp: 'The agent runtime calls tools only through the gateway, which forwards the end user\'s identity (token exchange) so a tool can never do more than that user may.',
      openstack: 'The agent runtime calls tools only through Envoy or Kong, which forwards the end user\'s identity (token exchange with Keycloak) so a tool can never do more than that user may.',
    },
  },
  {
    caps: ['agentRuntime', 'approval'],
    text: {
      aws: 'The workflow pauses at a callback task until a person approves or rejects in the review UI. State is checkpointed, so a restart resumes at the same step.',
      azure: 'The orchestration waits for an external event until a person approves or rejects in the review UI. State is checkpointed, so a restart resumes at the same step.',
      gcp: 'The workflow waits on a callback until a person approves or rejects in the review UI. State is checkpointed, so a restart resumes at the same step.',
      openstack: 'The workflow waits for a signal until a person approves or rejects in the review UI. Temporal persists state, so a restart resumes at the same step.',
    },
  },
  {
    caps: ['monitoring'],
    text: {
      aws: 'An OpenTelemetry collector sends traces to X-Ray and metrics to Managed Prometheus; Grafana shows quality, drift, latency, cost and tokens. Alarms go to SNS and your pager.',
      azure: 'An OpenTelemetry collector sends traces to Application Insights and metrics to Managed Prometheus; Grafana shows quality, drift, latency, cost and tokens. Alerts go to action groups and your pager.',
      gcp: 'An OpenTelemetry collector sends traces to Cloud Trace and metrics to Managed Service for Prometheus; dashboards show quality, drift, latency, cost and tokens. Alerts go to notification channels and your pager.',
      openstack: 'An OpenTelemetry collector sends traces to Tempo, metrics to Prometheus and logs to Loki; Grafana shows quality, drift, latency, cost and tokens. Alertmanager pages the on-call. You also own the health of the OpenStack control plane.',
    },
  },
  {
    caps: ['network', 'secrets'],
    text: {
      aws: 'Everything reaches AWS services through VPC endpoints, and every store is encrypted with a customer-managed KMS key. Egress is closed except for an allow-list.',
      azure: 'Everything reaches Azure services through private endpoints, and every store is encrypted with a Key Vault key. Egress is closed except through Azure Firewall rules.',
      gcp: 'Everything reaches Google services through Private Service Connect or Private Google Access, and every store uses a Cloud KMS key (CMEK). Egress is closed except through firewall rules and Cloud NAT.',
      openstack: 'Everything stays on Neutron private networks with security groups, volumes and objects are encrypted with Barbican keys, and egress goes through a controlled proxy.',
    },
  },
];

/* ---------------------------------------------------------------------------------------------- design notes */

export interface ViewInput {
  hld: string;
  sequence: string;
  c4Container: string;
  agentArchitecture: string | null;
  agentSequence: string | null;
  mode: 'online' | 'interactive' | 'batch';
  stance: 'stateless-active-active' | 'residency-pinned' | 'tenant-isolated';
  pattern: string;
  latencySLA: 'sub-10ms' | 'sub-100ms' | 'seconds' | 'batch';
}

const GPU: Record<CloudId, string> = {
  aws: 'GPU instance families (G and P series)',
  azure: 'NC and ND series VMs',
  gcp: 'G2 and A2/A3 accelerator machines',
  openstack: 'GPU flavours (PCI passthrough or vGPU, with Cyborg if you manage accelerators)',
};

/** What changes in the design, and what the platform makes you do, for this blueprint on this platform. */
export function designNotes(i: ViewInput, cloud: CloudId, caps: CapId[]): string[] {
  const n: string[] = [];
  const has = (c: CapId) => caps.includes(c);
  const tight = i.latencySLA === 'sub-10ms' && i.mode !== 'batch';
  if (tight)
    n.push(
      {
        aws: 'This is a sub-10 ms path. Keep API Gateway off the hot path (use an NLB or ALB and an in-cluster Envoy), keep the feature cache and the model in the same AZ as the caller, and measure from inside the VPC.',
        azure: 'This is a sub-10 ms path. Keep API Management off the hot path (use Application Gateway and an in-cluster Envoy), pin the cache and the model to the caller\'s zone, and measure from inside the VNet.',
        gcp: 'This is a sub-10 ms path. Keep Apigee off the hot path (use the load balancer and an in-cluster Envoy), keep the cache and the model in the caller\'s zone, and measure from inside the VPC.',
        openstack: 'This is a sub-10 ms path. An Octavia amphora adds a network hop; prefer OVN-based load balancing or in-cluster Envoy, keep the cache and model on the same compute host group, and measure from inside the project network.',
      }[cloud],
    );
  if (has('modelServing') && /^(cv|nlp|graph|llm-rag|llm-agent)$/.test(i.pattern))
    n.push(`This model family usually needs accelerators: ${GPU[cloud]}. Check quota and regional availability before you design around a specific instance type.`);
  if (has('llmModel') || has('llmGateway'))
    n.push(
      {
        aws: 'Model availability and quotas differ by Region, so pick the Region from the model you need, and request quota early.',
        azure: 'Model availability, quotas and data-zone options differ by region and deployment type, so pick the region from the model you need, and request quota early.',
        gcp: 'Model availability and quotas differ by region, so pick the region from the model you need, and request quota early.',
        openstack: 'There is no managed model API. Capacity planning for GPUs, the serving stack (vLLM), model licences and upgrades are yours; budget for that team time.',
      }[cloud],
    );
  if (i.stance === 'residency-pinned')
    n.push(
      {
        aws: 'State is pinned to the data subject\'s jurisdiction: choose the Region by jurisdiction and block other Regions with a Service Control Policy.',
        azure: 'State is pinned to the data subject\'s jurisdiction: choose the region by jurisdiction and block other regions with Azure Policy (allowed locations).',
        gcp: 'State is pinned to the data subject\'s jurisdiction: choose the region by jurisdiction and block others with an organisation policy on resource locations.',
        openstack: 'State is pinned to the data subject\'s jurisdiction: this is where OpenStack is strongest, because you choose the data centre. Run one region per jurisdiction and do not federate storage across them.',
      }[cloud],
    );
  if (i.stance === 'tenant-isolated')
    n.push(
      {
        aws: 'Tenants are isolated by key and row: use one KMS key per tenant, and consider separate accounts for the largest tenants.',
        azure: 'Tenants are isolated by key and row: use one Key Vault key per tenant, and consider separate subscriptions for the largest tenants.',
        gcp: 'Tenants are isolated by key and row: use one Cloud KMS key per tenant, and consider separate projects for the largest tenants.',
        openstack: 'Tenants are isolated by key and row: use one Barbican key per tenant, and consider a separate OpenStack project (with its own quotas and network) for the largest tenants.',
      }[cloud],
    );
  if (i.mode !== 'batch' && i.stance === 'stateless-active-active')
    n.push(
      {
        aws: 'Run the serving plane in more than one Region behind Route 53 latency or failover routing; replicate the lake with S3 replication and the database with Aurora Global Database.',
        azure: 'Run the serving plane in more than one region behind Front Door; replicate storage with geo-redundant options and the database with geo-replicas.',
        gcp: 'Run the serving plane in more than one region behind the global load balancer; replicate storage with dual-region buckets and use a multi-region database such as Spanner where it fits.',
        openstack: 'Multi-region needs two OpenStack regions with their own control planes, a global traffic manager (DNS or BGP anycast) and your own replication for Ceph (RGW multisite) and the database.',
      }[cloud],
    );
  if (i.mode === 'batch')
    n.push(
      {
        aws: 'This is a batch design: size by the time window, use Spot for the compute, checkpoint, and let the orchestrator re-run any partition.',
        azure: 'This is a batch design: size by the time window, use Spot for the compute, checkpoint, and let the orchestrator re-run any partition.',
        gcp: 'This is a batch design: size by the time window, use Spot VMs for the compute, checkpoint, and let the orchestrator re-run any partition.',
        openstack: 'This is a batch design: size by the time window and queue jobs against project quotas. Idle capacity is already paid for, so batch fits a private cloud well.',
      }[cloud],
    );
  if (cloud === 'openstack') {
    const self = caps.filter((c) => CAPS[c].openstack === 'self').length;
    n.push(
      `On OpenStack you deploy and operate ${self} of the ${caps.length} building blocks in this design yourself (marked self-run in the table). Count the people and the on-call that needs before you choose it.`,
    );
  }
  return n;
}

/* ------------------------------------------------------------------------------------------------ one view */

export interface CloudView {
  cloud: CloudId;
  hld: string;
  sequence: string;
  c4Container: string;
  agentArchitecture: string | null;
  agentSequence: string | null;
  /** every building block present in this blueprint, with the service that fills it */
  services: { cap: CapId; label: string; service: string; selfRun: boolean }[];
  /** how the services connect for this blueprint, in request and data order */
  wiring: string[];
  notes: string[];
}

export function cloudView(i: ViewInput, cloud: CloudId): CloudView {
  const hld = relabelFlowchart(i.hld, cloud);
  const seq = relabelSequence(i.sequence, cloud);
  const c4 = relabelFlowchart(i.c4Container, cloud);
  const ag = i.agentArchitecture ? relabelFlowchart(i.agentArchitecture, cloud) : null;
  const ags = i.agentSequence ? relabelSequence(i.agentSequence, cloud) : null;
  const set = new Set<CapId>([...hld.caps, ...c4.caps, ...(ag?.caps ?? []), ...(ags?.caps ?? []), ...ALWAYS]);
  const order = Object.keys(CAPS) as CapId[];
  const caps = order.filter((c) => set.has(c));
  return {
    cloud,
    hld: hld.code,
    sequence: seq.code,
    c4Container: c4.code,
    agentArchitecture: ag?.code ?? null,
    agentSequence: ags?.code ?? null,
    services: caps.map((c) => ({ cap: c, label: CAPS[c].label, service: CAPS[c].svc[cloud], selfRun: cloud === 'openstack' && CAPS[c].openstack === 'self' })),
    wiring: WIRING.filter((w) => w.caps.every((c) => set.has(c))).map((w) => w.text[cloud]),
    notes: designNotes(i, cloud, caps),
  };
}

/** The four platforms side by side for the capabilities one blueprint uses (also used by the markdown export). */
export function serviceMatrix(i: ViewInput): { cap: CapId; label: string; services: Record<CloudId, string> }[] {
  const v = cloudView(i, 'aws');
  return v.services.map((s) => ({ cap: s.cap, label: s.label, services: { aws: CAPS[s.cap].svc.aws, azure: CAPS[s.cap].svc.azure, gcp: CAPS[s.cap].svc.gcp, openstack: CAPS[s.cap].svc.openstack } }));
}

/** The fields of a blueprint the cloud views read, so a page can pass one small object instead of the whole use case. */
export function viewInputOf(u: {
  pattern: string;
  latencySLA: ViewInput['latencySLA'];
  systemDesign: { mode: ViewInput['mode']; topology: { stance: ViewInput['stance'] }; hld: { mermaid: string }; sequence: { mermaid: string } };
  enterpriseContext: { c4Container: string };
  agentic: { architecture: string; sequence: string };
}): ViewInput {
  return {
    hld: u.systemDesign.hld.mermaid,
    sequence: u.systemDesign.sequence.mermaid,
    c4Container: u.enterpriseContext.c4Container,
    agentArchitecture: u.agentic.architecture,
    agentSequence: u.agentic.sequence,
    mode: u.systemDesign.mode,
    stance: u.systemDesign.topology.stance,
    pattern: u.pattern,
    latencySLA: u.latencySLA,
  };
}
