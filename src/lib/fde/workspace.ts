/**
 * An FDE project workspace: one per customer engagement. It stores the blueprint it started from, the configuration, decisions,
 * integration and deployment status, test results, issues, blockers and evidence, and a hash-chained change history so the record
 * of who changed what cannot be edited quietly. Everything here is pure: the browser storage lives in `storage.ts`.
 */
import type { FdeStageId, ImplementationPlaybook } from '../../schemas/implementation.schema';
import { FDE_STAGES, STAGE_BY_ID, STAGE_OVERLAP } from '../../content/fde/workflow';
import {
  buildAcceptanceReport,
  type AcceptanceReport,
  type CriterionState,
  type Evidence,
} from '../../content/fde/dod';
import type { DeployModeId } from '../../content/fde/deploy-modes';
import { sha256Hex } from './sha256';

export const WORKSPACE_VERSION = 1;

export type ItemStatus = 'todo' | 'doing' | 'blocked' | 'done';
export type HopState = 'not-started' | 'in-progress' | 'blocked' | 'passing' | 'accepted';
export type Owner = 'fde' | 'customer' | 'shared';

export interface Blocker {
  id: string;
  title: string;
  owner: Owner;
  stage: FdeStageId;
  needsFrom: string;
  since: string;
  resolvedAt?: string;
  resolution?: string;
}
export interface Decision {
  id: string;
  title: string;
  context: string;
  decision: string;
  alternatives: string;
  consequences: string;
  status: 'proposed' | 'accepted' | 'superseded';
  decidedBy: string;
  at: string;
}
export interface Issue {
  id: string;
  title: string;
  body: string;
  stage: FdeStageId;
  severity: 'low' | 'medium' | 'high';
  labels: string[];
  status: 'open' | 'closed';
  createdAt: string;
  closedAt?: string;
}
export interface TestRun {
  id: string;
  testId: string;
  hopId?: string;
  result: 'pass' | 'fail' | 'skipped';
  evidenceId?: string;
  note: string;
  by: string;
  at: string;
}
export interface DeployRecord {
  id: string;
  environment: string;
  mode: DeployModeId;
  version: string;
  status: 'planned' | 'deployed' | 'rolled-back' | 'failed';
  note: string;
  by: string;
  at: string;
}
export interface HistoryEntry {
  seq: number;
  at: string;
  by: string;
  action: string;
  detail: string;
  prev: string;
  hash: string;
}

export interface Workspace {
  version: typeof WORKSPACE_VERSION;
  id: string;
  customer: string;
  slug: string;
  title: string;
  mode: DeployModeId;
  startDate: string;
  createdAt: string;
  updatedAt: string;
  counter: number;
  config: Record<string, string>;
  checklist: Record<string, { status: ItemStatus; note: string; by: string; at: string }>;
  hops: Record<string, { status: HopState; note: string; at: string }>;
  criteria: Record<string, CriterionState>;
  decisions: Decision[];
  blockers: Blocker[];
  issues: Issue[];
  tests: TestRun[];
  deployments: DeployRecord[];
  evidence: Evidence[];
  history: HistoryEntry[];
}

export type WsAction =
  | { type: 'checklist'; id: string; status: ItemStatus; note?: string }
  | { type: 'hop'; id: string; status: HopState; note?: string }
  | {
      type: 'criterion';
      id: string;
      category: string;
      status: CriterionState['status'];
      measured?: string;
      signedBy?: string;
      exception?: { reason: string; approvedBy: string };
    }
  | { type: 'blocker-add'; title: string; owner: Owner; stage: FdeStageId; needsFrom: string }
  | { type: 'blocker-resolve'; id: string; resolution: string }
  | {
      type: 'decision';
      title: string;
      context: string;
      decision: string;
      alternatives: string;
      consequences: string;
      status: Decision['status'];
    }
  | {
      type: 'issue-add';
      title: string;
      body: string;
      stage: FdeStageId;
      severity: Issue['severity'];
      labels: string[];
    }
  | { type: 'issue-close'; id: string }
  | {
      type: 'test';
      testId: string;
      hopId?: string;
      result: TestRun['result'];
      evidenceId?: string;
      note: string;
    }
  | {
      type: 'deploy';
      environment: string;
      mode: DeployModeId;
      version: string;
      status: DeployRecord['status'];
      note: string;
    }
  | { type: 'evidence'; evidence: Omit<Evidence, 'id' | 'addedBy' | 'at'> }
  | { type: 'config'; key: string; value: string }
  | { type: 'meta'; customer?: string; mode?: DeployModeId; startDate?: string };

