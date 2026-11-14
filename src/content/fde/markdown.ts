import type { Hop, ImplementationPlaybook } from '../../schemas/implementation.schema';
import { FDE_STAGES, STAGE_BY_ID } from './workflow';

const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const fence = (lang: string, body: string) => `\`\`\`${lang}\n${body.trim()}\n\`\`\``;
const table = (head: string[], rows: string[][]): string[] => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(esc).join(' | ')} |`)];

function hopMarkdown(h: Hop, L: string[]) {
  L.push(`### ${h.id}: ${h.name}`, '', `*${h.necessity} · ${h.direction}*. ${h.purpose}`, '');
  L.push('**1. External protocol**', '', ...table(['Source', 'Target', 'Protocol', 'Boundary', 'Authentication', 'Network'], [[h.external.source, h.external.target, h.external.protocol, h.external.boundary, h.external.authentication, h.external.network]]), '');
  L.push(`**2. Connector and transformation** (adapter: \`${h.connector.adapter}\`)`, '');
  h.connector.transformation.forEach((t) => L.push(`- ${t}`));
  L.push('', '*Error handling*', '');
  h.connector.errorHandling.forEach((t) => L.push(`- ${t}`));
  L.push('', `Retry: ${h.connector.retry}. Timeout: ${h.connector.timeout}. Idempotency: ${h.connector.idempotency}.`, '');
  L.push(`**3. Internal contract** \`${h.contract.name}\``, '', '```text', `request:  ${h.contract.request}`, `response: ${h.contract.response}`, `event:    ${h.contract.event}`, '```', '');
  L.push(`**4. Acknowledgement** (${h.acknowledgement.protocol})`, '', fence('text', h.acknowledgement.example), '', `Expected: ${h.acknowledgement.expectedOutput}`, '');
  L.push('**Mappings**', '', ...table(['External', 'Internal', 'Rule'], h.mappings.map((m) => [m.external, m.internal, m.rule])), '');
  L.push(fence('mermaid', h.sequence), '', '**Integration tests**', '', ...table(['Id', 'Layer', 'Case', 'Given', 'When', 'Then'], h.tests.map((t) => [t.id, t.layer, t.title, t.given, t.when, t.then])), '');
  const cmds = h.tests.filter((t) => t.command).map((t) => t.command!);
  if (cmds.length) L.push('Run:', '', fence('bash', [...new Set(cmds)].join('\n')), '');
  if (h.artifacts.length) L.push('**Code and fixtures**', '', ...h.artifacts.map((a) => `- \`${a}\``), '');
}

