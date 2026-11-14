import { Download, FileJson, FileText } from 'lucide-react';
import type { Hop, ImplementationPlaybook } from '../../schemas/implementation.schema';
import { PACK_BY_SLUG } from '../../content/fde/catalog';
import { STAGE_BY_ID, FDE_STAGES } from '../../content/fde/workflow';
import { withBase } from '../../lib/site';
import { CodeBlock } from '../Code';
import { AddToWorkspace } from '../fde/AddToWorkspace';
import { LazySequence } from '../fde/LazySequence';
import { List, Section, TableWrap } from './Sections';

const Sub = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <div id={id} className="scroll-mt-28 space-y-4 border-t border-line pt-6 first:border-t-0 first:pt-0">
    <h3 className="text-lg font-semibold tracking-tight text-ink">{title}</h3>
    {children}
  </div>
);
const Table = ({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) => (
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
const Mono = ({ children }: { children: React.ReactNode }) => (
  <code className="font-mono text-xs">{children}</code>
);
const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="font-mono text-[11px] uppercase tracking-wider text-dim">{children}</p>
);
const NECESSITY_TONE = {
  core: '!border-signal/50 !text-signal',
  conditional: '!border-warn/40 !text-warn',
  optional: 'text-dim',
} as const;

function HopCard({ h, open }: { h: Hop; open: boolean }) {
  const e = h.external;
  return (
    <details open={open} id={h.id} className="card scroll-mt-28 p-4" data-testid="hop">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-semibold text-ink">
        <span className="font-mono text-xs text-signal">{h.id}</span>
        <span>{h.name}</span>
        <span className={`chip ${NECESSITY_TONE[h.necessity]}`}>{h.necessity}</span>
        <span className="chip">{h.direction}</span>
      </summary>
      <div className="mt-4 space-y-5">
        <p className="text-sm text-mute" data-prose>
          {h.purpose}
        </p>
        <div>
          <Label>1 · External protocol</Label>
          <Table
            head={['Source', 'Target', 'Protocol', 'Boundary', 'Authentication', 'Network']}
            rows={[[e.source, e.target, e.protocol, e.boundary, e.authentication, e.network]]}
          />
        </div>
        <div className="space-y-2">
          <Label>2 · Connector and transformation (adapter: {h.connector.adapter})</Label>
          <List items={h.connector.transformation} />
          <p className="text-xs font-medium text-ink">Error handling</p>
          <List items={h.connector.errorHandling} tone="noise" />
          <p className="text-xs text-mute">
            Retry: {h.connector.retry}. Timeout: {h.connector.timeout}. Idempotency: {h.connector.idempotency}
            .
          </p>
        </div>
        <div className="space-y-2">
          <Label>3 · Internal contract: {h.contract.name}</Label>
          <CodeBlock
            lang="text"
            code={`request:  ${h.contract.request}\nresponse: ${h.contract.response}\nevent:    ${h.contract.event}`}
          />
        </div>
        <div className="space-y-2">
          <Label>4 · Acknowledgement ({h.acknowledgement.protocol})</Label>
          <CodeBlock lang="text" code={h.acknowledgement.example} />
          <p className="text-xs text-mute">Expected: {h.acknowledgement.expectedOutput}</p>
        </div>
        <Table
          head={['External', 'Internal', 'Rule']}
          rows={h.mappings.map((m) => [m.external, m.internal, m.rule])}
        />
        <LazySequence code={h.sequence} label={`${h.name}: sequence`} />
        <div className="space-y-2">
          <Label>Integration tests</Label>
          <Table
            head={['Id', 'Layer', 'Case', 'Given', 'When', 'Then']}
            rows={h.tests.map((t) => [t.id, t.layer, t.title, t.given, t.when, t.then])}
          />
          {h.tests.some((t) => t.command) && (
            <CodeBlock
              lang="text"
              code={[...new Set(h.tests.filter((t) => t.command).map((t) => t.command!))].join('\n')}
            />
          )}
        </div>
        {h.artifacts.length > 0 && (
          <div>
            <Label>Code and fixtures</Label>
            <ul className="mt-1 space-y-1 text-xs">
              {h.artifacts.map((a) => (
                <li key={a}>
                  <a href={withBase(`/downloads/${a}`)} className="font-mono">
                    {a}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

/** The Customer Implementation Playbook: what an FDE new to this use case needs to implement it end to end. */
export function ImplementationSection({ pb }: { pb: ImplementationPlaybook }) {
  const pack = PACK_BY_SLUG[pb.slug];
  const core = pb.integrations.filter((h) => h.necessity === 'core').length;
  return (
    <Section
      id="implementation"
      title="Customer implementation playbook"
      kicker="For the forward deployed engineer: discovery to handover without inventing the missing engineering"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`chip ${pb.provenance.kind === 'authored' ? '!border-signal/50 !text-signal' : ''}`}
            data-testid="impl-provenance"
          >
            {pb.provenance.kind === 'authored'
              ? 'Authored from an executable pack'
              : 'Derived from this blueprint'}
          </span>
          <span className="chip">
            {pb.integrations.length} integration hops ({core} core)
          </span>
          <span className="chip">mode: {pb.mode}</span>
        </div>
        <p className="max-w-3xl text-sm text-ink/90" data-prose>
          {pb.summary}
        </p>
        <p
          className="max-w-3xl rounded-md border border-line bg-raised/40 p-3 text-xs text-mute"
          data-testid="impl-boundary"
          data-prose
        >
          <strong className="text-ink">What this is and is not. </strong>
          {pb.provenance.note}
          {pb.provenance.kind === 'derived' &&
            " The hops, mappings and tests below are generated from this blueprint's own systems and constraints, so confirm them with the customer's system owners before relying on them."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <a
            className="btn no-underline"
            href={withBase(`/implementation/${pb.slug}.md`)}
            data-testid="impl-md"
          >
            <FileText size={14} aria-hidden /> Download as Markdown
          </a>
          <a
            className="btn no-underline"
            href={withBase(`/implementation/${pb.slug}.json`)}
            data-testid="impl-json"
          >
            <FileJson size={14} aria-hidden /> Download as JSON
          </a>
          {pack && (
            <a className="btn no-underline" href={withBase(`/downloads/${pack.dir}/README.md`)}>
              <Download size={14} aria-hidden /> Executable pack ({pack.tests} tests)
            </a>
          )}
          <a className="btn no-underline" href={withBase('/downloads/brainsiphon-fde-preflight-toolkit.zip')}>
            <Download size={14} aria-hidden /> Pre-flight toolkit
          </a>
        </div>
        <AddToWorkspace slug={pb.slug} />
      </div>

      <Sub id="impl-ownership" title="Who does what">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>The FDE owns</Label>
            <List items={pb.ownership.fdeOwns} />
          </div>
          <div>
            <Label>The FDE supports</Label>
            <List items={pb.ownership.fdeSupports} />
          </div>
        </div>
        <Table
          head={['Deliverable', 'FDE', 'Platform', 'Architect', 'AI eng', 'SRE', 'Customer']}
          rows={pb.ownership.raci.map((r) => [
            r.deliverable,
            r.fde,
            r.platform,
            r.architect,
            r.aiEngineer,
            r.sre,
            r.customer,
          ])}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <Label>The FDE can do alone</Label>
            <Table
              head={['Task', 'Evidence']}
              rows={pb.ownership.independent.map((r) => [r.task, r.evidence])}
            />
          </div>
          <div>
            <Label>Needs approval</Label>
            <Table
              head={['Task', 'Approver', 'Evidence']}
              rows={pb.ownership.needsApproval.map((r) => [r.task, r.approver, r.evidence])}
            />
          </div>
        </div>
        <div>
          <Label>Escalation</Label>
          <Table
            head={['Trigger', 'To', 'Within', 'How']}
            rows={pb.ownership.escalation.map((r) => [r.trigger, r.to, r.within, r.how])}
          />
        </div>
      </Sub>

      <Sub id="impl-maturity" title="What is missing for production">
        <p className="text-sm text-ink/90" data-prose>
          <strong>Reached: {pb.maturity.reached}.</strong> {pb.maturity.verdict}{' '}
          <span className="text-mute">Next: {pb.maturity.next}</span>
        </p>
        <Table
          head={['Id', 'Stage', 'Task', 'Owner', 'Evidence']}
          rows={pb.maturity.tasks.map((t) => [
            t.id,
            STAGE_BY_ID[t.stage].name,
            `${t.title}: ${t.detail}`,
            t.owner,
            t.evidence,
          ])}
        />
      </Sub>

      <Sub id="impl-discovery" title="Discovery questions for the customer">
        <Table
          head={['Id', 'Area', 'Question', 'Why it matters', 'Ask', 'Evidence']}
          rows={pb.discovery.map((d) => [d.id, d.area, d.question, d.why, d.askWho, d.evidence])}
        />
      </Sub>

      <Sub id="impl-systems" title="Customer systems and alternatives">
        <Table
          head={[
            'Role',
            'System',
            'Need',
            'Purpose',
            'Alternatives (adapter)',
            'Customer owner',
            'If no access',
          ]}
          rows={pb.systems.map((s) => [
            s.role,
            s.name,
            s.need,
            s.purpose,
            s.alternatives.map((a) => a.name + (a.adapter ? ` (${a.adapter})` : '')).join('; '),
            s.customerOwner,
            s.ifNoAccess,
          ])}
        />
      </Sub>

      <Sub id="impl-integrations" title="Integrations, layer by layer">
        <p className="text-sm text-mute">
          Each hop is specified in four layers: the external protocol, the connector and its transformations,
          the internal contract, and the acknowledgement. Open a hop for its mappings, sequence and tests.
        </p>
        <div className="space-y-3">
          {pb.integrations.map((h, i) => (
            <HopCard key={h.id} h={h} open={i === 0} />
          ))}
        </div>
      </Sub>

      <Sub id="impl-access" title="Identity, permissions and network">
        <KVRows
          rows={[
            ['Workforce', pb.identity.workforce],
            ['Machine', pb.identity.machine],
            ...(pb.identity.partner ? [['Partner', pb.identity.partner] as [string, string]] : []),
          ]}
        />
        <List items={pb.identity.notes} />
        <Table
          head={['System', 'Permission to request', 'Scope', 'Why', 'Approver']}
          rows={pb.permissions.map((p) => [p.system, p.permission, p.scope, p.why, p.approver])}
        />
        <Table
          head={['Id', 'From', 'To', 'Port', 'Protocol', 'Purpose', 'Firewall change']}
          rows={pb.network.map((n) => [n.id, n.from, n.to, n.port, n.protocol, n.purpose, n.change])}
        />
      </Sub>

      <Sub id="impl-connectors" title="Connectors, mocks and local development">
        <Table
          head={['Adapter', 'Role', 'Config', 'Mock']}
          rows={pb.connectors.map((c) => [
            <Mono key="a">{c.adapter}</Mono>,
            c.role,
            <Mono key="c">{c.config}</Mono>,
            c.mock,
          ])}
        />
        <List items={pb.localDev.prerequisites} />
        <ol className="space-y-4 text-sm">
          {pb.localDev.steps.map((s, i) => (
            <li key={i} className="space-y-1.5">
              <p className="font-medium text-ink">
                {i + 1}. {s.title}
              </p>
              <CodeBlock lang="text" code={s.command} />
              <p className="text-xs text-mute">Expect: {s.expect}</p>
            </li>
          ))}
        </ol>
      </Sub>

      <Sub id="impl-config" title="Customer configuration">
        {pb.configuration.files.map((f) => (
          <CodeBlock
            key={f.path}
            lang={f.language === 'yaml' || f.language === 'json' ? f.language : 'text'}
            title={f.path}
            code={f.content}
          />
        ))}
        <Table
          head={['Key', 'Required', 'Description', 'Example']}
          rows={pb.configuration.keys.map((k) => [
            <Mono key="k">{k.key}</Mono>,
            k.required ? 'yes' : 'no',
            k.description,
            <Mono key="e">{k.example}</Mono>,
          ])}
        />
      </Sub>

      <Sub id="impl-testing" title="Tests">
        <Table
          head={['Suite', 'Covers', 'Command']}
          rows={pb.testing.suites.map((s) => [s.name, s.covers, <Mono key="c">{s.command}</Mono>])}
        />
        <Table
          head={['Id', 'Acceptance case', 'Given', 'When', 'Then']}
          rows={pb.testing.acceptance.map((t) => [t.id, t.title, t.given, t.when, t.then])}
        />
      </Sub>

      <Sub id="impl-rollout" title="Rollout, rollback and reconciliation">
        <p className="text-sm text-ink/90" data-prose>
          {pb.rollout.strategy}
        </p>
        <Table
          head={['Stage', 'Traffic', 'Gate', 'Rollback']}
          rows={pb.rollout.stages.map((s) => [s.stage, s.traffic, s.gate, s.rollback])}
        />
        <p className="text-sm text-mute">
          <strong className="text-ink">Fallback. </strong>
          {pb.rollout.fallback}
        </p>
        <List items={pb.rollout.reconciliation} />
        <p className="text-sm text-mute">{pb.deployment.note}</p>
        {(['preflight', 'deploy', 'verify', 'rollback', 'cleanup'] as const).map((k) => (
          <div key={k} className="space-y-1.5">
            <Label>{k}</Label>
            <CodeBlock lang="text" code={pb.deployment.commands[k].join('\n')} />
          </div>
        ))}
      </Sub>

      <Sub id="impl-troubleshooting" title="Troubleshooting for this use case">
        {pb.troubleshooting.specific.map((t) => (
          <details key={t.title} className="card p-4">
            <summary className="cursor-pointer text-sm font-semibold text-ink">{t.title}</summary>
            <div className="mt-3 space-y-3 text-sm">
              <p className="text-mute">
                <strong className="text-ink">Symptoms. </strong>
                {t.symptoms.join('; ')}
              </p>
              <CodeBlock lang="text" code={t.diagnose.join('\n')} title="Diagnose" />
              <p className="text-mute">
                <strong className="text-ink">Likely cause. </strong>
                {t.cause}
              </p>
              <List items={t.fix} />
              <p className="text-mute">
                <strong className="text-ink">Verify. </strong>
                {t.verify.join('; ')}
              </p>
            </div>
          </details>
        ))}
        <p className="text-sm text-mute">
          Shared scenarios that also apply: {pb.troubleshooting.scenarioIds.join(', ')}. See the
          troubleshooting knowledge base in the <a href={withBase('/fde/#troubleshooting')}>FDE hub</a>.
        </p>
      </Sub>

      <Sub id="impl-deliverables" title="Deliverables: the FDE and the customer">
        <Table
          head={['Id', 'The FDE delivers', 'Stage', 'Evidence']}
          rows={pb.deliverables.fde.map((d) => [d.id, d.title, STAGE_BY_ID[d.stage].name, d.evidence])}
        />
        <Table
          head={['Id', 'The customer provides', 'Owner', 'Needed by', 'Blocks']}
          rows={pb.deliverables.customer.map((d) => [
            d.id,
            d.title,
            d.owner,
            STAGE_BY_ID[d.neededBy].name,
            d.blocks,
          ])}
        />
      </Sub>

      <Sub id="impl-acceptance" title="Acceptance and handover">
        <Table
          head={['Id', 'Category', 'Criterion', 'Measure', 'Threshold', 'Evidence', 'Owner']}
          rows={pb.acceptance.criteria.map((c) => [
            c.id,
            c.category,
            c.criterion,
            c.measure,
            c.threshold,
            c.evidence,
            c.owner,
          ])}
        />
        <Label>Handover pack</Label>
        <List items={pb.acceptance.handover} />
      </Sub>

      <Sub id="impl-checklist" title="Stage checklist">
        {FDE_STAGES.map((st) => {
          const items = pb.checklist.filter((c) => c.stage === st.id);
          return items.length ? (
            <details key={st.id} className="card p-4">
              <summary className="cursor-pointer text-sm font-semibold text-ink">
                {st.n}. {st.name} <span className="font-normal text-dim">({items.length} items)</span>
              </summary>
              <ul className="mt-3 space-y-1.5 text-sm">
                {items.map((c) => (
                  <li key={c.id}>
                    <span className="font-mono text-xs text-dim">{c.id}</span>{' '}
                    <span className="chip">{c.owner}</span>
                    {c.approval && <span className="chip !border-warn/40 !text-warn">approval</span>} {c.item}
                  </li>
                ))}
              </ul>
            </details>
          ) : null;
        })}
      </Sub>
    </Section>
  );
}

function KVRows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="space-y-1.5 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="grid gap-1 sm:grid-cols-[8rem_1fr]">
          <dt className="font-mono text-[11px] uppercase tracking-wider text-dim">{k}</dt>
          <dd className="text-ink/90">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
