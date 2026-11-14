/** Export a workspace's open work to GitHub Issues, Jira and Azure DevOps. Nothing is sent anywhere: each export is a file or a script the FDE runs with their own credentials. */
import type { ImplementationPlaybook } from '../../schemas/implementation.schema';
import { STAGE_BY_ID } from '../../content/fde/workflow';
import type { Workspace } from './workspace';

export interface WorkItem {
  key: string;
  title: string;
  body: string;
  kind: 'task' | 'bug' | 'blocker' | 'maturity';
  stage: string;
  owner: string;
  priority: 'High' | 'Medium' | 'Low';
  labels: string[];
}

/** Everything still open: undone checklist items, maturity tasks, open blockers and open issues. */
export function workItems(ws: Workspace, pb: ImplementationPlaybook): WorkItem[] {
  const base = [`customer:${slug(ws.customer)}`, `blueprint:${pb.slug.split('/')[1]}`];
  const items: WorkItem[] = [];
  for (const c of pb.checklist) {
    if (ws.checklist[c.id]?.status === 'done') continue;
    items.push({
      key: c.id,
      title: `[${c.id}] ${c.item}`.slice(0, 200),
      body: `${c.item}\n\nStage: ${STAGE_BY_ID[c.stage].name}\nOwner: ${c.owner}${c.approval ? '\nNeeds approval before it is done.' : ''}\nBlueprint: ${pb.slug}`,
      kind: 'task',
      stage: c.stage,
      owner: c.owner,
      priority: c.approval ? 'High' : 'Medium',
      labels: [...base, `stage:${c.stage}`, `owner:${c.owner}`],
    });
  }
  for (const t of pb.maturity.tasks) {
    items.push({
      key: t.id,
      title: `[${t.id}] ${t.title}`,
      body: `${t.detail}\n\nEvidence: ${t.evidence}${t.approval ? `\nApproval: ${t.approval}` : ''}\nStage: ${STAGE_BY_ID[t.stage].name}`,
      kind: 'maturity',
      stage: t.stage,
      owner: t.owner,
      priority: 'High',
      labels: [...base, 'maturity-gap', `stage:${t.stage}`, `owner:${t.owner}`],
    });
  }
  for (const b of ws.blockers.filter((x) => !x.resolvedAt))
    items.push({
      key: b.id,
      title: `[${b.id}] BLOCKED: ${b.title}`,
      body: `${b.title}\n\nWaiting on: ${b.needsFrom}\nOwner: ${b.owner}\nSince: ${b.since}`,
      kind: 'blocker',
      stage: b.stage,
      owner: b.owner,
      priority: 'High',
      labels: [...base, 'blocker', `stage:${b.stage}`],
    });
  for (const i of ws.issues.filter((x) => x.status === 'open'))
    items.push({
      key: i.id,
      title: `[${i.id}] ${i.title}`,
      body: i.body,
      kind: 'bug',
      stage: i.stage,
      owner: 'shared',
      priority: i.severity === 'high' ? 'High' : i.severity === 'medium' ? 'Medium' : 'Low',
      labels: [...base, ...i.labels, `stage:${i.stage}`],
    });
  return items;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'customer';
const sq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

/** A bash script of `gh issue create` calls. Labels are created first; it only needs an authenticated gh. */
export function githubIssuesScript(items: WorkItem[]): string {
  const labels = [...new Set(items.flatMap((i) => i.labels))].sort();
  const L = [
    '#!/usr/bin/env bash',
    '# Creates one GitHub issue per open work item. Review it, then run: bash issues.sh owner/repo',
    'set -euo pipefail',
    'REPO="${1:?usage: issues.sh owner/repo}"',
    '',
  ];
  for (const l of labels) L.push(`gh label create ${sq(l)} --repo "$REPO" --force >/dev/null`);
  L.push('');
  for (const i of items) {
    L.push(
      `gh issue create --repo "$REPO" --title ${sq(i.title)} ${i.labels.map((l) => `--label ${sq(l)}`).join(' ')} --body "$(cat <<'BS_EOF'`,
      i.body,
      'BS_EOF',
      ')"',
    );
  }
  return `${L.join('\n')}\n`;
}

/** A CSV for Jira's external-system import. Map columns on import: Summary, Description, Issue Type, Priority, Labels (up to three columns). */
export function jiraCsv(items: WorkItem[]): string {
  const head = [
    'Summary',
    'Description',
    'Issue Type',
    'Priority',
    'Labels',
    'Labels',
    'Labels',
    'Issue key (workspace)',
  ];
  const rows = items.map((i) => [
    i.title,
    i.body,
    i.kind === 'bug' ? 'Bug' : 'Task',
    i.priority,
    i.labels[0] ?? '',
    i.labels[1] ?? '',
    i.labels[2] ?? '',
    i.key,
  ]);
  return `${[head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')}\n`;
}

/** The body for POST /rest/api/3/issue/bulk (Jira Cloud). Set the project key before sending. */
export function jiraBulkJson(items: WorkItem[], projectKey = 'PROJ'): string {
  const adf = (text: string) => ({
    type: 'doc',
    version: 1,
    content: text.split('\n\n').map((p) => ({ type: 'paragraph', content: [{ type: 'text', text: p }] })),
  });
  return JSON.stringify(
    {
      issueUpdates: items.map((i) => ({
        fields: {
          project: { key: projectKey },
          summary: i.title.slice(0, 250),
          description: adf(i.body),
          issuetype: { name: i.kind === 'bug' ? 'Bug' : 'Task' },
          labels: i.labels.map((l) => l.replace(/[^A-Za-z0-9_:.-]/g, '-')),
          priority: { name: i.priority },
        },
      })),
    },
    null,
    2,
  );
}

/** A CSV in Azure DevOps's work-item import layout (Work Item Type, Title, Description, Priority, Tags). */
export function azureDevOpsCsv(items: WorkItem[]): string {
  const prio = { High: '1', Medium: '2', Low: '3' } as const;
  const head = ['Work Item Type', 'Title', 'Description', 'Priority', 'Tags'];
  const rows = items.map((i) => [
    i.kind === 'bug' ? 'Bug' : 'Task',
    i.title,
    i.body.replace(/\n/g, '<br>'),
    prio[i.priority],
    i.labels.join('; '),
  ]);
  return `${[head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')}\n`;
}

/** A script of `az boards work-item create` calls. Run `az devops configure -d organization=... project=...` first. */
export function azBoardsScript(items: WorkItem[]): string {
  const L = [
    '#!/usr/bin/env bash',
    '# Creates one Azure DevOps work item per open item. Needs: az extension add --name azure-devops; az login',
    'set -euo pipefail',
    '',
  ];
  for (const i of items)
    L.push(
      `az boards work-item create --type ${i.kind === 'bug' ? 'Bug' : 'Task'} --title ${sq(i.title)} --description ${sq(i.body.replace(/\n/g, '<br>'))} --fields ${sq(`System.Tags=${i.labels.join('; ')}`)} --output none`,
    );
  return `${L.join('\n')}\n`;
}
