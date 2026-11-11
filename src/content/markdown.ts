import { ARTIFACT_KINDS, ARTIFACT_META, COMPLETION_META, DELIVERY_META, type ArtifactKind } from '../lib/artifacts';
import { PROBLEM_LABEL } from '../lib/problem-types';
import { PRIMITIVE_BY_ID } from './primitives';
import { evaluationPlan, guardrailPlan } from './assurance';
import { blueprintStatuses, shortSha, type ReleaseManifest } from './release';
import { LIFECYCLE_PHASES, ROLE_LIFECYCLE, ROLE_META, ROLE_OWNS } from '../lib/roles';
import { DOMAIN_META, LATENCY_LABEL, PARADIGM_LABEL, type Agentic, type Playbook, type UseCase, ARCHETYPE_LABEL, isAgentic } from '../schemas/usecase.schema';

const fence = (lang: string, body: string) => `\`\`\`${lang}\n${body.trim()}\n\`\`\``;
const esc = (s: string) => s.replace(/\|/g, '\\|');
/** One line before a code block saying what kind of artifact it is, so a reader (or a model) never has to infer it. */
const kindLine = (k: ArtifactKind) => `*Artifact kind: ${ARTIFACT_META[k].label}. ${ARTIFACT_META[k].runs}*`;
const LEGEND = ARTIFACT_KINDS.map((k) => `- **${ARTIFACT_META[k].label}.** ${ARTIFACT_META[k].meaning}`);