const GENESIS = '0'.repeat(64);
const link = (prev: string, e: Omit<HistoryEntry, 'hash' | 'prev'>) =>
  sha256Hex(`${prev}|${e.seq}|${e.at}|${e.by}|${e.action}|${e.detail}`);

export function newWorkspace(input: {
  id: string;
  customer: string;
  playbook: ImplementationPlaybook;
  mode: DeployModeId;
  startDate: string;
  now: string;
  by: string;
}): Workspace {
  const { playbook: pb } = input;
  const ws: Workspace = {
    version: WORKSPACE_VERSION,
    id: input.id,
    customer: input.customer,
    slug: pb.slug,
    title: pb.title,
    mode: input.mode,
    startDate: input.startDate,
    createdAt: input.now,
    updatedAt: input.now,
    counter: 0,
    config: {},
    checklist: Object.fromEntries(
      pb.checklist.map((c) => [c.id, { status: 'todo' as ItemStatus, note: '', by: '', at: '' }]),
    ),
    hops: Object.fromEntries(
      pb.integrations.map((h) => [h.id, { status: 'not-started' as HopState, note: '', at: '' }]),
    ),
    criteria: {},
    decisions: [],
    blockers: [],
    issues: [],
    tests: [],
    deployments: [],
    evidence: [],
    history: [],
  };
  return appendHistory(
    ws,
    input.by,
    input.now,
    'created',
    `Workspace for ${input.customer} from ${pb.slug} (${input.mode})`,
  );
}

function appendHistory(ws: Workspace, by: string, at: string, action: string, detail: string): Workspace {
  const prev = ws.history.at(-1)?.hash ?? GENESIS;
  const base = { seq: ws.history.length + 1, at, by, action, detail };
  return { ...ws, updatedAt: at, history: [...ws.history, { ...base, prev, hash: link(prev, base) }] };
}

/** Recompute the chain: ok is false, with the first broken sequence number, if any entry was changed, removed or reordered. */
export function verifyHistory(ws: Pick<Workspace, 'history'>): { ok: boolean; brokenAt?: number } {
  let prev = GENESIS;
  for (const e of ws.history) {
    if (e.prev !== prev || e.hash !== link(prev, e)) return { ok: false, brokenAt: e.seq };
    prev = e.hash;
  }
  return { ok: true };
}

const nextId = (ws: Workspace, prefix: string): [Workspace, string] => [
  { ...ws, counter: ws.counter + 1 },
  `${prefix}-${ws.counter + 1}`,
];

