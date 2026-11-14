/**
 * The FDE Definition of Done. "The model runs" is not done. Ten measurable categories, each with a threshold, the evidence that
 * proves it and who signs. The acceptance report is generated from the evidence attached in the workspace.
 */
import type { FdeStageId } from '../../schemas/implementation.schema';

export interface DodCategory {
  id: string;
  title: string;
  measure: string;
  /** the default threshold; a use case overrides it with its own numbers */
  threshold: string;
  evidence: string[];
  signer: string;
  stage: FdeStageId;
}

export const DOD_CATEGORIES: DodCategory[] = [
  { id: 'requirements', title: 'Customer requirements implemented', measure: 'Requirements with a passing acceptance test, over all in-scope requirements', threshold: '100% of in-scope requirements pass; every deferral is signed by the product owner', evidence: ['Requirements traceability matrix', 'UAT results'], signer: 'Product owner', stage: 'uat' },
  { id: 'integrations', title: 'Enterprise integrations working', measure: 'Core integration hops with passing contract, failure and idempotency tests in the customer environment', threshold: 'All core hops pass; optional hops are either passing or explicitly out of scope', evidence: ['Integration test report per hop', 'Readiness report from the target environment'], signer: 'Solution architect and the customer system owners', stage: 'integration-testing' },
  { id: 'data-access', title: 'Data access approved', measure: 'Sources with an approval, a purpose statement and a least-privilege service account, over all sources used', threshold: '100% of sources approved; denied-permission checks pass', evidence: ['Access approvals', 'Service-account register', 'Service-account permission check output'], signer: 'Data owners and security', stage: 'data-access' },
  { id: 'data-contracts', title: 'Data contracts validated', measure: 'Contracts signed and their quality assertions passing (completeness, freshness, uniqueness, validity)', threshold: 'All contracts signed; quality assertions pass on the last 7 days of production-shaped data', evidence: ['Signed data contracts', 'Data quality run output'], signer: 'Data owners', stage: 'data-access' },
  { id: 'security', title: 'Security approved', measure: 'Threat model reviewed, findings closed or accepted, penetration or red-team result, secrets and identity reviewed', threshold: 'No open critical or high finding without a signed risk acceptance', evidence: ['Security sign-off', 'Test results', 'SBOM and scan report'], signer: 'Security engineer and the customer security team', stage: 'integration-testing' },
  { id: 'deployment', title: 'Deployment verified', measure: 'Deployed commit, image digest, configuration version and model version recorded; smoke tests, dashboards and rollback verified', threshold: 'Smoke tests pass; rollback executed once; inventory matches the plan', evidence: ['Release evidence (commit, digest, config and model versions)', 'Smoke test output', 'Rollback rehearsal record', 'Infrastructure inventory'], signer: 'SRE and platform engineer', stage: 'customer-deployment' },
  { id: 'acceptance-tests', title: 'Acceptance tests passed', measure: 'Business acceptance scenarios passed by the customer\'s users', threshold: 'All scenarios pass or each failure is accepted by the product owner with a ticket', evidence: ['UAT sign-off', 'Defect log'], signer: 'Product owner', stage: 'uat' },
  { id: 'kpis', title: 'Business KPIs measurable', measure: 'Each KPI has a definition, a baseline, a data source, an owner and a first reading', threshold: 'Every KPI is reported from production data with its baseline', evidence: ['KPI definitions', 'Baseline report', 'First production readout'], signer: 'Decision owner and finance', stage: 'production-rollout' },
  { id: 'ownership', title: 'Operational ownership transferred', measure: 'Named service owner, on-call rota, runbooks, SLOs and credentials transferred and accepted', threshold: 'Operations accepted the service in writing; the rota has at least two people', evidence: ['Handover pack', 'On-call schedule', 'Credential transfer record'], signer: 'Operations lead', stage: 'customer-acceptance' },
  { id: 'training', title: 'Customer users trained', measure: 'Share of target users and operators who completed training, with a competence check', threshold: 'At least 90% of target users and 100% of operators', evidence: ['Attendance and assessment records'], signer: 'Business owner', stage: 'customer-acceptance' },
];

export interface Evidence {
  id: string;
  /** the DoD category, or 'general' */
  category: string;
  title: string;
  kind: 'test-result' | 'report' | 'approval' | 'screenshot' | 'log' | 'config' | 'link' | 'other';
  /** sha256 of the attached file, or empty for a link */
  sha256: string;
  name: string;
  size: number;
  url?: string;
  addedBy: string;
  at: string;
  note?: string;
}

export interface CriterionState {
  id: string;
  category: string;
  status: 'not-started' | 'in-progress' | 'met' | 'accepted-exception' | 'failed';
  measured?: string;
  exception?: { reason: string; approvedBy: string };
  signedBy?: string;
  signedAt?: string;
}

export interface CategoryReport {
  id: string;
  title: string;
  status: 'met' | 'accepted-exception' | 'incomplete' | 'failed';
  criteria: { id: string; criterion: string; threshold: string; status: CriterionState['status']; measured: string; signer: string; signed: boolean }[];
  evidence: Evidence[];
  gaps: string[];
}

