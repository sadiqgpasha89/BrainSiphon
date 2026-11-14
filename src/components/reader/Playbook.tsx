import { CircleCheck, CircleDashed, CircleDot } from 'lucide-react';
import Link from 'next/link';
import { COMPLETION_META, DELIVERY_META } from '../../lib/artifacts';
import { PROBLEM_LABEL } from '../../lib/problem-types';
import type { Playbook } from '../../schemas/usecase.schema';
import { ArtifactLegend, KindBadge } from '../ArtifactKind';
import { CodeBlock } from '../Code';
import { List, Section, TableWrap } from './Sections';

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">{children}</p>
);

const Sub = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <div id={id} className="scroll-mt-28 space-y-4 border-t border-line pt-6 first:border-t-0 first:pt-0">
    <h3 className="text-lg font-semibold tracking-tight text-ink">{title}</h3>
    {children}
  </div>
);

const KIT_BASE = 'https://github.com/sadiqgpasha89/BrainSiphon/tree/main/content/kits';

export const VERDICT_LABEL = {
  exact: 'Exact match',
  adaptable: 'Adaptable match',
  none: 'No compatible starter kit',
} as const;
export const VERDICT_TONE = {
  exact: 'chip-signal',
  adaptable: '!border-warn/40 !bg-warn/10 !text-warn',
  none: 'chip-noise',
} as const;
const STATUS_TONE: Record<string, string> = {
  match: 'chip-signal',
  adapt: '!border-warn/40 !bg-warn/10 !text-warn',
  mismatch: 'chip-noise',
  'outside-kit': '',
};
const STATUS_LABEL: Record<string, string> = {
  match: 'match',
  adapt: 'adapt',
  mismatch: 'mismatch',
  'outside-kit': 'your platform',
};
const DIM_LABEL: Record<string, string> = {
  problem: 'Prediction problem',
  label: 'Label and target',
  validation: 'Validation method',
  metrics: 'Evaluation metrics',
  data: 'Data shape and timing',
  model: 'Model family and baseline',
  serving: 'Serving mode and latency',
  integrations: 'Integrations and operations',
};

