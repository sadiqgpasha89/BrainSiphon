/**
 * Who does what between the FDE and the other roles, and where the FDE's own authority ends. Every blueprint carries this lens; the
 * Customer Implementation Playbook adds the use-case-specific rows.
 */
import type { FdeStageId } from '../../schemas/implementation.schema';

export type Letter = 'R' | 'A' | 'A/R' | 'C' | 'I' | '';

export interface RaciRow {
  deliverable: string;
  stage: FdeStageId;
  fde: Letter;
  platform: Letter;
  architect: Letter;
  aiEngineer: Letter;
  sre: Letter;
  customer: Letter;
}

/** R does it, A answers for it. The FDE is Responsible for customer-environment work and Accountable for acceptance and adoption. */
export const FDE_RACI: RaciRow[] = [
  { deliverable: 'Customer discovery log and customer systems map', stage: 'customer-discovery', fde: 'R', platform: 'I', architect: 'C', aiEngineer: 'C', sre: 'I', customer: 'A' },
  { deliverable: 'Completed environment templates and readiness report', stage: 'environment-discovery', fde: 'A/R', platform: 'C', architect: 'C', aiEngineer: 'I', sre: 'C', customer: 'C' },
  { deliverable: 'Firewall, DNS, identity and access requests filed and tracked', stage: 'environment-discovery', fde: 'A/R', platform: 'C', architect: 'I', aiEngineer: 'I', sre: 'I', customer: 'R' },
  { deliverable: 'Integration specification per hop (four layers)', stage: 'integration-discovery', fde: 'R', platform: 'C', architect: 'A', aiEngineer: 'C', sre: 'C', customer: 'C' },
  { deliverable: 'Adapter and connector configuration for the customer systems', stage: 'solution-configuration', fde: 'A/R', platform: 'I', architect: 'C', aiEngineer: 'C', sre: 'I', customer: 'C' },
  { deliverable: 'Data-access approvals and service-account register', stage: 'data-access', fde: 'A/R', platform: 'C', architect: 'I', aiEngineer: 'I', sre: 'I', customer: 'R' },
  { deliverable: 'Landing zone, cluster, network and identity foundations', stage: 'customer-deployment', fde: 'C', platform: 'A/R', architect: 'C', aiEngineer: 'I', sre: 'C', customer: 'C' },
  { deliverable: 'Model, prompts, retrieval and agent logic', stage: 'local-development', fde: 'C', platform: 'I', architect: 'C', aiEngineer: 'A/R', sre: 'I', customer: 'I' },
  { deliverable: 'Deployment into the customer environment through their change process', stage: 'customer-deployment', fde: 'A/R', platform: 'R', architect: 'I', aiEngineer: 'C', sre: 'C', customer: 'C' },
  { deliverable: 'Integration test report in the customer environment', stage: 'integration-testing', fde: 'A/R', platform: 'C', architect: 'C', aiEngineer: 'C', sre: 'C', customer: 'C' },
  { deliverable: 'User acceptance testing and customer sign-off', stage: 'uat', fde: 'R', platform: 'I', architect: 'I', aiEngineer: 'C', sre: 'I', customer: 'A' },
  { deliverable: 'Production rollout: shadow, canary, ramp', stage: 'production-rollout', fde: 'R', platform: 'C', architect: 'I', aiEngineer: 'C', sre: 'C', customer: 'A' },
  { deliverable: 'SLOs, observability, on-call and runbooks', stage: 'production-rollout', fde: 'C', platform: 'C', architect: 'I', aiEngineer: 'I', sre: 'A/R', customer: 'C' },
  { deliverable: 'Customer acceptance report and operational handover pack', stage: 'customer-acceptance', fde: 'A/R', platform: 'C', architect: 'C', aiEngineer: 'C', sre: 'R', customer: 'R' },
  { deliverable: 'User training and adoption tracking', stage: 'customer-acceptance', fde: 'A/R', platform: 'I', architect: 'I', aiEngineer: 'C', sre: 'I', customer: 'C' },
  { deliverable: 'Customer-side incident coordination and escalation', stage: 'day-two-support', fde: 'A/R', platform: 'C', architect: 'I', aiEngineer: 'C', sre: 'R', customer: 'C' },
  { deliverable: 'Production incident response and recovery', stage: 'day-two-support', fde: 'C', platform: 'C', architect: 'I', aiEngineer: 'C', sre: 'A/R', customer: 'I' },
];

