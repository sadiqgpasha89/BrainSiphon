import { DOMAIN_META, LATENCY_LABEL, PARADIGM_LABEL, type Agentic, type Playbook, type UseCase } from '../schemas/usecase.schema';

const fence = (lang: string, body: string) => `\`\`\`${lang}\n${body.trim()}\n\`\`\``;
const esc = (s: string) => s.replace(/\|/g, '\\|');

/** Clean markdown export of a blueprint — pipe it straight into an IDE agent. */
export function toMarkdown(u: UseCase, origin = 'https://brainsiphon.com'): string {
  const d = u.systemDesign;
  const L: string[] = [];
  L.push(`# ${u.title}`, '');
  L.push(`> ${DOMAIN_META[u.domain].name} · ${u.mlParadigms.map((p) => PARADIGM_LABEL[p]).join(' + ')} · ${LATENCY_LABEL[u.latencySLA]} · ${u.difficulty}`);
  L.push(`> Last verified against production standards: ${u.lastVerifiedAt} · ${origin}/${u.slug}`, '');
  L.push('## Signal vs. Noise', '', '| Concept | True signal | Common noise | Why engineers fail |', '|---|---|---|---|');
  u.signalVsNoiseMatrix.forEach((r) => L.push(`| ${esc(r.concept)} | ${esc(r.trueSignal)} | ${esc(r.commonNoise)} | ${esc(r.whyEngineersFail)} |`));
  L.push('', '## Problem statement', '', `**Situation.** ${u.problemStatement.situation}`, '', `**Why it is hard.** ${u.problemStatement.whyHard}`, '', `**Scale and stakes.** ${u.problemStatement.scaleAndStakes}`, '', `**Success looks like.** ${u.problemStatement.successLooksLike}`, '', '**What can go wrong.**', '');
  u.problemStatement.risks.forEach((x) => L.push(`- ${x}`));
  L.push('', '## Solution approach', '', u.solutionApproach.thesis, '');
  u.solutionApproach.moves.forEach((m, i) => L.push(`${i + 1}. **${m.move}.** ${m.detail}`));
  L.push('', '**Deliberately not doing.**', '');
  u.solutionApproach.deliberatelyNot.forEach((x) => L.push(`- ${x}`));
  L.push('', `**How it is proven.** ${u.solutionApproach.proof}`);
  L.push('', '## Problem formulation', '', `**Objective.** ${u.problemFormulation.businessObjective}`, '', '**Loss / ML objective.**', '', fence('latex', u.problemFormulation.mlObjectiveAndLoss), '', '**What each symbol stands for.**', '', '| Symbol | Meaning in this use case |', '|---|---|');
  u.problemFormulation.lossVariables.forEach((v) => L.push(`| \`${v.symbol.replace(/\|/g, '\\|')}\` | ${esc(v.meaning)} |`));
  L.push('', '**Constraints.**', '');
  u.problemFormulation.constraints.forEach((c) => L.push(`- ${c}`));
  L.push('', '## Data and features', '', '| High-signal feature | Logic | Intuition | Leakage risk |', '|---|---|---|---|');
  u.dataAndFeatures.highSignalFeatures.forEach((f) => L.push(`| ${esc(f.name)} | ${esc(f.formulaOrLogic)} | ${esc(f.intuition)} | ${esc(f.leakageRisk)} |`));
  L.push('', '**Drop these (noise):**', '');
  u.dataAndFeatures.noisyFeaturesToDrop.forEach((f) => L.push(`- **${f.name}** — ${f.whyItIsNoise}`));
  L.push('', '## Architecture blueprint', '', `**Baseline.** ${u.architectureBlueprint.baselineModel}`, '', `**Production.** ${u.architectureBlueprint.productionModel}`, '', fence('mermaid', u.architectureBlueprint.mermaidDiagram));
  L.push('', '## High-level design (10M users)', '', d.hld.summary, '', fence('mermaid', d.hld.mermaid), '', '| Component | Tech | Responsibility | Budget |', '|---|---|---|---|');
  d.hld.components.forEach((c) => L.push(`| ${esc(c.name)} | ${esc(c.tech)} | ${esc(c.responsibility)} | ${c.latencyBudgetMs === null ? '—' : `${c.latencyBudgetMs} ms`} |`));
  L.push('', '## Sequence diagram', '', fence('mermaid', d.sequence.mermaid), '');
  d.sequence.notes.forEach((n) => L.push(`- ${n}`));
  L.push('', '## Low-level design', '', `### API contract\n\n\`${d.lld.apiContract.method} ${d.lld.apiContract.path}\``, '', 'Request:', '', fence('json', d.lld.apiContract.request), '', 'Response:', '', fence('json', d.lld.apiContract.response));
  L.push('', '### Data model', '', fence('sql', d.lld.dataModelDDL), '', '### Classes', '', fence('mermaid', d.lld.classDiagram), '', '### Core algorithm', '', fence(d.lld.algorithm.language, d.lld.algorithm.code), '', '### Config', '', fence('yaml', d.lld.config), '', '### Degradation ladder', '', '| Level | Trigger | Behaviour |', '|---|---|---|');
  d.lld.degradationLadder.forEach((x) => L.push(`| L${x.level} | ${esc(x.trigger)} | ${esc(x.behaviour)} |`));
  L.push('', '## End-to-end breakdown', '');
  d.e2e.forEach((p) => {
    L.push(`### ${p.phase}. ${p.title}`, '');
    p.steps.forEach((s) => L.push(`- ${s}`));
    L.push('', `*Deliverable:* ${p.deliverable}`, '');
  });
  L.push('## Scale to 10M users', '', '| Metric | Value | How |', '|---|---|---|');
  d.scale.table.forEach((r) => L.push(`| ${esc(r.metric)} | ${esc(r.value)} | ${esc(r.how)} |`));
  L.push('', '**Assumptions**', '');
  d.scale.assumptions.forEach((a) => L.push(`- ${a}`));
  L.push('', '**Why each stage exists here.**', '', '| Stage | Role here | What lands on it | Budget | If it fails |', '|---|---|---|---|---|');
  u.architectureRationale.forEach((r) => L.push(`| ${esc(r.stage)} (${esc(r.tech)}) | ${esc(r.role)} | ${esc(r.carries)} | ${esc(r.budget)} | ${esc(r.onFailure)} |`));
  L.push('', '**Bottlenecks**', '');
  d.scale.bottlenecks.forEach((a) => L.push(`- ${a}`));
  L.push('', '**Resilience**', '');
  d.scale.resilience.forEach((a) => L.push(`- ${a}`));
  L.push('', '## Evaluation', '', '**Offline.**', '');
  u.evaluationAndMetrics.offlineMetrics.forEach((x) => L.push(`- ${x}`));
  L.push('', '**Online business.**', '');
  u.evaluationAndMetrics.onlineBusinessMetrics.forEach((x) => L.push(`- ${x}`));
  L.push('', '**Offline→online gap traps.**', '');
  u.evaluationAndMetrics.offlineOnlineGapTraps.forEach((x) => L.push(`- ${x}`));
  L.push('', '## Production edge cases', '', '| Scenario | Failure mode | Mitigation |', '|---|---|---|');
  u.productionEdgeCases.forEach((e) => L.push(`| ${esc(e.scenario)} | ${esc(e.failureMode)} | ${esc(e.mitigationStrategy)} |`));
  agenticMarkdown(u.agentic, L);
  if (u.playbook) playbookMarkdown(u.playbook, L);
  return `${L.join('\n')}\n`;
}