/** The implementation boundary, stated before anything else: which starter (if any), how far its artifacts get you, what is yours. */
function ImplementationStatus({ pb }: { pb: Playbook }) {
  const c = pb.compatibility;
  const k = pb.completion;
  return (
    <div className="space-y-4" data-testid="implementation-status">
      <div className="card p-4" data-testid="starter-verdict" data-verdict={c.verdict}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`chip ${VERDICT_TONE[c.verdict]}`}>{VERDICT_LABEL[c.verdict]}</span>
          <span className="chip">{PROBLEM_LABEL[c.problemType]}</span>
          <span
            className={`chip ${k.reached === 'guidance-only' ? 'chip-noise' : 'chip-signal'}`}
            data-testid="reached-state"
          >
            Reaches: {COMPLETION_META[k.reached].label}
            {k.conditional ? ' (after modifications)' : ''}
          </span>
        </div>
        <p className="mt-3 text-base text-ink" data-testid="compat-statement">
          {c.statement}
        </p>
        <p className="mt-2 text-sm text-mute" data-testid="completion-summary">
          {k.summary}
        </p>
      </div>

      <div>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">
          How far the executable artifacts get you (L0–L5 Maturity Scale)
        </p>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="completion-ladder">
          {k.states.map((st) => (
            <li key={st.state} className="card p-3" data-state={st.state} data-status={st.status}>
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                {st.status === 'reached' ? (
                  <CircleCheck size={16} className="shrink-0 text-signal" aria-hidden />
                ) : st.status === 'conditional' ? (
                  <CircleDot size={16} className="shrink-0 text-warn" aria-hidden />
                ) : (
                  <CircleDashed size={16} className="shrink-0 text-dim" aria-hidden />
                )}
                <span>
                  <span className="mr-1 font-mono text-xs font-bold text-signal">
                    {COMPLETION_META[st.state].levelCode}
                  </span>
                  {COMPLETION_META[st.state].label}
                </span>
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-dim">
                {st.status === 'reached'
                  ? 'Reached'
                  : st.status === 'conditional'
                    ? 'After modifications'
                    : 'Not reached'}
              </p>
              <p className="mt-2 text-xs text-mute" data-prose>
                {st.meaning}
              </p>
              <p className="mt-2 text-xs text-ink/90" data-prose>
                {st.evidence}
              </p>
              {st.stillNeeded.length > 0 && (
                <div className="mt-2 text-xs text-mute" data-prose>
                  <p className="font-semibold text-ink">Still needed</p>
                  <List items={st.stillNeeded} />
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>

      <ImplementationGapReport pb={pb} />

      <ArtifactLegend />
    </div>
  );
}

function ImplementationGapReport({ pb }: { pb: Playbook }) {
  const k = pb.completion;
  const currentLevel = COMPLETION_META[k.reached];

  return (
    <div className="card border-signal/30 bg-signal-soft/10 p-4" data-testid="gap-report">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="rounded bg-signal/20 px-1.5 py-0.5 font-mono text-xs font-bold uppercase text-signal">
              FDE Implementation Gap Report
            </span>
            <span>Maturity: {currentLevel.levelName}</span>
          </h4>
          <p className="mt-1 text-xs text-mute">{k.boundary}</p>
        </div>
        <Link
          href="/delivery"
          className="flex items-center gap-1 font-mono text-xs text-signal hover:underline"
        >
          Delivery Guide & Templates →
        </Link>
      </div>

      <div className="mt-3 grid gap-3 text-xs md:grid-cols-2">
        <div className="bg-paper/60 rounded border border-signal/20 p-2.5">
          <p className="flex items-center gap-1 font-semibold text-signal">
            <CircleCheck size={14} className="text-signal" /> Supplied by this blueprint
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-mute">
            <li>End-to-end mathematical problem formulation and loss function</li>
            <li>Feature engineering signals, noisy features, and leakage traps</li>
            <li>Target architecture (HLD, LLD, sequence diagrams, and capacity model)</li>
            {k.reached !== 'guidance-only' && (
              <li>Executable reference code & synthetic data baseline (M1–M4)</li>
            )}
            <li>Governance guardrails, metrics catalogue, and risk controls</li>
          </ul>
        </div>

        <div className="bg-paper/60 rounded border border-warn/30 p-2.5">
          <p className="flex items-center gap-1 font-semibold text-warn">
            <CircleDashed size={14} className="text-warn" /> Platform engineer responsibility
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-mute">
            <li>Production REST (OpenAPI 3.1) and event (AsyncAPI) contracts</li>
            <li>Database schema models & migrations (e.g. PostgreSQL + pgvector)</li>
            <li>Feature store & live streaming pipelines (Feast / Redis / Kafka)</li>
            <li>Cloud IaC & orchestration (Terraform AWS/GCP/Azure, Kubernetes & Helm)</li>
            <li>System verification: load testing (k6), chaos resilience, & 10 SRE runbooks</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Why this kit (or no kit): the use case's needs against the kit's contract, one row per dimension. */
function KitFit({ pb }: { pb: Playbook }) {
  const c = pb.compatibility;
  return (
    <div className="space-y-4" data-testid="kit-fit">
      <p data-prose className="text-sm text-mute">
        A kit is a starter only when it implements the same fundamental problem. Broad labels such as
        &quot;tabular&quot; are not enough: the table compares what this use case needs with what the kit
        provides, dimension by dimension. Problem type was decided {c.basis.charAt(0).toLowerCase()}
        {c.basis.slice(1)}.
      </p>
      <TableWrap>
        <table className="bs-table">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>This use case needs</th>
              <th>
                {c.verdict === 'none'
                  ? `Closest kit provides${c.closest ? ` (${c.closest.label})` : ''}`
                  : 'The kit provides'}
              </th>
              <th>Fit</th>
            </tr>
          </thead>
          <tbody>
            {c.dimensions.map((d) => (
              <tr key={d.dimension} data-dimension={d.dimension}>
                <td className="font-medium text-ink">{DIM_LABEL[d.dimension]}</td>
                <td>{d.needs}</td>
                <td className="text-mute">{d.provides}</td>
                <td>
                  <span className={`chip ${STATUS_TONE[d.status]}`}>{STATUS_LABEL[d.status]}</span>
                  {d.change && <p className="mt-1 text-xs text-mute">{d.change}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      {c.verdict === 'none' && (
        <div className="card p-4" data-testid="kit-blockers">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-noise">Why no kit fits</p>
          <List items={c.blockers} tone="noise" />
          {c.closest && (
            <p className="mt-3 text-sm text-mute" data-prose>
              <strong className="text-ink">Closest kit, for background reading only: </strong>
              <a href={`${KIT_BASE}/${c.closest.kitId}`} target="_blank" rel="noopener noreferrer">
                {c.closest.label}
              </a>
              . {c.closest.whyNot} It is not a starter for this use case.
            </p>
          )}
        </div>
      )}
      {c.verdict === 'adaptable' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-4" data-testid="kit-reusable">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-signal">
              What carries over
            </p>
            <List items={c.reusable} />
          </div>
          <div className="card p-4" data-testid="kit-modifications">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-warn">
              Modifications required first
            </p>
            <List items={c.modifications} />
          </div>
        </div>
      )}
      {c.verdict === 'exact' && c.source === 'reference-kit' && (
        <div className="card p-4" data-testid="kit-reusable">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-signal">
            What the kit gives you
          </p>
          <List items={c.reusable} />
        </div>
      )}
      <details className="text-xs text-mute">
        <summary className="cursor-pointer">Every reference kit that was compared</summary>
        {c.evaluated.length === 0 ? (
          <p className="mt-2">This use case has a hand-written starter, so no shared kit was compared.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {c.evaluated.map((e) => (
              <li key={e.kitId}>
                <span className="font-mono text-ink">{e.kitId}</span>: {e.verdict}
                {e.blocker ? `. ${e.blocker}` : ''}
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}

/** The "Build playbook": everything an intermediate engineer needs to go from blueprint to a shipped system. */
export async function PlaybookSection({ pb }: { pb: Playbook }) {
  const starter = pb.starter;
  return (
    <Section
      id="playbook"
      title="Build playbook"
      kicker="From empty repo to shadow-ready: data, ordered milestones with numeric gates and, where a compatible one exists, a starter kit that runs"
    >
      <div
        className={`rounded-md border p-3 text-sm ${pb.provenance === 'generated' ? 'border-warn/40 bg-warn/5 text-ink/90' : 'border-signal/40 bg-signal-soft/20 text-ink/90'}`}
        data-testid="playbook-provenance"
        data-prose
      >
        {pb.provenance === 'generated' ? (
          <>
            <strong className="text-warn">Generated playbook.</strong> Assembled from this blueprint&apos;s
            own signals, constraints and traps and shared domain and method knowledge.{' '}
            {pb.starter?.kitId ? (
              <>
                Its starter is the{' '}
                <a href={`${KIT_BASE}/${pb.starter.kitId}`} target="_blank" rel="noopener noreferrer">
                  {pb.starter.kitId} reference kit
                </a>{' '}
                (
                {pb.compatibility.verdict === 'exact'
                  ? 'an exact match'
                  : 'an adaptable match: it needs the listed modifications'}
                ; tested in CI on synthetic data).
              </>
            ) : (
              <>It has no starter kit: no reference kit is compatible with this use case.</>
            )}{' '}
            8 pilot use cases have hand-written playbooks. Read each section against your own data and
            decision.
          </>
        ) : (
          <>
            <strong className="text-signal">Hand-written playbook</strong> with its own starter kit, numbers
            measured from its runs.
          </>
        )}
      </div>
      <p data-prose className="prose-bs max-w-3xl text-base">
        {pb.summary}
      </p>

      <Sub id="pb-status" title="What this playbook gives you, and where your platform starts">
        <ImplementationStatus pb={pb} />
      </Sub>

      <Sub id="pb-fit" title="Fit with the starter kit">
        <KitFit pb={pb} />
      </Sub>

      <Sub id="pb-prereqs" title="Before you start">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-4">
            <Label>Skills you need</Label>
            <List items={pb.prerequisites.skills} />
          </div>
          <div className="card p-4">
            <Label>Tools</Label>
            <List items={pb.prerequisites.tools} />
            <p className="mt-4 text-sm text-mute" data-prose>
              <strong className="text-ink">Effort. </strong>
              {pb.prerequisites.effort}
            </p>
          </div>
        </div>
      </Sub>

      <Sub id="pb-domain" title="1 · Domain knowledge and terminology you need first">
        <p data-prose className="prose-bs max-w-3xl text-base">
          {pb.domainKnowledge.overview}
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {pb.domainKnowledge.concepts.map((c) => (
            <div key={c.name} className="card p-4" data-testid="concept">
              <p className="text-sm font-semibold text-ink">{c.name}</p>
              <p className="mt-1 text-sm text-ink/90" data-prose>
                {c.explanation}
              </p>
              <p className="mt-2 text-sm text-signal/95" data-prose>
                <strong>Why it matters here. </strong>
                {c.whyItMatters}
              </p>
            </div>
          ))}
        </div>
        <TableWrap>
          <table className="bs-table">
            <thead>
              <tr>
                <th>Term</th>
                <th>What it means in this domain</th>
              </tr>
            </thead>
            <tbody data-testid="glossary">
              {pb.domainKnowledge.glossary.map((g) => (
                <tr key={g.term}>
                  <td className="whitespace-nowrap font-medium text-ink">{g.term}</td>
                  <td>{g.definition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <div className="card p-4">
          <Label>Questions to ask the domain experts before you build</Label>
          <List items={pb.domainKnowledge.askTheExperts} />
        </div>
      </Sub>

      <Sub id="pb-data" title="2 · Data: where it comes from and what a row looks like">
        <p data-prose className="prose-bs max-w-3xl text-sm">
          {pb.data.strategy}
        </p>
        <TableWrap>
          <table className="bs-table">
            <thead>
              <tr>
                <th>Dataset</th>
                <th>License / access</th>
                <th>What it gives you</th>
                <th className="!text-warn">Caveat</th>
              </tr>
            </thead>
            <tbody>
              {pb.data.datasets.map((d) => (
                <tr key={d.url}>
                  <td className="font-medium text-ink">
                    <a href={d.url} target="_blank" rel="noopener noreferrer">
                      {d.name}
                    </a>
                  </td>
                  <td className="text-mute">{d.license}</td>
                  <td>{d.gives}</td>
                  <td className="text-warn/90">{d.caveat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        {pb.data.synthetic && pb.data.sample ? (
          <>
            <div className="card p-4">
              <Label>
                Synthetic generator · <span className="normal-case">{pb.data.synthetic.file}</span>
              </Label>
              <p className="text-sm text-ink/90" data-prose>
                {pb.data.synthetic.description}
              </p>
              <div className="mt-3">
                <Label>Knobs</Label>
                <List items={pb.data.synthetic.knobs} />
              </div>
            </div>
            <TableWrap>
              <table className="bs-table">
                <thead>
                  <tr>
                    {pb.data.sample.columns.map((c) => (
                      <th key={c} className="font-mono">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pb.data.sample.rows.map((r, i) => (
                    <tr key={i}>
                      {r.map((cell, j) => (
                        <td key={j} className="font-mono text-xs">
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </>
        ) : (
          <div className="card p-4" data-testid="no-synthetic">
            <p className="text-sm text-ink/90" data-prose>
              <strong>No synthetic data is supplied.</strong> No reference kit generates this problem&apos;s
              data, so there is no generator and no sample table here. Build the smallest dataset with the
              real label structure first (see milestone M1).
            </p>
          </div>
        )}
        <p className="text-sm text-mute" data-prose>
          <strong className="text-ink">Label. </strong>
          {pb.data.label}
        </p>
      </Sub>

      <Sub id="pb-milestones" title="3 · Milestones with exit gates">
        <ol className="space-y-4">
          {pb.milestones.map((m) => (
            <li key={m.id} className="card p-4" data-testid="milestone">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="chip chip-signal font-mono">{m.id}</span>
                <h4 className="text-base font-semibold text-ink">{m.title}</h4>
                <span className="ml-auto font-mono text-xs text-dim">{m.days} days</span>
              </div>
              <div
                className="mt-2 flex flex-wrap items-center gap-2"
                data-testid="milestone-delivery"
                data-delivery={m.delivery}
              >
                <span
                  className={`chip ${m.delivery === 'executable-reference' ? 'chip-accent' : m.delivery === 'adapt-reference' ? '!border-warn/40 !bg-warn/10 !text-warn' : m.delivery === 'your-platform' ? 'chip-noise' : ''}`}
                  title={DELIVERY_META[m.delivery].meaning}
                >
                  {DELIVERY_META[m.delivery].label}
                </span>
                <span className="text-xs text-dim">completes: {COMPLETION_META[m.state].label}</span>
              </div>
              <div className="mt-3" data-prose>
                <List items={m.tasks} />
              </div>
              <p className="mt-3 text-sm text-mute" data-prose>
                <strong className="text-ink">Deliverable. </strong>
                {m.deliverable}
              </p>
              <dl className="mt-3 grid gap-x-4 gap-y-1 rounded-md border border-signal/30 bg-signal-soft/20 p-3 text-sm sm:grid-cols-[7rem_1fr]">
                <dt className="font-mono text-[11px] uppercase tracking-wider text-signal">Exit gate</dt>
                <dd className="text-ink">{m.gate.metric}</dd>
                <dt className="font-mono text-[11px] uppercase tracking-wider text-dim">Pass when</dt>
                <dd className="text-signal/95">{m.gate.threshold}</dd>
                <dt className="font-mono text-[11px] uppercase tracking-wider text-dim">How</dt>
                <dd className="text-mute">{m.gate.how}</dd>
              </dl>
            </li>
          ))}
        </ol>
      </Sub>

      <Sub
        id="pb-starter"
        title={
          !pb.starter
            ? '4 · Starter kit: none for this use case'
            : pb.compatibility.verdict === 'adaptable'
              ? '4 · Starter kit to adapt (not runnable for this use case as it is)'
              : '4 · Starter kit you can run now'
        }
      >
        {starter ? (
          <>
            {pb.compatibility.verdict === 'adaptable' && (
              <div
                className="rounded-md border border-warn/40 bg-warn/5 p-3 text-sm text-ink/90"
                data-testid="adapt-warning"
                data-prose
              >
                <strong className="text-warn">Adapt before you rely on it.</strong> This kit implements a
                neighbouring problem. Make the modifications listed under &quot;Fit with the starter kit&quot;
                first; until then its numbers and code do not describe this use case.
              </div>
            )}
            <p className="text-sm text-mute" data-prose>
              <strong className="text-ink">Runtime. </strong>
              {starter.runtime}
            </p>
            <CodeBlock code={starter.run.join('\n')} lang="text" title="run it" />
            <p className="text-sm text-mute" data-prose>
              <strong className="text-ink">Expect. </strong>
              {starter.expected}
            </p>
            <div className="space-y-3">
              {starter.files.map((f) => (
                <details key={f.path} className="card group p-4" data-testid="starter-file">
                  <summary className="cursor-pointer list-none">
                    <span className="font-mono text-sm text-signal">{f.path}</span>
                    <span className="ml-3 text-sm text-mute">{f.purpose}</span>
                    <span className="ml-3 align-middle">
                      <KindBadge kind={f.kind} />
                    </span>
                  </summary>
                  <div className="mt-3">
                    <CodeBlock code={f.code} lang={f.language} title={f.path} kind={f.kind} />
                  </div>
                </details>
              ))}
            </div>
          </>
        ) : (
          <div className="card p-4" data-testid="no-starter">
            <p className="text-sm text-ink/90" data-prose>
              <strong>{pb.compatibility.statement}</strong> No code, data generator or run command is supplied
              for this use case, because a runnable example of a different problem could lead you to build the
              wrong thing. Use the milestones, gates and tests below to build the first four milestones
              yourself.
            </p>
          </div>
        )}
      </Sub>

      <Sub id="pb-example" title="5 · Worked example">
        <p className="flex flex-wrap items-center gap-2 text-sm text-mute" data-prose>
          <span className={`chip ${pb.workedExample.basis === 'reference-kit' ? 'chip-accent' : ''}`}>
            {pb.workedExample.basis === 'reference-kit'
              ? 'Run on the starter kit'
              : 'Blueprint only: nothing was run'}
          </span>
          {pb.workedExample.scenario}
        </p>
        <ol className="space-y-3">
          {pb.workedExample.steps.map((s) => (
            <li key={s.stage} className="card p-4">
              <p className="text-sm font-medium text-ink">{s.stage}</p>
              <p className="mt-1 text-sm text-ink/90" data-prose>
                {s.detail}
              </p>
            </li>
          ))}
        </ol>
        <p className="text-sm text-signal/95" data-prose>
          <strong>Outcome. </strong>
          {pb.workedExample.outcome}
        </p>
      </Sub>

      <Sub id="pb-tests" title="6 · Test and acceptance plan">
        <TableWrap>
          <table className="bs-table">
            <thead>
              <tr>
                <th>Test</th>
                <th>Tool / command</th>
                <th className="!text-signal">Pass criterion</th>
              </tr>
            </thead>
            <tbody>
              {pb.tests.map((t) => (
                <tr key={t.test}>
                  <td className="font-medium text-ink">{t.test}</td>
                  <td className="font-mono text-xs text-mute">{t.tool}</td>
                  <td className="text-signal/90">{t.pass}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Sub>

      <Sub id="pb-decisions" title="7 · Decisions you will have to make">
        <div className="space-y-4">
          {pb.decisions.map((d) => (
            <div key={d.question} className="card p-4">
              <p className="text-sm font-medium text-ink">{d.question}</p>
              <TableWrap>
                <table className="bs-table mt-2">
                  <thead>
                    <tr>
                      <th>Option</th>
                      <th>Choose it when</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.options.map((o) => (
                      <tr key={o.option}>
                        <td className="font-medium text-ink">{o.option}</td>
                        <td>{o.chooseWhen}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
              <p className="mt-2 text-sm text-signal/95" data-prose>
                <strong>Default. </strong>
                {d.default}
              </p>
            </div>
          ))}
        </div>
      </Sub>

      <Sub id="pb-pitfalls" title="8 · Pitfalls, by milestone">
        <TableWrap>
          <table className="bs-table">
            <thead>
              <tr>
                <th>At</th>
                <th>Mistake</th>
                <th className="!text-noise">Symptom</th>
                <th className="!text-signal">Fix</th>
              </tr>
            </thead>
            <tbody>
              {pb.pitfalls.map((p) => (
                <tr key={p.mistake}>
                  <td className="font-mono text-xs">{p.at}</td>
                  <td className="font-medium text-ink">{p.mistake}</td>
                  <td className="text-noise/90">{p.symptom}</td>
                  <td className="text-signal/90">{p.fix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Sub>

      <Sub id="pb-30" title="9 · The first 30 days after launch">
        <div data-prose>
          <List items={pb.first30Days} />
        </div>
      </Sub>
    </Section>
  );
}