export function apply(ws0: Workspace, a: WsAction, by: string, at: string): Workspace {
  let ws = ws0;
  switch (a.type) {
    case 'checklist': {
      if (!ws.checklist[a.id]) throw new Error(`Unknown checklist item ${a.id}`);
      ws = {
        ...ws,
        checklist: {
          ...ws.checklist,
          [a.id]: { status: a.status, note: a.note ?? ws.checklist[a.id]!.note, by, at },
        },
      };
      return appendHistory(ws, by, at, 'checklist', `${a.id} -> ${a.status}`);
    }
    case 'hop': {
      if (!ws.hops[a.id]) throw new Error(`Unknown integration ${a.id}`);
      ws = {
        ...ws,
        hops: { ...ws.hops, [a.id]: { status: a.status, note: a.note ?? ws.hops[a.id]!.note, at } },
      };
      return appendHistory(ws, by, at, 'integration', `${a.id} -> ${a.status}`);
    }
    case 'criterion': {
      if (a.status === 'accepted-exception' && !a.exception?.approvedBy)
        throw new Error('An accepted exception needs a named approver');
      const st: CriterionState = {
        id: a.id,
        category: a.category,
        status: a.status,
        ...(a.measured ? { measured: a.measured } : {}),
        ...(a.exception ? { exception: a.exception } : {}),
        ...(a.signedBy ? { signedBy: a.signedBy, signedAt: at } : {}),
      };
      ws = { ...ws, criteria: { ...ws.criteria, [a.id]: st } };
      return appendHistory(
        ws,
        by,
        at,
        'acceptance',
        `${a.id} -> ${a.status}${a.signedBy ? ` signed by ${a.signedBy}` : ''}`,
      );
    }
    case 'blocker-add': {
      let id: string;
      [ws, id] = nextId(ws, 'BLK');
      ws = {
        ...ws,
        blockers: [
          ...ws.blockers,
          { id, title: a.title, owner: a.owner, stage: a.stage, needsFrom: a.needsFrom, since: at },
        ],
      };
      return appendHistory(ws, by, at, 'blocker', `${id} opened: ${a.title}`);
    }
    case 'blocker-resolve': {
      if (!ws.blockers.some((b) => b.id === a.id && !b.resolvedAt))
        throw new Error(`No open blocker ${a.id}`);
      ws = {
        ...ws,
        blockers: ws.blockers.map((b) =>
          b.id === a.id ? { ...b, resolvedAt: at, resolution: a.resolution } : b,
        ),
      };
      return appendHistory(ws, by, at, 'blocker', `${a.id} resolved: ${a.resolution}`);
    }
    case 'decision': {
      let id: string;
      [ws, id] = nextId(ws, 'ADR');
      ws = {
        ...ws,
        decisions: [
          ...ws.decisions,
          {
            id,
            title: a.title,
            context: a.context,
            decision: a.decision,
            alternatives: a.alternatives,
            consequences: a.consequences,
            status: a.status,
            decidedBy: by,
            at,
          },
        ],
      };
      return appendHistory(ws, by, at, 'decision', `${id}: ${a.title} (${a.status})`);
    }
    case 'issue-add': {
      let id: string;
      [ws, id] = nextId(ws, 'ISS');
      ws = {
        ...ws,
        issues: [
          ...ws.issues,
          {
            id,
            title: a.title,
            body: a.body,
            stage: a.stage,
            severity: a.severity,
            labels: a.labels,
            status: 'open',
            createdAt: at,
          },
        ],
      };
      return appendHistory(ws, by, at, 'issue', `${id} opened: ${a.title}`);
    }
    case 'issue-close': {
      if (!ws.issues.some((i) => i.id === a.id && i.status === 'open'))
        throw new Error(`No open issue ${a.id}`);
      ws = {
        ...ws,
        issues: ws.issues.map((i) => (i.id === a.id ? { ...i, status: 'closed', closedAt: at } : i)),
      };
      return appendHistory(ws, by, at, 'issue', `${a.id} closed`);
    }
    case 'test': {
      let id: string;
      [ws, id] = nextId(ws, 'RUN');
      ws = {
        ...ws,
        tests: [
          ...ws.tests,
          {
            id,
            testId: a.testId,
            ...(a.hopId ? { hopId: a.hopId } : {}),
            result: a.result,
            ...(a.evidenceId ? { evidenceId: a.evidenceId } : {}),
            note: a.note,
            by,
            at,
          },
        ],
      };
      return appendHistory(ws, by, at, 'test', `${a.testId} ${a.result}`);
    }
    case 'deploy': {
      let id: string;
      [ws, id] = nextId(ws, 'DEP');
      ws = {
        ...ws,
        deployments: [
          ...ws.deployments,
          {
            id,
            environment: a.environment,
            mode: a.mode,
            version: a.version,
            status: a.status,
            note: a.note,
            by,
            at,
          },
        ],
      };
      return appendHistory(ws, by, at, 'deployment', `${id} ${a.environment} ${a.version} ${a.status}`);
    }
    case 'evidence': {
      let id: string;
      [ws, id] = nextId(ws, 'EV');
      ws = { ...ws, evidence: [...ws.evidence, { ...a.evidence, id, addedBy: by, at }] };
      return appendHistory(
        ws,
        by,
        at,
        'evidence',
        `${id} ${a.evidence.title} (${a.evidence.category}${a.evidence.sha256 ? `, sha256 ${a.evidence.sha256.slice(0, 12)}` : ''})`,
      );
    }
    case 'config': {
      ws = { ...ws, config: { ...ws.config, [a.key]: a.value } };
      return appendHistory(ws, by, at, 'config', `${a.key} set`);
    }
    case 'meta': {
      ws = {
        ...ws,
        ...(a.customer ? { customer: a.customer } : {}),
        ...(a.mode ? { mode: a.mode } : {}),
        ...(a.startDate ? { startDate: a.startDate } : {}),
      };
      return appendHistory(
        ws,
        by,
        at,
        'meta',
        Object.keys(a)
          .filter((k) => k !== 'type')
          .join(', '),
      );
    }
  }
}