function agenticMarkdown(a: Agentic, L: string[]) {
  L.push('', '## Agentic solution', '', `**Fit:** ${a.fit} · **Role:** ${a.role} · **Pattern:** ${a.pattern}`, '', a.rationale, '', '### Agents', '');
  L.push('| Agent | Responsibility | Trigger | Tools | Starts at | Hands off to |', '|---|---|---|---|---|---|');
  a.agents.forEach((x) => L.push(`| ${esc(x.name)} | ${esc(x.responsibility)} | ${esc(x.trigger)} | ${esc(x.tools.join(', '))} | ${x.autonomy} | ${esc(x.handoff)} |`));
  L.push('', '```mermaid', a.architecture, '```', '', '```mermaid', a.sequence, '```', '', '### Typed tools', '', '| Tool | Access | Backed by | Permission |', '|---|---|---|---|');
  a.tools.forEach((t) => L.push(`| ${esc(t.name)} | ${t.access} | ${esc(t.backedBy)} | ${esc(t.permission)} |`));
  L.push('', '### Autonomy ladder', '');
  a.autonomy.forEach((l) => L.push(`- **${l.level} ${l.name}.** ${l.behaviour}. *Gate:* ${l.gate}`));
  L.push('', '### Context and memory', '');
  a.context.forEach((c) => L.push(`- **${c.kind}.** ${c.detail}`));
  L.push('', '### Guardrails', '', '| Risk | Control |', '|---|---|');
  a.guardrails.forEach((g) => L.push(`| ${esc(g.risk)} | ${esc(g.control)} |`));
  L.push('', '### Evaluation', '', '| What | Metric | Target | How |', '|---|---|---|---|');
  a.evaluation.forEach((e) => L.push(`| ${esc(e.what)} | ${esc(e.metric)} | ${esc(e.target)} | ${esc(e.how)} |`));
  L.push('', '### Failure modes', '', '| Scenario | Response |', '|---|---|');
  a.failureModes.forEach((f) => L.push(`| ${esc(f.scenario)} | ${esc(f.response)} |`));
  L.push('', '### Budgets', '');
  a.budget.forEach((b) => L.push(`- **${b.item}.** ${b.value}`));
  L.push('', '### Build order', '');
  a.buildSteps.forEach((s, i) => L.push(`${i + 1}. **${s.step}.** ${s.deliverable}`));
  L.push('', '### When not to use an agent', '');
  a.whenNotToUse.forEach((x) => L.push(`- ${x}`));
}