/** Clean markdown export of a blueprint — pipe it straight into an IDE agent. */
export function toMarkdown(u: UseCase, origin = 'https://brainsiphon.com', release: ReleaseManifest | null = null): string {
  const d = u.systemDesign;
  const L: string[] = [];
  L.push(`# ${u.title}`, '');
  L.push(`> ${DOMAIN_META[u.domain].name} · ${u.mlParadigms.map((p) => PARADIGM_LABEL[p]).join(' + ')} · ${LATENCY_LABEL[u.latencySLA]} · ${u.difficulty}`);
  // five separate statuses, never one "verified" verdict
  const statuses = blueprintStatuses(u, release);
  L.push(`> Validation: ${statuses.map((x) => `${x.label} ${x.text.toLowerCase()}`).join(' · ')}`);
  L.push(`> ${release ? `Release ${release.contentVersion} · commit ${shortSha(release.sourceCommit)} · validated ${release.validatedAt ?? 'not in this build'}${release.deployedAt ? ` · deployed ${release.deployedAt}` : ''}` : 'Release information is not available for this export'} · Risk tier: ${u.governance.riskTier} · ${origin}/${u.slug}`, '');
  discoveryMarkdown(u, L);
  enterpriseMarkdown(u, L);
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
  L.push('', '## High-level design (10M users)', '', d.hld.summary, '', `**Topology (${d.topology.stance}).** ${d.topology.summary}`, '', `- *Inference plane:* ${d.topology.inferencePlane}`, `- *State plane:* ${d.topology.statePlane}`);
  d.topology.notes.forEach((n) => L.push(`- ${n}`));
  L.push('', fence('mermaid', d.hld.mermaid), '', '| Component | Tech | Responsibility | Budget |', '|---|---|---|---|');
  d.hld.components.forEach((c) => L.push(`| ${esc(c.name)} | ${esc(c.tech)} | ${esc(c.responsibility)} | ${c.latencyBudgetMs === null ? '—' : `${c.latencyBudgetMs} ms`} |`));
  L.push('', '## Sequence diagram', '', fence('mermaid', d.sequence.mermaid), '');
  d.sequence.notes.forEach((n) => L.push(`- ${n}`));
  L.push('', '## Low-level design', '', `**Archetype:** ${ARCHETYPE_LABEL[d.lld.archetype]} · **Status:** ${d.lld.status === 'expert-reviewed' ? 'expert reviewed' : 'illustrative implementation scaffold, not a complete production LLD'}`, '', '**What the artifact labels mean**', '', ...LEGEND, '', `### API contract\n\n${kindLine(d.lld.artifacts.apiContract)}\n\n\`${d.lld.apiContract.method} ${d.lld.apiContract.path}\``, '', 'Request:', '', fence('json', d.lld.apiContract.request), '', 'Response:', '', fence('json', d.lld.apiContract.response));
  L.push('', '### Data model', '', kindLine(d.lld.artifacts.dataModelDDL), '', fence('sql', d.lld.dataModelDDL), '', '### Classes', '', kindLine(d.lld.artifacts.classDiagram), '', fence('mermaid', d.lld.classDiagram), '', '### Core algorithm', '', kindLine(d.lld.artifacts.algorithm), '', fence(d.lld.algorithm.language, d.lld.algorithm.code), '', '### Config', '', kindLine(d.lld.artifacts.config), '', fence('yaml', d.lld.config), '', '### Degradation ladder', '', '| Level | Trigger | Behaviour |', '|---|---|---|');
  d.lld.degradationLadder.forEach((x) => L.push(`| L${x.level} | ${esc(x.trigger)} | ${esc(x.behaviour)} |`));
  L.push('', '### Event schema', '', kindLine(d.lld.artifacts.eventSchema), '', fence('json', d.lld.eventSchema), '', '### Failure and retry behaviour', '', '| Failure | Behaviour |', '|---|---|');
  d.lld.failureAndRetry.forEach((x) => L.push(`| ${esc(x.failure)} | ${esc(x.behaviour)} |`));
  L.push('', '### Security and access model', '', '| Surface | Control |', '|---|---|');
  d.lld.securityModel.forEach((x) => L.push(`| ${esc(x.surface)} | ${esc(x.control)} |`));
  L.push('', '### Test scenarios', '', '| Scenario | Kind | Assertion |', '|---|---|---|');
  d.lld.testScenarios.forEach((x) => L.push(`| ${esc(x.scenario)} | ${x.kind} | ${esc(x.assertion)} |`));
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
  evaluationMarkdown(u, L);
  L.push('', '## Production edge cases', '', '| Scenario | Failure mode | Mitigation |', '|---|---|---|');
  u.productionEdgeCases.forEach((e) => L.push(`| ${esc(e.scenario)} | ${esc(e.failureMode)} | ${esc(e.mitigationStrategy)} |`));
  L.push('', '## Role lenses: production gaps by persona', '');
  u.roleLenses.forEach((r) => {
    L.push(`### ${ROLE_META[r.role].label}`, '', `*${r.focus}*`, '', '**In the lifecycle.**', '');
    LIFECYCLE_PHASES.forEach((p) => {
      const text = ROLE_LIFECYCLE[r.role][p.id];
      if (text) L.push(`- ${p.label}: ${text}`);
    });
    L.push('', '**For this system.**', '');
    r.items.forEach((i) => {
      const p = i.primitive ? PRIMITIVE_BY_ID[i.primitive] : undefined;
      L.push(`- **${i.title}.** ${i.detail}${p ? ` See [${p.title}](${origin}/patterns/primitives/${p.id}).` : ''}`);
    });
    L.push('');
  });
  L.push('### Reference primitives', '');
  u.primitives.forEach((id) => {
    const p = PRIMITIVE_BY_ID[id];
    if (p) L.push(`- [${p.title}](${origin}/patterns/primitives/${p.id}): ${p.summary}`);
  });
  governanceMarkdown(u, L);
  mlopsMarkdown(u, L);
  operationsMarkdown(u, L);
  experimentationMarkdown(u, L);
  metricsMarkdown(u, L);
  agenticMarkdown(u.agentic, L);
  if (u.playbook) playbookMarkdown(u.playbook, L);
  validationMarkdown(u, L, release);
  return `${L.join('\n')}\n`;
}

function experimentationMarkdown(u: UseCase, L: string[]) {
  const x = u.experimentation;
  L.push('', '## Statistical validation and experimentation', '', `**Question.** ${x.question}`, '', `**Estimand.** ${x.estimand}`, '', `**Design.** ${x.design.type} · unit: ${x.design.unit}`, '', x.design.why, '', `**Interference.** ${x.design.interference}`, '');
  L.push(`- **Primary metric.** ${x.metrics.primary}`, `- **Offline to online.** ${x.metrics.offlineOnlineGap}`, `- **Significance.** alpha ${x.power.alpha}, power ${Math.round(x.power.power * 100)}%`, `- **Minimum detectable effect.** ${x.power.mde}`, `- **Sample-size rule.** ${x.power.sampleSizeRule}`, `- **Duration.** ${x.power.duration}`);
  L.push('', '**Guardrails**', '');
  x.metrics.guardrails.forEach((g) => L.push(`- ${g}`));
  L.push('', '**Stopping rules**', '');
  x.stopping.forEach((g) => L.push(`- ${g}`));
  L.push('', '### Labels, sampling and data quality', '', `- **Label maturity.** ${x.labels.maturity}`, `- **Label quality.** ${x.labels.quality}`, `- **Selection bias.** ${x.labels.selectionBias}`, `- **Sampling.** ${x.sampling}`, '');
  x.dataQuality.forEach((g) => L.push(`- ${g}`));
  L.push('', '### Calibration, uncertainty, slices and causal methods', '', `- **Calibration.** ${x.calibration}`, `- **Uncertainty.** ${x.uncertainty}`, `- **Causal method.** ${x.causal.method}. Use it when: ${x.causal.when}.`, `- **Counterfactual evaluation.** ${x.counterfactual}`, '', '**Slices**', '');
  x.slices.forEach((g) => L.push(`- ${g}`));
  L.push('', '### Business value', '', '| Measure | How |', '|---|---|');
  x.businessValue.forEach((b) => L.push(`| ${esc(b.metric)} | ${esc(b.how)} |`));
  L.push('', '**Common failure modes**', '');
  x.pitfalls.forEach((g) => L.push(`- ${g}`));
}

