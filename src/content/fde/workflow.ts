/**
 * The FDE delivery workflow: twelve stages from customer discovery to day-two support. Each states what must be true before it
 * starts, what the FDE does, the commands, what it produces, what it depends on and the exit criteria. The workspace turns it into
 * a dated, customer-specific plan from a selected blueprint.
 */
import type { FdeStageId } from '../../schemas/implementation.schema';

export interface FdeStage {
  id: FdeStageId;
  n: number;
  name: string;
  short: string;
  /** the delivery-guide phase(s) this stage sits in */
  phases: string[];
  goal: string;
  prerequisites: string[];
  activities: string[];
  commands: string[];
  deliverables: string[];
  dependsOn: FdeStageId[];
  /** things only the customer can provide, which block this stage */
  customerDependencies: string[];
  exitCriteria: string[];
  /** typical share of an engagement and the default working days for a small first release */
  defaultDays: number;
}

export const FDE_STAGES: FdeStage[] = [
  {
    id: 'customer-discovery', n: 1, name: 'Customer discovery', short: 'Discovery', phases: ['p0'],
    goal: 'Agree what decision the system supports, for whom, with which customer systems, under which approvals, and how success will be measured.',
    prerequisites: ['A sponsor and a named decision owner on the customer side', 'The blueprint for the use case selected, with its Customer Implementation Playbook open'],
    activities: ['Run the use-case discovery questions with the people who do the work, not only the sponsor', 'Name the customer owner for every system, data set and approval', 'Write the as-is and to-be process and the manual fallback', 'Record the customer systems and which alternatives they run instead of the blueprint\'s', 'List regulatory and contractual constraints'],
    commands: ['open the Customer Implementation Playbook for the use case and export its discovery questions: workspace -> Plan -> Discovery'],
    deliverables: ['Discovery log with confirmed answers and owners', 'Customer systems map with alternatives', 'Approval map: who must say yes to what'],
    dependsOn: [], customerDependencies: ['Interviews with end users and process owners', 'Names of system, data and security owners'],
    exitCriteria: ['Every discovery question has a confirmed answer or an owned risk', 'The customer systems map is signed by the sponsor', 'Success measures (the KPIs) are written as definitions with a baseline source'], defaultDays: 5,
  },
  {
    id: 'environment-discovery', n: 2, name: 'Enterprise environment discovery', short: 'Environment', phases: ['p0'],
    goal: 'Find out, before any design is fixed, what the customer\'s network, identity, cloud and security landscape allows. Customer approvals and firewall changes are the usual critical path: start them now.',
    prerequisites: ['Stage 1 has named the systems involved', 'A jump host or the customer\'s approved way to run read-only checks'],
    activities: ['Complete the thirteen discovery templates with the customer (topology, VPC/VNet, firewall, proxy, DNS, identity, service accounts, databases, Kafka, API gateway, secrets, residency, cloud access)', 'Raise every firewall, DNS, identity and access request immediately: they have the longest lead time', 'Decide the deployment mode (customer cloud, Kubernetes, on-premises, hybrid, air-gapped, managed SaaS)', 'Run the pre-flight checks and attach the readiness report'],
    commands: ['cd fde-toolkit && cp config/preflight.example.json preflight.json', 'python3 -m bs_preflight validate-config --config preflight.json', 'python3 -m bs_preflight run --config preflight.json --out readiness-report.json --markdown readiness-report.md', 'bash shell/preflight.sh targets.tsv readiness-report.json   # no Python on the host'],
    deliverables: ['Completed environment templates', 'readiness-report.json (machine-readable)', 'Deployment mode decision with the customer security team\'s agreement', 'Access and firewall request log with tickets and owners'],
    dependsOn: ['customer-discovery'], customerDependencies: ['Network, DNS, IAM and cloud-platform contacts', 'Firewall and access change windows', 'Read-only account for discovery'],
    exitCriteria: ['Readiness verdict is READY or every blocking failure has an owner and a date', 'All access requests are filed and ticketed', 'The deployment mode is agreed'], defaultDays: 5,
  },
  {
    id: 'integration-discovery', n: 3, name: 'System integration discovery', short: 'Integrations', phases: ['p1'],
    goal: 'Turn "integrate with the customer\'s systems" into specified hops: the external protocol, the connector, the internal contract and the acknowledgement, for each system.',
    prerequisites: ['Stage 2 environment facts', 'Interface documentation or sandbox access for each system'],
    activities: ['For each hop confirm protocol, boundary, authentication, network path, request and response contracts, event schemas, transformation rules, error handling, retry and timeout, idempotency', 'Choose the adapter for each system (or a customer-specific one) and record versions', 'Agree the data mapping with the data owner and record what is unmapped', 'Decide what is core and what is an optional extension'],
    commands: ['cd fde-adapters && python3 -m fde_adapters list', 'python3 -m fde_adapters check --config configs/<adapter>.connector.json --mock', 'cd ../fde-packs/<domain>/<use-case> && python3 -m pytest tests -q'],
    deliverables: ['Integration specification per hop (four layers) with sequence diagrams', 'Data mapping signed by the data owner', 'Adapter selection and connector compatibility record'],
    dependsOn: ['environment-discovery'], customerDependencies: ['Interface specifications and test endpoints', 'Data dictionary and field owners'],
    exitCriteria: ['Every core hop has a specification the customer\'s system owner has reviewed', 'Unknown fields and codes are listed with owners', 'Security has seen the identity and network design'], defaultDays: 5,
  },
  {
    id: 'data-access', n: 4, name: 'Data-access enablement', short: 'Data access', phases: ['p2'],
    goal: 'Get lawful, least-privilege, audited access to the data and prove the data contracts hold.',
    prerequisites: ['Stage 3 mappings', 'Data classification and the approval path from the risk tier'],
    activities: ['Submit access requests with the purpose stated, through the customer\'s own process', 'Create service accounts with the smallest permissions that work and prove the denied cases', 'Sign data contracts with the producing teams', 'Complete the privacy and data-residency review', 'Profile the data and reconcile identifiers'],
    commands: ['python3 -m bs_preflight run --config preflight.json --only service_accounts --only databases --only kafka', 'python3 -m fde_adapters check --config <connector>.json   # against the real system once access exists'],
    deliverables: ['Access approvals and the service-account register', 'Signed data contracts', 'Privacy impact assessment', 'Data profile and reconciliation report'],
    dependsOn: ['integration-discovery'], customerDependencies: ['Data-owner approvals', 'Security approval of service accounts', 'Privacy and legal review'],
    exitCriteria: ['Data access is approved and evidenced for every core source', 'Service-account permission checks pass, including the must-fail checks', 'Data contracts are signed and the quality checks run'], defaultDays: 10,
  },
  {
    id: 'solution-configuration', n: 5, name: 'Solution configuration', short: 'Configuration', phases: ['p3'],
    goal: 'Configure the blueprint for this customer: connectors, mappings, thresholds, policies and environment settings, without forking the code.',
    prerequisites: ['Stages 3 and 4 outputs', 'Customer decisions on thresholds, routing and fallback behaviour'],
    activities: ['Write the connector configurations and field mappings', 'Set thresholds, routing rules, calendars and escalation policies with the decision owner', 'Generate the customer deployment configuration for the chosen mode', 'Record every decision as an ADR with the customer approver'],
    commands: ['open the workspace -> Packages and generate the customer package for the selected blueprint and mode', 'python3 -m fde_adapters contract --config <connector>.json   # contract battery against the mock'],
    deliverables: ['Connector configurations and mappings', 'Decision log (ADRs) with customer approvals', 'Generated deployment configuration (values, variables, environment template)'],
    dependsOn: ['data-access'], customerDependencies: ['Decision owner\'s thresholds and policies in writing'],
    exitCriteria: ['Configuration is complete and reviewed', 'Every threshold and policy has a named customer approver', 'No credential is in a file'], defaultDays: 5,
  },
  {
    id: 'local-development', n: 6, name: 'Local development and mocks', short: 'Local dev', phases: ['p3'],
    goal: 'Build and test the integration code against mocks and simulators, so progress does not wait for customer access.',
    prerequisites: ['Connector specifications', 'The use case\'s pack or reference implementation'],
    activities: ['Run the pack simulators and fixtures', 'Implement customer-specific variations as adapters or profiles', 'Write contract tests for each hop and run them against the mocks', 'Replay recorded or synthetic traffic'],
    commands: ['cd fde-packs/<domain>/<use-case> && python3 -m pytest tests -q', 'cd fde-adapters && python3 -m pytest tests -q', 'python3 -m fde_adapters mock <system>   # serve a vendor-shaped mock on localhost'],
    deliverables: ['Working adapters and mappings', 'Contract tests per hop', 'Replay results'],
    dependsOn: ['integration-discovery'], customerDependencies: [],
    exitCriteria: ['All hop tests pass against mocks', 'Replay shows the expected decisions on the customer\'s sample data', 'Code is reviewed by the platform engineer'], defaultDays: 10,
  },
  {
    id: 'customer-deployment', n: 7, name: 'Customer-environment deployment', short: 'Deployment', phases: ['p4', 'p5'],
    goal: 'Deploy into the customer\'s environment through their change process, with infrastructure validated first and rollback rehearsed.',
    prerequisites: ['Stage 5 generated configuration', 'Approved change request', 'Images and packages available inside the customer environment'],
    activities: ['Mirror images, packages and charts into the customer\'s private registries', 'Validate the infrastructure (plan, policy checks, permissions) before applying', 'Deploy with traffic off or behind a flag', 'Run smoke tests and confirm telemetry', 'Rehearse rollback and record the time it takes'],
    commands: ['terraform -chdir=deployment/terraform/<cloud> init -backend-config=../backend.hcl', 'terraform -chdir=deployment/terraform/<cloud> plan -var-file=../environments/<env>.tfvars -out=tfplan', 'helm lint deployment/helm/ai-solution -f deployment/helm/ai-solution/values-<env>.yaml', 'helm upgrade --install <release> deployment/helm/ai-solution -n <ns> -f values-<env>.yaml --atomic --wait', 'bash deployment/smoke-test.sh https://<endpoint>'],
    deliverables: ['Deployed environment with an inventory', 'Validation evidence (plan, policy, smoke test)', 'Rehearsed rollback record'],
    dependsOn: ['solution-configuration', 'local-development'], customerDependencies: ['Change approval and window', 'Platform team to run or approve the apply', 'Registry and package mirrors'],
    exitCriteria: ['Smoke tests pass in the customer environment', 'Dashboards and alerts receive data', 'Rollback has been executed once in a non-production environment'], defaultDays: 5,
  },
  {
    id: 'integration-testing', n: 8, name: 'Integration testing', short: 'Integration tests', phases: ['p4'],
    goal: 'Prove every integration hop in the customer environment: contracts, failure behaviour, idempotency, security and performance.',
    prerequisites: ['Stage 7 deployment', 'Test data approved for use'],
    activities: ['Run the contract tests against the real systems (sandbox first)', 'Inject the failures: timeout, rate limit, outage, malformed message, duplicate', 'Prove idempotency and ordering', 'Measure latency per hop against the budget', 'Run the security tests, including the cross-tenant and least-privilege cases'],
    commands: ['python3 -m bs_preflight run --config preflight.json --out readiness-report.json   # re-run in the target environment', 'cd fde-packs/<domain>/<use-case> && python3 -m pytest tests -q', 'bash deployment/smoke-test.sh https://<endpoint>'],
    deliverables: ['Integration test report per hop', 'Performance and failure-injection results', 'Security test results'],
    dependsOn: ['customer-deployment'], customerDependencies: ['Sandbox or test tenants of each customer system', 'Test accounts'],
    exitCriteria: ['All core hop tests pass', 'Failure behaviour matches the specification', 'Security has reviewed the results'], defaultDays: 7,
  },
  {
    id: 'uat', n: 9, name: 'User acceptance testing', short: 'UAT', phases: ['p4'],
    goal: 'Let the customer\'s own users prove the system works in their workflow, with their data and their definition of correct.',
    prerequisites: ['Stage 8 passed', 'UAT plan agreed with the product owner', 'Users trained for UAT'],
    activities: ['Run the business acceptance scenarios with end users', 'Capture defects and feedback with owners', 'Review the model\'s worst mistakes with the domain expert', 'Record the business measures against the baseline'],
    commands: ['open the workspace -> Acceptance and record each scenario result with its evidence'],
    deliverables: ['UAT results and defect log', 'Domain-expert review of errors', 'Baseline-versus-pilot measures'],
    dependsOn: ['integration-testing'], customerDependencies: ['End users\' time', 'Product owner decisions on defects'],
    exitCriteria: ['Business acceptance scenarios pass, or each failure is accepted with a named owner', 'No open severity-1 defect'], defaultDays: 7,
  },
  {
    id: 'production-rollout', n: 10, name: 'Production rollout', short: 'Rollout', phases: ['p5'],
    goal: 'Move production traffic in controlled steps with automatic guardrails and a rehearsed way back.',
    prerequisites: ['Go/no-go decision', 'Operations accepted the runbooks', 'Rollback rehearsed'],
    activities: ['Run shadow mode and compare with the existing process', 'Ramp in steps with guardrails and stopping rules', 'Run daily hypercare reviews', 'Reconcile decisions against outcomes'],
    commands: ['helm upgrade --install <release> deployment/helm/ai-solution -n <ns> -f values-prod.yaml --atomic --wait', 'helm history <release> -n <ns>   # the rollback target', 'helm rollback <release> <revision> -n <ns> --wait   # when a guardrail breaks'],
    deliverables: ['Shadow report', 'Ramp log with the decision at each step', 'Hypercare log'],
    dependsOn: ['uat'], customerDependencies: ['Go/no-go signers available', 'Change window'],
    exitCriteria: ['The planned traffic share is served within the SLOs', 'No guardrail breached, or each breach was handled by the rehearsed rollback', 'Reconciliation shows no unexplained difference'], defaultDays: 10,
  },
  {
    id: 'customer-acceptance', n: 11, name: 'Customer acceptance and handover', short: 'Acceptance', phases: ['p5'],
    goal: 'Prove the Definition of Done with evidence and transfer ownership: acceptance report, signed handover, trained users, named operators.',
    prerequisites: ['Stage 10 complete', 'Evidence collected throughout'],
    activities: ['Generate the customer acceptance report from the collected evidence', 'Review each Definition-of-Done criterion with its owner', 'Transfer operational ownership and credentials', 'Train the customer\'s operators and users', 'Collect signatures'],
    commands: ['open the workspace -> Acceptance -> Generate acceptance report', 'python3 fde-evidence/collect_inventory.py --terraform-state terraform.tfstate --out evidence/inventory.json', 'python3 fde-evidence/build_handover_pack.py --workspace workspace.json --evidence evidence --out handover-pack'],
    deliverables: ['Customer acceptance report with evidence references', 'Signed operational handover pack', 'Training records'],
    dependsOn: ['production-rollout'], customerDependencies: ['Signatories for acceptance and handover', 'Named operations owners'],
    exitCriteria: ['Every Definition-of-Done criterion is met with evidence, or an accepted exception', 'Operations has accepted the service in writing'], defaultDays: 5,
  },
  {
    id: 'day-two-support', n: 12, name: 'Day-two support', short: 'Day two', phases: ['p6'],
    goal: 'Coordinate customer-side incidents, track adoption and business outcomes, and feed edge cases back to engineering.',
    prerequisites: ['Handover accepted', 'On-call and escalation paths published'],
    activities: ['Triage customer-side incidents with the troubleshooting knowledge base', 'Track adoption and the business KPIs against the baseline', 'Coordinate changes through the customer\'s change process', 'Run the monthly service review', 'Record learnings into the playbook'],
    commands: ['python3 -m bs_preflight run --config preflight.json --out readiness-report.json   # re-run after any customer change', 'open the workspace -> Troubleshooting for the scenario, diagnostics and verification commands'],
    deliverables: ['Incident records', 'Adoption and business-outcome report', 'Monthly service review notes'],
    dependsOn: ['customer-acceptance'], customerDependencies: ['Support desk and on-call rota', 'Change-management contact'],
    exitCriteria: ['Incidents are within the agreed response times', 'KPIs are reported monthly against the baseline', 'Open improvement actions have owners'], defaultDays: 30,
  },
];

export const STAGE_BY_ID: Record<FdeStageId, FdeStage> = Object.fromEntries(FDE_STAGES.map((s) => [s.id, s])) as Record<FdeStageId, FdeStage>;

/** Stages whose work can overlap. Environment discovery starts with customer discovery because access requests have the longest lead time. */
export const STAGE_OVERLAP: Partial<Record<FdeStageId, number>> = { 'environment-discovery': 0.6, 'local-development': 0.7, 'data-access': 0.3, 'integration-testing': 0.2 };
