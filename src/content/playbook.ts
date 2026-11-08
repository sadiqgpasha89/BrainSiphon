/**
 * Build Playbook loader.
 *
 * Authored per use case in `content/playbooks/<domain>/<key>/playbook.yaml`, next to a `starter/` directory
 * of real, tested code. Everything that is genuinely generic (effort sum, load/game-day tests, first-30-days
 * checklist) is derived here from the blueprint so authors only write what is specific to the use case.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { PlaybookSchema, type LatencySLA, type Paradigm, type Playbook } from '../schemas/usecase.schema';
import type { RawUseCase } from './parse';
import type { ScaleResult } from './scale';
import { TOTAL_BUDGET_MS } from './design';

const nonEmpty = z.string().trim().min(2);

/** What authors write: the shared schema minus derived fields, with starter files referenced by path. */
const AuthoredSchema = PlaybookSchema.omit({ prerequisites: true, starter: true, tests: true, first30Days: true })
  .extend({
    prerequisites: PlaybookSchema.shape.prerequisites.partial({ effort: true }),
    starter: z.object({
      runtime: nonEmpty,
      run: z.array(nonEmpty).min(2),
      expected: nonEmpty,
      files: z.array(z.object({ path: nonEmpty, purpose: nonEmpty })).min(3),
    }),
    tests: PlaybookSchema.shape.tests.element.array().min(4),
    first30Days: z.array(nonEmpty).min(4).optional(),
  })
  .strict();

const LANG: Record<string, 'python' | 'yaml' | 'text'> = { '.py': 'python', '.yaml': 'yaml', '.yml': 'yaml' };

const range = (days: string): [number, number] => {
  const m = /^(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?$/.exec(days.trim());
  if (!m) throw new Error(`milestone days "${days}" must look like "2" or "2-3"`);
  const lo = Number(m[1]);
  return [lo, m[2] ? Number(m[2]) : lo];
};

const fmtN = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toFixed(0));

const SKILLS: Record<Paradigm, string> = {
  tabular: 'Gradient boosting and calibration on imbalanced tabular data (scikit-learn, LightGBM or XGBoost)',
  'time-series': 'Time-based validation, windowed features and forecasting error metrics',
  nlp: 'Text preprocessing, embeddings and error analysis on labelled text',
  'llm-agents': 'Prompting, tool calling and building a golden evaluation set for an LLM system',
  recommender: 'Candidate retrieval plus ranking, and implicit-feedback evaluation (NDCG, recall@k)',
  graph: 'Graph construction and neighbourhood or embedding features (networkx or PyTorch Geometric)',
  'computer-vision': 'Fine-tuning a pretrained vision backbone and annotation quality control',
  'reinforcement-learning': 'Off-policy evaluation and safe exploration for bandit or RL policies',
};

function derivePrerequisites(raw: RawUseCase, authored: z.infer<typeof AuthoredSchema>) {
  const [lo, hi] = authored.milestones.reduce<[number, number]>(
    (a, m) => {
      const [l, h] = range(m.days);
      return [a[0] + l, a[1] + h];
    },
    [0, 0],
  );
  const p = authored.prerequisites;
  return {
    skills: p.skills.length >= 3 ? p.skills : [...p.skills, ...(raw.paradigms as Paradigm[]).map((x) => SKILLS[x])].slice(0, 5),
    tools: p.tools,
    effort: p.effort ?? `${lo}–${hi} engineer-days from empty repo to a shadow-ready system; platform, security review and approvals are extra lead time.`,
  };
}

function deriveTests(raw: RawUseCase, latency: LatencySLA, scale: ScaleResult) {
  const budget = TOTAL_BUDGET_MS[latency];
  return [
    {
      test: 'Load test at 1.5× provisioned peak',
      tool: latency === 'batch' ? 'Synthetic backfill at 1.5× daily volume' : 'k6 or Locust replaying production-shaped traffic',
      pass:
        latency === 'batch'
          ? `Run finishes inside the ${scale.batchWindowHours ?? 6} h window at 1.5× data volume with no failed partitions`
          : `${budget === null ? 'Run window met' : `p99 stays under ${budget} ms`} at ${fmtN(scale.provisionedQps)} req/s with zero errors outside the degradation ladder`,
    },
    {
      test: 'Dependency game-day',
      tool: 'Fault injection (kill, add 500 ms latency) per dependency',
      pass: 'Each failure moves the service one rung down the degradation ladder; callers never see an unhandled error and the decision log records the rung',
    },
  ];
}