function metricsMarkdown(u: UseCase, L: string[]) {
  const x = u.metrics;
  const total = x.layers.reduce((n, l) => n + l.rows.length, 0);
  L.push('', '## Metrics catalogue', '', `${total} metrics in ${x.layers.length} layers. ${x.basis}`, '', '```mermaid', x.tree, '```');
  for (const l of x.layers) {
    L.push('', `### ${l.title}`, '', l.why, '', '| Metric | Kind | What it measures | Target | Cadence | Owner | If it breaches |', '|---|---|---|---|---|---|---|');
    l.rows.forEach((r) => L.push(`| ${esc(r.metric)} | ${r.kind} | ${esc(r.definition)} | ${esc(r.target)} | ${esc(r.cadence)} | ${esc(r.owner)} | ${esc(r.onBreach)} |`));
  }
  if (x.notApplicable.length) {
    L.push('', '### Layers that do not apply here', '');
    x.notApplicable.forEach((n) => L.push(`- **${n.layer}.** ${n.reason}`));
  }
  L.push('', '### Monitors for this system\'s own edge cases', '', '| Edge case | Signal to watch | Alert when | Response |', '|---|---|---|---|');
  x.failureMonitors.forEach((f) => L.push(`| ${esc(f.scenario)} | ${esc(f.signal)} | ${esc(f.threshold)} | ${esc(f.response)} |`));
  L.push('', '### How these metrics get gamed', '', '| Metric | How it misleads | Read it beside |', '|---|---|---|');
  x.gaming.forEach((g) => L.push(`| ${esc(g.metric)} | ${esc(g.risk)} | ${esc(g.counter)} |`));
}

