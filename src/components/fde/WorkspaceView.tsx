'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ImplementationPlaybook } from '../../schemas/implementation.schema';
import { acceptanceMarkdown } from '../../content/fde/dod';
import {
  azBoardsScript,
  azureDevOpsCsv,
  githubIssuesScript,
  jiraBulkJson,
  jiraCsv,
  workItems,
} from '../../lib/fde/exports';
import { download, fetchPlaybook } from '../../lib/fde/storage';
import {
  acceptanceFor,
  apply,
  buildPlan,
  planMarkdown,
  progress,
  verifyHistory,
  type Workspace,
  type WsAction,
} from '../../lib/fde/workspace';
import {
  AcceptancePanel,
  BlockersIssuesPanel,
  ChecklistPanel,
  ConfigDecisionsPanel,
  DeploymentsPanel,
  EvidencePanel,
  IntegrationsPanel,
} from './WorkspacePanels';
import { Bar, Stat, Table } from './ui';

const SUBTABS = [
  ['dashboard', 'Dashboard'],
  ['checklist', 'Checklist'],
  ['integrations', 'Integrations'],
  ['config', 'Config and decisions'],
  ['deployments', 'Deployments'],
  ['issues', 'Blockers and issues'],
  ['evidence', 'Evidence'],
  ['acceptance', 'Acceptance'],
  ['exports', 'Export'],
  ['history', 'History'],
] as const;
type Sub = (typeof SUBTABS)[number][0];

