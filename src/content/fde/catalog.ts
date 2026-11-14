/**
 * What the FDE hub ships, as data: the pre-flight toolkit, the adapter catalogue and its compatibility registry, and the runnable
 * implementation packs. Client-safe plain data. A test checks that every path named here exists, so the site cannot promise a file
 * the repository does not have.
 */
import type { Domain } from '../../schemas/usecase.schema';

export const TOOLKIT_DIR = 'fde-toolkit';
export const ADAPTERS_DIR = 'fde-adapters';
export const PACKS_DIR = 'fde-packs';
export const EVIDENCE_DIR = 'fde-evidence';

export interface ToolkitCheck {
  section: string;
  title: string;
  proves: string;
  script: string;
}

export const TOOLKIT_CHECKS: ToolkitCheck[] = [
  { section: 'dns', title: 'DNS and private endpoints', proves: 'The name resolves to the expected range, through the expected CNAME chain, from the resolver the workloads use', script: 'fde-toolkit/bs_preflight/checks/dns.py' },
  { section: 'tcp', title: 'TCP and firewall rules', proves: 'The firewall rule exists; a timeout and a refusal are told apart; works through the corporate proxy', script: 'fde-toolkit/bs_preflight/checks/tcp.py' },
  { section: 'tls', title: 'TLS certificates', proves: 'Chain, hostname, days to expiry (even for an untrusted chain), protocol version and mTLS', script: 'fde-toolkit/bs_preflight/checks/tls.py' },
  { section: 'api_auth', title: 'API authentication', proves: 'A token is issued and accepted; 401 (identity) and 403 (permission) are told apart; secrets never reach the report', script: 'fde-toolkit/bs_preflight/checks/http.py' },
  { section: 'idp', title: 'Identity federation', proves: 'OIDC discovery, issuer match, JWKS, grant types and clock skew; SAML metadata expiry', script: 'fde-toolkit/bs_preflight/checks/idp.py' },
  { section: 'service_accounts', title: 'Service-account permissions', proves: 'Allowed routes pass and denied routes fail: least privilege is real', script: 'fde-toolkit/bs_preflight/checks/service_account.py' },
  { section: 'databases', title: 'Database connectivity', proves: 'PostgreSQL real login without a driver; MySQL, SQL Server and Oracle protocol checks; optional driver login', script: 'fde-toolkit/bs_preflight/checks/database.py' },
  { section: 'kafka', title: 'Kafka and event streams', proves: 'Broker identity, topic metadata, leaders, and every advertised listener', script: 'fde-toolkit/bs_preflight/checks/kafka.py' },
  { section: 'object_storage', title: 'S3-compatible storage', proves: 'SigV4-signed list and an optional write/read/delete canary', script: 'fde-toolkit/bs_preflight/checks/object_storage.py' },
  { section: 'cloud_access', title: 'Cloud and cluster permissions', proves: 'Allow-listed CLI commands (aws, az, gcloud, kubectl, helm, terraform) with assertions on their output', script: 'fde-toolkit/bs_preflight/checks/cmd.py' },
  { section: 'proxy_checks', title: 'Proxy', proves: 'The proxy is reachable, CONNECT is allowed per destination, NO_PROXY covers internal hosts', script: 'fde-toolkit/bs_preflight/checks/proxy.py' },
  { section: 'egress_denied', title: 'Air-gap proof', proves: 'Destinations that must be blocked are actually unreachable', script: 'fde-toolkit/bs_preflight/checks/egress.py' },
];

export const TOOLKIT_TEMPLATES = [
  '01-enterprise-network-topology.md',
  '02-vpc-vnet-discovery.md',
  '03-firewall-port-requirements.csv',
  '04-proxy-configuration.md',
  '05-dns-private-endpoint-discovery.md',
  '06-identity-provider-configuration.md',
  '07-service-account-requirements.csv',
  '08-database-connectivity.md',
  '09-kafka-event-stream-access.md',
  '10-api-gateway-configuration.md',
  '11-secrets-management.md',
  '12-data-residency-requirements.md',
  '13-cloud-subscription-account-access.md',
] as const;

