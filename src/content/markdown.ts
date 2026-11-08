import { DOMAIN_META, LATENCY_LABEL, PARADIGM_LABEL, type Playbook, type UseCase } from '../schemas/usecase.schema';

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
  L.push('', '## Problem formulation', '', `**Objective.** ${u.problemFormulation.businessObjective}`, '', '**Loss / ML objective.**', '', fence('latex', u.problemFormulation.mlObjectiveAndLoss), '', '**Constraints.**', '');
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
  if (u.playbook) playbookMarkdown(u.playbook, L);
  return `${L.join('\n')}\n`;
}

function playbookMarkdown(pb: Playbook, L: string[]) {
  L.push('', '## Build playbook', '', pb.summary, '', '### Before you start', '', '**Skills**', '');
  pb.prerequisites.skills.forEach((x) => L.push(`- ${x}`));
  L.push('', '**Tools**', '');
  pb.prerequisites.tools.forEach((x) => L.push(`- ${x}`));
  L.push('', `**Effort.** ${pb.prerequisites.effort}`, '', '### 1. Data', '', pb.data.strategy, '', '| Dataset | License / access | What it gives you | Caveat |', '|---|---|---|---|');
  pb.data.datasets.forEach((d) => L.push(`| [${esc(d.name)}](${d.url}) | ${esc(d.license)} | ${esc(d.gives)} | ${esc(d.caveat)} |`));
  L.push('', `**Synthetic generator** (\`${pb.data.synthetic.file}\`). ${pb.data.synthetic.description}`, '', '**Knobs**', '');
  pb.data.synthetic.knobs.forEach((k) => L.push(`- ${k}`));
  L.push('', `| ${pb.data.sample.columns.join(' | ')} |`, `|${pb.data.sample.columns.map(() => '---').join('|')}|`);
  pb.data.sample.rows.forEach((r) => L.push(`| ${r.map((c) => esc(String(c))).join(' | ')} |`));
  L.push('', `**Label.** ${pb.data.label}`, '', '### 2. Milestones with exit gates', '');
  pb.milestones.forEach((m) => {
    L.push(`#### ${m.id} · ${m.title} (${m.days} days)`, '');
    m.tasks.forEach((t) => L.push(`- ${t}`));
    L.push('', `*Deliverable:* ${m.deliverable}`, '', `**Exit gate:** ${m.gate.metric} — pass when ${m.gate.threshold}. How: ${m.gate.how}`, '');
  });
  L.push('### 3. Starter kit', '', `Runtime: ${pb.starter.runtime}`, '', fence('bash', pb.starter.run.join('\n')), '', `Expect: ${pb.starter.expected}`, '');
  pb.starter.files.forEach((f) => L.push(`#### ${f.path}`, '', f.purpose, '', fence(f.language === 'text' ? 'text' : f.language, f.code), ''));
  L.push('### 4. Worked example', '', pb.workedExample.scenario, '');
  pb.workedExample.steps.forEach((s) => L.push(`- **${s.stage}** ${s.detail}`));
  L.push('', `**Outcome.** ${pb.workedExample.outcome}`, '', '### 5. Test and acceptance plan', '', '| Test | Tool / command | Pass criterion |', '|---|---|---|');
  pb.tests.forEach((t) => L.push(`| ${esc(t.test)} | ${esc(t.tool)} | ${esc(t.pass)} |`));
  L.push('', '### 6. Decisions', '');
  pb.decisions.forEach((d) => {
    L.push(`**${d.question}**`, '', '| Option | Choose it when |', '|---|---|');
    d.options.forEach((o) => L.push(`| ${esc(o.option)} | ${esc(o.chooseWhen)} |`));
    L.push('', `Default: ${d.default}`, '');
  });
  L.push('### 7. Pitfalls', '', '| At | Mistake | Symptom | Fix |', '|---|---|---|---|');
  pb.pitfalls.forEach((p) => L.push(`| ${p.at} | ${esc(p.mistake)} | ${esc(p.symptom)} | ${esc(p.fix)} |`));
  L.push('', '### 8. The first 30 days', '');
  pb.first30Days.forEach((x) => L.push(`- ${x}`));
}