export function WorkspaceView({
  ws,
  onChange,
  actor,
}: {
  ws: Workspace;
  onChange: (w: Workspace) => void;
  actor: string;
}) {
  const [pb, setPb] = useState<ImplementationPlaybook | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [sub, setSub] = useState<Sub>('dashboard');
  const [err, setErr] = useState('');
  useEffect(() => {
    let live = true;
    setPb(null);
    setLoadErr('');
    fetchPlaybook(ws.slug)
      .then((p) => live && setPb(p))
      .catch(
        (e: unknown) => live && setLoadErr(e instanceof Error ? e.message : 'Could not load the playbook.'),
      );
    return () => {
      live = false;
    };
  }, [ws.slug]);

  const act = (a: WsAction) => {
    try {
      onChange(apply(ws, a, actor || 'me', new Date().toISOString()));
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'That change was refused.');
    }
  };
  const prog = useMemo(() => (pb ? progress(ws, pb) : null), [ws, pb]);
  const report = useMemo(() => {
    if (!pb) return null;
    const r = acceptanceFor(ws, pb, new Date().toISOString());
    return { markdown: acceptanceMarkdown(r), json: JSON.stringify(r, null, 2), verdict: r.verdict };
  }, [ws, pb]);

  if (loadErr)
    return (
      <p role="alert" className="text-sm text-warn">
        {loadErr} The workspace is intact; reload when the site is reachable.
      </p>
    );
  if (!pb || !prog || !report)
    return (
      <p className="text-sm text-mute" aria-live="polite">
        Loading the implementation playbook…
      </p>
    );

  const items = workItems(ws, pb);
  const plan = buildPlan(pb, { customer: ws.customer, mode: ws.mode, startDate: ws.startDate });
  const hist = verifyHistory(ws);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-ink">{ws.customer}</h3>
          <p className="text-xs text-mute">
            {pb.title} · {ws.mode} · started {ws.startDate}
          </p>
        </div>
        <span className={`chip ${hist.ok ? '' : '!border-warn/40 !text-warn'}`} data-testid="history-status">
          {hist.ok
            ? `history verified (${ws.history.length} entries)`
            : `history altered at ${hist.brokenAt}`}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Workspace sections">
        {SUBTABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={sub === id}
            onClick={() => setSub(id)}
            className={`btn !px-2.5 !py-1 text-xs ${sub === id ? '!border-signal/50 !bg-signal-soft !text-signal' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>
      {err && (
        <p role="alert" className="rounded-md border border-warn/40 p-2 text-xs text-warn">
          {err}
        </p>
      )}

      {sub === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat
              label="Checklist"
              value={`${prog.overall}%`}
              sub={`${plan.stages.reduce((n, s) => n + s.tasks.length, 0)} items`}
            />
            <Stat
              label="Integrations"
              value={`${prog.hops.passing + prog.hops.accepted}/${prog.hopsTotal}`}
              sub={`${prog.hops.blocked} blocked`}
            />
            <Stat
              label="Tests"
              value={`${prog.tests.pass} pass`}
              sub={`${prog.tests.fail} failing · ${prog.tests.skipped} skipped`}
            />
            <Stat
              label="Acceptance"
              value={`${prog.criteria.met}/${prog.criteria.total}`}
              sub={report.verdict.replaceAll('_', ' ').toLowerCase()}
            />
            <Stat
              label="Open blockers"
              value={prog.openBlockers.length}
              sub={`${prog.openIssues} open issues · ${prog.evidence} evidence`}
            />
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-ink">Progress by stage</h4>
            {prog.stages.map((s, i) => (
              <div key={s.id} className="grid grid-cols-[12rem_1fr_9rem] items-center gap-3 text-xs">
                <span className="text-mute">
                  {i + 1}. {s.name}
                </span>
                <Bar pct={s.pct} tone={s.blocked ? 'warn' : 'signal'} />
                <span className="text-dim">
                  {s.done}/{s.total}
                  {s.blocked ? ` · ${s.blocked} blocked` : ''} · {plan.stages[i]!.end}
                </span>
              </div>
            ))}
          </div>
          {prog.openBlockers.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-ink">Blockers</h4>
              <Table
                head={['Id', 'Blocked', 'Waiting on', 'Owner', 'Since']}
                rows={prog.openBlockers.map((b) => [
                  b.id,
                  b.title,
                  b.needsFrom,
                  b.owner,
                  b.since.slice(0, 10),
                ])}
              />
            </div>
          )}
          <div className="space-y-2">
            <h4 className="font-semibold text-ink">Next up</h4>
            <Table head={['Id', 'Owner', 'Item']} rows={prog.nextUp.map((n) => [n.id, n.owner, n.item])} />
          </div>
        </div>
      )}
      {sub === 'checklist' && <ChecklistPanel ws={ws} pb={pb} act={act} />}
      {sub === 'integrations' && <IntegrationsPanel ws={ws} pb={pb} act={act} />}
      {sub === 'config' && <ConfigDecisionsPanel ws={ws} pb={pb} act={act} />}
      {sub === 'deployments' && <DeploymentsPanel ws={ws} pb={pb} act={act} />}
      {sub === 'issues' && <BlockersIssuesPanel ws={ws} pb={pb} act={act} />}
      {sub === 'evidence' && <EvidencePanel ws={ws} pb={pb} act={act} />}
      {sub === 'acceptance' && <AcceptancePanel ws={ws} pb={pb} act={act} report={report} />}
      {sub === 'exports' && (
        <div className="space-y-4">
          <p className="max-w-3xl text-sm text-mute">
            {items.length} open work items (undone checklist items, maturity-gap tasks, open blockers and
            issues). Nothing is sent anywhere: each export is a file or a script you run with your own
            credentials.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ['GitHub Issues', 'issues.sh', () => githubIssuesScript(items), 'bash script using gh'],
                ['Jira CSV', 'jira-import.csv', () => jiraCsv(items), 'external-system import'],
                [
                  'Jira bulk JSON',
                  'jira-bulk.json',
                  () => jiraBulkJson(items),
                  'POST /rest/api/3/issue/bulk',
                ],
                ['Azure DevOps CSV', 'azure-devops.csv', () => azureDevOpsCsv(items), 'work-item import'],
                [
                  'Azure DevOps script',
                  'az-boards.sh',
                  () => azBoardsScript(items),
                  'az boards work-item create',
                ],
                ['Implementation plan', 'plan.md', () => planMarkdown(plan), 'dated, stage by stage'],
                [
                  'Workspace (full)',
                  `${ws.id}.workspace.json`,
                  () => JSON.stringify(ws, null, 2),
                  'import it on another machine',
                ],
              ] as [string, string, () => string, string][]
            ).map(([t, f, make, hint]) => (
              <button
                key={t}
                type="button"
                className="card p-4 text-left hover:border-signal"
                onClick={() =>
                  download(
                    `${ws.customer.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${f}`,
                    make(),
                    f.endsWith('.json') ? 'application/json' : 'text/plain',
                  )
                }
              >
                <span className="block text-sm font-semibold text-ink">{t}</span>
                <span className="text-xs text-mute">
                  {f} · {hint}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {sub === 'history' && (
        <div className="space-y-3">
          <p className="max-w-3xl text-sm text-mute">
            Every change is recorded with who made it and chained to the previous entry by a SHA-256 hash, so
            an edited or removed entry is detected when the workspace is opened or imported.
          </p>
          <Table
            head={['#', 'When', 'Who', 'What', 'Detail', 'Hash']}
            rows={[...ws.history].reverse().map((h) => [
              h.seq,
              h.at.slice(0, 19).replace('T', ' '),
              h.by,
              h.action,
              h.detail,
              <code key="h" className="text-[11px]">
                {h.hash.slice(0, 10)}
              </code>,
            ])}
          />
        </div>
      )}
    </div>
  );
}