export const TOOLKIT_TEMPLATE_TITLES: Record<(typeof TOOLKIT_TEMPLATES)[number], string> = {
  '01-enterprise-network-topology.md': 'Enterprise network topology',
  '02-vpc-vnet-discovery.md': 'VPC / VNet discovery',
  '03-firewall-port-requirements.csv': 'Firewall and port requirements',
  '04-proxy-configuration.md': 'Proxy configuration',
  '05-dns-private-endpoint-discovery.md': 'DNS and private endpoint discovery',
  '06-identity-provider-configuration.md': 'Identity provider configuration',
  '07-service-account-requirements.csv': 'Service account requirements',
  '08-database-connectivity.md': 'Database connectivity',
  '09-kafka-event-stream-access.md': 'Kafka and event-stream access',
  '10-api-gateway-configuration.md': 'API gateway configuration',
  '11-secrets-management.md': 'Secrets management',
  '12-data-residency-requirements.md': 'Data residency requirements',
  '13-cloud-subscription-account-access.md': 'Customer cloud subscription and account access',
};

/** How trustworthy an adapter is today. Nothing here is "tested against the vendor": that is stated, not implied. */
export type MockKind = 'vendor-shaped http mock' | 'in-memory broker' | 'sqlite (same SQL) plus SQL text tests' | 'local protocol server' | 'local oidc mock';

export interface AdapterEntry {
  id: string;
  title: string;
  systems: string[];
  protocol: string;
  auth: string;
  module: string;
  config: string;
  mock: MockKind;
  apiVersion: string;
  testedAgainst: string;
  /** vendor sandbox and customer-environment status: always "not run" until someone runs it and records it in a workspace */
  vendorSandbox: 'not run';
  idempotency: string;
}

const C = (id: string) => `fde-adapters/configs/${id}.connector.json`;
const M = (f: string) => `fde-adapters/fde_adapters/connectors/${f}.py`;
const NR = 'not run' as const;

