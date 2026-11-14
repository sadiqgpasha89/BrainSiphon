'use client';

import { useState } from 'react';
import type { ImplementationPlaybook, FdeStageId } from '../../schemas/implementation.schema';
import { FDE_STAGES, STAGE_BY_ID } from '../../content/fde/workflow';
import { DEPLOY_MODES, type DeployModeId } from '../../content/fde/deploy-modes';
import type { CriterionState, Evidence } from '../../content/fde/dod';
import { download, getEvidenceFile, putEvidenceFile, sha256File } from '../../lib/fde/storage';
import type { HopState, ItemStatus, Workspace, WsAction } from '../../lib/fde/workspace';
import { Field, inputCls, Table } from './ui';

export interface PanelProps {
  ws: Workspace;
  pb: ImplementationPlaybook;
  act: (a: WsAction) => void;
}
const Btn = ({
  children,
  onClick,
  tone,
  disabled,
  submit,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'signal';
  disabled?: boolean;
  submit?: boolean;
}) => (
  <button
    type={submit ? 'submit' : 'button'}
    disabled={disabled}
    className={`btn !px-2.5 !py-1 text-xs ${tone === 'signal' ? '!border-signal/50 !bg-signal-soft !text-signal' : ''}`}
    onClick={onClick}
  >
    {children}
  </button>
);
const select = 'rounded-md border border-line bg-canvas px-1.5 py-1 text-xs text-ink';
const STATUS_LABEL: Record<ItemStatus, string> = {
  todo: 'To do',
  doing: 'Doing',
  blocked: 'Blocked',
  done: 'Done',
};