function deriveFirst30Days(raw: RawUseCase) {
  const north = raw.on[0] ?? 'the north-star metric';
  const guard = raw.on[1] ?? 'the guardrail metric';
  const edge = raw.edge[0]?.[0] ?? 'the first documented edge case';
  const offline = raw.off[0] ?? 'the primary offline metric';
  return [
    `Week 1 — shadow only: score live traffic with the model, take no action, and compare against the baseline on ${offline}.`,
    `Week 2 — read the 50 largest disagreements between baseline and model by hand; write each as a test case, starting with "${edge}".`,
    `Week 3 — 1% canary with an automatic rollback on "${guard}"; read "${north}" against a held-out control group.`,
    'Week 4 — first label-delay-aware evaluation on matured outcomes; decide ramp, hold or roll back, and record the decision with its evidence.',
    'Set the retraining cadence, the owner of the on-call runbook, and the date of the first game-day before any ramp beyond 25%.',
  ];
}

/** Returns undefined when the use case has no playbook directory (pilot rollout). */
export function loadPlaybook(
  root: string,
  domain: string,
  raw: RawUseCase,
  latency: LatencySLA,
  scale: ScaleResult,
): Playbook | undefined {
  const dir = join(root, 'content', 'playbooks', domain, raw.key);
  const yamlPath = join(dir, 'playbook.yaml');
  if (!existsSync(yamlPath)) return undefined;
  const where = `content/playbooks/${domain}/${raw.key}/playbook.yaml`;

  const parsed = AuthoredSchema.safeParse(parseYaml(readFileSync(yamlPath, 'utf8')));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`${where}: playbook validation failed\n${issues}`);
  }
  const a = parsed.data;

  const files = a.starter.files.map((f) => {
    const p = join(dir, 'starter', f.path);
    if (!existsSync(p)) throw new Error(`${where}: starter file "${f.path}" does not exist under starter/`);
    const ext = f.path.slice(f.path.lastIndexOf('.'));
    return { path: f.path, purpose: f.purpose, language: LANG[ext] ?? 'text', code: readFileSync(p, 'utf8').trimEnd() };
  });
  if (!files.some((f) => f.path === a.data.synthetic.file))
    throw new Error(`${where}: data.synthetic.file "${a.data.synthetic.file}" is not listed in starter.files`);
  const ids = a.milestones.map((m) => m.id);
  if (ids.some((id, i) => id !== `M${i}`)) throw new Error(`${where}: milestone ids must run M0, M1, M2… in order (got ${ids.join(',')})`);
  for (const p of a.pitfalls) if (!ids.includes(p.at)) throw new Error(`${where}: pitfall refers to unknown milestone ${p.at}`);
  for (const row of a.data.sample.rows)
    if (row.length !== a.data.sample.columns.length) throw new Error(`${where}: every data.sample row needs ${a.data.sample.columns.length} cells`);

  const out = {
    summary: a.summary,
    prerequisites: derivePrerequisites(raw, a),
    domainKnowledge: a.domainKnowledge,
    data: a.data,
    milestones: a.milestones,
    starter: { runtime: a.starter.runtime, run: a.starter.run, expected: a.starter.expected, files },
    workedExample: a.workedExample,
    tests: [...a.tests, ...deriveTests(raw, latency, scale)],
    decisions: a.decisions,
    pitfalls: a.pitfalls,
    first30Days: a.first30Days ?? deriveFirst30Days(raw),
  };
  const checked = PlaybookSchema.safeParse(out);
  if (!checked.success) {
    const issues = checked.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`${where}: assembled playbook invalid\n${issues}`);
  }
  return checked.data;
}