export const ADAPTERS: AdapterEntry[] = [
  { id: 'salesforce', title: 'Salesforce', systems: ['Salesforce Sales Cloud', 'Salesforce Service Cloud'], protocol: 'REST v60: SOQL paging, upsert by external id', auth: 'OAuth2 JWT bearer or client credentials', module: M('salesforce'), config: C('salesforce'), mock: 'vendor-shaped http mock', apiVersion: 'v60.0', testedAgainst: 'mock: contract suite, JWT bearer, 401 refresh, injection rejection', vendorSandbox: NR, idempotency: 'external id upsert' },
  { id: 'sap-odata', title: 'SAP S/4HANA, ECC', systems: ['SAP S/4HANA', 'SAP ECC', 'SAP Business Suite'], protocol: 'OData V2/V4 through the SAP Gateway', auth: 'Basic or OAuth2; X-CSRF-Token handshake for writes', module: M('sap_odata'), config: C('sap-odata'), mock: 'vendor-shaped http mock', apiVersion: 'OData V2 and V4', testedAgainst: 'mock: paging, CSRF fetch then send with session cookie, 403 without token', vendorSandbox: NR, idempotency: 'check-then-create on a reference field' },
  { id: 'servicenow', title: 'ServiceNow', systems: ['ServiceNow ITSM', 'ServiceNow CSM'], protocol: 'Table API with sysparm paging', auth: 'Basic or OAuth2', module: M('servicenow'), config: C('servicenow'), mock: 'vendor-shaped http mock', apiVersion: 'Table API', testedAgainst: 'mock: contract suite, idempotent upsert by correlation_id', vendorSandbox: NR, idempotency: 'correlation_id lookup' },
  { id: 'dynamics365', title: 'Microsoft Dynamics 365', systems: ['Dynamics 365 Customer Service', 'Dataverse'], protocol: 'OData v4 Web API with @odata.nextLink', auth: 'Microsoft Entra ID client credentials', module: M('dynamics365'), config: C('dynamics365'), mock: 'vendor-shaped http mock', apiVersion: 'v9.2', testedAgainst: 'mock: contract suite, alternate-key upsert', vendorSandbox: NR, idempotency: 'alternate-key upsert' },
  { id: 'oracle', title: 'Oracle Database', systems: ['Oracle Database 12c+', 'Oracle Retail (RMS) schema', 'Oracle Autonomous'], protocol: 'Oracle Net via python-oracledb', auth: 'Database user and password (TCPS)', module: M('oracle_db'), config: C('oracle'), mock: 'sqlite (same SQL) plus SQL text tests', apiVersion: '12c and later', testedAgainst: 'SQL text for FETCH FIRST and MERGE; logic on SQLite', vendorSandbox: NR, idempotency: 'MERGE INTO ... USING DUAL' },
  { id: 'snowflake', title: 'Snowflake', systems: ['Snowflake'], protocol: 'SQL API v2 with bindings, async polling, partitions', auth: 'Key-pair JWT or OAuth', module: M('snowflake'), config: C('snowflake'), mock: 'vendor-shaped http mock', apiVersion: 'SQL API v2', testedAgainst: 'mock: bindings, 202 polling, partitions, MERGE request shape (SQL not executed)', vendorSandbox: NR, idempotency: 'MERGE INTO on the key column' },
  { id: 'databricks', title: 'Databricks', systems: ['Databricks SQL warehouse', 'Unity Catalog'], protocol: 'SQL Statement Execution API 2.0', auth: 'PAT or OAuth M2M bearer', module: M('databricks'), config: C('databricks'), mock: 'vendor-shaped http mock', apiVersion: 'API 2.0', testedAgainst: 'mock: PENDING to SUCCEEDED polling, chunked results, MERGE parameters (SQL not executed)', vendorSandbox: NR, idempotency: 'MERGE INTO with named parameters' },
  { id: 'postgres', title: 'PostgreSQL', systems: ['PostgreSQL', 'Aurora PostgreSQL', 'Cloud SQL', 'AlloyDB'], protocol: 'psycopg wire protocol', auth: 'SCRAM-SHA-256 with TLS', module: M('postgres'), config: C('postgres'), mock: 'sqlite (same SQL) plus SQL text tests', apiVersion: 'PostgreSQL 13+', testedAgainst: 'SQLite with identical SQL; the toolkit checks real PostgreSQL login against a protocol-faithful fake', vendorSandbox: NR, idempotency: 'INSERT ... ON CONFLICT DO UPDATE' },
  { id: 'sqlserver', title: 'Microsoft SQL Server', systems: ['SQL Server', 'Azure SQL', 'RDS SQL Server'], protocol: 'TDS via pyodbc and ODBC Driver 18', auth: 'SQL auth or Entra ID; encryption on', module: M('sqlserver'), config: C('sqlserver'), mock: 'sqlite (same SQL) plus SQL text tests', apiVersion: 'SQL Server 2016+', testedAgainst: 'T-SQL text for TOP and MERGE with HOLDLOCK; logic on SQLite', vendorSandbox: NR, idempotency: 'MERGE ... WITH (HOLDLOCK)' },
  { id: 'kafka', title: 'Apache Kafka', systems: ['Apache Kafka', 'Confluent', 'Amazon MSK', 'Azure Event Hubs (Kafka API)', 'Redpanda'], protocol: 'Kafka protocol via confluent-kafka', auth: 'SSL or SASL_SSL', module: M('kafka'), config: C('kafka'), mock: 'in-memory broker', apiVersion: 'confluent-kafka 2.3+', testedAgainst: 'in-memory broker: commit-after-processing, resume, DLQ, lag, keyed produce', vendorSandbox: NR, idempotency: 'idempotent producer plus consumer-side keys' },
  { id: 'rabbitmq', title: 'RabbitMQ', systems: ['RabbitMQ'], protocol: 'AMQP 0-9-1 via pika', auth: 'Username and password over TLS', module: M('rabbitmq'), config: C('rabbitmq'), mock: 'in-memory broker', apiVersion: 'pika 1.3+', testedAgainst: 'in-memory broker: manual ack, nack to DLX, requeue, persistent publish', vendorSandbox: NR, idempotency: 'message_id on publish' },
  { id: 's3', title: 'S3-compatible object storage', systems: ['AWS S3', 'MinIO', 'Ceph RGW', 'NetApp StorageGRID', 'Cloudflare R2'], protocol: 'S3 REST with AWS Signature V4', auth: 'Access key and secret (or STS session token)', module: M('s3'), config: C('s3'), mock: 'vendor-shaped http mock', apiVersion: 'S3 REST; SigV4', testedAgainst: 'mock plus the AWS documentation SigV4 vectors; manifest-gated read and atomic publish', vendorSandbox: NR, idempotency: 'If-None-Match: * on PUT' },
  { id: 'idp-oidc', title: 'Enterprise identity provider', systems: ['Microsoft Entra ID', 'Okta', 'Ping Identity', 'Keycloak', 'Auth0'], protocol: 'OIDC discovery, JWKS, RS256 JWT validation, SCIM 2.0', auth: 'OAuth2 / OIDC', module: M('idp'), config: C('idp-oidc'), mock: 'local oidc mock', apiVersion: 'OIDC Core 1.0; SCIM 2.0', testedAgainst: 'local OIDC mock with generated RSA keys: rotation, claim checks, alg confusion, SCIM paging', vendorSandbox: NR, idempotency: 'SCIM externalId' },
  { id: 'hl7v2-mllp', title: 'HL7 v2 over MLLP', systems: ['Epic (Bridges)', 'Oracle Health / Cerner', 'MEDITECH', 'Mirth Connect', 'Rhapsody', 'InterSystems'], protocol: 'MLLP: ADT A01/A02/A03/A04/A08/A11/A40, ORU R01; AA/AE/AR', auth: 'Network controls, VPN or TLS tunnel', module: M('hl7_mllp'), config: C('hl7v2-mllp'), mock: 'local protocol server', apiVersion: 'HL7 v2.3 to v2.7', testedAgainst: 'the real MLLP server and client on localhost: duplicates, AE retry, AR final, merge handling', vendorSandbox: NR, idempotency: 'MSH-10 control id and observation identifier' },
  { id: 'fhir-r4', title: 'FHIR R4', systems: ['Epic on FHIR', 'Oracle Health FHIR', 'HAPI FHIR', 'Azure Health Data Services', 'Google Cloud Healthcare API'], protocol: 'FHIR R4 REST: search paging, conditional create', auth: 'OAuth2 / SMART backend services', module: M('fhir_r4'), config: C('fhir-r4'), mock: 'vendor-shaped http mock', apiVersion: 'R4 (4.0.1)', testedAgainst: 'mock: Bundle paging, If-None-Exist conditional create', vendorSandbox: NR, idempotency: 'If-None-Exist on identifier' },
  { id: 'zendesk', title: 'Zendesk Support', systems: ['Zendesk Support'], protocol: 'REST v2: incremental cursor export, PUT with safe_update', auth: 'API token (email/token) or OAuth', module: 'fde-packs/saas/support-ticket-triage-and-priority/src/ticket_integration/zendesk.py', config: 'fde-packs/saas/support-ticket-triage-and-priority/config/zendesk.connector.json', mock: 'vendor-shaped http mock', apiVersion: 'API v2', testedAgainst: 'mock: cursor paging, marker-tag idempotency, 409 re-apply, 429', vendorSandbox: NR, idempotency: 'marker tag on the ticket plus safe_update' },
  { id: 'wfm-roster', title: 'Workforce management / roster', systems: ['UKG', 'Workday', 'Quinyx', 'Legion', 'A generic roster REST API'], protocol: 'REST: employees, shifts, shift-proposals', auth: 'OAuth2 client credentials', module: 'fde-packs/bfsi/branch-footfall-and-staffing-forecast/src/branch_integration/wfm.py', config: 'fde-packs/bfsi/branch-footfall-and-staffing-forecast/config/wfm.connector.json', mock: 'vendor-shaped http mock', apiVersion: 'generic', testedAgainst: 'mock: proposals idempotent by id, publish refused until approved', vendorSandbox: NR, idempotency: 'proposal id' },
  { id: 'reso-webapi', title: 'MLS via the RESO Web API', systems: ['Any MLS exposing the RESO Web API'], protocol: 'OData v4 /Property with $filter on ModificationTimestamp', auth: 'OAuth2 client credentials or a bearer token issued by the MLS', module: 'fde-packs/real-estate/automated-valuation-model/src/avm_integration/reso.py', config: 'fde-packs/real-estate/automated-valuation-model/market_packs/us-reso.json', mock: 'vendor-shaped http mock', apiVersion: 'RESO Data Dictionary 1.7', testedAgainst: 'mock: filter, select, nextLink; licence enforced in code', vendorSandbox: NR, idempotency: 'ListingKey' },
];