function agenticMarkdown(a: Agentic, L: string[]) {
  L.push('', '## Agentic solution', '', `**Fit:** ${a.fit} · **Role:** ${a.role} · **Pattern:** ${a.pattern}`, '', a.rationale, '', '### Do we need an agent at all?', '', `**${a.decision.question}**`, '', '| Approach | Start with it when | Verdict | Why |', '|---|---|---|---|');
  a.decision.options.forEach((o) => L.push(`| ${esc(o.approach)} | ${esc(o.startWhen)} | ${o.verdict} | ${esc(o.reason)} |`));
  L.push('', `- **What would justify an agent.** ${a.decision.measurableValue}`, `- **Incremental cost.** ${a.decision.incrementalCost}`, `- **Operational risk.** ${a.decision.operationalRisk}`, `- **Fallback architecture.** ${a.decision.fallbackArchitecture}`, '', '**Revisit when**', '');
  a.decision.revisitWhen.forEach((x) => L.push(`- ${x}`));
  if (!isAgentic(a.fit)) {
    L.push('', '### Recommended architecture without agents', '', '```mermaid', a.architecture, '```', '', '```mermaid', a.sequence, '```', '', '### When not to add an agent here', '');
    a.whenNotToUse.forEach((x) => L.push(`- ${x}`));
    return;
  }
  L.push('', '### Agents', '');
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
  const c = pb.compatibility;
  const k = pb.completion;
  L.push('', '## Build playbook', '', pb.summary, '', '### What this playbook gives you, and where your platform starts', '');
  L.push(`- **Starter kit verdict.** ${c.verdict === 'exact' ? 'Exact match' : c.verdict === 'adaptable' ? 'Adaptable match' : 'No compatible starter kit'}. ${c.statement}`);
  L.push(`- **Problem type.** ${PROBLEM_LABEL[c.problemType]} (decided ${c.basis.charAt(0).toLowerCase()}${c.basis.slice(1)})`);
  L.push(`- **Executable artifacts reach.** ${COMPLETION_META[k.reached].label}${k.conditional ? ' (only after the listed modifications)' : ''}. ${k.boundary}`, '');
  L.push('| State | Status | Evidence | Still needed |', '|---|---|---|---|');
  k.states.forEach((st) => L.push(`| ${COMPLETION_META[st.state].label} | ${st.status === 'conditional' ? 'after modifications' : st.status === 'reached' ? 'reached' : 'not reached'} | ${esc(st.evidence)} | ${esc(st.stillNeeded.join('; ') || 'nothing')} |`));
  L.push('', '**What the artifact labels mean**', '', ...LEGEND, '', '### Fit with the starter kit', '', '| Dimension | This use case needs | The kit provides | Fit |', '|---|---|---|---|');
  c.dimensions.forEach((d) => L.push(`| ${d.dimension} | ${esc(d.needs)} | ${esc(d.provides)} | ${d.status}${d.change ? `: ${esc(d.change)}` : ''} |`));
  if (c.verdict === 'none') {
    L.push('', '**Why no kit fits**', '');
    c.blockers.forEach((b) => L.push(`- ${b}`));
    if (c.closest) L.push('', `Closest kit, for background reading only: ${c.closest.label}. ${c.closest.whyNot} It is not a starter for this use case.`);
  } else {
    L.push('', '**What carries over**', '');
    c.reusable.forEach((r) => L.push(`- ${r}`));
    if (c.modifications.length) {
      L.push('', '**Modifications required first**', '');
      c.modifications.forEach((m) => L.push(`- ${m}`));
    }
  }
  L.push('', '### Before you start', '', '**Skills**', '');
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
  if (pb.data.synthetic && pb.data.sample) {
    L.push('', `**Synthetic generator** (\`${pb.data.synthetic.file}\`). ${pb.data.synthetic.description}`, '', '**Knobs**', '');
    pb.data.synthetic.knobs.forEach((k) => L.push(`- ${k}`));
    L.push('', `| ${pb.data.sample.columns.join(' | ')} |`, `|${pb.data.sample.columns.map(() => '---').join('|')}|`);
    pb.data.sample.rows.forEach((r) => L.push(`| ${r.map((c) => esc(String(c))).join(' | ')} |`));
  } else L.push('', '**No synthetic data is supplied.** No reference kit generates this problem\'s data.');
  L.push('', `**Label.** ${pb.data.label}`, '', '### 3. Milestones with exit gates', '');
  pb.milestones.forEach((m) => {
    L.push(`#### ${m.id} · ${m.title} (${m.days} days)`, '', `*Delivery: ${DELIVERY_META[m.delivery].label}. Completes: ${COMPLETION_META[m.state].label}.*`, '');
    m.tasks.forEach((t) => L.push(`- ${t}`));
    L.push('', `*Deliverable:* ${m.deliverable}`, '', `**Exit gate:** ${m.gate.metric} — pass when ${m.gate.threshold}. How: ${m.gate.how}`, '');
  });
  if (pb.starter) {
    L.push('### 4. Starter kit', '', c.verdict === 'adaptable' ? '**Adapt before you rely on it:** this kit implements a neighbouring problem; make the modifications above first.' : 'Runs on synthetic data; it is not production code.', '', `Runtime: ${pb.starter.runtime}`, '', fence('bash', pb.starter.run.join('\n')), '', `Expect: ${pb.starter.expected}`, '');
    pb.starter.files.forEach((f) => L.push(`#### ${f.path}`, '', f.purpose, '', kindLine(f.kind), '', fence(f.language === 'text' ? 'text' : f.language, f.code), ''));
  } else L.push('### 4. Starter kit', '', `**None.** ${c.statement} No code, data generator or run command is supplied for this use case.`, '');
  L.push('### 5. Worked example', '', `*Basis: ${pb.workedExample.basis === 'reference-kit' ? 'run on the starter kit' : 'blueprint only, nothing was run'}.* ${pb.workedExample.scenario}`, '');
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

function discoveryMarkdown(u: UseCase, L: string[]) {
  const x = u.discovery;
  const t = (head: string[], rows: string[][]) => {
    L.push(`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`);
    rows.forEach((r) => L.push(`| ${r.map(esc).join(' | ')} |`));
  };
  L.push('## Phase 0: Enterprise discovery and business requirements (compulsory)', '', `> Status: ${x.status}. ${x.summary}`, '', '### The eight questions to settle first', '');
  t(['Question', 'Proposed starting answer', 'Confirm with', 'Evidence that closes it'], x.questions.map((q) => [q.question, q.proposedAnswer, q.confirmWith, q.evidence]));
  L.push('', '### AS-IS process', '');
  x.process.asIs.forEach((a, i) => L.push(`${i + 1}. ${a}`));
  L.push('', '### TO-BE process', '');
  x.process.toBe.forEach((a, i) => L.push(`${i + 1}. ${a}`));
  L.push('', '**What changes for people**', '');
  x.process.changes.forEach((a) => L.push(`- ${a}`));
  L.push('', '### Stakeholders', '');
  t(['Stakeholder', 'Needs', 'Involvement'], x.stakeholders.map((s) => [s.who, s.needs, s.involvement]));
  L.push('', '### User journeys', '');
  x.journeys.forEach((j) => {
    L.push(`**${j.persona}.** ${j.goal}`, '');
    j.steps.forEach((a, i) => L.push(`${i + 1}. ${a}`));
    L.push('', `*When it is wrong:* ${j.whenWrong}`, '');
  });
  L.push('### Functional requirements and acceptance criteria', '');
  t(['ID', 'Requirement', 'Acceptance criterion'], x.requirements.map((r) => [r.id, r.requirement, r.acceptance]));
  L.push('', '### RACI', '');
  t(['Activity', 'Responsible', 'Accountable', 'Consulted', 'Informed'], x.raci.map((r) => [r.activity, r.responsible, r.accountable, r.consulted, r.informed]));
  const b = x.businessCase;
  L.push('', '### Business case and ROI measurement', '', `- **Baseline.** ${b.baseline}`, `- **Target.** ${b.target}`, `- **Value drivers.** ${b.valueDrivers.join('; ')}`, `- **ROI formula.** ${b.roiFormula}`, '', '**Costs**', '');
  b.costs.forEach((a) => L.push(`- ${a}`));
  L.push('', '**How it is measured**', '');
  b.measurement.forEach((a) => L.push(`- ${a}`));
  L.push('', '**Assumptions**', '');
  b.assumptions.forEach((a) => L.push(`- ${a}`));
  L.push('', '### Phase 0 exit gate (all open until confirmed with a real client)', '');
  x.exitGate.forEach((g) => L.push(`- [ ] ${g.criterion} (${g.owner})`));
  L.push('', '### Common engineering lifecycle', '', 'Every role below works inside the same phases; pick several roles to combine their responsibilities.', '');
  LIFECYCLE_PHASES.forEach((p) => L.push(`- **${p.label}${p.mandatory ? ' (compulsory)' : ''}**`));
  L.push('');
}

function enterpriseMarkdown(u: UseCase, L: string[]) {
  const e = u.enterpriseContext;
  const dm = u.decisionMatrix;
  const t = (head: string[], rows: string[][]) => {
    L.push(`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`);
    rows.forEach((r) => L.push(`| ${r.map(esc).join(' | ')} |`));
  };
  L.push('## Enterprise solution context', '', '### Business architecture', '', `- **Capability.** ${e.business.capability}`, `- **Processes.** ${e.business.processes.join('; ')}`, `- **Decision ownership.** ${e.business.decisionOwner}`, `- **Current state.** ${e.business.currentState}`, `- **Target state.** ${e.business.futureState}`, `- **KPIs.** ${e.business.kpis.join('; ')}`, '');
  t(['Stakeholder', 'Needs'], e.business.stakeholders.map((s) => [s.who, s.needs]));
  L.push('', '### Application and integration architecture', '', `- **Systems of record.** ${e.application.systemsOfRecord.join('; ')}`, `- **Upstream.** ${e.application.upstream.join('; ')}`, `- **Downstream.** ${e.application.downstream.join('; ')}`, '', fence('mermaid', e.c4Context), '', fence('mermaid', e.c4Container), '');
  t(['Boundary', 'Style', 'Contract', 'On failure'], e.application.integration.map((i) => [i.boundary, i.style, i.contract, i.onFailure]));
  L.push('', `**Legacy coexistence.** ${e.application.coexistence}`, '', '### Enterprise data architecture', '');
  t(['Source', 'Owner', 'System of record', 'Ingestion', 'Quality rule'], e.data.sources.map((s) => [s.source, s.owner, s.systemOfRecord, s.ingestion, s.quality]));
  L.push('', '**Data quality SLA**', '');
  t(['Dimension', 'Target', 'Check'], e.data.qualitySla.map((q) => [q.dimension, q.target, q.check]));
  L.push('', fence('yaml', e.data.contractExample), '', `- **Lineage.** ${e.data.lineage}`, `- **Schema change.** ${e.data.onSchemaChange}`, `- **Corrections and backfills.** ${e.data.corrections}`, `- **Privacy and deletion.** ${e.data.privacyDeletion}`, '', '### Technology, security and operating architecture', '');
  L.push(`- **Hosting.** ${e.technology.hosting}`, `- **Compute.** ${e.technology.compute}`, `- **Data platform.** ${e.technology.dataPlatform}`, `- **AI platform.** ${e.technology.aiPlatform}`, `- **Deployment.** ${e.technology.deployment}`, `- **RTO / RPO.** ${e.technology.dr.rto} / ${e.technology.dr.rpo}`, `- **Disaster recovery.** ${e.technology.dr.strategy}`, `- **Identity.** ${e.security.identity}`, `- **Classification.** ${e.security.classification}`, `- **Encryption.** ${e.security.encryption}`, `- **Privacy.** ${e.security.privacy}`, `- **Service ownership.** ${e.operating.serviceOwner}`, `- **Support model.** ${e.operating.supportModel}`, '', '**Trust boundaries**', '');
  e.security.trustBoundaries.forEach((x) => L.push(`- ${x}`));
  L.push('', '**Lifecycle ownership**', '');
  t(['Asset', 'Owner'], e.operating.lifecycleOwners.map((o) => [o.asset, o.owner]));
  L.push('', '### Non-functional requirements', '');
  t(['Attribute', 'Requirement', 'Measured by'], e.nfr.map((n) => [n.attribute, n.requirement, n.measuredBy]));
  L.push('', '### AI solution architecture decision matrix', '', `1. **Why AI?** ${dm.whyAI}`, `2. **Why not rules or traditional software?** ${dm.whyNotRules}`, `3. **Why this paradigm?** ${dm.whyThisParadigm}`, '', '4. **Alternatives considered**', '');
  t(['Option', 'Verdict', 'Why'], dm.alternatives.map((a) => [a.option, a.verdict, a.reason]));
  L.push('', `5. **Why this architecture.** ${dm.whyChosen}`, '', `- **Topology.** ${dm.topology}`, `- **Sourcing.** ${dm.sourcing}`, `- **Human intelligence (${dm.humanOversight.mode}).** ${dm.humanOversight.detail}`, `- **Economics.** ${dm.economics}`, '', '6. **What would trigger a change in architecture**', '');
  dm.changeTriggers.forEach((x) => L.push(`- ${x}`));
  L.push('', '### Architecture decision records', '');
  e.adrs.forEach((a) => L.push(`**${a.id} (${a.status}): ${a.title}.** Context: ${a.context} Decision: ${a.decision} Alternatives: ${a.alternatives.join('; ')}. Consequences: ${a.consequences}`, ''));
  L.push('### Build, buy or integrate', '', `**${e.buildBuy.question}**`, '');
  t(['Option', 'Choose it when', 'Main risk'], e.buildBuy.options.map((o) => [o.option, o.chooseWhen, o.risk]));
  L.push('', `**Recommendation.** ${e.buildBuy.recommendation}`, '');
}

/** The full evaluation plan, gathered from the statistical-validation, metrics, agentic and MLOps fields (see assurance.ts). */
function evaluationMarkdown(u: UseCase, L: string[]) {
  const e = evaluationPlan(u);
  L.push('', '### What the evaluation has to prove', '', `**${e.question}**`, '', e.estimand);
  L.push('', '### Offline protocol', '', '| Step | How to run it |', '|---|---|');
  e.protocol.forEach((p) => L.push(`| ${esc(p.item)} | ${esc(p.how)} |`));
  L.push('', '**Report every metric on these slices.**', '');
  e.slices.forEach((x) => L.push(`- ${x}`));
  L.push('', '### Release thresholds', '', '| Metric | Target | Checked | If it is missed |', '|---|---|---|---|');
  e.thresholds.forEach((t) => L.push(`| ${esc(t.metric)} | ${esc(t.target)} | ${esc(t.cadence)} | ${esc(t.onBreach)} |`));
  L.push('', `*${e.thresholdBasis}*`);
  if (e.aiQuality.length) {
    L.push('', '### LLM and agent evaluation', '', '| What | Metric | Target | How |', '|---|---|---|---|');
    e.aiQuality.forEach((a) => L.push(`| ${esc(a.what)} | ${esc(a.metric)} | ${esc(a.target)} | ${esc(a.how)} |`));
  }
  L.push('', '### Online evaluation', '', '| Decision | For this use case |', '|---|---|');
  L.push(`| Design | ${esc(e.online.design.replace(/-/g, ' '))} |`, `| Unit | ${esc(e.online.unit)} |`);
  L.push(`| Why this design | ${esc(e.online.why)} |`, `| Primary metric | ${esc(e.online.primary)} |`);
  L.push('', '**Guardrail metrics: must not get worse.**', '');
  e.online.guardrails.forEach((x) => L.push(`- ${x}`));
  L.push('', '**Stopping rules: fixed before launch.**', '');
  e.online.stopping.forEach((x) => L.push(`- ${x}`));
  L.push('', '### After launch: evaluation does not stop', '', '**What triggers a re-evaluation or retrain.**', '');
  e.continuous.triggers.forEach((x) => L.push(`- ${x}`));
  L.push('', `**Champion and challenger.** ${e.continuous.championChallenger}`);
  L.push('', `**Train and score only on matured data.** ${e.continuous.dataMaturity}`);
  if (e.tests.length) {
    L.push('', '### Executable checks', '', '| Test | Passes when |', '|---|---|');
    e.tests.forEach((t) => L.push(`| ${esc(t.test)} | ${esc(t.pass)} |`));
  }
}

function governanceMarkdown(u: UseCase, L: string[]) {
  const g = u.governance;
  const ctl = (rows: { area: string; control: string; evidence: string }[]) => {
    L.push('| Area | Control | Evidence |', '|---|---|---|');
    rows.forEach((r) => L.push(`| ${esc(r.area)} | ${esc(r.control)} | ${esc(r.evidence)} |`));
  };
  L.push('', '## Security, governance and responsible AI', '', `**Risk tier: ${g.riskTier}.** ${g.rationale} Treatment: ${g.treatment}`, '', '**Approval path**', '');
  g.approvalPath.forEach((x) => L.push(`- ${x}`));
  const gp = guardrailPlan(u);
  L.push('', '### Guardrails: what must not happen, and what enforces it', '');
  if (gp.noAgentNote) L.push(gp.noAgentNote, '');
  L.push('| Layer | Guardrail | Enforced by |', '|---|---|---|');
  gp.rows.forEach((r) => L.push(`| ${r.layer} | ${esc(r.guardrails.join('; '))} | ${esc(r.enforcedBy.join('; '))} |`));
  L.push('', '### Data governance', '');
  ctl(g.data);
  L.push('', '### Model governance', '');
  ctl(g.model);
  L.push('', '### Responsible AI', '');
  ctl(g.responsibleAI);
  L.push('', '### AI security', '', '| Threat | Control |', '|---|---|');
  g.aiSecurity.forEach((t) => L.push(`| ${esc(t.threat)} | ${esc(t.control)} |`));
  L.push('', '### Obligation to control to evidence', '', '| Obligation | Control | Evidence | Owner | Cadence |', '|---|---|---|---|---|');
  g.regulatory.forEach((r) => L.push(`| ${esc(r.obligation)} | ${esc(r.architecturalControl)} | ${esc(r.evidence)} | ${esc(r.owner)} | ${esc(r.cadence)} |`));
}

function mlopsMarkdown(u: UseCase, L: string[]) {
  const m = u.mlops;
  L.push('', `## ${m.llmops ? 'MLOps and LLMOps' : 'MLOps'}`, '', '| Area | Practice | Artifact | Gate |', '|---|---|---|---|');
  m.lifecycle.forEach((l) => L.push(`| ${esc(l.area)} | ${esc(l.practice)} | ${esc(l.artifact)} | ${esc(l.gate)} |`));
  L.push('', '**Retraining triggers**', '');
  m.retraining.triggers.forEach((x) => L.push(`- ${x}`));
  L.push('', `- **Label maturity.** ${m.retraining.dataMaturity}`, `- **Champion/challenger.** ${m.retraining.championChallenger}`, '', '**Rollback**', '');
  m.rollback.forEach((x) => L.push(`- ${x}`));
  L.push('', '| Concern | Options |', '|---|---|');
  m.toolchain.forEach((t) => L.push(`| ${esc(t.concern)} | ${esc(t.options)} |`));
  if (m.llmops) {
    L.push('', '### LLMOps additions', '', '| Area | Practice |', '|---|---|');
    m.llmops.forEach((x) => L.push(`| ${esc(x.area)} | ${esc(x.practice)} |`));
  }
}

function operationsMarkdown(u: UseCase, L: string[]) {
  const o = u.operations;
  L.push('', '## Production operations and SRE', '', '| SLI | SLO | Window | Error budget |', '|---|---|---|---|');
  o.slos.forEach((s) => L.push(`| ${esc(s.sli)} | ${esc(s.slo)} | ${esc(s.window)} | ${esc(s.errorBudget)} |`));
  L.push('', '| Layer | Telemetry |', '|---|---|');
  o.telemetry.forEach((t) => L.push(`| ${esc(t.layer)} | ${esc(t.signals)} |`));
  L.push('', '| Severity | Definition | Response |', '|---|---|---|');
  o.severities.forEach((s) => L.push(`| ${s.sev} | ${esc(s.definition)} | ${esc(s.response)} |`));
  L.push('', '| Support | Owns |', '|---|---|');
  o.support.forEach((s) => L.push(`| ${s.level} | ${esc(s.owns)} |`));
  L.push('', `- **Release.** ${o.release.deploy}`, `- **Rollback.** ${o.release.rollback}`, `- **Capacity.** ${o.capacity}`, '', '| Failure | Detection | Alert | Owner | Mitigation | Recovery | Learning |', '|---|---|---|---|---|---|---|');
  o.scenarios.forEach((s) => L.push(`| ${esc(s.failure)} | ${esc(s.detection)} | ${esc(s.alert)} | ${esc(s.owner)} | ${esc(s.mitigation)} | ${esc(s.recovery)} | ${esc(s.learning)} |`));
  L.push('', '| Unit cost | Value | How |', '|---|---|---|');
  o.unitCost.forEach((c) => L.push(`| ${esc(c.unit)} | ${esc(c.value)} | ${esc(c.how)} |`));
}

function validationMarkdown(u: UseCase, L: string[], release: ReleaseManifest | null) {
  const pv = u.validation.provenance;
  L.push('', '## Validation and architecture review', '', `**Content status:** ${pv.status} · **Owner:** ${pv.owner} · **Reviewer:** ${pv.reviewer ? `${pv.reviewer}, ${pv.reviewedAt}` : 'none yet'} · **Generated:** ${pv.generatedAt}`, '', '### How each part was made', '', '| Section | Origin | Basis |', '|---|---|---|');
  pv.sections.forEach((x) => L.push(`| ${esc(x.section)} | ${x.origin} | ${esc(x.basis)} |`));
  L.push('', '### What kind of number is this?', '', '| Figure | Nature | Note |', '|---|---|---|');
  pv.numbers.forEach((x) => L.push(`| ${esc(x.item)} | ${x.nature} | ${esc(x.note)} |`));
  L.push('', '**Sources**', '');
  pv.sources.forEach((x) => L.push(`- ${x.kind}: ${x.ref}`));
  L.push('', '**Assumptions**', '');
  pv.assumptions.forEach((x) => L.push(`- ${x}`));
  L.push('', '**Known limitations**', '');
  pv.limitations.forEach((x) => L.push(`- ${x}`));
  L.push('', '### Validation status (each is separate evidence)', '', '| Validation | Status | What it means here |', '|---|---|---|');
  blueprintStatuses(u, release).forEach((x) => L.push(`| ${x.label} | ${x.text} | ${esc(x.detail)} |`));
  if (release)
    L.push('', `**Release.** Version ${release.contentVersion} · source commit ${release.sourceCommit ?? 'unknown'}${release.sourceDirty ? ' (uncommitted changes)' : ''} · last successful validation ${release.validatedAt ?? 'none for this content'} · ${release.deployedAt ? `deployment built ${release.deployedAt}` : 'not a deployment build'}.`);
  L.push('', '| Feasibility check | Result | Detail |', '|---|---|---|');
  u.validation.feasibility.forEach((f) => L.push(`| ${esc(f.check)} | ${f.status} | ${esc(f.detail)} |`));
  L.push('', `Role ownership: ${(Object.keys(ROLE_META) as (keyof typeof ROLE_META)[]).map((r) => `${ROLE_META[r].label} (${ROLE_OWNS[r].toLowerCase()})`).join('; ')}.`);
}
