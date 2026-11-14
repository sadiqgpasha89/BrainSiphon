import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { buildImplementationPlaybook } from '../content/fde/generate';
import { sha256Hex } from '../lib/fde/sha256';
import {
  acceptanceFor,
  apply,
  buildPlan,
  newWorkspace,
  planMarkdown,
  progress,
  verifyHistory,
  type Workspace,
} from '../lib/fde/workspace';
import {
  azBoardsScript,
  azureDevOpsCsv,
  githubIssuesScript,
  jiraBulkJson,
  jiraCsv,
  workItems,
} from '../lib/fde/exports';
import { parseWorkspaceFile } from '../lib/fde/storage';
import { acceptanceMarkdown } from '../content/fde/dod';

const pb = buildImplementationPlaybook(
  loadAllUseCases(process.cwd()).find((u) => u.slug === 'fintech/real-time-card-upi-fraud-detection')!,
);
const T0 = '2026-03-02T09:00:00.000Z';
const fresh = (): Workspace =>
  newWorkspace({
    id: 'ws-1',
    customer: "Acme Bank's Cards",
    playbook: pb,
    mode: 'customer-kubernetes',
    startDate: '2026-03-02',
    now: T0,
    by: 'fde.one',
  });

describe('sha256', () => {
  it('matches node crypto at every padding boundary', () => {
    for (const n of [0, 1, 3, 55, 56, 57, 63, 64, 65, 119, 120, 1000]) {
      const s = 'é'.repeat(n);
      expect(sha256Hex(s), `len ${n}`).toBe(createHash('sha256').update(s).digest('hex'));
    }
  });
});

