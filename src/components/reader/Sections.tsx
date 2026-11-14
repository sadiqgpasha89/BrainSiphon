import Link from 'next/link';
import {
  ARCHETYPE_LABEL,
  DOMAIN_META,
  type UseCase,
  type UseCaseIndexEntry,
} from '../../schemas/usecase.schema';
import { ArtifactLegend, KindLine } from '../ArtifactKind';
import { CodeBlock } from '../Code';
import { MathBlock } from '../Math';
import { MermaidDiagram } from '../Mermaid';
import { viewInputOf } from '../../content/cloud-views';
import { CloudDiagramTabs } from './CloudTabs';
import { SymbolText } from './SymbolText';
import { CapacityCalculator } from './CapacityCalculator';
import { EvaluationDetail } from './Assurance';
import { ROLE_META, rolesForSection } from '../../lib/roles';
import { PRIMITIVE_BY_ID } from '../../content/primitives';

export function Section({
  id,
  title,
  kicker,
  prose,
  children,
}: {
  id: string;
  title: string;
  kicker?: string;
  prose?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className="scroll-mt-28 border-t border-line py-10 first:border-t-0 first:pt-0"
      data-roles={rolesForSection(id).join(' ')}
      {...(prose ? { 'data-prose-section': true } : {})}
    >
      {kicker && <p className="font-mono text-[11px] uppercase tracking-wider text-dim">{kicker}</p>}
      <h2 id={`${id}-h`} className="h-section mb-5">
        {title}
      </h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

export const TableWrap = ({ children }: { children: React.ReactNode }) => (
  <div className="card overflow-x-auto">{children}</div>
);
export const List = ({ items, tone }: { items: string[]; tone?: 'signal' | 'noise' }) => (
  <ul className="space-y-2 text-sm text-ink/90">
    {items.map((x) => (
      <li key={x} className="flex gap-2">
        <span
          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone === 'noise' ? 'bg-noise' : 'bg-signal'}`}
          aria-hidden
        />
        <span>{x}</span>
      </li>
    ))}
  </ul>
);

export const tocFor = (hasPlaybook = false): { id: string; label: string; prose?: boolean }[] => [
  { id: 'discovery', label: 'Phase 0 · Discovery' },
  { id: 'enterprise', label: 'Enterprise context' },
  { id: 'signal-noise', label: 'Signal vs. Noise' },
  { id: 'problem', label: 'Problem & loss' },
  { id: 'features', label: 'Features' },
  { id: 'blueprint', label: 'Pipeline blueprint' },
  { id: 'hld', label: 'HLD · 10M users' },
  { id: 'sequence', label: 'Sequence diagram' },
  { id: 'lld', label: 'Low-level design' },
  { id: 'e2e', label: 'End-to-end breakdown', prose: true },
  { id: 'scale', label: 'Scale & capacity' },
  { id: 'evaluation', label: 'Evaluation' },
  { id: 'edge-cases', label: 'Edge cases' },
  { id: 'role-lenses', label: 'Role lenses' },
  { id: 'governance', label: 'Governance & guardrails' },
  { id: 'experimentation', label: 'Statistical validation' },
  { id: 'metrics', label: 'Metrics catalogue' },
  { id: 'mlops', label: 'MLOps & LLMOps' },
  { id: 'operations', label: 'Production operations' },
  { id: 'agentic', label: 'Agentic solution' },
  ...(hasPlaybook ? [{ id: 'playbook', label: 'Build playbook' }] : []),
  { id: 'validation', label: 'Validation' },
];

export async function Sections({ uc }: { uc: UseCase }) {
  const d = uc.systemDesign;
  const ladderTone = ['text-signal', 'text-accent', 'text-warn', 'text-noise', 'text-noise'];
  return (
    <div>
      <Section
        id="signal-noise"
        title="Signal vs. Noise"
        kicker="The matrix that separates what moves the metric from what wastes your quarter"
      >
        <TableWrap>
          <table className="bs-table">
            <thead>
              <tr>
                <th>Concept</th>
                <th className="!text-signal">True signal</th>
                <th className="!text-noise">Common noise</th>
                <th>Why engineers fail</th>
              </tr>
            </thead>
            <tbody>
              {uc.signalVsNoiseMatrix.map((r) => (
                <tr key={r.concept}>
                  <td className="font-medium text-ink">{r.concept}</td>
                  <td className="bg-signal-soft/30 text-signal/95">{r.trueSignal}</td>
                  <td className="bg-noise-soft/30 text-noise/95">{r.commonNoise}</td>
                  <td className="text-mute">{r.whyEngineersFail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Section>

      <Section
        id="problem"
        title="Problem formulation"
        kicker="Business objective → ML objective → hard constraints"
      >
        <div className="card space-y-3 p-4" data-testid="problem-statement">
          <p className="font-mono text-[11px] uppercase tracking-wider text-signal">
            Problem statement
            <span
              className={`ml-2 rounded border px-1.5 py-0.5 normal-case tracking-normal ${uc.narrativeProvenance === 'authored' ? 'border-signal/40 text-signal' : 'border-warn/40 text-warn'}`}
              data-testid="narrative-provenance"
              title={
                uc.narrativeProvenance === 'authored'
                  ? 'The problem statement, solution approach, architecture rationale and end-to-end breakdown for this use case were written by hand.'
                  : "These sections are assembled from this use case's own fields."
              }
            >
              {uc.narrativeProvenance === 'authored' ? 'hand-written' : 'generated'}
            </span>
          </p>
          <p data-prose className="prose-bs max-w-3xl text-base">
            <strong className="text-ink">Situation. </strong>
            {uc.problemStatement.situation}
          </p>
          <p data-prose className="prose-bs max-w-3xl text-base">
            <strong className="text-ink">Why it is hard. </strong>
            {uc.problemStatement.whyHard}
          </p>
          <p data-prose className="prose-bs max-w-3xl text-base">
            <strong className="text-ink">Scale and stakes. </strong>
            {uc.problemStatement.scaleAndStakes}
          </p>
          <p data-prose className="prose-bs max-w-3xl text-base">
            <strong className="text-ink">Success looks like. </strong>
            {uc.problemStatement.successLooksLike}
          </p>
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">What can go wrong</p>
            <List items={uc.problemStatement.risks} tone="noise" />
          </div>
        </div>
        <p data-prose className="prose-bs max-w-3xl text-base">
          <strong className="text-ink">Objective. </strong>
          {uc.problemFormulation.businessObjective}
        </p>
        <div className="card p-4">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">ML objective / loss</p>
          <MathBlock tex={uc.problemFormulation.mlObjectiveAndLoss} />
        </div>
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">
            What each symbol stands for
          </p>
          <TableWrap>
            <table className="bs-table" data-testid="loss-variables">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Meaning in this use case</th>
                </tr>
              </thead>
              <tbody>
                {uc.problemFormulation.lossVariables.map((v) => (
                  <tr key={v.symbol}>
                    <td className="whitespace-nowrap">
                      <SymbolText tex={v.symbol} />
                    </td>
                    <td>{v.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">Constraints</p>
          <List items={uc.problemFormulation.constraints} />
        </div>
      </Section>

      <Section
        id="features"
        title="Data & features"
        kicker="High-signal features with their leakage risk, and what to delete"
      >
        <TableWrap>
          <table className="bs-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Logic</th>
                <th>Intuition</th>
                <th className="!text-warn">Leakage risk</th>
              </tr>
            </thead>
            <tbody>
              {uc.dataAndFeatures.highSignalFeatures.map((f) => (
                <tr key={f.name}>
                  <td className="font-medium text-signal">{f.name}</td>
                  <td>{f.formulaOrLogic}</td>
                  <td className="text-mute">{f.intuition}</td>
                  <td className="text-warn/90">{f.leakageRisk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <div className="card border-noise-line bg-noise-soft/20 p-4">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-noise">Drop these — noise</p>
          <ul className="space-y-2 text-sm">
            {uc.dataAndFeatures.noisyFeaturesToDrop.map((n) => (
              <li key={n.name}>
                <span className="font-medium text-noise line-through decoration-noise/50">{n.name}</span>{' '}
                <span className="text-mute">— {n.whyItIsNoise}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section
        id="blueprint"
        title="Architecture blueprint"
        kicker="Baseline first, then the production model"
      >
        <div className="card space-y-3 p-4" data-testid="solution-approach">
          <p className="font-mono text-[11px] uppercase tracking-wider text-signal">Solution approach</p>
          <p data-prose className="prose-bs max-w-3xl text-base">
            {uc.solutionApproach.thesis}
          </p>
          <ol className="space-y-2 text-sm text-ink/90">
            {uc.solutionApproach.moves.map((m, i) => (
              <li key={m.move} className="flex gap-3">
                <span className="font-mono text-dim">{i + 1}.</span>
                <span>
                  <strong className="text-ink">{m.move}.</strong> {m.detail}
                </span>
              </li>
            ))}
          </ol>
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">
              Deliberately not doing
            </p>
            <List items={uc.solutionApproach.deliberatelyNot} tone="noise" />
          </div>
          <p data-prose className="prose-bs max-w-3xl text-sm text-mute">
            <strong className="text-ink">How it is proven. </strong>
            {uc.solutionApproach.proof}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2" data-prose>
          <div className="card p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-dim">Start here (baseline)</p>
            <p className="mt-2 text-sm text-ink/90">{uc.architectureBlueprint.baselineModel}</p>
          </div>
          <div className="card border-signal-line p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-signal">Production model</p>
            <p className="mt-2 text-sm text-ink/90">{uc.architectureBlueprint.productionModel}</p>
          </div>
        </div>
        <MermaidDiagram
          code={uc.architectureBlueprint.mermaidDiagram}
          label="Model pipeline & feedback loop"
        />
      </Section>

      <Section id="hld" title="High-level design for 10M users" kicker={`HLD · ${d.mode} serving`}>
        <p data-prose className="prose-bs max-w-3xl">
          {d.hld.summary}
        </p>
        <div className="card border-signal-line p-4" data-testid="topology">
          <p className="font-mono text-[11px] uppercase tracking-wider text-signal">
            Regions and state · {d.topology.stance.replace(/-/g, ' ')}
          </p>
          <p data-prose className="prose-bs mt-2 max-w-3xl text-sm">
            {d.topology.summary}
          </p>
          <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-wider text-dim">Inference plane</dt>
              <dd className="mt-1 text-ink/90">{d.topology.inferencePlane}</dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-wider text-dim">State plane</dt>
              <dd className="mt-1 text-ink/90">{d.topology.statePlane}</dd>
            </div>
          </dl>
          <div className="mt-3">
            <List items={d.topology.notes} />
          </div>
        </div>
        <CloudDiagramTabs
          kind="hld"
          label="Deployment topology"
          code={d.hld.mermaid}
          input={viewInputOf(uc)}
          details
        />
        <TableWrap>
          <table className="bs-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Tech</th>
                <th>Responsibility</th>
                <th className="text-right">Budget</th>
              </tr>
            </thead>
            <tbody>
              {d.hld.components.map((c) => (
                <tr key={`${c.name}-${c.tech}`}>
                  <td className="font-medium text-ink">{c.name}</td>
                  <td className="font-mono text-xs text-mute">{c.tech}</td>
                  <td className="text-mute">{c.responsibility}</td>
                  <td className="text-right font-mono text-xs">
                    {c.latencyBudgetMs === null ? '—' : `${c.latencyBudgetMs} ms`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <div data-testid="architecture-rationale">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">
            Why each stage exists in this system
          </p>
          <TableWrap>
            <table className="bs-table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Role here</th>
                  <th>What lands on it</th>
                  <th>Budget</th>
                  <th>If it fails</th>
                </tr>
              </thead>
              <tbody>
                {uc.architectureRationale.map((r) => (
                  <tr key={`${r.stage}-${r.tech}`}>
                    <td className="font-medium text-ink">
                      {r.stage}
                      <span className="block font-mono text-xs font-normal text-mute">{r.tech}</span>
                    </td>
                    <td className="text-mute">{r.role}</td>
                    <td>{r.carries}</td>
                    <td className="whitespace-nowrap font-mono text-xs">{r.budget}</td>
                    <td className="text-mute">{r.onFailure}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
      </Section>

      <Section
        id="sequence"
        title="Sequence diagram"
        kicker="Request path with deadline propagation and the degradation branch"
      >
        <CloudDiagramTabs
          kind="sequence"
          label="Request sequence"
          code={d.sequence.mermaid}
          input={viewInputOf(uc)}
        />
        <div data-prose>
          <List items={d.sequence.notes} />
        </div>
      </Section>

      <Section
        id="lld"
        title="Low-level design"
        kicker="API contract · data model · events · classes · hot path · config · failure, security and tests"
      >
        <div className="flex flex-wrap items-center gap-2" data-testid="lld-status">
          <span className="chip chip-signal">{ARCHETYPE_LABEL[d.lld.archetype]}</span>
          <span className="chip chip-noise">Illustrative scaffold</span>
          <span className="text-sm text-mute">
            Generated from the {ARCHETYPE_LABEL[d.lld.archetype].toLowerCase()} template and this use
            case&apos;s own fields: it shows the right shape of API, schema and failure model. The hot-path
            code is pseudocode and the rest is architectural illustration: nothing here is production code.
          </span>
        </div>
        <ArtifactLegend />
        <div className="card p-4">
          <KindLine kind={d.lld.artifacts.apiContract}>API contract</KindLine>
          <p className="mt-2 font-mono text-sm">
            <span className="rounded bg-signal-soft px-2 py-0.5 text-signal">{d.lld.apiContract.method}</span>{' '}
            <span className="ml-2 text-ink">{d.lld.apiContract.path}</span>
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <CodeBlock
              code={d.lld.apiContract.request}
              lang={d.lld.apiContract.request.trim().startsWith('{') ? 'json' : 'text'}
              title="request"
            />
            <CodeBlock
              code={d.lld.apiContract.response}
              lang={d.lld.apiContract.response.trim().startsWith('{') ? 'json' : 'text'}
              title="response"
            />
          </div>
        </div>
        <CodeBlock
          code={d.lld.dataModelDDL}
          lang="sql"
          title="Data model · DDL"
          kind={d.lld.artifacts.dataModelDDL}
        />
        <CodeBlock
          code={d.lld.eventSchema}
          lang="json"
          title="Event schema"
          kind={d.lld.artifacts.eventSchema}
        />
        <KindLine kind={d.lld.artifacts.classDiagram}>Component classes</KindLine>
        <MermaidDiagram code={d.lld.classDiagram} label="Component classes" />
        <CodeBlock
          code={d.lld.algorithm.code}
          lang={d.lld.algorithm.language}
          title="Core algorithm · hot path"
          kind={d.lld.artifacts.algorithm}
        />
        <CodeBlock code={d.lld.config} lang="yaml" title="Runtime config" kind={d.lld.artifacts.config} />
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">Degradation ladder</p>
          <TableWrap>
            <table className="bs-table">
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Trigger</th>
                  <th>Behaviour</th>
                </tr>
              </thead>
              <tbody>
                {d.lld.degradationLadder.map((l) => (
                  <tr key={l.level}>
                    <td className={`font-mono font-semibold ${ladderTone[l.level] ?? ''}`}>L{l.level}</td>
                    <td>{l.trigger}</td>
                    <td className="text-mute">{l.behaviour}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">
            Failure and retry behaviour
          </p>
          <TableWrap>
            <table className="bs-table">
              <thead>
                <tr>
                  <th>Failure</th>
                  <th>Behaviour</th>
                </tr>
              </thead>
              <tbody>
                {d.lld.failureAndRetry.map((f) => (
                  <tr key={f.failure}>
                    <td>{f.failure}</td>
                    <td className="text-mute">{f.behaviour}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">
            Security and access model
          </p>
          <TableWrap>
            <table className="bs-table">
              <tbody>
                {d.lld.securityModel.map((x) => (
                  <tr key={x.surface}>
                    <th>{x.surface}</th>
                    <td className="text-mute">{x.control}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">Test scenarios</p>
          <TableWrap>
            <table className="bs-table">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Kind</th>
                  <th>Assertion</th>
                </tr>
              </thead>
              <tbody>
                {d.lld.testScenarios.map((t) => (
                  <tr key={t.scenario}>
                    <td>{t.scenario}</td>
                    <td className="font-mono text-xs">{t.kind}</td>
                    <td className="text-mute">{t.assertion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
      </Section>

      <Section id="e2e" title="End-to-end breakdown" kicker="From decision framing to ROI — ten phases" prose>
        <ol className="space-y-4">
          {d.e2e.map((p) => (
            <li key={p.phase} className="card p-5">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-2xl font-semibold text-signal">
                  {String(p.phase).padStart(2, '0')}
                </span>
                <h3 className="text-base font-semibold">{p.title}</h3>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-ink/90">
                {p.steps.map((s) => (
                  <li key={s} className="flex gap-2">
                    <span className="mt-2 h-px w-3 shrink-0 bg-line" aria-hidden />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-mute">
                <span className="font-mono uppercase tracking-wider text-dim">Deliverable · </span>
                {p.deliverable}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="scale"
        title="Scale & capacity at 10M users"
        kicker="Back-of-envelope model derived from this use case's own traffic profile"
      >
        <TableWrap>
          <table className="bs-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>How</th>
              </tr>
            </thead>
            <tbody>
              {d.scale.table.map((r) => (
                <tr key={r.metric}>
                  <td className="font-medium text-ink">{r.metric}</td>
                  <td className="font-mono text-signal">{r.value}</td>
                  <td className="text-mute">{r.how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <CapacityCalculator
          domain={uc.domain}
          paradigms={uc.mlParadigms}
          latency={uc.latencySLA}
          inputs={d.scale.inputs}
          archetype={d.lld.archetype}
        />
        <div data-prose className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">Assumptions</p>
            <List items={d.scale.assumptions} />
          </div>
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-noise">Bottlenecks</p>
            <List items={d.scale.bottlenecks} tone="noise" />
          </div>
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-signal">Resilience</p>
            <List items={d.scale.resilience} />
          </div>
        </div>
      </Section>

      <Section
        id="evaluation"
        title="Evaluation & metrics"
        kicker="What to measure, how to run it, the thresholds to ship on, and what keeps checking after launch"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-4">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">Offline</p>
            <List items={uc.evaluationAndMetrics.offlineMetrics} />
          </div>
          <div className="card p-4">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">Online business</p>
            <List items={uc.evaluationAndMetrics.onlineBusinessMetrics} />
          </div>
          <div className="card border-noise-line p-4">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-noise">
              Offline→online gap traps
            </p>
            <List items={uc.evaluationAndMetrics.offlineOnlineGapTraps} tone="noise" />
          </div>
        </div>
        <EvaluationDetail uc={uc} />
      </Section>

      <Section id="edge-cases" title="Production edge cases" kicker="Scenario → failure mode → mitigation">
        <TableWrap>
          <table className="bs-table">
            <thead>
              <tr>
                <th>Scenario</th>
                <th className="!text-noise">Failure mode</th>
                <th className="!text-signal">Mitigation</th>
              </tr>
            </thead>
            <tbody>
              {uc.productionEdgeCases.map((e) => (
                <tr key={e.scenario}>
                  <td className="font-medium text-ink">{e.scenario}</td>
                  <td className="text-noise/90">{e.failureMode}</td>
                  <td className="text-signal/90">{e.mitigationStrategy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Section>

      <Section
        id="role-lenses"
        title="Role lenses: production gaps by persona"
        kicker="What each of the fifteen roles must additionally check, specialised to this system. Pick one or more roles in the Lens bar to filter the page and combine their responsibilities."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {uc.roleLenses.map((r) => (
            <div key={r.role} className="card p-4" data-role-card={r.role} data-testid={`lens-${r.role}`}>
              <h3 className="text-base font-semibold text-ink">
                <span className="mr-2 font-mono text-xs text-dim">{ROLE_META[r.role].key}</span>
                {ROLE_META[r.role].label}
              </h3>
              <p className="mt-1 text-xs text-mute">{r.focus}</p>
              <ul className="mt-3 space-y-3 text-sm">
                {r.items.map((i) => {
                  const p = i.primitive ? PRIMITIVE_BY_ID[i.primitive] : undefined;
                  return (
                    <li key={i.title}>
                      <strong className="text-ink">{i.title}.</strong>{' '}
                      <span className="text-ink/90">{i.detail}</span>
                      {p && (
                        <>
                          {' '}
                          <Link
                            href={`/patterns/primitives/${p.id}`}
                            className="chip chip-signal no-underline"
                          >
                            {p.title} →
                          </Link>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div data-testid="primitives">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">
            Reference primitives this system leans on (one canonical write-up each)
          </p>
          <ul className="flex flex-wrap gap-2">
            {uc.primitives.map((id) => {
              const p = PRIMITIVE_BY_ID[id];
              return p ? (
                <li key={id}>
                  <Link
                    href={`/patterns/primitives/${id}`}
                    className="chip no-underline hover:border-signal"
                    title={p.summary}
                  >
                    {p.title}
                  </Link>
                </li>
              ) : null;
            })}
          </ul>
        </div>
      </Section>
    </div>
  );
}

export function Pager({
  prev,
  next,
  related,
}: {
  prev: UseCaseIndexEntry | null;
  next: UseCaseIndexEntry | null;
  related: UseCaseIndexEntry[];
}) {
  return (
    <div className="mt-6 space-y-8 border-t border-line pt-8">
      <nav aria-label="Previous and next" className="grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link href={`/${prev.slug}`} className="card block p-4 no-underline hover:border-mute">
            <p className="font-mono text-[11px] uppercase text-dim">← Previous</p>
            <p className="mt-1 font-medium text-ink">{prev.title}</p>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/${next.slug}`} className="card block p-4 text-right no-underline hover:border-mute">
            <p className="font-mono text-[11px] uppercase text-dim">Next →</p>
            <p className="mt-1 font-medium text-ink">{next.title}</p>
          </Link>
        )}
      </nav>
      <div>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-dim">Related blueprints</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {related.map((r) => (
            <li key={r.id}>
              <Link
                href={`/${r.slug}`}
                className="card flex items-baseline justify-between gap-3 px-4 py-3 text-sm no-underline hover:border-mute"
              >
                <span className="text-ink">{r.title}</span>
                <span className="shrink-0 font-mono text-[11px] text-dim">{DOMAIN_META[r.domain].short}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