export const ADAPTER_BY_ID: Record<string, AdapterEntry> = Object.fromEntries(ADAPTERS.map((a) => [a.id, a]));

/** Alternatives the FDE can offer when a customer does not run the system a blueprint names. */
export const SYSTEM_ALTERNATIVES: { match: RegExp; kind: string; adapters: string[] }[] = [
  { match: /\b(SAP|ERP|S\/4|ECC)\b/i, kind: 'ERP', adapters: ['sap-odata', 'oracle', 'dynamics365'] },
  { match: /Salesforce|CRM|customer master|customer data platform|CDP/i, kind: 'CRM', adapters: ['salesforce', 'dynamics365'] },
  { match: /ticket|case|ITSM|service desk|helpdesk|SOAR|SecOps/i, kind: 'ticketing', adapters: ['servicenow', 'zendesk', 'salesforce'] },
  { match: /warehouse|lakehouse|data lake|analytics|reporting|BI\b|data platform|feature store|snowflake|databricks/i, kind: 'analytics platform', adapters: ['snowflake', 'databricks', 's3'] },
  { match: /Kafka|event|stream|message queue|MQ\b|bus|telemetry/i, kind: 'event stream', adapters: ['kafka', 'rabbitmq'] },
  { match: /core banking|ledger|database|system of record|master data|registry|inventory|store master|catalog/i, kind: 'relational system of record', adapters: ['postgres', 'sqlserver', 'oracle'] },
  { match: /identity|IdP|SSO|directory|IAM|OIDC|SAML/i, kind: 'identity', adapters: ['idp-oidc'] },
  { match: /EHR|HL7|FHIR|clinical|laboratory|patient|hospital/i, kind: 'clinical', adapters: ['hl7v2-mllp', 'fhir-r4'] },
  { match: /file|batch|object|export|drop|S3|bucket/i, kind: 'file or object drop', adapters: ['s3'] },
];