/* ---------------------------------------------------------------- the dated plan */

const addWorkingDays = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  let left = Math.max(0, Math.round(days));
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) left--;
  }
  return d.toISOString().slice(0, 10);
};
const skipWeekend = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export interface PlanStage {
  id: FdeStageId;
  n: number;
  name: string;
  start: string;
  end: string;
  days: number;
  prerequisites: string[];
  activities: string[];
  commands: string[];
  deliverables: string[];
  customerDependencies: string[];
  exitCriteria: string[];
  tasks: ImplementationPlaybook['checklist'];
  maturityTasks: ImplementationPlaybook['maturity']['tasks'];
  customerNeeds: ImplementationPlaybook['deliverables']['customer'];
}
export interface Plan {
  slug: string;
  title: string;
  customer: string;
  mode: DeployModeId;
  startDate: string;
  endDate: string;
  stages: PlanStage[];
}

/** A customer-specific, dated plan from the blueprint's playbook. Stages overlap where the workflow says they can. */
export function buildPlan(
  pb: ImplementationPlaybook,
  input: { customer: string; mode: DeployModeId; startDate: string; scale?: number },
): Plan {
  const scale = input.scale ?? 1;
  let cursor = skipWeekend(input.startDate);
  let prevDays = 0;
  const stages: PlanStage[] = FDE_STAGES.map((st) => {
    const days = Math.max(1, Math.round(st.defaultDays * scale));
    const overlap = Math.round(prevDays * (STAGE_OVERLAP[st.id] ?? 0));
    const start = overlap ? backWorkingDays(cursor, overlap) : cursor;
    const end = addWorkingDays(start, days);
    cursor = end;
    prevDays = days;
    return {
      id: st.id,
      n: st.n,
      name: st.name,
      start,
      end,
      days,
      prerequisites: st.prerequisites,
      activities: st.activities,
      commands: st.commands,
      deliverables: st.deliverables,
      customerDependencies: st.customerDependencies,
      exitCriteria: st.exitCriteria,
      tasks: pb.checklist.filter((c) => c.stage === st.id),
      maturityTasks: pb.maturity.tasks.filter((t) => t.stage === st.id),
      customerNeeds: pb.deliverables.customer.filter((c) => c.neededBy === st.id),
    };
  });
  return {
    slug: pb.slug,
    title: pb.title,
    customer: input.customer,
    mode: input.mode,
    startDate: input.startDate,
    endDate: stages.at(-1)!.end,
    stages,
  };
}
function backWorkingDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() - 1);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) left--;
  }
  return d.toISOString().slice(0, 10);
}

export function planMarkdown(p: Plan): string {
  const L = [
    `# Implementation plan: ${p.customer}`,
    '',
    `Blueprint: ${p.title} (${p.slug}) · deployment mode: ${p.mode} · ${p.startDate} to ${p.endDate} (working days, weekends skipped; dates are estimates for a small first release)`,
    '',
  ];
  for (const s of p.stages) {
    L.push(
      `## ${s.n}. ${s.name} (${s.start} to ${s.end}, ${s.days} days)`,
      '',
      '**Before it starts**',
      '',
      ...s.prerequisites.map((x) => `- ${x}`),
      '',
      '**Activities**',
      '',
      ...s.activities.map((x) => `- ${x}`),
      '',
    );
    if (s.commands.length) L.push('**Commands**', '', '```bash', ...s.commands, '```', '');
    L.push(
      '**Deliverables**',
      '',
      ...s.deliverables.map((x) => `- ${x}`),
      '',
      '**Needed from the customer**',
      '',
      ...[
        ...s.customerDependencies,
        ...s.customerNeeds.map((c) => `${c.title} (${c.owner}; ${c.blocks})`),
      ].map((x) => `- ${x}`),
      '',
      '**Exit criteria**',
      '',
      ...s.exitCriteria.map((x) => `- ${x}`),
      '',
    );
    if (s.tasks.length)
      L.push(
        '**Use-case tasks**',
        '',
        ...s.tasks.map((t) => `- [ ] ${t.id} (${t.owner}${t.approval ? ', needs approval' : ''}) ${t.item}`),
        '',
      );
    if (s.maturityTasks.length)
      L.push(
        '**Closing the maturity gap**',
        '',
        ...s.maturityTasks.map((t) => `- [ ] ${t.id} ${t.title}: ${t.detail}`),
        '',
      );
  }
  return `${L.join('\n')}\n`;
}

