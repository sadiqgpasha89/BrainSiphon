/**
 * Per-domain enterprise facts: the business capability, who cares, which systems of record the AI system touches, how it is
 * hosted, how identity and data classification work, and which regulatory obligations translate into which architectural
 * control and which evidence. Client-safe plain data, consumed by `enterprise.ts`.
 */
import type { Domain } from '../schemas/usecase.schema';

export interface Obligation {
  obligation: string;
  architecturalControl: string;
  evidence: string;
  owner: string;
  cadence: string;
}

export interface DomainEnterprise {
  capability: string;
  processes: string[];
  stakeholders: { who: string; needs: string }[];
  systemsOfRecord: string[];
  upstream: string[];
  downstream: string[];
  /** data-owning teams, assigned to source datasets in order */
  owners: string[];
  team: string;
  unit: string;
  hosting: string;
  identity: string;
  classification: string;
  privacy: string;
  /** 0 (lowest inherent consequence) to 2 */
  baseRisk: 0 | 1 | 2;
  regulatory: Obligation[];
  /** the existing enterprise estate the new service has to coexist with */
  legacy: string;
}

export const DOMAIN_ENTERPRISE: Record<Domain, DomainEnterprise> = {
  fintech: {
    capability: 'Payments risk, authorisation and settlement',
    processes: ['Card and UPI authorisation', 'Dispute and chargeback handling', 'Merchant onboarding and monitoring'],
    stakeholders: [
      { who: 'Head of Fraud and Payments Risk', needs: 'Lower fraud loss at a fixed false-decline ceiling' },
      { who: 'Payments operations and fraud analysts', needs: 'A short review queue with explained, evidence-backed cases' },
      { who: 'Compliance and the PCI-DSS assessor', needs: 'Small audit scope and a replayable record of every decision' },
      { who: 'Customers and merchants', needs: 'Genuine payments approved first time, with clear reasons when they are not' },
    ],
    systemsOfRecord: ['Core banking ledger', 'Card management system', 'Customer identity and KYC (CIAM)'],
    upstream: ['Payment switch and UPI PSP gateway', 'Mobile and web device SDK', 'Merchant and acquirer master data'],
    downstream: ['Authorisation response to the switch', 'Case-management and analyst tooling', 'Customer step-up and notification channels'],
    owners: ['Payments engineering', 'Risk analytics', 'Customer data office'],
    team: 'Payments Risk',
    unit: 'transaction',
    hosting: 'Hybrid: card and UPI data stays in an in-country private or sovereign-region cloud; training, experimentation and non-regulated analytics run in the public cloud on tokenised data',
    identity: 'SPIFFE/mTLS workload identity between switch, scorer and state plane; OIDC with RBAC and maker-checker approval for analyst and policy tools',
    classification: 'Restricted: PAN (tokenised) and account identifiers; Confidential: device, behavioural and decision data; Internal: aggregates',
    privacy: 'Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention',
    baseRisk: 2,
    legacy: 'a payment switch and core ledger that cannot change on the AI team\'s schedule',
    regulatory: [
      { obligation: 'PCI-DSS scope minimisation', architecturalControl: 'Tokenise PAN at the edge so the model plane, feature store and logs stay outside cardholder-data scope', evidence: 'Data-flow diagram with the scope boundary; quarterly scans; token-vault access logs', owner: 'Security architecture', cadence: 'Quarterly and on any data-flow change' },
      { obligation: 'Payment-data localisation', architecturalControl: 'Pin payment state to in-country shards with a synchronous in-country standby; cross-border calls carry tokens and derived features only', evidence: 'Region-pinning policy as code and a storage-location report', owner: 'Platform engineering', cadence: 'Monthly' },
      { obligation: 'Explainable adverse decisions and dispute handling', architecturalControl: 'Return reason codes with every decline or step-up, store them in the decision ledger and give analysts a logged override path', evidence: 'Ledger replay of a sampled disputed decision reproduces the output', owner: 'Risk operations', cadence: 'Monthly sample' },
      { obligation: 'Model risk management for decision models', architecturalControl: 'Independent validation before promotion, a model inventory entry and champion/challenger monitoring in production', evidence: 'Validation report, inventory record and the promotion approval trail', owner: 'Model risk management', cadence: 'Annual review and on material change' },
    ],
  },
  retail: {
    capability: 'Merchandising, search and customer experience',
    processes: ['Product discovery and search', 'Pricing and promotion planning', 'Order fulfilment and returns'],
    stakeholders: [
      { who: 'Head of Merchandising and category managers', needs: 'Control over what ranks and a clear view of why' },
      { who: 'Product and growth teams', needs: 'Measured lift in conversion and margin, not offline metric gains' },
      { who: 'Customer service and trust and safety', needs: 'Explanations for odd results and fast handling of abuse' },
      { who: 'Shoppers and marketplace sellers', needs: 'Relevant, fair results that respect consent' },
    ],
    systemsOfRecord: ['Product information management (PIM)', 'Order management system (OMS)', 'Customer data platform (CDP)'],
    upstream: ['Clickstream and app events', 'Catalogue and inventory feeds (GS1/EDI)', 'Payment-gateway webhooks'],
    downstream: ['Storefront and search APIs', 'Merchandising tools', 'Marketing and CRM activation'],
    owners: ['Catalogue operations', 'E-commerce engineering', 'Customer analytics'],
    team: 'Commerce Platform',
    unit: 'session',
    hosting: 'Public cloud, multi-region, with a CDN at the edge; regional data stores where consumer-privacy law requires',
    identity: 'OIDC customer identity (CIAM) at the edge; service-to-service mTLS; role-based merchandiser tooling',
    classification: 'Confidential: customer behavioural and order data; Internal: catalogue and pricing; Restricted: payment tokens (never stored)',
    privacy: 'Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings',
    baseRisk: 0,
    legacy: 'a monolithic commerce platform and OMS that own price, stock and order truth',
    regulatory: [
      { obligation: 'Consumer privacy and consent (GDPR, CCPA, DPDP)', architecturalControl: 'Consent flag read with every personalised request; opt-out routes to the non-personalised ranker; deletion fans out to feature store and embeddings', evidence: 'Consent-propagation test in CI and a deletion-latency report', owner: 'Privacy engineering', cadence: 'Quarterly' },
      { obligation: 'Consumer protection and price transparency', architecturalControl: 'Pricing and promotion rules sit in a versioned policy engine with floors, ceilings and an audit trail; the model proposes, the policy decides', evidence: 'Policy version attached to every price shown; sampled price audits', owner: 'Pricing governance', cadence: 'Monthly' },
      { obligation: 'Marketplace fairness and seller transparency', architecturalControl: 'Exposure and ranking-factor reports per seller cohort, with a documented override and appeal path', evidence: 'Cohort exposure dashboard and appeal log', owner: 'Marketplace policy', cadence: 'Quarterly' },
    ],
  },
  healthcare: {
    capability: 'Clinical decision support and care operations',
    processes: ['Triage and admission', 'Inpatient monitoring and deterioration response', 'Diagnostic reporting and follow-up'],
    stakeholders: [
      { who: 'Chief Medical Information Officer and clinical lead', needs: 'Clinically validated benefit without alert fatigue' },
      { who: 'Nurses and physicians at the point of care', needs: 'Actionable, explained prompts inside their existing workflow' },
      { who: 'Patient safety and quality', needs: 'A safety case, incident learning and monitored subgroup performance' },
      { who: 'Hospital IT and integration', needs: 'Standards-based integration that does not destabilise the EHR' },
    ],
    systemsOfRecord: ['Electronic health record (EHR)', 'Laboratory, radiology and PACS systems', 'Master patient index (MPI)'],
    upstream: ['HL7 v2 ADT/ORU feed via the integration engine', 'Bedside devices and monitors', 'Order entry (CPOE)'],
    downstream: ['In-EHR alert or worklist (CDS Hooks / FHIR)', 'Clinical review queue', 'Quality and safety dashboards'],
    owners: ['Clinical informatics', 'Hospital data office', 'Integration team'],
    team: 'Clinical Informatics',
    unit: 'patient encounter',
    hosting: 'Hybrid: identifiable data stays in the hospital or an in-country healthcare cloud region; de-identified training data lives in a governed research enclave',
    identity: 'SMART on FHIR / OIDC with care-team (relationship-based) authorisation, break-glass access and a full access audit',
    classification: 'Restricted: identifiable clinical data (PHI); Confidential: de-identified research sets; Internal: operational aggregates',
    privacy: 'Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage',
    baseRisk: 2,
    legacy: 'an EHR and interface engine with long change cycles and clinical-safety sign-off for every change',
    regulatory: [
      { obligation: 'Health-data protection (HIPAA, GDPR, ABDM)', architecturalControl: 'Minimum-necessary access via relationship-based authorisation, field-level masking, jurisdiction-pinned storage and de-identified training sets', evidence: 'Access-audit sample, data-flow diagram and de-identification risk report', owner: 'Privacy and security officer', cadence: 'Quarterly' },
      { obligation: 'Software-as-medical-device classification and clinical validation', architecturalControl: 'Pre-registered validation protocol, locked model versions in production, change control for every retrain and a rollback plan', evidence: 'Validation study, locked-version manifest and change records', owner: 'Clinical safety officer', cadence: 'Per release and annually' },
      { obligation: 'Clinical safety case and alert governance', architecturalControl: 'Hazard log, alert hysteresis and burden caps, clinician override with a reason, and subgroup monitoring', evidence: 'Hazard log, alert-burden report and subgroup performance dashboard', owner: 'Patient safety committee', cadence: 'Monthly' },
    ],
  },
  'supply-chain': {
    capability: 'Planning, logistics and fulfilment operations',
    processes: ['Sales and operations planning', 'Transport and warehouse execution', 'Supplier and inventory management'],
    stakeholders: [
      { who: 'VP Supply Chain and S&OP lead', needs: 'Better service levels at lower inventory and freight cost' },
      { who: 'Planners, dispatchers and warehouse supervisors', needs: 'Recommendations they can act on and override with reasons' },
      { who: 'Procurement and supplier management', needs: 'Early warning on supplier and lane risk' },
      { who: 'Finance', needs: 'Working-capital and cost impact they can reconcile' },
    ],
    systemsOfRecord: ['ERP (orders, inventory, finance)', 'Warehouse and transport management systems (WMS, TMS)', 'Supplier and EDI network'],
    upstream: ['EDI X12/EDIFACT and EPCIS feeds', 'Telematics and IoT over MQTT', 'Carrier and port APIs'],
    downstream: ['ERP and advanced-planning runs', 'Dispatch and warehouse task queues', 'Exception dashboards'],
    owners: ['Supply-chain planning', 'Logistics IT', 'Master data team'],
    team: 'Supply Chain Planning',
    unit: 'shipment',
    hosting: 'Public cloud for planning and analytics; edge compute at warehouses and plants for low-latency, offline-tolerant control',
    identity: 'Federated partner identity (OAuth2 client credentials, mTLS) for carriers and suppliers; RBAC for planners',
    classification: 'Confidential: commercial terms, demand and cost; Internal: telemetry and operational data',
    privacy: 'Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits',
    baseRisk: 0,
    legacy: 'an ERP and planning suite with batch interfaces and master data of mixed quality',
    regulatory: [
      { obligation: 'Partner data-sharing agreements', architecturalControl: 'Contract terms encoded as data-use policies on shared datasets, with per-partner views and revocable access', evidence: 'Policy-as-code repository and partner access log', owner: 'Supply chain legal and data office', cadence: 'Quarterly' },
      { obligation: 'Worker and driver data protection', architecturalControl: 'Pseudonymise telematics identifiers, aggregate before analysis and restrict individual-level views', evidence: 'Pseudonymisation test and access audit', owner: 'Privacy engineering', cadence: 'Quarterly' },
      { obligation: 'Trade, customs and traceability records', architecturalControl: 'Immutable event log for custody and customs-relevant events with replay for audits', evidence: 'Audit replay of a sampled consignment', owner: 'Logistics compliance', cadence: 'Semi-annual' },
    ],
  },
  adtech: {
    capability: 'Auction, delivery and measurement',
    processes: ['Real-time bidding and delivery', 'Budget pacing and campaign optimisation', 'Attribution and reporting'],
    stakeholders: [
      { who: 'Head of Ad Products and revenue', needs: 'Revenue and advertiser return at a fixed latency and cost' },
      { who: 'Campaign managers and advertisers', needs: 'Predictable delivery, pacing and trustworthy reporting' },
      { who: 'Privacy and legal', needs: 'Consent honoured on every request and sensitive categories excluded' },
      { who: 'Trading-platform SRE', needs: 'A bidder that stays inside its deadline under peak load' },
    ],
    systemsOfRecord: ['Campaign and budget ledger', 'Billing and invoicing', 'Identity graph and consent store (CMP)'],
    upstream: ['OpenRTB bid requests from exchanges', 'Win/loss notices and impression and click beacons', 'Consent signals (TCF strings)'],
    downstream: ['Bid response to the exchange', 'Pacing and budget service', 'Reporting and billing'],
    owners: ['Ad platform engineering', 'Measurement science', 'Privacy engineering'],
    team: 'Ad Platform',
    unit: 'bid request',
    hosting: 'Public cloud with edge regions near the exchanges and high-IO nodes on the bidder path',
    identity: 'mTLS and signed requests with exchanges; OIDC with RBAC for advertiser UIs; scoped API keys with quotas',
    classification: 'Confidential: user identifiers and behavioural segments; Restricted: precise geolocation and sensitive categories (blocked by policy)',
    privacy: 'Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement',
    baseRisk: 1,
    legacy: 'exchange integrations and a billing ledger with strict reconciliation rules',
    regulatory: [
      { obligation: 'Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA)', architecturalControl: 'Evaluate the consent string at the gateway; requests without consent use contextual features only', evidence: 'Consent-conformance test suite and sampled bid logs showing the gate', owner: 'Privacy engineering', cadence: 'Quarterly' },
      { obligation: 'Sensitive-category and brand-safety policy', architecturalControl: 'Blocklist and category policy evaluated before scoring, versioned with the decision', evidence: 'Policy version in decision logs and a violation-rate report', owner: 'Trust and policy', cadence: 'Monthly' },
      { obligation: 'Billing accuracy and measurement integrity', architecturalControl: 'Reconcile impressions, wins and spend against exchange reports with tolerance alerts; keep attribution method versioned', evidence: 'Daily reconciliation report and attribution method register', owner: 'Finance operations', cadence: 'Daily and quarterly' },
    ],
  },
  cybersecurity: {
    capability: 'Security operations and threat defence',
    processes: ['Detection and alert triage', 'Incident response and containment', 'Identity and access threat monitoring'],
    stakeholders: [
      { who: 'CISO', needs: 'Lower mean time to detect and respond without more analysts' },
      { who: 'SOC analysts and incident responders', needs: 'Fewer false positives and cases that arrive with evidence' },
      { who: 'IT operations and identity team', needs: 'Containment actions that do not break the business' },
      { who: 'Audit and risk', needs: 'Evidence that automated actions are bounded and reviewed' },
    ],
    systemsOfRecord: ['SIEM and security data lake', 'Asset inventory (CMDB) and identity directory', 'Case and ticketing system (SOAR)'],
    upstream: ['EDR, network, cloud and identity telemetry (syslog, CEF, OCSF)', 'Threat-intelligence feeds (STIX/TAXII)', 'Email and web gateways'],
    downstream: ['Alerts and cases in the SOC console', 'SOAR playbooks and containment actions', 'Detection-engineering backlog'],
    owners: ['Detection engineering', 'Security data platform', 'Identity and access team'],
    team: 'Security Operations',
    unit: 'event',
    hosting: 'Hybrid: telemetry collected on-premises and in cloud, analysed in a segregated security enclave with its own accounts and keys',
    identity: 'Privileged-access management with just-in-time elevation; models and agents are read-only by default; containment needs human approval',
    classification: 'Restricted: security telemetry and incident data; Confidential: user activity',
    privacy: 'Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class',
    baseRisk: 1,
    legacy: 'a SIEM, SOAR and EDR estate with vendor-specific schemas and playbooks',
    regulatory: [
      { obligation: 'Breach notification timelines', architecturalControl: 'Case timestamps and evidence packs generated automatically so notification clocks and scope are provable', evidence: 'Incident timeline export for a sampled incident', owner: 'Security governance', cadence: 'Per incident and semi-annual drill' },
      { obligation: 'Employee-monitoring proportionality', architecturalControl: 'Field-level masking, purpose-limited queries and a logged unmasking workflow with approval', evidence: 'Unmasking audit log and monitoring impact assessment', owner: 'Privacy and HR legal', cadence: 'Annual' },
      { obligation: 'Security framework controls (ISO 27001, NIST CSF, SOC 2)', architecturalControl: 'Detection coverage mapped to the framework and to ATT&CK; automated actions limited by an approved autonomy ladder', evidence: 'Coverage matrix and autonomy-level approval record', owner: 'Security architecture', cadence: 'Quarterly' },
    ],
  },
  edtech: {
    capability: 'Learning, assessment and learner success',
    processes: ['Adaptive learning and tutoring', 'Assessment and feedback', 'Learner engagement and retention'],
    stakeholders: [
      { who: 'Chief Academic Officer or head of learning', needs: 'Measured learning gains, not engagement vanity metrics' },
      { who: 'Teachers and instructors', needs: 'Transparent recommendations they can accept or override' },
      { who: 'Learners and guardians', needs: 'Fair, understandable feedback and control of their data' },
      { who: 'Student-data privacy officer', needs: 'Child-safe data handling and consent evidence' },
    ],
    systemsOfRecord: ['Learning management system (LMS)', 'Student information system (SIS)', 'Content and item bank'],
    upstream: ['LTI 1.3 launches and xAPI or Caliper events', 'Assessment responses (QTI)', 'OneRoster rostering feeds'],
    downstream: ['Learner dashboards and the adaptive-path service', 'Teacher gradebook and alerts', 'Guardian reporting'],
    owners: ['Learning engineering', 'Registrar and data office', 'Content team'],
    team: 'Learning Platform',
    unit: 'learner interaction',
    hosting: 'Public cloud with regional residency for student records; CDN delivery and offline-tolerant clients for low-bandwidth learners',
    identity: 'OIDC or SAML SSO with the institution, guardian consent for minors, teacher-scoped access to rosters',
    classification: 'Restricted: minors\' records and assessment results; Confidential: engagement telemetry',
    privacy: 'Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment',
    baseRisk: 1,
    legacy: 'an LMS and SIS with rigid integration standards and academic calendars',
    regulatory: [
      { obligation: 'Student and child data protection (FERPA, COPPA, GDPR-K)', architecturalControl: 'Per-institution data partitions, guardian-consent flags checked at read time and no cross-institution joins', evidence: 'Consent-gate tests and partition-isolation audit', owner: 'Privacy officer', cadence: 'Quarterly' },
      { obligation: 'High-stakes assessment fairness and integrity', architecturalControl: 'Human review for consequential outcomes, subgroup error-rate monitoring and a documented appeal process', evidence: 'Subgroup report and appeal log', owner: 'Assessment board', cadence: 'Per term' },
      { obligation: 'Accessibility obligations (WCAG)', architecturalControl: 'Accessible fallbacks for every AI-generated interaction and accessibility checks in the release gate', evidence: 'Accessibility test results per release', owner: 'Product accessibility lead', cadence: 'Per release' },
    ],
  },
  saas: {
    capability: 'Product intelligence and customer success',
    processes: ['In-product assistance and automation', 'Support deflection and triage', 'Churn and expansion management'],
    stakeholders: [
      { who: 'VP Product and head of the AI platform', needs: 'Features that ship safely across tenants at predictable cost' },
      { who: 'Customer success and support', needs: 'Accurate answers and risk signals with the evidence behind them' },
      { who: 'Security and trust', needs: 'Tenant isolation and no data leakage through prompts, indexes or logs' },
      { who: 'Enterprise customer administrators', needs: 'Control over what the AI can see and do for their tenant' },
    ],
    systemsOfRecord: ['Tenant and entitlement service', 'Product event warehouse', 'CRM and billing (subscriptions)'],
    upstream: ['Product events and API logs', 'Support tickets and chat', 'Docs, knowledge base and code repositories'],
    downstream: ['In-product experience (UI and API)', 'Support and customer-success workflows', 'Billing and usage metering'],
    owners: ['Product analytics', 'Platform engineering', 'Customer success operations'],
    team: 'AI Platform',
    unit: 'request',
    hosting: 'Public cloud, cell-based multi-tenant deployment with region pinning and dedicated cells for the largest or regulated tenants',
    identity: 'OIDC or SAML SSO with SCIM provisioning; on-behalf-of token exchange so the AI acts with the calling user\'s permissions; per-tenant RBAC and ABAC',
    classification: 'Confidential: tenant content and usage; Restricted: tenant secrets and credentials (never placed in prompts)',
    privacy: 'Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding',
    baseRisk: 1,
    legacy: 'a multi-tenant product with its own permission model that the AI must respect rather than replace',
    regulatory: [
      { obligation: 'Security attestations (SOC 2, ISO 27001)', architecturalControl: 'Change control, access reviews and audit logging apply to prompts, indexes, tools and models like any production code', evidence: 'Control-test evidence from the compliance platform', owner: 'Security and compliance', cadence: 'Continuous and annual audit' },
      { obligation: 'Customer data-processing agreements', architecturalControl: 'Per-tenant data-use flags (no training, residency, subprocessors) enforced in the gateway and the retrieval layer', evidence: 'Gateway policy tests and a tenant-flag audit', owner: 'Legal and trust', cadence: 'Quarterly' },
      { obligation: 'AI transparency commitments', architecturalControl: 'Label AI output, cite sources and expose which model and policy version produced it', evidence: 'Sampled responses showing labels, citations and versions', owner: 'Product', cadence: 'Per release' },
    ],
  },
  bfsi: {
    capability: 'Lending, treasury, claims and compliance operations',
    processes: ['Credit underwriting and monitoring', 'Claims and policy servicing', 'Treasury, settlement and regulatory reporting'],
    stakeholders: [
      { who: 'Chief Risk Officer', needs: 'Risk-adjusted returns with a model estate the regulator accepts' },
      { who: 'Business-line heads (lending, insurance, markets)', needs: 'Faster, more consistent decisions inside risk appetite' },
      { who: 'Model risk management and internal audit', needs: 'Independent validation, lineage and reproducible decisions' },
      { who: 'Operations and compliance', needs: 'Exceptions routed with evidence and a complete audit trail' },
    ],
    systemsOfRecord: ['Core banking or policy administration system', 'General ledger and risk data warehouse', 'Customer master and KYC repository'],
    upstream: ['Core-banking MQ messages and batch copybooks', 'Market and reference data (FIX, SWIFT MX / ISO 20022)', 'Credit bureau, collateral and third-party feeds'],
    downstream: ['Decision write-back to the system of record', 'Regulatory and management reporting', 'Case management and customer correspondence'],
    owners: ['Core banking IT', 'Risk data office', 'Operations'],
    team: 'Enterprise Risk Analytics',
    unit: 'account',
    hosting: 'Hybrid and often on-premises for the core; model development and non-production in a private-cloud landing zone; data residency by jurisdiction',
    identity: 'Enterprise IAM with privileged-access management, segregation of duties and maker-checker on model, limit and policy changes',
    classification: 'Restricted: customer financial and credit data; Confidential: models, limits and pricing',
    privacy: 'Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions',
    baseRisk: 2,
    legacy: 'a mainframe or packaged core with batch interfaces, copybooks and a quarterly change calendar',
    regulatory: [
      { obligation: 'Model risk management (SR 11-7, SS1/23)', architecturalControl: 'Model inventory, tiering, independent validation before promotion and periodic revalidation tracked in the registry', evidence: 'Validation report, inventory entry, annual review record', owner: 'Model risk management', cadence: 'Annual and on material change' },
      { obligation: 'Fair lending and adverse-action explanation', architecturalControl: 'Reason codes stored with each decision, protected-attribute proxies tested and a challenge process for declined customers', evidence: 'Disparate-impact report and a sampled adverse-action replay', owner: 'Compliance', cadence: 'Quarterly' },
      { obligation: 'Risk-data aggregation and lineage (BCBS 239, IFRS 9, CECL)', architecturalControl: 'Column-level lineage from source to model input to reported figure, with reconciled totals', evidence: 'Lineage graph and reconciliation sign-off', owner: 'Risk data office', cadence: 'Quarterly' },
      { obligation: 'Operational resilience and third-party risk', architecturalControl: 'Tested failover for the decision service, exit plans for external model providers and an outsourcing register entry', evidence: 'DR test report and vendor exit plan', owner: 'Technology risk', cadence: 'Annual' },
    ],
  },
  'real-estate': {
    capability: 'Valuation, leasing and property operations',
    processes: ['Valuation and underwriting', 'Listing, search and leasing', 'Building operations and maintenance'],
    stakeholders: [
      { who: 'Head of investments and valuation', needs: 'Defensible valuations with ranges and comparables' },
      { who: 'Asset and property managers', needs: 'Portfolio-wide operational optimisation they can audit' },
      { who: 'Brokers, agents and leasing teams', needs: 'Fresh, accurate listings and lead prioritisation' },
      { who: 'Compliance (fair housing, AML)', needs: 'Protected-class features excluded and decisions explainable' },
    ],
    systemsOfRecord: ['Property and portfolio management system', 'Listing (MLS) feed and CRM', 'Building management system (BMS) and IoT hub'],
    upstream: ['MLS and RESO Web API feeds', 'Public records, GIS and aerial imagery', 'BMS telemetry (BACnet, Modbus)'],
    downstream: ['Listing portals and agent tools', 'Valuation and underwriting workflow', 'Maintenance work-order system'],
    owners: ['Portfolio data team', 'Property operations', 'Geospatial team'],
    team: 'PropTech Platform',
    unit: 'property',
    hosting: 'Public cloud with tenant cells per brokerage or portfolio; edge gateways in buildings for BMS data',
    identity: 'OIDC SSO with brokerage or portfolio tenancy, row-level security on listings and leases, agent-scoped access',
    classification: 'Confidential: valuations, rent rolls and lease terms; Restricted: tenant personal data; Licensed: MLS listing data',
    privacy: 'Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models',
    baseRisk: 1,
    legacy: 'fragmented property systems and MLS feeds with inconsistent identifiers and slow update cycles',
    regulatory: [
      { obligation: 'Fair housing and anti-discrimination law', architecturalControl: 'Protected-class features and close proxies excluded from features, disparate-impact tests in the release gate', evidence: 'Disparate-impact report per release', owner: 'Compliance', cadence: 'Per release' },
      { obligation: 'Valuation standards and auditability', architecturalControl: 'Store comparables, adjustments and model version with each valuation; human appraiser review above a value or uncertainty threshold', evidence: 'Valuation replay and reviewer sign-off sample', owner: 'Valuation committee', cadence: 'Quarterly' },
      { obligation: 'Data licensing (MLS) and tenant privacy', architecturalControl: 'Licence-aware access tiers, no redistribution of licensed fields and PII masking in analytics', evidence: 'Licence-policy tests and an access audit', owner: 'Data governance', cadence: 'Quarterly' },
    ],
  },
};
