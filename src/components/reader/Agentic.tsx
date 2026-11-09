import { type Agentic, isAgentic } from '../../schemas/usecase.schema';
import { MermaidDiagram } from '../Mermaid';
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

const FIT: Record<Agentic['fit'], { label: string; tone: string; text: string }> = {
  core: { label: 'Core', tone: 'chip-signal', text: 'The agent is the product.' },
  strong: { label: 'Strong fit', tone: 'chip-signal', text: 'Agents add real value around the model.' },
  supporting: { label: 'Supporting', tone: '', text: 'Agents help on the edges; the model does the work.' },
  'not-recommended': {
    label: 'No agent recommended',
    tone: 'chip-noise',
    text: 'A deterministic design is the better answer here.',
  },
  'not-applicable': {
    label: 'Agents not applicable',
    tone: 'chip-noise',
    text: 'The problem has no place an agent could improve.',
  },
};

const VERDICT_TONE: Record<Agentic['decision']['options'][number]['verdict'], string> = {
  chosen: 'chip-signal',
  complement: '',
  fallback: '',
  rejected: 'chip-noise',
};

function DecisionBlock({ ag }: { ag: Agentic }) {
  const d = ag.decision;
  return (
    <Sub id="ag-decision" title="Do we need an agent at all?">
      <p data-prose className="prose-bs max-w-3xl text-base font-medium" data-testid="agentic-question">
        {d.question}
      </p>
      <TableWrap>
        <table className="w-full text-left text-sm" data-testid="agentic-decision">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wider text-dim">
              <th className="p-3">Approach</th>
              <th className="p-3">Start with it when</th>
              <th className="p-3">Verdict here</th>
              <th className="p-3">Why</th>
            </tr>
          </thead>
          <tbody>
            {d.options.map((o) => (
              <tr key={o.approach} className="border-b border-line/60 align-top">
                <th className="p-3 font-semibold capitalize text-ink">{o.approach.replace(/-/g, ' ')}</th>
                <td className="p-3">{o.startWhen}</td>
                <td className="p-3">
                  <span className={`chip ${VERDICT_TONE[o.verdict]}`}>{o.verdict}</span>
                </td>
                <td className="p-3">{o.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <Label>What would justify an agent</Label>
          <p className="text-sm text-ink/90">{d.measurableValue}</p>
        </div>
        <div className="card p-4">
          <Label>Incremental cost</Label>
          <p className="text-sm text-ink/90">{d.incrementalCost}</p>
        </div>
        <div className="card p-4">
          <Label>Operational risk</Label>
          <p className="text-sm text-ink/90">{d.operationalRisk}</p>
        </div>
        <div className="card p-4">
          <Label>Fallback architecture</Label>
          <p className="text-sm text-ink/90">{d.fallbackArchitecture}</p>
        </div>
      </div>
      <div className="card p-4">
        <Label>Revisit this verdict when</Label>
        <List items={d.revisitWhen} />
      </div>
    </Sub>
  );
}

/** Agentic solutioning: where agents belong, what they may do, how autonomy is earned and how they are evaluated. */
export function AgenticSection({ ag }: { ag: Agentic }) {
  const fit = FIT[ag.fit];
  return (
    <Section
      id="agentic"
      title="Agentic solution"
      kicker="Agents, typed tools, an autonomy ladder with gates, guardrails and how to evaluate them"
    >
      <div className="flex flex-wrap items-center gap-2" data-testid="agentic-fit">
        <span className={`chip ${fit.tone}`}>{fit.label}</span>
        <span className="text-sm text-mute">{fit.text}</span>
        <span className="chip">{ag.pattern}</span>
      </div>
      <p data-prose className="prose-bs max-w-3xl text-base">
        <strong>{ag.role}.</strong> {ag.rationale}
      </p>

      <DecisionBlock ag={ag} />

      {!isAgentic(ag.fit) && (
        <Sub id="ag-fallback" title="Recommended architecture without agents">
          <MermaidDiagram code={ag.architecture} label="Architecture without agents" />
          <MermaidDiagram code={ag.sequence} label="Sequence without agents" />
          <div className="card p-4">
            <Label>When not to add an agent here</Label>
            <List items={ag.whenNotToUse} tone="noise" />
          </div>
        </Sub>
      )}

      {isAgentic(ag.fit) && (
        <>
          <Sub id="ag-agents" title="The agents">
            <TableWrap>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wider text-dim">
                    <th className="p-3">Agent</th>
                    <th className="p-3">Responsibility</th>
                    <th className="p-3">Trigger</th>
                    <th className="p-3">Tools</th>
                    <th className="p-3">Starts at</th>
                    <th className="p-3">Hands off to</th>
                  </tr>
                </thead>
                <tbody>
                  {ag.agents.map((a) => (
                    <tr key={a.name} className="border-b border-line/60 align-top">
                      <th className="p-3 font-semibold text-ink">{a.name}</th>
                      <td className="p-3">{a.responsibility}</td>
                      <td className="p-3">{a.trigger}</td>
                      <td className="p-3 font-mono text-xs">{a.tools.join(', ')}</td>
                      <td className="p-3 font-mono text-xs">{a.autonomy}</td>
                      <td className="p-3">{a.handoff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            <MermaidDiagram code={ag.architecture} label="Agent architecture" />
            <MermaidDiagram code={ag.sequence} label="Agent sequence: investigate, verify, approve, act" />
          </Sub>

          <Sub id="ag-tools" title="Typed tools and permissions">
            <TableWrap>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wider text-dim">
                    <th className="p-3">Tool</th>
                    <th className="p-3">Access</th>
                    <th className="p-3">Backed by</th>
                    <th className="p-3">Permission</th>
                  </tr>
                </thead>
                <tbody>
                  {ag.tools.map((t) => (
                    <tr key={t.name} className="border-b border-line/60 align-top">
                      <th className="p-3 font-mono text-xs text-ink">{t.name}</th>
                      <td className="p-3">
                        <span className={`chip ${t.access === 'write' ? 'chip-noise' : 'chip-signal'}`}>
                          {t.access}
                        </span>
                      </td>
                      <td className="p-3">{t.backedBy}</td>
                      <td className="p-3">{t.permission}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Sub>

          <Sub id="ag-autonomy" title="Autonomy ladder: earn it level by level">
            <div className="grid gap-4 md:grid-cols-2" data-testid="agentic-ladder">
              {ag.autonomy.map((l) => (
                <div key={l.level} className="card p-4">
                  <Label>
                    {l.level} · {l.name}
                  </Label>
                  <p className="text-sm text-ink/90">{l.behaviour}</p>
                  <p className="mt-2 text-sm text-mute">
                    <strong className="text-ink">Gate:</strong> {l.gate}
                  </p>
                </div>
              ))}
            </div>
          </Sub>

          <Sub id="ag-context" title="Context and memory">
            <TableWrap>
              <table className="w-full text-left text-sm">
                <tbody>
                  {ag.context.map((c) => (
                    <tr key={c.kind} className="border-b border-line/60 align-top">
                      <th className="p-3 font-semibold text-ink">{c.kind}</th>
                      <td className="p-3">{c.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Sub>

          <Sub id="ag-guardrails" title="Guardrails">
            <TableWrap>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wider text-dim">
                    <th className="p-3">Risk</th>
                    <th className="p-3">Control</th>
                  </tr>
                </thead>
                <tbody>
                  {ag.guardrails.map((g) => (
                    <tr key={g.risk} className="border-b border-line/60 align-top">
                      <th className="p-3 font-medium text-ink">{g.risk}</th>
                      <td className="p-3">{g.control}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Sub>

          <Sub id="ag-eval" title="How to evaluate the agents">
            <TableWrap>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wider text-dim">
                    <th className="p-3">What</th>
                    <th className="p-3">Metric</th>
                    <th className="p-3">Target</th>
                    <th className="p-3">How</th>
                  </tr>
                </thead>
                <tbody>
                  {ag.evaluation.map((e) => (
                    <tr key={e.what} className="border-b border-line/60 align-top">
                      <th className="p-3 font-medium text-ink">{e.what}</th>
                      <td className="p-3">{e.metric}</td>
                      <td className="p-3">{e.target}</td>
                      <td className="p-3">{e.how}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Sub>

          <Sub id="ag-failures" title="Failure modes and budgets">
            <TableWrap>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wider text-dim">
                    <th className="p-3">Scenario</th>
                    <th className="p-3">Agent response</th>
                  </tr>
                </thead>
                <tbody>
                  {ag.failureModes.map((f) => (
                    <tr key={f.scenario} className="border-b border-line/60 align-top">
                      <th className="p-3 font-medium text-ink">{f.scenario}</th>
                      <td className="p-3">{f.response}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            <TableWrap>
              <table className="w-full text-left text-sm">
                <tbody>
                  {ag.budget.map((b) => (
                    <tr key={b.item} className="border-b border-line/60 align-top">
                      <th className="p-3 font-semibold text-ink">{b.item}</th>
                      <td className="p-3">{b.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Sub>

          <Sub id="ag-build" title="Build order">
            <ol className="space-y-3 text-sm">
              {ag.buildSteps.map((s, i) => (
                <li key={s.step} className="flex gap-3">
                  <span className="font-mono text-dim">{i + 1}.</span>
                  <span>
                    <strong className="text-ink">{s.step}.</strong> {s.deliverable}
                  </span>
                </li>
              ))}
            </ol>
            <div className="card p-4">
              <Label>When not to use an agent</Label>
              <List items={ag.whenNotToUse} tone="noise" />
            </div>
          </Sub>
        </>
      )}
    </Section>
  );
}
