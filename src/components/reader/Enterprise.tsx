import { CircleCheck, CircleDashed, ShieldAlert } from 'lucide-react';
import { RISK_TIERS, type RiskTier, type UseCase, type ValidationLevel } from '../../schemas/usecase.schema';
import { CodeBlock } from '../Code';
import { MermaidDiagram } from '../Mermaid';
import { List, Section, TableWrap } from './Sections';
import { ReleaseLine } from './ValidationStatus';
import {
  blueprintStatuses,
  kitKeyFor,
  shortSha,
  type ReleaseManifest,
  type StatusState,
} from '../../content/release';

/* Blueprint 2.0 sections: enterprise context, governance, MLOps, production operations and validation provenance. */

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">{children}</p>
);

const Sub = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <div id={id} className="scroll-mt-28 space-y-4 border-t border-line pt-6 first:border-t-0 first:pt-0">
    <h3 className="text-lg font-semibold tracking-tight text-ink">{title}</h3>
    {children}
  </div>
);

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <TableWrap>
      <table className="bs-table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={j === 0 ? 'font-medium text-ink' : undefined}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}

const KV = ({ rows }: { rows: [string, React.ReactNode][] }) => (
  <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[11rem_minmax(0,1fr)]">
    {rows.map(([k, v]) => (
      <div key={k} className="contents">
        <dt className="font-medium text-mute">{k}</dt>
        <dd className="text-ink/90">{v}</dd>
      </div>
    ))}
  </dl>
);

/* ------------------------------------------------------------------ phase 0: discovery */