export interface AcceptanceReport {
  customer: string;
  blueprint: string;
  generatedAt: string;
  verdict: 'ACCEPTED' | 'ACCEPTED_WITH_EXCEPTIONS' | 'NOT_ACCEPTED';
  summary: { categories: number; met: number; exceptions: number; incomplete: number; failed: number; criteria: number; evidenceItems: number };
  categories: CategoryReport[];
  openBlockers: string[];
}

/**
 * Build the report from the criteria states and the evidence. A category is `met` only when each of its criteria is met (or accepted
 * as an exception by a named person), it is signed, and at least one piece of evidence is attached. The report never says "met" for
 * something without evidence.
 */
export function buildAcceptanceReport(input: {
  customer: string;
  blueprint: string;
  now: string;
  criteria: { id: string; category: string; criterion: string; threshold: string; signer: string }[];
  states: Record<string, CriterionState | undefined>;
  evidence: Evidence[];
  openBlockers?: string[];
}): AcceptanceReport {
  const cats = [...new Set(input.criteria.map((c) => c.category))];
  const reports: CategoryReport[] = cats.map((cat) => {
    const cs = input.criteria.filter((c) => c.category === cat);
    const ev = input.evidence.filter((e) => e.category === cat);
    const rows = cs.map((c) => {
      const st = input.states[c.id];
      return { id: c.id, criterion: c.criterion, threshold: c.threshold, status: st?.status ?? 'not-started', measured: st?.measured ?? '', signer: c.signer, signed: Boolean(st?.signedBy) };
    });
    const gaps: string[] = [];
    for (const r of rows) {
      if (r.status === 'failed') gaps.push(`${r.id} failed`);
      else if (r.status === 'not-started' || r.status === 'in-progress') gaps.push(`${r.id} is ${r.status.replace('-', ' ')}`);
      if ((r.status === 'met' || r.status === 'accepted-exception') && !r.signed) gaps.push(`${r.id} has no signature from ${r.signer}`);
      if (r.status === 'accepted-exception' && !input.states[r.id]?.exception?.approvedBy) gaps.push(`${r.id} exception has no approver`);
    }
    if (rows.every((r) => r.status === 'met' || r.status === 'accepted-exception') && ev.length === 0) gaps.push('no evidence attached');
    const failed = rows.some((r) => r.status === 'failed');
    const exceptions = rows.some((r) => r.status === 'accepted-exception');
    const status: CategoryReport['status'] = failed ? 'failed' : gaps.length ? 'incomplete' : exceptions ? 'accepted-exception' : 'met';
    return { id: cat, title: cat, status, criteria: rows, evidence: ev, gaps };
  });
  const count = (s: CategoryReport['status']) => reports.filter((r) => r.status === s).length;
  const verdict: AcceptanceReport['verdict'] = count('failed') || count('incomplete') || (input.openBlockers ?? []).length ? 'NOT_ACCEPTED' : count('accepted-exception') ? 'ACCEPTED_WITH_EXCEPTIONS' : 'ACCEPTED';
  return {
    customer: input.customer, blueprint: input.blueprint, generatedAt: input.now, verdict,
    summary: { categories: reports.length, met: count('met'), exceptions: count('accepted-exception'), incomplete: count('incomplete'), failed: count('failed'), criteria: input.criteria.length, evidenceItems: input.evidence.length },
    categories: reports, openBlockers: input.openBlockers ?? [],
  };
}

export function acceptanceMarkdown(r: AcceptanceReport, titles: Record<string, string> = {}): string {
  const L = [`# Customer acceptance report: ${r.customer}`, '', `Blueprint: ${r.blueprint}  ·  Generated ${r.generatedAt}`, '', `**Verdict: ${r.verdict.replaceAll('_', ' ')}**`, '',
    `${r.summary.met} of ${r.summary.categories} categories met, ${r.summary.exceptions} with accepted exceptions, ${r.summary.incomplete} incomplete, ${r.summary.failed} failed. ${r.summary.criteria} criteria, ${r.summary.evidenceItems} evidence items.`, ''];
  if (r.openBlockers.length) L.push('## Open customer-side blockers', '', ...r.openBlockers.map((b) => `- ${b}`), '');
  for (const c of r.categories) {
    L.push(`## ${titles[c.id] ?? c.title}: ${c.status.replaceAll('-', ' ')}`, '', '| Criterion | Threshold | Status | Measured | Signed |', '|---|---|---|---|---|');
    for (const x of c.criteria) L.push(`| ${x.criterion.replace(/\|/g, '/')} | ${x.threshold.replace(/\|/g, '/')} | ${x.status.replaceAll('-', ' ')} | ${x.measured.replace(/\|/g, '/') || '-'} | ${x.signed ? 'yes' : 'no'} |`);
    L.push('');
    if (c.evidence.length) L.push('Evidence:', ...c.evidence.map((e) => `- ${e.title} (${e.kind}, ${e.name || e.url || 'link'}${e.sha256 ? `, sha256 ${e.sha256.slice(0, 12)}…` : ''}, added by ${e.addedBy} on ${e.at.slice(0, 10)})`), '');
    if (c.gaps.length) L.push('Gaps:', ...c.gaps.map((g) => `- ${g}`), '');
  }
  return L.join('\n');
}