export const adaptersFor = (text: string): string[] => {
  const out: string[] = [];
  for (const a of SYSTEM_ALTERNATIVES) if (a.match.test(text)) for (const x of a.adapters) if (!out.includes(x)) out.push(x);
  return out;
};

/* ------------------------------------------------------------------------------------------------------ runnable packs */

export interface PackEntry {
  slug: string;
  domain: Domain;
  dir: string;
  pkg: string;
  tests: number;
  /** what the pack runs, in one line */
  runs: string;
  files: string[];
}

const P = (domain: Domain, key: string) => `${PACKS_DIR}/${domain}/${key}`;
export const PACKS: PackEntry[] = [
  { slug: 'fintech/real-time-card-upi-fraud-detection', domain: 'fintech', dir: P('fintech', 'real-time-card-upi-fraud-detection'), pkg: 'fraud_switch', tests: 27, runs: 'ISO 8583 gateway and switch simulator, idempotent decision ledger, canary with rollback, replay, reconciliation',
    files: ['src/fraud_switch/iso8583.py', 'src/fraud_switch/upi.py', 'src/fraud_switch/mapping.py', 'src/fraud_switch/ledger.py', 'src/fraud_switch/gateway.py', 'src/fraud_switch/canary.py', 'src/fraud_switch/replay.py', 'src/fraud_switch/reconcile.py', 'src/fraud_switch/hsm.py', 'fixtures/iso8583_replay.jsonl', 'contracts/score-request.schema.json', 'docs/payment-switch-integration.md'] },
  { slug: 'retail/demand-forecasting-sku-store', domain: 'retail', dir: P('retail', 'demand-forecasting-sku-store'), pkg: 'forecast_integration', tests: 13, runs: 'Nightly batch from object storage, stock-out correction, master-data reconciliation, planner overrides, replenishment proposal',
    files: ['src/forecast_integration/censoring.py', 'src/forecast_integration/master_data.py', 'src/forecast_integration/calendar.py', 'src/forecast_integration/contract.py', 'src/forecast_integration/cold_start.py', 'src/forecast_integration/pipeline.py', 'config/sap-stock.connector.json', 'config/oracle-retail.connector.json', 'config/pos-sales.connector.json', 'docs/integration.md'] },
  { slug: 'healthcare/sepsis-early-warning', domain: 'healthcare', dir: P('healthcare', 'sepsis-early-warning'), pkg: 'sepsis_integration', tests: 11, runs: 'HL7 replay through the MLLP adapter, identity and encounter matching, alert lifecycle, NEWS2 fallback, ward configuration gates',
    files: ['src/sepsis_integration/alert_lifecycle.py', 'src/sepsis_integration/identity.py', 'src/sepsis_integration/news2.py', 'src/sepsis_integration/fallback.py', 'src/sepsis_integration/ward_config.py', 'src/sepsis_integration/replay.py', 'fixtures/events.jsonl', 'docs/ehr-integration.md', 'docs/hazard-log.csv'] },
  { slug: 'supply-chain/eta-prediction-for-shipments', domain: 'supply-chain', dir: P('supply-chain', 'eta-prediction-for-shipments'), pkg: 'eta_integration', tests: 13, runs: 'X12 214 and EDIFACT IFTSTA parsing, event-time semantics, geofences, signed webhooks, ETA policy and override book, edge buffer',
    files: ['src/eta_integration/edi.py', 'src/eta_integration/events.py', 'src/eta_integration/geo.py', 'src/eta_integration/security.py', 'src/eta_integration/policy.py', 'src/eta_integration/edge.py', 'src/eta_integration/registry.py', 'config/carriers.json', 'fixtures/214.edi', 'fixtures/iftsta.edi', 'docs/integration.md'] },
  { slug: 'adtech/ctr-prediction-ads', domain: 'adtech', dir: P('adtech', 'ctr-prediction-ads'), pkg: 'rtb_integration', tests: 14, runs: 'OpenRTB validation and mapping, TCF consent gate, deadline-aware pipeline with a stage budget, pacing, reconciliation, per-exchange canary',
    files: ['src/rtb_integration/openrtb.py', 'src/rtb_integration/consent.py', 'src/rtb_integration/budget.py', 'src/rtb_integration/pacing.py', 'src/rtb_integration/reconcile.py', 'src/rtb_integration/exchange_auth.py', 'src/rtb_integration/simulator.py', 'config/exchanges.example.json', 'docs/exchange-integration.md'] },
  { slug: 'cybersecurity/phishing-url-and-email-detection', domain: 'cybersecurity', dir: P('cybersecurity', 'phishing-url-and-email-detection'), pkg: 'phish_integration', tests: 11, runs: 'SIEM event mapping, STIX/TAXII, inline inspection, read-only response controller with approvals and undo, incident simulation',
    files: ['src/phish_integration/events.py', 'src/phish_integration/stix.py', 'src/phish_integration/gateway.py', 'src/phish_integration/response.py', 'src/phish_integration/feedback.py', 'src/phish_integration/simulate.py', 'fixtures/messages.json', 'fixtures/stix_bundle.json', 'docs/siem-soar-integration.md'] },
  { slug: 'edtech/knowledge-tracing-student-modeling', domain: 'edtech', dir: P('edtech', 'knowledge-tracing-student-modeling'), pkg: 'edu_integration', tests: 24, runs: 'LTI 1.3 launch, OneRoster reconciliation, xAPI and Caliper replay, QTI, identity, consent and deletion, grade firewall, fairness',
    files: ['src/edu_integration/lti13.py', 'src/edu_integration/oneroster.py', 'src/edu_integration/xapi.py', 'src/edu_integration/qti.py', 'src/edu_integration/identity.py', 'src/edu_integration/consent.py', 'src/edu_integration/mastery.py', 'src/edu_integration/permissions.py', 'src/edu_integration/fairness.py', 'docs/institution-onboarding.md'] },
  { slug: 'saas/support-ticket-triage-and-priority', domain: 'saas', dir: P('saas', 'support-ticket-triage-and-priority'), pkg: 'ticket_integration', tests: 14, runs: 'Zendesk read and idempotent writeback, webhook verification, entitlements and routing, tenant isolation, on-behalf-of, approvals',
    files: ['src/ticket_integration/zendesk.py', 'src/ticket_integration/mock_zendesk.py', 'src/ticket_integration/webhook.py', 'src/ticket_integration/entitlements.py', 'src/ticket_integration/tenant.py', 'src/ticket_integration/obo.py', 'src/ticket_integration/approvals.py', 'config/zendesk.connector.json', 'config/routing-rules.json', 'docs/ticketing-connector-package.md'] },
  { slug: 'bfsi/branch-footfall-and-staffing-forecast', domain: 'bfsi', dir: P('bfsi', 'branch-footfall-and-staffing-forecast'), pkg: 'branch_integration', tests: 15, runs: 'Sensor failure handling, branch and time-zone reconciliation, Erlang C staffing, labour-rule validation, WFM proposals, manager approval',
    files: ['src/branch_integration/footfall.py', 'src/branch_integration/staffing.py', 'src/branch_integration/wfm.py', 'src/branch_integration/approval.py', 'src/branch_integration/reports.py', 'config/wfm.connector.json', 'config/branch-master.json', 'config/labour-rules.json', 'docs/branch-integration.md'] },
  { slug: 'real-estate/automated-valuation-model', domain: 'real-estate', dir: P('real-estate', 'automated-valuation-model'), pkg: 'avm_integration', tests: 12, runs: 'RESO access under licence, address and parcel identity, comparables with adjustment caps, confidence routing, review and challenge',
    files: ['src/avm_integration/licence.py', 'src/avm_integration/reso.py', 'src/avm_integration/address.py', 'src/avm_integration/comps.py', 'src/avm_integration/commercial.py', 'src/avm_integration/access.py', 'src/avm_integration/workflow.py', 'market_packs/us-reso.json', 'market_packs/uk-land-registry.json', 'market_packs/in-state-registry.json', 'docs/market-implementation.md'] },
];
export const PACK_BY_SLUG: Record<string, PackEntry> = Object.fromEntries(PACKS.map((p) => [p.slug, p]));