export const ROLE_DIFFERENCES: { role: string; owns: string; fdeDifference: string }[] = [
  { role: 'Platform Engineer', owns: 'The cloud, cluster, network, identity and pipeline foundations', fdeDifference: 'The FDE finds out what the customer\'s foundations allow and gets requests approved; the platform engineer builds and runs them. The FDE never changes shared platform configuration.' },
  { role: 'Solution Architect', owns: 'The enterprise integration architecture and its decision records', fdeDifference: 'The architect decides the integration boundaries; the FDE implements and proves them in the customer\'s environment and reports where reality differs.' },
  { role: 'AI Engineer', owns: 'Model, prompt, retrieval and agent logic and its evaluation', fdeDifference: 'The FDE configures and integrates the AI component for the customer and feeds real edge cases back; changing model behaviour is the AI engineer\'s decision.' },
  { role: 'SRE / DevOps Engineer', owns: 'SLOs, observability, on-call, incident response and recovery', fdeDifference: 'The SRE takes the pages; the FDE coordinates customer-side issues (access, network, data, users) and escalates platform faults.' },
];

export const FDE_INDEPENDENT: { task: string; evidence: string }[] = [
  { task: 'Run read-only environment discovery and the pre-flight checks', evidence: 'readiness-report.json' },
  { task: 'Configure connectors, mappings and non-security settings in the customer workspace', evidence: 'Configuration diff and contract-test output' },
  { task: 'Develop and test adapters against mocks and simulators', evidence: 'Test results' },
  { task: 'Run integration and UAT sessions with the customer\'s users', evidence: 'Test and UAT records' },
  { task: 'Triage customer-side incidents and apply documented, reversible remediation inside approved scope', evidence: 'Incident record' },
  { task: 'Prepare change requests, evidence and the acceptance report', evidence: 'Draft documents in the workspace' },
];

export const FDE_NEEDS_APPROVAL: { task: string; approver: string; evidence: string }[] = [
  { task: 'Opening a firewall port, a private endpoint or a DNS zone link', approver: 'Customer network and security team', evidence: 'Approved change ticket' },
  { task: 'Creating or widening a service account, role or API scope', approver: 'Customer IAM and security', evidence: 'Access approval and the permission check output' },
  { task: 'Reading production or personal data, or moving data across a boundary', approver: 'Data owner and privacy officer', evidence: 'Signed access request with purpose' },
  { task: 'Deploying into a customer environment', approver: 'Customer change advisory board and platform owner', evidence: 'Approved change request' },
  { task: 'Changing a threshold, policy, routing rule or any value that changes business decisions', approver: 'The decision owner', evidence: 'Signed decision record (ADR)' },
  { task: 'Enabling an action that changes customer systems (containment, schedule publication, order creation)', approver: 'Business owner and security', evidence: 'Signed grant with scope, approvers and expiry' },
  { task: 'Switching traffic to the new system, and ramping it', approver: 'Product owner, SRE and risk (go/no-go)', evidence: 'Recorded go/no-go' },
  { task: 'Accepting a risk or a deferred requirement', approver: 'Sponsor or risk owner', evidence: 'Signed exception' },
];

export const FDE_ESCALATION: { trigger: string; to: string; within: string; how: string }[] = [
  { trigger: 'A blocker on the customer side for more than 3 working days (access, firewall, approval)', to: 'The customer sponsor through the delivery lead', within: '1 working day', how: 'Blocker record with owner, ticket, date raised and impact on the plan' },
  { trigger: 'A security finding or any suspected data exposure or cross-tenant leak', to: 'Security engineer and the customer\'s security contact; stop the affected flow', within: 'Immediately', how: 'Incident record; stop the change; do not investigate by pulling more data' },
  { trigger: 'A guardrail breach or a failed canary', to: 'SRE and the product owner; roll back with the rehearsed procedure', within: 'Immediately', how: 'Rollback first, diagnosis second' },
  { trigger: 'The blueprint does not match the customer\'s reality (a missing system, a different protocol)', to: 'Solution architect', within: '2 working days', how: 'Gap record with evidence and a proposed adaptation' },
  { trigger: 'A defect in an adapter or a pack', to: 'AI engineer or platform engineer (the code owner)', within: '2 working days', how: 'Failing test and the customer-environment evidence' },
];
