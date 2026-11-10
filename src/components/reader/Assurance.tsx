import { evaluationPlan, guardrailPlan, type GuardrailLayer } from '../../content/assurance';
import type { UseCase } from '../../schemas/usecase.schema';

/* The full evaluation plan and the guardrails table: one place each for what the blueprint says across several sections. */

const Sub = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <div id={id} className="scroll-mt-28 space-y-4 border-t border-line pt-6">
    <h3 className="text-lg font-semibold tracking-tight text-ink">{title}</h3>
    {children}
  </div>
);

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="card overflow-x-auto">
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
    </div>
  );
}

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="space-y-2 text-sm text-ink/90">
    {items.map((x) => (
      <li key={x} className="flex gap-2">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" aria-hidden />
        <span>{x}</span>
      </li>
    ))}
  </ul>
);

/** One line as text, several as a compact list: a row can hold many guardrails enforced by one mechanism. */
const Lines = ({ items }: { items: string[] }) =>
  items.length === 1 ? (
    <>{items[0]}</>
  ) : (
    <ul className="list-disc space-y-1 pl-4">
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  );

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="font-mono text-[11px] uppercase tracking-wider text-dim">{children}</p>
);

const DESIGN_LABEL = (d: string) => d.replace(/-/g, ' ');

export function EvaluationDetail({ uc }: { uc: UseCase }) {
  const e = evaluationPlan(uc);
  return (
    <div className="space-y-6" data-testid="evaluation-plan">
      <Sub id="ev-question" title="What the evaluation has to prove">
        <p className="max-w-3xl text-sm font-medium text-ink">{e.question}</p>
        <p data-prose className="max-w-3xl text-sm text-mute">
          {e.estimand}
        </p>
      </Sub>

      <Sub id="ev-offline" title="Offline protocol">
        <Table head={['Step', 'How to run it']} rows={e.protocol.map((p) => [p.item, p.how])} />
        <div>
          <Label>Report every metric on these slices</Label>
          <div className="mt-2">
            <Bullets items={e.slices} />
          </div>
        </div>
      </Sub>

      <Sub id="ev-thresholds" title="Release thresholds">
        <Table
          head={['Metric', 'Target', 'Checked', 'If it is missed']}
          rows={e.thresholds.map((t) => [t.metric, t.target, t.cadence, t.onBreach])}
        />
        <p data-prose className="max-w-3xl text-xs text-dim">
          {e.thresholdBasis}
        </p>
      </Sub>

      {e.aiQuality.length > 0 && (
        <Sub id="ev-ai" title="LLM and agent evaluation">
          <Table
            head={['What', 'Metric', 'Target', 'How']}
            rows={e.aiQuality.map((a) => [a.what, a.metric, a.target, a.how])}
          />
        </Sub>
      )}

      <Sub id="ev-online" title="Online evaluation">
        <Table
          head={['Decision', 'For this use case']}
          rows={[
            ['Design', <span key="d">{DESIGN_LABEL(e.online.design)}</span>],
            ['Unit', e.online.unit],
            ['Why this design', e.online.why],
            ['Primary metric', e.online.primary],
          ]}
        />
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label>Guardrail metrics: must not get worse</Label>
            <div className="mt-2">
              <Bullets items={e.online.guardrails} />
            </div>
          </div>
          <div>
            <Label>Stopping rules: fixed before launch</Label>
            <div className="mt-2">
              <Bullets items={e.online.stopping} />
            </div>
          </div>
        </div>
      </Sub>

      <Sub id="ev-continuous" title="After launch: evaluation does not stop">
        <div>
          <Label>What triggers a re-evaluation or retrain</Label>
          <div className="mt-2">
            <Bullets items={e.continuous.triggers} />
          </div>
        </div>
        <Table
          head={['Rule', 'For this use case']}
          rows={[
            ['Champion and challenger', e.continuous.championChallenger],
            ['Train and score only on matured data', e.continuous.dataMaturity],
          ]}
        />
      </Sub>

      {e.tests.length > 0 && (
        <Sub id="ev-tests" title="Executable checks">
          <Table head={['Test', 'Passes when']} rows={e.tests.map((t) => [t.test, t.pass])} />
        </Sub>
      )}

      <p className="text-sm text-mute" data-prose>
        More depth:{' '}
        <a href="#experimentation" className="text-signal">
          Statistical validation
        </a>{' '}
        (power, causal methods, business value),{' '}
        <a href="#metrics" className="text-signal">
          Metrics catalogue
        </a>{' '}
        (every metric with its owner and alert)
        {e.aiQuality.length > 0 && (
          <>
            {' '}
            and{' '}
            <a href="#agentic" className="text-signal">
              Agentic solution
            </a>{' '}
            (autonomy gates)
          </>
        )}
        .
      </p>
    </div>
  );
}

const LAYER_TONE: Record<GuardrailLayer, string> = {
  'Hard constraint': 'chip-noise',
  'Runtime control': 'chip-accent',
  'Outcome guardrail': 'chip-signal',
  'Human oversight': '',
  Degradation: '',
  'Stop and roll back': '',
};

export function GuardrailsBlock({ uc }: { uc: UseCase }) {
  const g = guardrailPlan(uc);
  return (
    <div
      id="gov-guardrails"
      className="scroll-mt-28 space-y-4 border-t border-line pt-6"
      data-testid="guardrails"
      data-agent-controls={g.hasAgentControls}
    >
      <h3 className="text-lg font-semibold tracking-tight text-ink">
        Guardrails: what must not happen, and what enforces it
      </h3>
      <p data-prose className="max-w-3xl text-sm text-mute">
        A guardrail is a limit enforced outside the model. Six layers, from the constraint that can never be
        broken to the way a bad release is withdrawn.
      </p>
      {g.noAgentNote && (
        <p className="max-w-3xl text-sm text-ink" data-testid="guardrails-no-agent">
          {g.noAgentNote}
        </p>
      )}
      <Table
        head={['Layer', 'Guardrail', 'Enforced by']}
        rows={g.rows.map((r) => [
          <span key="l" className={`chip whitespace-nowrap ${LAYER_TONE[r.layer]}`}>
            {r.layer}
          </span>,
          <Lines key="g" items={r.guardrails} />,
          <Lines key="e" items={r.enforcedBy} />,
        ])}
      />
      <p className="text-sm text-mute" data-prose>
        Related:{' '}
        <a href="#gov-security" className="text-signal">
          AI security threats
        </a>
        ,{' '}
        <a href="#edge-cases" className="text-signal">
          production edge cases
        </a>
        {g.autonomy.length > 0 && (
          <>
            {' '}
            and the{' '}
            <a href="#agentic" className="text-signal">
              autonomy ladder
            </a>{' '}
            ({g.autonomy.length} levels, each with a gate to pass before the system may do more)
          </>
        )}
        .
      </p>
    </div>
  );
}