describe('workspace history', () => {
  it('chains every change and detects an edited, removed or reordered entry', () => {
    let ws = fresh();
    ws = apply(
      ws,
      { type: 'config', key: 'issuer', value: 'https://idp.example' },
      'fde.one',
      '2026-03-02T10:00:00.000Z',
    );
    ws = apply(
      ws,
      {
        type: 'blocker-add',
        title: 'Firewall change',
        owner: 'customer',
        stage: 'environment-discovery',
        needsFrom: 'Network team',
      },
      'fde.one',
      '2026-03-02T11:00:00.000Z',
    );
    expect(ws.history.map((h) => h.seq)).toEqual([1, 2, 3]);
    expect(verifyHistory(ws)).toEqual({ ok: true });
    const edited = {
      ...ws,
      history: ws.history.map((h, i) => (i === 1 ? { ...h, detail: 'issuer set to something else' } : h)),
    };
    expect(verifyHistory(edited)).toEqual({ ok: false, brokenAt: 2 });
    expect(verifyHistory({ history: ws.history.filter((_, i) => i !== 1) }).ok).toBe(false);
    expect(verifyHistory({ history: [ws.history[0]!, ws.history[2]!, ws.history[1]!] }).ok).toBe(false);
  });

  it('refuses to import a workspace file whose history was altered', () => {
    const ws = apply(fresh(), { type: 'config', key: 'a', value: 'b' }, 'x', '2026-03-02T10:00:00.000Z');
    expect(parseWorkspaceFile(JSON.stringify(ws)).ok).toBe(true);
    const bad = JSON.parse(JSON.stringify(ws)) as Workspace;
    bad.history[1]!.by = 'someone.else';
    const r = parseWorkspaceFile(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    expect(parseWorkspaceFile('not json').ok).toBe(false);
    expect(parseWorkspaceFile('{"version":2}').ok).toBe(false);
  });
});

describe('workspace actions', () => {
  it('rejects unknown items and exceptions without a named approver, and numbers records uniquely', () => {
    const ws = fresh();
    expect(() => apply(ws, { type: 'checklist', id: 'NOPE', status: 'done' }, 'x', T0)).toThrow(
      /Unknown checklist/,
    );
    expect(() => apply(ws, { type: 'hop', id: 'NOPE', status: 'passing' }, 'x', T0)).toThrow(
      /Unknown integration/,
    );
    expect(() =>
      apply(
        ws,
        { type: 'criterion', id: 'AC-1', category: 'security', status: 'accepted-exception' },
        'x',
        T0,
      ),
    ).toThrow(/approver/);
    let w = ws;
    w = apply(
      w,
      { type: 'issue-add', title: 'a', body: 'b', stage: 'uat', severity: 'high', labels: [] },
      'x',
      T0,
    );
    w = apply(
      w,
      { type: 'issue-add', title: 'c', body: 'd', stage: 'uat', severity: 'low', labels: [] },
      'x',
      T0,
    );
    w = apply(
      w,
      {
        type: 'decision',
        title: 'Use mTLS',
        context: 'c',
        decision: 'd',
        alternatives: 'a',
        consequences: 'q',
        status: 'accepted',
      },
      'x',
      T0,
    );
    expect(w.issues.map((i) => i.id)).toEqual(['ISS-1', 'ISS-2']);
    expect(w.decisions[0]!.id).toBe('ADR-3');
    expect(() => apply(w, { type: 'issue-close', id: 'ISS-9' }, 'x', T0)).toThrow();
    w = apply(w, { type: 'issue-close', id: 'ISS-1' }, 'x', T0);
    expect(w.issues[0]!.status).toBe('closed');
    expect(() => apply(w, { type: 'blocker-resolve', id: 'BLK-9', resolution: 'r' }, 'x', T0)).toThrow(
      /No open blocker/,
    );
  });

  it('does not mutate the previous workspace', () => {
    const a = fresh();
    const b = apply(a, { type: 'config', key: 'k', value: 'v' }, 'x', T0);
    expect(a.config).toEqual({});
    expect(a.history).toHaveLength(1);
    expect(b.history).toHaveLength(2);
  });
});

describe('progress, plan and acceptance', () => {
  it('counts checklist, integrations, tests, blockers and the latest result per test', () => {
    let ws = fresh();
    const first = pb.checklist[0]!;
    ws = apply(ws, { type: 'checklist', id: first.id, status: 'done' }, 'x', T0);
    ws = apply(ws, { type: 'hop', id: pb.integrations[0]!.id, status: 'passing' }, 'x', T0);
    ws = apply(ws, { type: 'test', testId: 'a', result: 'fail', note: '' }, 'x', T0);
    ws = apply(ws, { type: 'test', testId: 'a', result: 'pass', note: 'fixed' }, 'x', T0);
    ws = apply(
      ws,
      {
        type: 'blocker-add',
        title: 'No sandbox',
        owner: 'customer',
        stage: first.stage,
        needsFrom: 'Platform',
      },
      'x',
      T0,
    );
    const p = progress(ws, pb);
    expect(p.overall).toBeGreaterThan(0);
    expect(p.stages.find((s) => s.id === first.stage)!.done).toBe(1);
    expect(p.stages.find((s) => s.id === first.stage)!.blocked).toBe(1);
    expect(p.hops.passing).toBe(1);
    expect(p.hops['not-started']).toBe(pb.integrations.length - 1);
    expect(p.tests).toEqual({ pass: 1, fail: 0, skipped: 0 });
    expect(p.openBlockers).toHaveLength(1);
    expect(p.historyOk).toBe(true);
  });

  it('builds a dated plan across twelve stages that skips weekends and overlaps where allowed', () => {
    const plan = buildPlan(pb, { customer: 'Acme', mode: 'customer-aws', startDate: '2026-03-07' });
    expect(plan.stages).toHaveLength(12);
    expect(plan.stages[0]!.start).toBe('2026-03-09');
    for (const s of plan.stages) {
      expect([0, 6]).not.toContain(new Date(`${s.start}T00:00:00Z`).getUTCDay());
      expect([0, 6]).not.toContain(new Date(`${s.end}T00:00:00Z`).getUTCDay());
      expect(s.end >= s.start).toBe(true);
    }
    expect(plan.endDate > plan.startDate).toBe(true);
    expect(plan.stages.some((s, i) => i > 0 && s.start < plan.stages[i - 1]!.end)).toBe(true);
    expect(planMarkdown(plan)).toContain('## 12. Day-two support');
    const slow = buildPlan(pb, { customer: 'Acme', mode: 'customer-aws', startDate: '2026-03-07', scale: 2 });
    expect(slow.endDate > plan.endDate).toBe(true);
  });

  it('generates the acceptance report only from evidence: no evidence, no "met"', () => {
    let ws = fresh();
    const cats = [...new Set(pb.acceptance.criteria.map((c) => c.category))];
    expect(acceptanceFor(ws, pb, T0).verdict).toBe('NOT_ACCEPTED');
    for (const c of pb.acceptance.criteria)
      ws = apply(
        ws,
        {
          type: 'criterion',
          id: c.id,
          category: c.category,
          status: 'met',
          measured: 'ok',
          signedBy: c.owner,
        },
        'x',
        T0,
      );
    const noEvidence = acceptanceFor(ws, pb, T0);
    expect(noEvidence.verdict).toBe('NOT_ACCEPTED');
    expect(noEvidence.categories.every((c) => c.gaps.includes('no evidence attached'))).toBe(true);
    for (const cat of cats)
      ws = apply(
        ws,
        {
          type: 'evidence',
          evidence: {
            category: cat,
            title: `${cat} report`,
            kind: 'report',
            sha256: 'a'.repeat(64),
            name: 'r.pdf',
            size: 10,
          },
        },
        'x',
        T0,
      );
    const ok = acceptanceFor(ws, pb, T0);
    expect(ok.verdict).toBe('ACCEPTED');
    ws = apply(
      ws,
      {
        type: 'blocker-add',
        title: 'Customer sign-off',
        owner: 'customer',
        stage: 'customer-acceptance',
        needsFrom: 'Sponsor',
      },
      'x',
      T0,
    );
    expect(acceptanceFor(ws, pb, T0).verdict).toBe('NOT_ACCEPTED');
    expect(acceptanceMarkdown(ok)).toContain('ACCEPTED');
  });
});

describe('exports to GitHub, Jira and Azure DevOps', () => {
  it('lists open work only and escapes quotes in scripts', () => {
    let ws = fresh();
    const total = workItems(ws, pb).length;
    ws = apply(ws, { type: 'checklist', id: pb.checklist[0]!.id, status: 'done' }, 'x', T0);
    ws = apply(
      ws,
      {
        type: 'issue-add',
        title: "It's broken",
        body: 'it "fails"',
        stage: 'uat',
        severity: 'high',
        labels: ['bug'],
      },
      'x',
      T0,
    );
    const items = workItems(ws, pb);
    expect(items.length).toBe(total); // one done, one issue added
    expect(items.some((i) => i.key === pb.checklist[0]!.id)).toBe(false);
    const gh = githubIssuesScript(items);
    expect(gh).toContain('gh issue create');
    expect(gh).toContain(`'[ISS-1] It'\\''s broken'`);
    expect(gh).toContain('label create');
    expect(azBoardsScript(items)).toContain('az boards work-item create');
  });

  it('writes Jira and Azure DevOps files whose rows match the items', () => {
    const items = workItems(fresh(), pb);
    const csv = jiraCsv(items).trim().split('\n');
    expect(csv[0]).toBe(
      '"Summary","Description","Issue Type","Priority","Labels","Labels","Labels","Issue key (workspace)"',
    );
    expect(csv.length).toBeGreaterThan(items.length); // multi-line descriptions add lines
    const json = JSON.parse(jiraBulkJson(items, 'FDE')) as {
      issueUpdates: { fields: { project: { key: string }; summary: string } }[];
    };
    expect(json.issueUpdates).toHaveLength(items.length);
    expect(json.issueUpdates[0]!.fields.project.key).toBe('FDE');
    for (const u of json.issueUpdates) expect(u.fields.summary.length).toBeLessThanOrEqual(250);
    const ado = azureDevOpsCsv(items).split('\n')[0];
    expect(ado).toBe('"Work Item Type","Title","Description","Priority","Tags"');
  });
});