export function DiscoverySection({ uc }: { uc: UseCase }) {
  const x = uc.discovery;
  return (
    <Section
      id="discovery"
      title="Phase 0 · Enterprise discovery and business requirements"
      kicker="Compulsory before any architecture, data or model work: the Business Analyst's entry gate"
    >
      <div className="card flex flex-wrap items-center gap-3 p-4 text-sm" data-testid="discovery-status">
        <span className="chip chip-signal">Compulsory</span>
        <span className="chip">To be confirmed with the client</span>
        <span className="text-mute">{x.summary}</span>
      </div>

      <Sub id="disc-questions" title="The eight questions to settle first">
        <Table
          head={['Question', 'Proposed starting answer', 'Confirm with', 'Evidence that closes it']}
          rows={x.questions.map((q) => [q.question, q.proposedAnswer, q.confirmWith, q.evidence])}
        />
      </Sub>

      <Sub id="disc-process" title="AS-IS and TO-BE process">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-4">
            <Label>AS-IS today</Label>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink/90">
              {x.process.asIs.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          </div>
          <div className="card p-4">
            <Label>TO-BE with this system</Label>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink/90">
              {x.process.toBe.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          </div>
        </div>
        <Label>What changes for people</Label>
        <List items={x.process.changes} />
      </Sub>

      <Sub id="disc-stakeholders" title="Stakeholders and user journeys">
        <Table
          head={['Stakeholder', 'What they need', 'Involvement']}
          rows={x.stakeholders.map((s) => [s.who, s.needs, s.involvement])}
        />
        <div className="grid gap-4 md:grid-cols-3">
          {x.journeys.map((j) => (
            <div key={j.persona} className="card p-4" data-testid="journey">
              <p className="text-sm font-semibold text-ink">{j.persona}</p>
              <p className="mt-1 text-xs text-signal">{j.goal}</p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink/90">
                {j.steps.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-mute">
                <strong>When it is wrong:</strong> {j.whenWrong}
              </p>
            </div>
          ))}
        </div>
      </Sub>

      <Sub id="disc-requirements" title="Functional requirements and acceptance criteria">
        <Table
          head={['ID', 'Requirement', 'Acceptance criterion']}
          rows={x.requirements.map((r) => [r.id, r.requirement, r.acceptance])}
        />
      </Sub>

      <Sub id="disc-raci" title="RACI">
        <Table
          head={['Activity', 'Responsible', 'Accountable', 'Consulted', 'Informed']}
          rows={x.raci.map((r) => [r.activity, r.responsible, r.accountable, r.consulted, r.informed])}
        />
      </Sub>

      <Sub id="disc-case" title="Business case and ROI measurement">
        <KV
          rows={[
            ['Baseline', x.businessCase.baseline],
            ['Target', x.businessCase.target],
            ['Value drivers', x.businessCase.valueDrivers.join(' · ')],
            ['ROI formula', x.businessCase.roiFormula],
          ]}
        />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-4">
            <Label>Costs</Label>
            <List items={x.businessCase.costs} />
          </div>
          <div className="card p-4">
            <Label>How it is measured</Label>
            <List items={x.businessCase.measurement} />
          </div>
          <div className="card p-4">
            <Label>Assumptions</Label>
            <List items={x.businessCase.assumptions} />
          </div>
        </div>
      </Sub>

      <Sub id="disc-exit" title="Phase 0 exit gate">
        <p className="text-sm text-mute">
          Phase 1 (architecture and design) starts only when every criterion below is closed by the named
          owner. All are open on this page because nothing has been confirmed with a real client.
        </p>
        <ul className="space-y-2 text-sm" data-testid="exit-gate">
          {x.exitGate.map((g) => (
            <li key={g.criterion} className="card flex flex-wrap items-center gap-2 p-3">
              <CircleDashed size={16} className="text-dim" aria-hidden />
              <span className="min-w-0 flex-1 text-ink/90">{g.criterion}</span>
              <span className="chip">{g.owner}</span>
              <span className="chip">{g.status}</span>
            </li>
          ))}
        </ul>
      </Sub>
    </Section>
  );
}

/* ------------------------------------------------------------------ enterprise context */

const VERDICT_TONE: Record<string, string> = {
  chosen: 'chip-signal',
  fallback: '',
  later: '',
  rejected: '!border-noise/40 !text-noise',
};

export function EnterpriseSection({ uc }: { uc: UseCase }) {
  const e = uc.enterpriseContext;
  const dm = uc.decisionMatrix;
  return (
    <Section
      id="enterprise"
      title="Enterprise solution context"
      kicker="Where this system sits in the business, applications, data estate, technology, security and operating model, before any model is chosen"
    >
      <Sub id="ent-business" title="Business architecture">
        <KV
          rows={[
            ['Business capability', e.business.capability],
            ['Processes affected', e.business.processes.join(' · ')],
            ['Decision ownership', e.business.decisionOwner],
            ['Current state', e.business.currentState],
            ['Target state', e.business.futureState],
            ['Business KPIs', e.business.kpis.join(' · ')],
          ]}
        />
        <Table
          head={['Stakeholder', 'What they need']}
          rows={e.business.stakeholders.map((s) => [s.who, s.needs])}
        />
      </Sub>

      <Sub id="ent-application" title="Application and integration architecture">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-4">
            <Label>Systems of record</Label>
            <List items={e.application.systemsOfRecord} />
          </div>
          <div className="card p-4">
            <Label>Upstream dependencies</Label>
            <List items={e.application.upstream} />
          </div>
          <div className="card p-4">
            <Label>Downstream consumers</Label>
            <List items={e.application.downstream} />
          </div>
        </div>
        <MermaidDiagram code={e.c4Context} label="C4 level 1: system context" />
        <MermaidDiagram code={e.c4Container} label="C4 level 2: containers and trust boundary" />
        <Label>Integration dependency matrix</Label>
        <Table
          head={['Boundary', 'Style', 'Contract', 'On failure']}
          rows={e.application.integration.map((i) => [i.boundary, i.style, i.contract, i.onFailure])}
        />
        <p data-prose className="prose-bs max-w-3xl text-sm">
          <strong>Legacy coexistence.</strong> {e.application.coexistence}
        </p>
      </Sub>

      <Sub id="ent-data" title="Enterprise data architecture">
        <Table
          head={['Source dataset', 'Owner', 'System of record', 'Ingestion', 'Quality rule']}
          rows={e.data.sources.map((s) => [s.source, s.owner, s.systemOfRecord, s.ingestion, s.quality])}
        />
        <Label>Data quality SLA</Label>
        <Table
          head={['Dimension', 'Target', 'How it is checked']}
          rows={e.data.qualitySla.map((q) => [q.dimension, q.target, q.check])}
        />
        <CodeBlock
          code={e.data.contractExample}
          lang="yaml"
          title="Data contract · example for the primary input dataset"
        />
        <KV
          rows={[
            ['Lineage', e.data.lineage],
            ['When the source schema changes', e.data.onSchemaChange],
            ['Corrections and backfills', e.data.corrections],
            ['Privacy and deletion', e.data.privacyDeletion],
          ]}
        />
      </Sub>

      <Sub id="ent-technology" title="Technology and security architecture">
        <KV
          rows={[
            ['Hosting', e.technology.hosting],
            ['Compute', e.technology.compute],
            ['Data platform', e.technology.dataPlatform],
            ['AI platform', e.technology.aiPlatform],
            ['Deployment', e.technology.deployment],
            ['Recovery objectives', `RTO ${e.technology.dr.rto}. RPO ${e.technology.dr.rpo}.`],
            ['Disaster recovery', e.technology.dr.strategy],
            ['Identity and access', e.security.identity],
            ['Data classification', e.security.classification],
            ['Encryption', e.security.encryption],
            ['Privacy', e.security.privacy],
          ]}
        />
        <Label>Security trust boundaries</Label>
        <List items={e.security.trustBoundaries} />
      </Sub>

      <Sub id="ent-operating" title="Operating architecture">
        <KV
          rows={[
            ['Service ownership', e.operating.serviceOwner],
            ['Support model', e.operating.supportModel],
          ]}
        />
        <Table
          head={['Lifecycle asset', 'Owner']}
          rows={e.operating.lifecycleOwners.map((o) => [o.asset, o.owner])}
        />
      </Sub>

      <Sub id="ent-nfr" title="Non-functional requirements matrix">
        <Table
          head={['Attribute', 'Requirement', 'Measured by']}
          rows={e.nfr.map((n) => [n.attribute, n.requirement, n.measuredBy])}
        />
      </Sub>

      <Sub id="ent-decision" title="AI solution architecture decision matrix">
        <div className="grid gap-4 md:grid-cols-3" data-testid="decision-matrix">
          <div className="card p-4">
            <Label>1. Why do we need AI?</Label>
            <p className="text-sm text-ink/90">{dm.whyAI}</p>
          </div>
          <div className="card p-4">
            <Label>2. Why not rules or traditional software?</Label>
            <p className="text-sm text-ink/90">{dm.whyNotRules}</p>
          </div>
          <div className="card p-4">
            <Label>3. Why this ML / LLM paradigm?</Label>
            <p className="text-sm text-ink/90">{dm.whyThisParadigm}</p>
          </div>
        </div>
        <Label>4. Alternatives considered</Label>
        <Table
          head={['Option', 'Verdict', 'Why']}
          rows={dm.alternatives.map((a) => [
            a.option,
            <span key="v" className={`chip ${VERDICT_TONE[a.verdict] ?? ''}`}>
              {a.verdict}
            </span>,
            a.reason,
          ])}
        />
        <KV
          rows={[
            ['5. Why this architecture', dm.whyChosen],
            ['Model topology', dm.topology],
            ['Build, buy, fine-tune or foundation model', dm.sourcing],
            [
              'Human intelligence',
              <>
                <span className="chip mr-2">{dm.humanOversight.mode}</span>
                {dm.humanOversight.detail}
              </>,
            ],
            ['Economics', dm.economics],
          ]}
        />
        <Label>6. What would trigger a change in architecture</Label>
        <List items={dm.changeTriggers} />
      </Sub>

      <Sub id="ent-adr" title="Architecture decision records">
        <div className="grid gap-4 lg:grid-cols-2">
          {e.adrs.map((a) => (
            <div key={a.id} className="card space-y-2 p-4 text-sm" data-testid="adr">
              <p className="font-mono text-xs text-dim">
                {a.id} ·{' '}
                <span className={a.status === 'accepted' ? 'text-signal' : 'text-warn'}>{a.status}</span>
              </p>
              <h4 className="font-semibold text-ink">{a.title}</h4>
              <p>
                <strong>Context.</strong> {a.context}
              </p>
              <p>
                <strong>Decision.</strong> {a.decision}
              </p>
              <p>
                <strong>Alternatives.</strong> {a.alternatives.join('; ')}.
              </p>
              <p>
                <strong>Consequences.</strong> {a.consequences}
              </p>
            </div>
          ))}
        </div>
      </Sub>

      <Sub id="ent-buildbuy" title="Build, buy or integrate">
        <p data-prose className="max-w-3xl text-sm font-medium text-ink">
          {e.buildBuy.question}
        </p>
        <Table
          head={['Option', 'Choose it when', 'Main risk']}
          rows={e.buildBuy.options.map((o) => [o.option, o.chooseWhen, o.risk])}
        />
        <p data-prose className="prose-bs max-w-3xl text-sm">
          <strong>Recommendation.</strong> {e.buildBuy.recommendation}
        </p>
      </Sub>
    </Section>
  );
}

/* ------------------------------------------------------------------ governance */

const TIER_COPY: Record<RiskTier, string> = {
  low: 'Standard security, testing and operational controls.',
  medium: 'Additional data, privacy, fairness and human-review controls.',
  high: 'Formal risk assessment, independent validation, auditability and controlled deployment.',
  critical:
    'Strict approval boundaries, continuous assurance, human oversight where required and rehearsed fail-safe mechanisms.',
};

export function GovernanceSection({ uc }: { uc: UseCase }) {
  const g = uc.governance;
  const controls = (rows: { area: string; control: string; evidence: string }[]) => (
    <Table
      head={['Area', 'Architectural control', 'Verifiable evidence']}
      rows={rows.map((r) => [r.area, r.control, r.evidence])}
    />
  );
  return (
    <Section
      id="governance"
      title="Security, governance and responsible AI"
      kicker="Risk tier first, then the controls and the evidence that prove them"
    >
      <div className="flex flex-wrap items-center gap-2" data-testid="risk-tier">
        <span
          className={`chip ${g.riskTier === 'low' ? 'chip-signal' : g.riskTier === 'medium' ? '' : '!border-warn/40 !bg-warn/10 !text-warn'}`}
        >
          <ShieldAlert size={12} aria-hidden /> Risk tier: {g.riskTier}
        </span>
        <span className="text-sm text-mute">{g.treatment}</span>
      </div>
      <p data-prose className="prose-bs max-w-3xl text-sm">
        {g.rationale}
      </p>
      <Table
        head={['Risk category', 'Architecture treatment']}
        rows={RISK_TIERS.map((t) => [
          <span key="t" className={t === g.riskTier ? 'text-signal' : undefined}>
            {t === g.riskTier ? `▸ ${t} (this use case)` : t}
          </span>,
          TIER_COPY[t],
        ])}
      />
      <Sub id="gov-approvals" title="Approval path for this tier">
        <List items={g.approvalPath} />
      </Sub>
      <Sub id="gov-data" title="Data governance">
        {controls(g.data)}
      </Sub>
      <Sub id="gov-model" title="Model governance">
        {controls(g.model)}
      </Sub>
      <Sub id="gov-rai" title="Responsible AI">
        {controls(g.responsibleAI)}
      </Sub>
      <Sub id="gov-security" title="AI security threats">
        <Table head={['Threat', 'Control']} rows={g.aiSecurity.map((t) => [t.threat, t.control])} />
      </Sub>
      <Sub id="gov-regulatory" title="From obligation to control to evidence">
        <Table
          head={['Obligation', 'Architectural control', 'Evidence', 'Owner', 'Cadence']}
          rows={g.regulatory.map((r) => [
            r.obligation,
            r.architecturalControl,
            r.evidence,
            r.owner,
            r.cadence,
          ])}
        />
        <p data-prose className="text-xs text-dim">
          A list of regulations is not a control. Confirm the applicable jurisdiction and obligations with
          your own counsel; this table shows how an obligation becomes an architectural control with evidence
          an auditor can check.
        </p>
      </Sub>
    </Section>
  );
}

/* ------------------------------------------------------------------ MLOps */

export function MlopsSection({ uc }: { uc: UseCase }) {
  const m = uc.mlops;
  return (
    <Section
      id="mlops"
      title={m.llmops ? 'MLOps and LLMOps' : 'MLOps'}
      kicker="Industrialising model development, deployment and operation: nine areas, each with an artifact and a gate"
    >
      <Table
        head={['Area', 'Practice', 'Artifact', 'Gate']}
        rows={m.lifecycle.map((l) => [l.area, l.practice, l.artifact, l.gate])}
      />
      <Sub id="mlops-retraining" title="Retraining, champion/challenger and rollback">
        <Label>Retraining triggers</Label>
        <List items={m.retraining.triggers} />
        <KV
          rows={[
            ['Label maturity', m.retraining.dataMaturity],
            ['Champion/challenger', m.retraining.championChallenger],
          ]}
        />
        <Label>Rollback</Label>
        <List items={m.rollback} />
      </Sub>
      <Sub id="mlops-toolchain" title="Toolchain options">
        <Table head={['Concern', 'Typical options']} rows={m.toolchain.map((t) => [t.concern, t.options])} />
      </Sub>
      {m.llmops && (
        <Sub id="mlops-llmops" title="LLMOps additions">
          <p data-prose className="max-w-3xl text-sm text-mute">
            MLOps manages the lifecycle of predictive models. For systems whose behaviour depends on prompts,
            retrieval indexes and provider models, those become release artifacts too.
          </p>
          <Table head={['Area', 'Practice']} rows={m.llmops.map((l) => [l.area, l.practice])} />
        </Sub>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ operations */

export function OperationsSection({ uc }: { uc: UseCase }) {
  const o = uc.operations;
  return (
    <Section
      id="operations"
      title="Production operations and SRE"
      kicker="An AI system is finished only when somebody can operate it safely: SLOs, telemetry, incidents, failure scenarios and unit cost"
    >
      <Label>SLIs, SLOs and error budgets</Label>
      <Table
        head={['SLI', 'SLO', 'Window', 'Error budget']}
        rows={o.slos.map((s) => [s.sli, s.slo, s.window, s.errorBudget])}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <Label>Telemetry</Label>
          <Table head={['Layer', 'Signals']} rows={o.telemetry.map((t) => [t.layer, t.signals])} />
        </div>
        <div>
          <Label>Incident classification</Label>
          <Table
            head={['Severity', 'Definition', 'Response']}
            rows={o.severities.map((s) => [s.sev, s.definition, s.response])}
          />
        </div>
        <div>
          <Label>Support model</Label>
          <Table head={['Level', 'Owns']} rows={o.support.map((s) => [s.level, s.owns])} />
        </div>
        <div>
          <Label>Unit cost</Label>
          <Table head={['Unit', 'Value', 'How']} rows={o.unitCost.map((u) => [u.unit, u.value, u.how])} />
        </div>
      </div>
      <KV
        rows={[
          ['Release management', o.release.deploy],
          ['Rollback procedure', o.release.rollback],
          ['Capacity and autoscaling', o.capacity],
        ]}
      />
      <Label>Failure scenarios and runbook skeletons</Label>
      <Table
        head={['Failure', 'Detection', 'Alert', 'Owner', 'Mitigation', 'Recovery', 'Post-incident learning']}
        rows={o.scenarios.map((s) => [
          s.failure,
          s.detection,
          s.alert,
          s.owner,
          s.mitigation,
          s.recovery,
          s.learning,
        ])}
      />
    </Section>
  );
}

function LevelIcon({ state }: { state: StatusState }) {
  if (state === 'passed')
    return <CircleCheck size={18} className="mt-0.5 shrink-0 text-signal" aria-label="passed" />;
  if (state === 'failed')
    return <ShieldAlert size={18} className="mt-0.5 shrink-0 text-noise" aria-label="failed" />;
  return <CircleDashed size={18} className="mt-0.5 shrink-0 text-dim" aria-label="not yet" />;
}

/* ------------------------------------------------------------------ validation provenance */

const LEVEL_LABEL: Record<ValidationLevel, { title: string; means: string }> = {
  'schema-validated': { title: 'Schema validated', means: 'Required sections and types passed validation' },
  'technically-validated': {
    title: 'Architecture feasibility',
    means: 'Diagrams parse, equations compile and the architecture-feasibility checks pass',
  },
  'synthetic-data-tested': {
    title: 'Synthetic starter tested',
    means: 'A starter kit ran successfully against synthetic data',
  },
  'domain-expert-reviewed': {
    title: 'Domain expert reviewed',
    means: 'A domain specialist reviewed the technical content',
  },
  'production-evidence': {
    title: 'Production evidence',
    means: 'Evidence exists from a real deployment or production dataset',
  },
};

const CHECK_TONE = {
  pass: 'chip-signal',
  warn: '!border-warn/40 !bg-warn/10 !text-warn',
  fail: '!border-noise/50 !text-noise',
  'n/a': '',
} as const;

/* ------------------------------------------------------------------ statistical validation and experimentation */

export function ExperimentationSection({ uc }: { uc: UseCase }) {
  const x = uc.experimentation;
  return (
    <Section
      id="experimentation"
      title="Statistical validation and experimentation"
      kicker="Proving the business effect, not just the model metric: design, power, labels, slices, causal method and when to stop"
    >
      <div className="card p-4" data-testid="experiment-question">
        <Label>The question</Label>
        <p className="text-base text-ink">{x.question}</p>
        <p className="mt-2 text-sm text-mute">
          <strong className="text-ink">Estimand.</strong> {x.estimand}
        </p>
      </div>

      <Sub id="xp-design" title="Experimental design">
        <KV
          rows={[
            [
              'Design',
              <span key="d" className="chip chip-signal">
                {x.design.type}
              </span>,
            ],
            ['Unit', x.design.unit],
            ['Why this design', x.design.why],
            ['Interference', x.design.interference],
          ]}
        />
      </Sub>

      <Sub id="xp-metrics" title="Metrics, power and stopping">
        <KV
          rows={[
            ['Primary', x.metrics.primary],
            ['Offline to online', x.metrics.offlineOnlineGap],
            ['Significance', `α = ${x.power.alpha}, power = ${Math.round(x.power.power * 100)}%`],
            ['Minimum detectable effect', x.power.mde],
            ['Sample-size rule', x.power.sampleSizeRule],
            ['Duration', x.power.duration],
          ]}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-4">
            <Label>Guardrails</Label>
            <List items={x.metrics.guardrails} />
          </div>
          <div className="card p-4">
            <Label>Stopping rules</Label>
            <List items={x.stopping} />
          </div>
        </div>
      </Sub>

      <Sub id="xp-data" title="Labels, sampling and data quality">
        <KV
          rows={[
            ['Label maturity', x.labels.maturity],
            ['Label quality', x.labels.quality],
            ['Selection bias', x.labels.selectionBias],
            ['Sampling', x.sampling],
          ]}
        />
        <div className="card p-4">
          <Label>Missing and biased data checks</Label>
          <List items={x.dataQuality} />
        </div>
      </Sub>

      <Sub id="xp-model" title="Calibration, uncertainty, slices and causal methods">
        <KV
          rows={[
            ['Calibration', x.calibration],
            ['Uncertainty', x.uncertainty],
            ['Causal method', `${x.causal.method}. Use it when: ${x.causal.when}.`],
            ['Counterfactual evaluation', x.counterfactual],
          ]}
        />
        <div className="card p-4">
          <Label>Subgroup and fairness slices</Label>
          <List items={x.slices} />
        </div>
      </Sub>

      <Sub id="xp-value" title="Measuring business value">
        <Table head={['Measure', 'How']} rows={x.businessValue.map((b) => [b.metric, b.how])} />
        <div className="card p-4">
          <Label>Common ways this goes wrong</Label>
          <List items={x.pitfalls} tone="noise" />
        </div>
      </Sub>
    </Section>
  );
}

const ORIGIN_LABEL: Record<string, { label: string; tone: string }> = {
  'hand-authored': { label: 'hand-authored', tone: 'chip-signal' },
  'generated-from-spec': { label: 'generated from the spec', tone: '' },
  'generated-from-template': { label: 'generated from a template', tone: '!border-warn/40 !text-warn' },
};
const NATURE_TONE: Record<string, string> = {
  illustrative: '!border-warn/40 !text-warn',
  modelled: '!border-warn/40 !text-warn',
  synthetic: '',
  'proposed-target': '',
  'pilot-measured': 'chip-signal',
  'production-measured': 'chip-signal',
};

function ProvenancePanel({ uc }: { uc: UseCase }) {
  const p = uc.validation.provenance;
  return (
    <div className="space-y-5" data-testid="provenance">
      <div className="card grid gap-3 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label>Highest level claimed</Label>
          <p className="font-medium text-ink" data-testid="content-status">
            {LEVEL_LABEL[p.status].title}
          </p>
        </div>
        <div>
          <Label>Owner</Label>
          <p>{p.owner}</p>
        </div>
        <div>
          <Label>Reviewer</Label>
          <p data-testid="reviewer">
            {p.reviewer ? `${p.reviewer}, ${p.reviewedAt}` : 'No named reviewer yet'}
          </p>
        </div>
        <div>
          <Label>Generated</Label>
          <p>{p.generatedAt} (a generation date, not a review date)</p>
        </div>
      </div>
      <div>
        <Label>How each part of this page was made</Label>
        <Table
          head={['Section', 'Origin', 'Basis']}
          rows={p.sections.map((x) => [
            x.section,
            <span key="o" className={`chip ${ORIGIN_LABEL[x.origin]!.tone}`}>
              {ORIGIN_LABEL[x.origin]!.label}
            </span>,
            x.basis,
          ])}
        />
      </div>
      <div>
        <Label>What kind of number is this?</Label>
        <Table
          head={['Figure', 'Nature', 'Note']}
          rows={p.numbers.map((n) => [
            n.item,
            <span key="n" className={`chip ${NATURE_TONE[n.nature] ?? ''}`}>
              {n.nature}
            </span>,
            n.note,
          ])}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <Label>Sources</Label>
          <List items={p.sources.map((s) => `${s.kind}: ${s.ref}`)} />
        </div>
        <div className="card p-4">
          <Label>Assumptions</Label>
          <List items={p.assumptions} />
        </div>
        <div className="card p-4">
          <Label>Known limitations</Label>
          <List items={p.limitations} tone="noise" />
        </div>
      </div>
    </div>
  );
}

const STATE_MEANS: Record<string, string> = {
  schema: 'Required sections and types passed the strict schema when the page was built',
  feasibility:
    'Diagrams parse, equations compile, and stage budgets, capacity, storage, cost and recovery numbers agree',
  synthetic:
    'The starter kit for this blueprint was run end to end on synthetic data for exactly this content',
  expert: 'A named domain specialist reviewed the technical content (content/reviews.json)',
  production: 'Evidence from a real deployment or production dataset is recorded',
};

export function ValidationSection({ uc, release }: { uc: UseCase; release: ReleaseManifest | null }) {
  const v = uc.validation;
  const statuses = blueprintStatuses(uc, release);
  return (
    <Section
      id="validation"
      title="Validation and architecture review"
      kicker="Five separate kinds of evidence, each shown on its own: automated checks are not expert review, and neither is production evidence"
    >
      <ProvenancePanel uc={uc} />
      <ol className="space-y-2" data-testid="validation-levels">
        {statuses.map((l) => (
          <li
            key={l.id}
            className="card flex gap-3 p-3 text-sm"
            data-state={l.state}
            data-testid={`level-${l.id}`}
          >
            <LevelIcon state={l.state} />
            <div>
              <p className="font-medium text-ink">
                {l.label} <span className="font-mono text-xs text-dim">· {l.text}</span>
              </p>
              <p className="text-xs text-mute">{STATE_MEANS[l.id]}</p>
              <p className="mt-1 text-ink/90">{l.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="card p-4 text-sm" data-testid="release-card">
        <Label>Release this page was built from</Label>
        {release ? (
          <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <dt className="text-mute">Source commit</dt>
            <dd className="font-mono text-xs">
              {release.sourceCommit ?? 'unknown'}
              {release.sourceDirty ? ' (uncommitted changes)' : ''}
            </dd>
            <dt className="text-mute">Content version</dt>
            <dd className="font-mono text-xs">{release.contentVersion}</dd>
            <dt className="text-mute">Last successful validation</dt>
            <dd className="font-mono text-xs">{release.validatedAt ?? 'none for this content'}</dd>
            <dt className="text-mute">Deployment built</dt>
            <dd className="font-mono text-xs">{release.deployedAt ?? 'not a deployment build'}</dd>
            <dt className="text-mute">Starter kit run</dt>
            <dd className="font-mono text-xs">
              {kitKeyFor(uc)}: {release.checks.executable.ranAt ?? 'not run in this build'}
            </dd>
            <dt className="text-mute">Across all {release.checks.schema.useCases} blueprints</dt>
            <dd className="text-xs">
              {release.checks.domainExpert.reviewed} domain-expert reviewed ·{' '}
              {release.checks.productionEvidence.claimed} with production evidence ·{' '}
              {release.checks.feasibility.fail} feasibility failures
            </dd>
          </dl>
        ) : (
          <p className="mt-2 text-mute">
            No release manifest was found for this build, so no commit or timestamps are shown.
          </p>
        )}
        <div className="mt-3">
          <ReleaseLine release={release} />
        </div>
        <p className="mt-2 text-xs text-dim">
          Commit {shortSha(release?.sourceCommit ?? null)}: the deployment is built only when the validation
          report and the starter-kit report were produced for this exact commit and content (
          <code>npm run release:check</code>).
        </p>
      </div>
      <Label>Architecture feasibility checks</Label>
      <Table
        head={['Check', 'Result', 'Detail']}
        rows={v.feasibility.map((f) => [
          f.check,
          <span key="s" className={`chip ${CHECK_TONE[f.status]}`}>
            {f.status}
          </span>,
          f.detail,
        ])}
      />
      <p data-prose className="text-xs text-dim">
        A blueprint does not pass because every section exists: its numbers must also agree with each other.
        The same checks run in <code>npm run validate:content</code> and fail the build.
      </p>
    </Section>
  );
}

/* ------------------------------------------------------------------ metrics catalogue */

const KIND_TONE: Record<string, string> = {
  outcome: 'chip-signal',
  leading: 'chip-accent',
  guardrail: '!border-warn/40 !bg-warn/10 !text-warn',
  diagnostic: '',
};

const KIND_HELP: Record<string, string> = {
  outcome: 'The result itself',
  leading: 'Moves before the outcome does',
  guardrail: 'Must not get worse',
  diagnostic: 'Explains why something moved',
};

export function MetricsSection({ uc }: { uc: UseCase }) {
  const x = uc.metrics;
  const total = x.layers.reduce((n, l) => n + l.rows.length, 0);
  return (
    <Section
      id="metrics"
      title="Metrics catalogue"
      kicker="What to measure for this system, layer by layer: business, model, data, system, cost, responsible AI, security, MLOps and, where they apply, RAG, LLM, agents and human review"
    >
      <div className="card p-4" data-testid="metrics-summary">
        <p className="text-base text-ink">
          <strong>
            {total} metrics in {x.layers.length} layers
          </strong>{' '}
          for {uc.title}, each with a definition, a starting target, a cadence, an owner and what to do when
          it breaches.
          {x.notApplicable.length > 0 && (
            <>
              {' '}
              {x.notApplicable.length} further {x.notApplicable.length === 1 ? 'layer does' : 'layers do'} not
              apply to this system; each says why below.
            </>
          )}
        </p>
        <p className="mt-2 text-sm text-mute" data-prose>
          {x.basis}
        </p>
        <div className="mt-3 flex flex-wrap gap-2" data-prose>
          {Object.keys(KIND_TONE).map((k) => (
            <span key={k} className={`chip ${KIND_TONE[k]}`} title={KIND_HELP[k]}>
              {k}: {KIND_HELP[k]!.toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      <MermaidDiagram code={x.tree} label="How the metric layers connect for this system" />

      <Table
        head={['Layer', 'Metrics', 'Why it matters here']}
        rows={x.layers.map((l) => [
          <a key="a" href={`#mt-${l.id}`} className="no-underline hover:underline">
            {l.title}
          </a>,
          l.rows.length,
          <span key="w" data-prose>
            {l.why}
          </span>,
        ])}
      />

      {x.layers.map((l) => (
        <Sub key={l.id} id={`mt-${l.id}`} title={l.title}>
          <p data-prose className="text-sm text-mute">
            {l.why}
          </p>
          <Table
            head={['Metric', 'What it measures', 'Target', 'Cadence · owner', 'If it breaches']}
            rows={l.rows.map((r) => [
              <span key="m">
                {r.metric}
                <br />
                <span className={`chip mt-1 ${KIND_TONE[r.kind]}`}>{r.kind}</span>
              </span>,
              r.definition,
              r.target,
              <span key="c">
                {r.cadence}
                <br />
                <span className="text-dim">{r.owner}</span>
              </span>,
              r.onBreach,
            ])}
          />
        </Sub>
      ))}

      {x.notApplicable.length > 0 && (
        <Sub id="mt-not-applicable" title="Layers that do not apply here">
          <div className="grid gap-4 md:grid-cols-2">
            {x.notApplicable.map((n) => (
              <div key={n.layer} className="card p-4" data-testid={`metrics-na-${n.layer}`}>
                <Label>
                  Not applicable:{' '}
                  {n.layer === 'rag'
                    ? 'RAG'
                    : n.layer === 'llm'
                      ? 'LLM serving'
                      : n.layer === 'agent'
                        ? 'Agents'
                        : 'Human review'}
                </Label>
                <p className="text-sm text-mute">{n.reason}</p>
              </div>
            ))}
          </div>
        </Sub>
      )}

      <Sub id="mt-failure-monitors" title="Monitors for this system's own edge cases">
        <p data-prose className="text-sm text-mute">
          One monitor for each edge case in the specification, so a known failure mode has a signal and a
          threshold before it happens, not a post-mortem after.
        </p>
        <Table
          head={['Edge case', 'Signal to watch', 'Alert when', 'Response']}
          rows={x.failureMonitors.map((f) => [f.scenario, f.signal, f.threshold, f.response])}
        />
      </Sub>

      <Sub id="mt-gaming" title="How these metrics get gamed">
        <p data-prose className="text-sm text-mute">
          A metric that becomes a target stops measuring what it measured. For each headline number: how it
          lies, and which metric to read beside it.
        </p>
        <Table
          head={['Metric', 'How it misleads', 'Read it beside']}
          rows={x.gaming.map((g) => [g.metric, g.risk, g.counter])}
        />
      </Sub>
    </Section>
  );
}
