import type { Playbook } from '../../schemas/usecase.schema';
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

/** The "Build playbook": everything an intermediate engineer needs to go from blueprint to a shipped system. */
export async function PlaybookSection({ pb }: { pb: Playbook }) {
  return (
    <Section
      id="playbook"
      title="Build playbook"
      kicker="From empty repo to shadow-ready: data, ordered milestones with numeric gates, a starter kit that runs"
    >
      <p data-prose className="prose-bs max-w-3xl text-base">
        {pb.summary}
      </p>

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

      <Sub id="pb-data" title="1 · Data: where it comes from and what a row looks like">
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
        <p className="text-sm text-mute" data-prose>
          <strong className="text-ink">Label. </strong>
          {pb.data.label}
        </p>
      </Sub>

      <Sub id="pb-milestones" title="2 · Milestones with exit gates">
        <ol className="space-y-4">
          {pb.milestones.map((m) => (
            <li key={m.id} className="card p-4" data-testid="milestone">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="chip chip-signal font-mono">{m.id}</span>
                <h4 className="text-base font-semibold text-ink">{m.title}</h4>
                <span className="ml-auto font-mono text-xs text-dim">{m.days} days</span>
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

      <Sub id="pb-starter" title="3 · Starter kit you can run now">
        <p className="text-sm text-mute" data-prose>
          <strong className="text-ink">Runtime. </strong>
          {pb.starter.runtime}
        </p>
        <CodeBlock code={pb.starter.run.join('\n')} lang="text" title="run it" />
        <p className="text-sm text-mute" data-prose>
          <strong className="text-ink">Expect. </strong>
          {pb.starter.expected}
        </p>
        <div className="space-y-3">
          {pb.starter.files.map((f) => (
            <details key={f.path} className="card group p-4" data-testid="starter-file">
              <summary className="cursor-pointer list-none">
                <span className="font-mono text-sm text-signal">{f.path}</span>
                <span className="ml-3 text-sm text-mute">{f.purpose}</span>
              </summary>
              <div className="mt-3">
                <CodeBlock code={f.code} lang={f.language} title={f.path} />
              </div>
            </details>
          ))}
        </div>
      </Sub>

      <Sub id="pb-example" title="4 · Worked example">
        <p className="text-sm text-mute" data-prose>
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

      <Sub id="pb-tests" title="5 · Test and acceptance plan">
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

      <Sub id="pb-decisions" title="6 · Decisions you will have to make">
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

      <Sub id="pb-pitfalls" title="7 · Pitfalls, by milestone">
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

      <Sub id="pb-30" title="8 · The first 30 days after launch">
        <div data-prose>
          <List items={pb.first30Days} />
        </div>
      </Sub>
    </Section>
  );
}