/** One Markdown document per use case: the Customer Implementation Playbook an FDE can follow end to end. */
export function implementationMarkdown(pb: ImplementationPlaybook, origin = 'https://brainsiphon.com'): string {
  const L: string[] = [];
  L.push(`# Customer Implementation Playbook: ${pb.title}`, '');
  L.push(`> ${pb.provenance.kind === 'authored' ? 'Authored from an executable pack' : 'Derived from the blueprint'} · mode ${pb.mode} · ${origin}/${pb.slug}`, `> ${pb.provenance.note}`, '');
  L.push(pb.summary, '');
  L.push('## 1. Ownership: who does what', '', '**The FDE owns**', '', ...pb.ownership.fdeOwns.map((x) => `- ${x}`), '', '**The FDE supports**', '', ...pb.ownership.fdeSupports.map((x) => `- ${x}`), '');
  L.push('### RACI', '', ...table(['Deliverable', 'FDE', 'Platform', 'Architect', 'AI Eng', 'SRE', 'Customer'], pb.ownership.raci.map((r) => [r.deliverable, r.fde, r.platform, r.architect, r.aiEngineer, r.sre, r.customer])), '');
  L.push('### The FDE can do alone', '', ...table(['Task', 'Evidence'], pb.ownership.independent.map((r) => [r.task, r.evidence])), '', '### Needs approval', '', ...table(['Task', 'Approver', 'Evidence'], pb.ownership.needsApproval.map((r) => [r.task, r.approver, r.evidence])), '', '### Escalation', '', ...table(['Trigger', 'To', 'Within', 'How'], pb.ownership.escalation.map((r) => [r.trigger, r.to, r.within, r.how])), '');
  L.push('## 2. Maturity and what is missing for production', '', `**Reached:** ${pb.maturity.reached}. ${pb.maturity.verdict}`, '', `**Next:** ${pb.maturity.next}`, '', ...table(['Id', 'Stage', 'Task', 'Owner', 'Evidence'], pb.maturity.tasks.map((t) => [t.id, STAGE_BY_ID[t.stage].name, `${t.title}: ${t.detail}`, t.owner, t.evidence])), '');
  L.push('## 3. Discovery questions', '', ...table(['Id', 'Area', 'Question', 'Why it matters', 'Ask', 'Evidence'], pb.discovery.map((d) => [d.id, d.area, d.question, d.why, d.askWho, d.evidence])), '');
  L.push('## 4. Systems and alternatives', '', ...table(['Role', 'System', 'Need', 'Purpose', 'Alternatives', 'Customer owner', 'If no access'], pb.systems.map((s) => [s.role, s.name, s.need, s.purpose, s.alternatives.map((a) => a.name + (a.adapter ? ` (${a.adapter})` : '')).join('; '), s.customerOwner, s.ifNoAccess])), '');
  L.push('## 5. Integrations, layer by layer', '');
  pb.integrations.forEach((h) => hopMarkdown(h, L));
  L.push('## 6. Identity, permissions and network', '', `**Workforce:** ${pb.identity.workforce}`, '', `**Machine:** ${pb.identity.machine}`, '');
  if (pb.identity.partner) L.push(`**Partner:** ${pb.identity.partner}`, '');
  pb.identity.notes.forEach((n) => L.push(`- ${n}`));
  L.push('', '### Permissions to request', '', ...table(['System', 'Permission', 'Scope', 'Why', 'Approver'], pb.permissions.map((p) => [p.system, p.permission, p.scope, p.why, p.approver])), '', '### Network paths and firewall changes', '', ...table(['Id', 'From', 'To', 'Port', 'Protocol', 'Purpose'], pb.network.map((n) => [n.id, n.from, n.to, n.port, n.protocol, n.purpose])), '');
  L.push('## 7. Connectors, mocks and local development', '', ...table(['Adapter', 'Role', 'Config', 'Mock'], pb.connectors.map((c) => [c.adapter, c.role, c.config, c.mock])), '', '**Prerequisites**', '', ...pb.localDev.prerequisites.map((p) => `- ${p}`), '');
  pb.localDev.steps.forEach((s, i) => L.push(`${i + 1}. **${s.title}**`, '', fence('bash', s.command), '', `   Expect: ${s.expect}`, ''));
  L.push('## 8. Customer configuration', '');
  pb.configuration.files.forEach((f) => L.push(`### \`${f.path}\``, '', fence(f.language === 'env' ? 'bash' : f.language, f.content), ''));
  L.push(...table(['Key', 'Required', 'Description', 'Example'], pb.configuration.keys.map((k) => [k.key, k.required ? 'yes' : 'no', k.description, k.example])), '');
  L.push('## 9. Tests', '', ...table(['Suite', 'Covers', 'Command'], pb.testing.suites.map((s) => [s.name, s.covers, `\`${s.command}\``])), '', '### Acceptance tests', '', ...table(['Id', 'Case', 'Given', 'When', 'Then'], pb.testing.acceptance.map((t) => [t.id, t.title, t.given, t.when, t.then])), '');
  L.push('## 10. Rollout and rollback', '', pb.rollout.strategy, '', ...table(['Stage', 'Traffic', 'Gate', 'Rollback'], pb.rollout.stages.map((s) => [s.stage, s.traffic, s.gate, s.rollback])), '', `**Fallback.** ${pb.rollout.fallback}`, '', '**Reconciliation**', '', ...pb.rollout.reconciliation.map((r) => `- ${r}`), '');
  L.push('## 11. Deployment commands', '', pb.deployment.note, '');
  (['preflight', 'deploy', 'verify', 'rollback', 'cleanup'] as const).forEach((k) => L.push(`### ${k[0]!.toUpperCase()}${k.slice(1)}`, '', fence('bash', pb.deployment.commands[k].join('\n')), ''));
  L.push('## 12. Troubleshooting', '');
  pb.troubleshooting.specific.forEach((t) => L.push(`### ${t.title}`, '', `**Symptoms:** ${t.symptoms.join('; ')}`, '', '**Diagnose**', '', fence('bash', t.diagnose.join('\n')), '', `**Likely cause:** ${t.cause}`, '', '**Fix**', '', ...t.fix.map((f) => `- ${f}`), '', `**Verify:** ${t.verify.join('; ')}`, ''));
  L.push(`Shared scenarios from the knowledge base: ${pb.troubleshooting.scenarioIds.join(', ')}.`, '');
  L.push('## 13. Deliverables', '', '### The FDE delivers', '', ...table(['Id', 'Deliverable', 'Stage', 'Evidence'], pb.deliverables.fde.map((d) => [d.id, d.title, STAGE_BY_ID[d.stage].name, d.evidence])), '', '### The customer provides', '', ...table(['Id', 'Dependency', 'Owner', 'Needed by', 'Blocks'], pb.deliverables.customer.map((d) => [d.id, d.title, d.owner, STAGE_BY_ID[d.neededBy].name, d.blocks])), '');
  L.push('## 14. Acceptance and handover', '', ...table(['Id', 'Category', 'Criterion', 'Measure', 'Threshold', 'Evidence', 'Owner'], pb.acceptance.criteria.map((c) => [c.id, c.category, c.criterion, c.measure, c.threshold, c.evidence, c.owner])), '', '**Handover pack**', '', ...pb.acceptance.handover.map((h) => `- ${h}`), '');
  L.push('## 15. Stage checklist', '');
  for (const st of FDE_STAGES) {
    const items = pb.checklist.filter((c) => c.stage === st.id);
    if (!items.length) continue;
    L.push(`### ${st.n}. ${st.name}`, '', ...items.map((c) => `- [ ] ${c.id} (${c.owner}${c.approval ? ', needs approval' : ''}) ${c.item}`), '');
  }
  return `${L.join('\n')}\n`;
}