export function ChecklistPanel({ ws, pb, act }: PanelProps) {
  return (
    <div className="space-y-3">
      {FDE_STAGES.map((st) => {
        const items = pb.checklist.filter((c) => c.stage === st.id);
        if (!items.length) return null;
        const done = items.filter((c) => ws.checklist[c.id]?.status === 'done').length;
        return (
          <details key={st.id} className="card p-4" open={done < items.length && done > 0}>
            <summary className="cursor-pointer text-sm font-semibold text-ink">
              {st.n}. {st.name}{' '}
              <span className="font-normal text-dim">
                {done}/{items.length} done
              </span>
            </summary>
            <ul className="mt-3 space-y-2">
              {items.map((c) => {
                const cur = ws.checklist[c.id]?.status ?? 'todo';
                return (
                  <li key={c.id} className="flex flex-wrap items-start gap-2 text-sm">
                    <select
                      aria-label={`Status of ${c.id}`}
                      className={select}
                      value={cur}
                      onChange={(e) =>
                        act({ type: 'checklist', id: c.id, status: e.target.value as ItemStatus })
                      }
                    >
                      {(Object.keys(STATUS_LABEL) as ItemStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    <span className="font-mono text-xs text-dim">{c.id}</span>
                    <span className="chip">{c.owner}</span>
                    {c.approval && <span className="chip !border-warn/40 !text-warn">approval</span>}
                    <span
                      className={`min-w-0 flex-1 ${cur === 'done' ? 'text-dim line-through' : 'text-ink/90'}`}
                    >
                      {c.item}
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

const HOP_STATES: HopState[] = ['not-started', 'in-progress', 'blocked', 'passing', 'accepted'];
export function IntegrationsPanel({ ws, pb, act }: PanelProps) {
  const latest = (id: string) => [...ws.tests].reverse().find((t) => t.testId === id);
  return (
    <div className="space-y-3">
      {pb.integrations.map((h) => (
        <details key={h.id} className="card p-4">
          <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-semibold text-ink">
            <span className="font-mono text-xs text-signal">{h.id}</span>
            {h.name}
            <span className="chip">{h.necessity}</span>
            <span className="chip">{ws.hops[h.id]?.status ?? 'not-started'}</span>
          </summary>
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label={`Status of ${h.id}`}
                className={select}
                value={ws.hops[h.id]?.status ?? 'not-started'}
                onChange={(e) => act({ type: 'hop', id: h.id, status: e.target.value as HopState })}
              >
                {HOP_STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <input
                aria-label={`Note for ${h.id}`}
                className={`${select} min-w-0 flex-1`}
                placeholder="Note (version, endpoint, caveat)…"
                defaultValue={ws.hops[h.id]?.note ?? ''}
                onBlur={(e) => {
                  if (e.target.value !== (ws.hops[h.id]?.note ?? ''))
                    act({
                      type: 'hop',
                      id: h.id,
                      status: ws.hops[h.id]?.status ?? 'not-started',
                      note: e.target.value,
                    });
                }}
              />
            </div>
            <Table
              head={['Test', 'Case', 'Latest', 'Record a result']}
              rows={h.tests.map((t) => {
                const r = latest(t.id);
                return [
                  t.id,
                  t.title,
                  r ? `${r.result} · ${r.at.slice(0, 10)}` : 'not run',
                  <span key="b" className="space-x-1">
                    {(['pass', 'fail', 'skipped'] as const).map((res) => (
                      <Btn
                        key={res}
                        onClick={() =>
                          act({ type: 'test', testId: t.id, hopId: h.id, result: res, note: '' })
                        }
                      >
                        {res}
                      </Btn>
                    ))}
                  </span>,
                ];
              })}
            />
          </div>
        </details>
      ))}
    </div>
  );
}

export function ConfigDecisionsPanel({ ws, pb, act }: PanelProps) {
  const [d, setD] = useState({ title: '', context: '', decision: '', alternatives: '', consequences: '' });
  const adr = () =>
    ws.decisions
      .map(
        (x) =>
          `# ${x.id}: ${x.title}\n\nStatus: ${x.status} · ${x.at.slice(0, 10)} · ${x.decidedBy}\n\n## Context\n\n${x.context}\n\n## Decision\n\n${x.decision}\n\n## Alternatives considered\n\n${x.alternatives}\n\n## Consequences\n\n${x.consequences}\n`,
      )
      .join('\n---\n\n');
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="font-semibold text-ink">Customer configuration values</h3>
        <p className="text-sm text-mute">
          Names and non-secret values only. Secrets live in the customer&apos;s secret store and are
          referenced, never pasted here.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {pb.configuration.keys.map((k) => (
            <Field key={k.key} label={`${k.key}${k.required ? ' (required)' : ''}: ${k.description}`}>
              <input
                className={inputCls}
                placeholder={k.example}
                defaultValue={ws.config[k.key] ?? ''}
                onBlur={(e) => {
                  if (e.target.value !== (ws.config[k.key] ?? ''))
                    act({ type: 'config', key: k.key, value: e.target.value });
                }}
              />
            </Field>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="font-semibold text-ink">Decisions (architecture decision records)</h3>
        <form
          className="card grid gap-3 p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            act({ type: 'decision', ...d, status: 'accepted' });
            setD({ title: '', context: '', decision: '', alternatives: '', consequences: '' });
          }}
        >
          <Field label="Title" className="sm:col-span-2">
            <input
              required
              className={inputCls}
              value={d.title}
              onChange={(e) => setD({ ...d, title: e.target.value })}
            />
          </Field>
          {(['context', 'decision', 'alternatives', 'consequences'] as const).map((k) => (
            <Field key={k} label={k[0]!.toUpperCase() + k.slice(1)}>
              <textarea
                required
                rows={3}
                className={inputCls}
                value={d[k]}
                onChange={(e) => setD({ ...d, [k]: e.target.value })}
              />
            </Field>
          ))}
          <div className="sm:col-span-2">
            <Btn submit tone="signal" onClick={() => undefined}>
              Record decision
            </Btn>
          </div>
        </form>
        {ws.decisions.length > 0 && (
          <div className="flex gap-2">
            <Btn onClick={() => download(`${ws.id}-decisions.md`, adr())}>Export decisions (.md)</Btn>
          </div>
        )}
        <Table
          head={['Id', 'Decision', 'Status', 'By', 'Date']}
          rows={ws.decisions.map((x) => [
            x.id,
            `${x.title}: ${x.decision}`,
            x.status,
            x.decidedBy,
            x.at.slice(0, 10),
          ])}
        />
      </div>
    </div>
  );
}

export function DeploymentsPanel({ ws, act }: PanelProps) {
  const [f, setF] = useState({
    environment: 'staging',
    version: '',
    status: 'deployed' as 'planned' | 'deployed' | 'rolled-back' | 'failed',
    note: '',
  });
  return (
    <div className="space-y-6">
      <Field label="Deployment mode" className="max-w-sm">
        <select
          className={inputCls}
          value={ws.mode}
          onChange={(e) => act({ type: 'meta', mode: e.target.value as DeployModeId })}
        >
          {DEPLOY_MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>
      <form
        className="card grid gap-3 p-4 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          act({
            type: 'deploy',
            environment: f.environment,
            mode: ws.mode,
            version: f.version,
            status: f.status,
            note: f.note,
          });
          setF({ ...f, version: '', note: '' });
        }}
      >
        <Field label="Environment">
          <input
            required
            className={inputCls}
            value={f.environment}
            onChange={(e) => setF({ ...f, environment: e.target.value })}
          />
        </Field>
        <Field label="Version (commit, image digest, config and model versions)" className="sm:col-span-2">
          <input
            required
            className={inputCls}
            value={f.version}
            onChange={(e) => setF({ ...f, version: e.target.value })}
            placeholder="abc1234 / sha256:… / cfg-7 / model-2026-03"
          />
        </Field>
        <Field label="Status">
          <select
            className={inputCls}
            value={f.status}
            onChange={(e) => setF({ ...f, status: e.target.value as typeof f.status })}
          >
            {['planned', 'deployed', 'rolled-back', 'failed'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Note" className="sm:col-span-4">
          <input className={inputCls} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Field>
        <div className="sm:col-span-4">
          <Btn submit tone="signal" onClick={() => undefined}>
            Record deployment
          </Btn>
        </div>
      </form>
      <Table
        head={['Id', 'Environment', 'Version', 'Status', 'Mode', 'Note', 'When']}
        rows={ws.deployments.map((d) => [
          d.id,
          d.environment,
          d.version,
          d.status,
          d.mode,
          d.note,
          d.at.slice(0, 16).replace('T', ' '),
        ])}
      />
    </div>
  );
}

export function BlockersIssuesPanel({ ws, act }: PanelProps) {
  const [b, setB] = useState({
    title: '',
    owner: 'customer' as 'fde' | 'customer' | 'shared',
    stage: 'environment-discovery' as FdeStageId,
    needsFrom: '',
  });
  const [i, setI] = useState({
    title: '',
    body: '',
    stage: 'integration-testing' as FdeStageId,
    severity: 'medium' as 'low' | 'medium' | 'high',
  });
  const stages = (
    <>
      {FDE_STAGES.map((s) => (
        <option key={s.id} value={s.id}>
          {s.n}. {s.name}
        </option>
      ))}
    </>
  );
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-3">
        <h3 className="font-semibold text-ink">Blockers</h3>
        <form
          className="card grid gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            act({ type: 'blocker-add', ...b });
            setB({ ...b, title: '', needsFrom: '' });
          }}
        >
          <Field label="What is blocked">
            <input
              required
              className={inputCls}
              value={b.title}
              onChange={(e) => setB({ ...b, title: e.target.value })}
            />
          </Field>
          <Field label="Waiting on (person or team)">
            <input
              required
              className={inputCls}
              value={b.needsFrom}
              onChange={(e) => setB({ ...b, needsFrom: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner">
              <select
                className={inputCls}
                value={b.owner}
                onChange={(e) => setB({ ...b, owner: e.target.value as typeof b.owner })}
              >
                <option>customer</option>
                <option>fde</option>
                <option>shared</option>
              </select>
            </Field>
            <Field label="Stage">
              <select
                className={inputCls}
                value={b.stage}
                onChange={(e) => setB({ ...b, stage: e.target.value as FdeStageId })}
              >
                {stages}
              </select>
            </Field>
          </div>
          <div>
            <Btn submit tone="signal" onClick={() => undefined}>
              Open blocker
            </Btn>
          </div>
        </form>
        <ul className="space-y-2 text-sm">
          {ws.blockers.map((x) => (
            <li key={x.id} className="card flex flex-wrap items-center gap-2 p-3">
              <span className="font-mono text-xs text-dim">{x.id}</span>
              <span className={`min-w-0 flex-1 ${x.resolvedAt ? 'text-dim line-through' : 'text-ink'}`}>
                {x.title}{' '}
                <span className="text-mute">
                  (waiting on {x.needsFrom}; {STAGE_BY_ID[x.stage].short}; since {x.since.slice(0, 10)})
                </span>
              </span>
              {!x.resolvedAt && (
                <Btn
                  onClick={() => {
                    const r = window.prompt('How was it resolved?');
                    if (r) act({ type: 'blocker-resolve', id: x.id, resolution: r });
                  }}
                >
                  Resolve
                </Btn>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-3">
        <h3 className="font-semibold text-ink">Issues</h3>
        <form
          className="card grid gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            act({ type: 'issue-add', ...i, labels: [] });
            setI({ ...i, title: '', body: '' });
          }}
        >
          <Field label="Title">
            <input
              required
              className={inputCls}
              value={i.title}
              onChange={(e) => setI({ ...i, title: e.target.value })}
            />
          </Field>
          <Field label="Details and how to reproduce">
            <textarea
              required
              rows={3}
              className={inputCls}
              value={i.body}
              onChange={(e) => setI({ ...i, body: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Severity">
              <select
                className={inputCls}
                value={i.severity}
                onChange={(e) => setI({ ...i, severity: e.target.value as typeof i.severity })}
              >
                <option>low</option>
                <option>medium</option>
                <option>high</option>
              </select>
            </Field>
            <Field label="Stage">
              <select
                className={inputCls}
                value={i.stage}
                onChange={(e) => setI({ ...i, stage: e.target.value as FdeStageId })}
              >
                {stages}
              </select>
            </Field>
          </div>
          <div>
            <Btn submit tone="signal" onClick={() => undefined}>
              Open issue
            </Btn>
          </div>
        </form>
        <ul className="space-y-2 text-sm">
          {ws.issues.map((x) => (
            <li key={x.id} className="card flex flex-wrap items-center gap-2 p-3">
              <span className="font-mono text-xs text-dim">{x.id}</span>
              <span className="chip">{x.severity}</span>
              <span
                className={`min-w-0 flex-1 ${x.status === 'closed' ? 'text-dim line-through' : 'text-ink'}`}
              >
                {x.title}
              </span>
              {x.status === 'open' && <Btn onClick={() => act({ type: 'issue-close', id: x.id })}>Close</Btn>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const KINDS: Evidence['kind'][] = [
  'test-result',
  'report',
  'approval',
  'screenshot',
  'log',
  'config',
  'link',
  'other',
];
export function EvidencePanel({ ws, pb, act }: PanelProps) {
  const cats = ['general', ...new Set(pb.acceptance.criteria.map((c) => c.category))];
  const [f, setF] = useState({
    category: cats[1] ?? 'general',
    title: '',
    kind: 'report' as Evidence['kind'],
    url: '',
    note: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState('');
  const add = async () => {
    setErr('');
    try {
      const base = {
        category: f.category,
        title: f.title,
        kind: f.kind,
        ...(f.note ? { note: f.note } : {}),
      };
      if (file) {
        const digest = await sha256File(file);
        const nextId = `EV-${ws.counter + 1}`;
        await putEvidenceFile(ws.id, nextId, file, file.name);
        act({ type: 'evidence', evidence: { ...base, sha256: digest, name: file.name, size: file.size } });
      } else if (f.url)
        act({
          type: 'evidence',
          evidence: { ...base, kind: 'link', sha256: '', name: '', size: 0, url: f.url },
        });
      else return setErr('Attach a file or give a link.');
      setF({ ...f, title: '', url: '', note: '' });
      setFile(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not store the file in this browser.');
    }
  };
  const open = async (e: Evidence) => {
    const rec = await getEvidenceFile(ws.id, e.id).catch(() => undefined);
    if (rec) download(rec.name, rec.blob, rec.blob.type || 'application/octet-stream');
    else
      setErr(
        'The file is not in this browser (it may have been exported from another one). The checksum is still recorded.',
      );
  };
  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-mute">
        Attach what proves each acceptance category: test output, approvals, screenshots, logs. The file stays
        in this browser; the workspace records its name, size and SHA-256, so the acceptance report can show
        what was relied on.
      </p>
      <form
        className="card grid gap-3 p-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <Field label="Category">
          <select
            className={inputCls}
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
          >
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Title" className="sm:col-span-2">
          <input
            required
            className={inputCls}
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
          />
        </Field>
        <Field label="Kind">
          <select
            className={inputCls}
            value={f.kind}
            onChange={(e) => setF({ ...f, kind: e.target.value as Evidence['kind'] })}
          >
            {KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label="File">
          <input type="file" className={inputCls} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <Field label="…or a link">
          <input
            className={inputCls}
            value={f.url}
            onChange={(e) => setF({ ...f, url: e.target.value })}
            placeholder="https://…"
          />
        </Field>
        <div className="sm:col-span-3">
          <Btn submit tone="signal" onClick={() => undefined}>
            Attach evidence
          </Btn>
        </div>
        {err && (
          <p role="alert" className="text-xs text-warn sm:col-span-3">
            {err}
          </p>
        )}
      </form>
      <Table
        head={['Id', 'Category', 'Title', 'Kind', 'SHA-256', 'Added', '']}
        rows={ws.evidence.map((e) => [
          e.id,
          e.category,
          e.title,
          e.kind,
          e.sha256 ? e.sha256.slice(0, 12) + '…' : 'link',
          `${e.addedBy} · ${e.at.slice(0, 10)}`,
          e.sha256 ? (
            <Btn key="o" onClick={() => void open(e)}>
              Download
            </Btn>
          ) : (
            <a key="l" href={e.url} rel="noreferrer noopener" target="_blank">
              open
            </a>
          ),
        ])}
      />
    </div>
  );
}

const CRIT: CriterionState['status'][] = [
  'not-started',
  'in-progress',
  'met',
  'accepted-exception',
  'failed',
];
export function AcceptancePanel({
  ws,
  pb,
  act,
  report,
}: PanelProps & { report: { markdown: string; json: string; verdict: string } }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`chip ${report.verdict === 'ACCEPTED' ? '!border-signal/50 !text-signal' : '!border-warn/40 !text-warn'}`}
          data-testid="verdict"
        >
          Verdict: {report.verdict.replaceAll('_', ' ')}
        </span>
        <Btn onClick={() => download(`${ws.id}-acceptance-report.md`, report.markdown)}>
          Download report (.md)
        </Btn>
        <Btn onClick={() => download(`${ws.id}-acceptance-report.json`, report.json, 'application/json')}>
          Download report (.json)
        </Btn>
      </div>
      <p className="max-w-3xl text-sm text-mute">
        The report is generated from what is recorded here: a category is met only when every criterion is met
        or has an accepted exception, each is signed by a named person, and evidence is attached. Nothing is
        marked met without evidence.
      </p>
      <div className="space-y-3">
        {pb.acceptance.criteria.map((c) => {
          const st = ws.criteria[c.id];
          const set = (
            status: CriterionState['status'],
            extra: {
              measured?: string;
              signedBy?: string;
              exception?: { reason: string; approvedBy: string };
            } = {},
          ) =>
            act({
              type: 'criterion',
              id: c.id,
              category: c.category,
              status,
              measured: extra.measured ?? st?.measured,
              signedBy: extra.signedBy ?? st?.signedBy,
              ...(extra.exception
                ? { exception: extra.exception }
                : st?.exception
                  ? { exception: st.exception }
                  : {}),
            });
          return (
            <div key={c.id} className="card space-y-2 p-3 text-sm">
              <p>
                <span className="font-mono text-xs text-dim">{c.id}</span>{' '}
                <span className="chip">{c.category}</span> <span className="text-ink">{c.criterion}</span>
              </p>
              <p className="text-xs text-mute">
                Threshold: {c.threshold}. Evidence: {c.evidence}. Signer: {c.owner}.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label={`Status of ${c.id}`}
                  className={select}
                  value={st?.status ?? 'not-started'}
                  onChange={(e) => {
                    const s = e.target.value as CriterionState['status'];
                    if (s === 'accepted-exception') {
                      const reason = window.prompt('Reason for the exception');
                      const by = reason ? window.prompt('Who approved it (name and role)?') : null;
                      if (reason && by) set(s, { exception: { reason, approvedBy: by } });
                    } else set(s);
                  }}
                >
                  {CRIT.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <input
                  aria-label={`Measured value for ${c.id}`}
                  className={`${select} min-w-0 flex-1`}
                  placeholder="Measured value"
                  defaultValue={st?.measured ?? ''}
                  onBlur={(e) => {
                    if (e.target.value !== (st?.measured ?? ''))
                      set(st?.status ?? 'in-progress', { measured: e.target.value });
                  }}
                />
                <input
                  aria-label={`Signed by for ${c.id}`}
                  className={select}
                  placeholder="Signed by"
                  defaultValue={st?.signedBy ?? ''}
                  onBlur={(e) => {
                    if (e.target.value && e.target.value !== (st?.signedBy ?? ''))
                      set(st?.status ?? 'in-progress', { signedBy: e.target.value });
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