/* ---------------------------------------------------------------- progress */

export interface StageProgress {
  id: FdeStageId;
  name: string;
  total: number;
  done: number;
  blocked: number;
  pct: number;
}
export interface Progress {
  overall: number;
  stages: StageProgress[];
  hops: Record<HopState, number>;
  hopsTotal: number;
  tests: { pass: number; fail: number; skipped: number };
  criteria: { total: number; met: number; failed: number };
  openBlockers: Blocker[];
  openIssues: number;
  evidence: number;
  nextUp: { id: string; stage: FdeStageId; item: string; owner: Owner }[];
  historyOk: boolean;
}

export function progress(ws: Workspace, pb: ImplementationPlaybook): Progress {
  const stages: StageProgress[] = FDE_STAGES.map((st) => {
    const items = pb.checklist.filter((c) => c.stage === st.id);
    const done = items.filter((c) => ws.checklist[c.id]?.status === 'done').length;
    const blocked =
      items.filter((c) => ws.checklist[c.id]?.status === 'blocked').length +
      ws.blockers.filter((b) => !b.resolvedAt && b.stage === st.id).length;
    return {
      id: st.id,
      name: st.name,
      total: items.length,
      done,
      blocked,
      pct: items.length ? Math.round((100 * done) / items.length) : 0,
    };
  });
  const total = stages.reduce((s, x) => s + x.total, 0);
  const done = stages.reduce((s, x) => s + x.done, 0);
  const hops: Record<HopState, number> = {
    'not-started': 0,
    'in-progress': 0,
    blocked: 0,
    passing: 0,
    accepted: 0,
  };
  for (const h of pb.integrations) hops[ws.hops[h.id]?.status ?? 'not-started']++;
  const latest = new Map<string, TestRun['result']>();
  for (const t of ws.tests) latest.set(t.testId, t.result);
  const results = [...latest.values()];
  const states = pb.acceptance.criteria.map((c) => ws.criteria[c.id]?.status);
  const nextUp = pb.checklist
    .filter((c) => (ws.checklist[c.id]?.status ?? 'todo') === 'todo')
    .slice(0, 5)
    .map((c) => ({ id: c.id, stage: c.stage, item: c.item, owner: c.owner }));
  return {
    overall: total ? Math.round((100 * done) / total) : 0,
    stages,
    hops,
    hopsTotal: pb.integrations.length,
    tests: {
      pass: results.filter((r) => r === 'pass').length,
      fail: results.filter((r) => r === 'fail').length,
      skipped: results.filter((r) => r === 'skipped').length,
    },
    criteria: {
      total: states.length,
      met: states.filter((s) => s === 'met' || s === 'accepted-exception').length,
      failed: states.filter((s) => s === 'failed').length,
    },
    openBlockers: ws.blockers.filter((b) => !b.resolvedAt),
    openIssues: ws.issues.filter((i) => i.status === 'open').length,
    evidence: ws.evidence.length,
    nextUp,
    historyOk: verifyHistory(ws).ok,
  };
}

/** The acceptance report, generated only from what the workspace holds: criteria states, evidence and open customer blockers. */
export function acceptanceFor(ws: Workspace, pb: ImplementationPlaybook, now: string): AcceptanceReport {
  return buildAcceptanceReport({
    customer: ws.customer,
    blueprint: pb.slug,
    now,
    criteria: pb.acceptance.criteria.map((c) => ({
      id: c.id,
      category: c.category,
      criterion: c.criterion,
      threshold: c.threshold,
      signer: c.owner,
    })),
    states: ws.criteria,
    evidence: ws.evidence,
    openBlockers: ws.blockers
      .filter((b) => !b.resolvedAt && b.owner !== 'fde')
      .map((b) => `${b.id} ${b.title} (waiting on ${b.needsFrom})`),
  });
}

export { STAGE_BY_ID };