function playbookMarkdown(pb: Playbook, L: string[]) {
  L.push('', '## Build playbook', '', pb.summary, '', '### Before you start', '', '**Skills**', '');
  pb.prerequisites.skills.forEach((x) => L.push(`- ${x}`));
  L.push('', '**Tools**', '');
  pb.prerequisites.tools.forEach((x) => L.push(`- ${x}`));
  L.push('', `**Effort.** ${pb.prerequisites.effort}`, '', '### 1. Domain knowledge and terminology', '', pb.domainKnowledge.overview, '');
  pb.domainKnowledge.concepts.forEach((c) => L.push(`**${c.name}.** ${c.explanation} *Why it matters here:* ${c.whyItMatters}`, ''));
  L.push('| Term | What it means in this domain |', '|---|---|');
  pb.domainKnowledge.glossary.forEach((g) => L.push(`| ${esc(g.term)} | ${esc(g.definition)} |`));
  L.push('', '**Questions to ask the domain experts**', '');
  pb.domainKnowledge.askTheExperts.forEach((q) => L.push(`- ${q}`));
  L.push('', '### 2. Data', '', pb.data.strategy, '', '| Dataset | License / access | What it gives you | Caveat |', '|---|---|---|---|');
  pb.data.datasets.forEach((d) => L.push(`| [${esc(d.name)}](${d.url}) | ${esc(d.license)} | ${esc(d.gives)} | ${esc(d.caveat)} |`));
  L.push('', `**Synthetic generator** (\`${pb.data.synthetic.file}\`). ${pb.data.synthetic.description}`, '', '**Knobs**', '');
  pb.data.synthetic.knobs.forEach((k) => L.push(`- ${k}`));
  L.push('', `| ${pb.data.sample.columns.join(' | ')} |`, `|${pb.data.sample.columns.map(() => '---').join('|')}|`);
  pb.data.sample.rows.forEach((r) => L.push(`| ${r.map((c) => esc(String(c))).join(' | ')} |`));
  L.push('', `**Label.** ${pb.data.label}`, '', '### 3. Milestones with exit gates', '');
  pb.milestones.forEach((m) => {
    L.push(`#### ${m.id} · ${m.title} (${m.days} days)`, '');
    m.tasks.forEach((t) => L.push(`- ${t}`));
    L.push('', `*Deliverable:* ${m.deliverable}`, '', `**Exit gate:** ${m.gate.metric} — pass when ${m.gate.threshold}. How: ${m.gate.how}`, '');
  });
  L.push('### 4. Starter kit', '', `Runtime: ${pb.starter.runtime}`, '', fence('bash', pb.starter.run.join('\n')), '', `Expect: ${pb.starter.expected}`, '');
  pb.starter.files.forEach((f) => L.push(`#### ${f.path}`, '', f.purpose, '', fence(f.language === 'text' ? 'text' : f.language, f.code), ''));
  L.push('### 5. Worked example', '', pb.workedExample.scenario, '');
  pb.workedExample.steps.forEach((s) => L.push(`- **${s.stage}** ${s.detail}`));
  L.push('', `**Outcome.** ${pb.workedExample.outcome}`, '', '### 6. Test and acceptance plan', '', '| Test | Tool / command | Pass criterion |', '|---|---|---|');
  pb.tests.forEach((t) => L.push(`| ${esc(t.test)} | ${esc(t.tool)} | ${esc(t.pass)} |`));
  L.push('', '### 7. Decisions', '');
  pb.decisions.forEach((d) => {
    L.push(`**${d.question}**`, '', '| Option | Choose it when |', '|---|---|');
    d.options.forEach((o) => L.push(`| ${esc(o.option)} | ${esc(o.chooseWhen)} |`));
    L.push('', `Default: ${d.default}`, '');
  });
  L.push('### 8. Pitfalls', '', '| At | Mistake | Symptom | Fix |', '|---|---|---|---|');
  pb.pitfalls.forEach((p) => L.push(`| ${p.at} | ${esc(p.mistake)} | ${esc(p.symptom)} | ${esc(p.fix)} |`));
  L.push('', '### 9. The first 30 days', '');
  pb.first30Days.forEach((x) => L.push(`- ${x}`));
}
