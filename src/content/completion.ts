/**
 * The completion ladder and per-milestone delivery for a playbook: how far the executable artifacts get an engineer, and for each
 * milestone whether it runs in the starter, needs the starter adapted, is guidance only, or is your platform's work.
 */
import { COMPLETION_META, type CompletionState, type MilestoneDelivery, type ReachedState } from '../lib/artifacts';
import type { Completion, Compatibility } from '../schemas/usecase.schema';

const STATE_OF_MILESTONE: Record<string, CompletionState> = { M0: 'prototype-ready', M1: 'prototype-ready', M2: 'prototype-ready', M3: 'evaluation-ready', M4: 'evaluation-ready', M5: 'shadow-ready', M6: 'production-ready' };
export const milestoneState = (id: string): CompletionState => STATE_OF_MILESTONE[id] ?? 'production-ready';

export function milestoneDelivery(compat: Pick<Compatibility, 'verdict'>, id: string): MilestoneDelivery {
  if (id === 'M5' || id === 'M6') return 'your-platform';
  if (id === 'M0') return 'guidance';
  if (compat.verdict === 'none') return 'guidance';
  return compat.verdict === 'exact' ? 'executable-reference' : 'adapt-reference';
}

export function buildCompletion(compat: Compatibility, milestones: { id: string; title: string }[]): Completion {
  const m = (id: string) => milestones.find((x) => x.id === id);
  const platformNeeds = (id: string, extra: string[]) => [m(id) ? `${id}: ${m(id)!.title}` : id, ...extra];
  const verdict = compat.verdict;
  const authored = compat.source === 'authored-starter';
  const kit = compat.kitLabel ?? 'the starter';
  const nMods = compat.modifications.length;

  type S = Completion['states'][number];
  const mk = (state: CompletionState, status: S['status'], evidence: string, stillNeeded: string[]): S => ({ state, meaning: COMPLETION_META[state].meaning, status, evidence, stillNeeded });

  let proto: S, evalr: S;
  if (verdict === 'none') {
    proto = mk('prototype-ready', 'not-reached', 'No executable artifact is supplied: there is no starter kit, no generator and no sample code for this use case.', ['Build a small dataset with the label and structure described in M1', 'Write the first end-to-end run yourself, following M0 to M2']);
    evalr = mk('evaluation-ready', 'not-reached', 'No runnable baseline, split or test is supplied. The milestone gates describe what to build.', ['Implement the split, the leakage test and the metric from M1 to M3', 'Compare the baseline and the production design as in M3 and M4']);
  } else if (verdict === 'adaptable') {
    proto = mk('prototype-ready', 'conditional', `${kit} runs on synthetic data, but it implements a neighbouring problem. It becomes a prototype for this use case only after the ${nMods} listed modification${nMods === 1 ? '' : 's'}.`, compat.modifications.slice(0, 4));
    evalr = mk('evaluation-ready', 'not-reached', 'The kit tests prove its own method, not this one. Baselines, metrics and tests for this use case must be written or adapted.', ['Re-run the gates of M1 to M4 with this use case\'s label, split and metrics']);
  } else if (authored) {
    proto = mk('prototype-ready', 'reached', 'The hand-written starter generates synthetic data and trains the first model end to end (milestones M1 and M2).', []);
    evalr = mk('evaluation-ready', 'reached', 'The starter runs a baseline against the stronger design on a leak-proof split, reports the blueprint\'s metrics and fails its tests when the method is wrong (milestones M3 and M4, pytest). The numbers are for synthetic data.', ['Repeat M1 to M4 on your own data: its numbers will be lower']);
  } else {
    proto = mk('prototype-ready', 'reached', `${kit} implements the same problem and runs end to end on synthetic data.`, ['Replace the synthetic data with a sample of yours and rename the columns']);
    evalr = mk('evaluation-ready', 'conditional', 'The kit\'s tests prove the method on its own synthetic data. They become evidence for this use case only when re-run on your data with your label and metrics.', ['Re-run the gates of M1 to M4 on your data']);
  }
  const integ = mk(
    'integration-ready',
    'not-reached',
    'Application APIs, database migrations, event publishers and external integration contracts require implementation.',
    platformNeeds('M5', [
      'Executable REST (OpenAPI 3.1) and event (AsyncAPI) contracts',
      'Database schema models and migrations (e.g. Alembic / Prisma)',
      'Feature store online/offline serving boundary',
    ]),
  );
  const shadow = mk(
    'shadow-ready',
    'not-reached',
    'Nothing here connects to production inputs. There is no scoring service, feature store integration, identity, deadline handling or live traffic.',
    platformNeeds('M5', ['Live data and identity integration', 'Security and privacy review']),
  );
  const prod = mk(
    'production-ready',
    'not-reached',
    'No artifact is production code, and no rollout, monitoring, rollback or support ownership is supplied.',
    platformNeeds('M6', ['Approval from risk and operations', 'A named on-call owner and a rehearsed rollback']),
  );
  const states = [proto, evalr, integ, shadow, prod];

  const fullyReached = [...states].reverse().find((s) => s.status === 'reached');
  const conditional = [...states].reverse().find((s) => s.status === 'conditional');
  const reached: ReachedState = fullyReached ? fullyReached.state : conditional ? conditional.state : 'guidance-only';
  const isConditional = !fullyReached && Boolean(conditional);

  const runs = milestones.filter((x) => milestoneDelivery(compat, x.id) === 'executable-reference').map((x) => x.id);
  const adapt = milestones.filter((x) => milestoneDelivery(compat, x.id) === 'adapt-reference').map((x) => x.id);
  const range = (ids: string[]) => (ids.length ? (ids.length === 1 ? ids[0]! : `${ids[0]}–${ids[ids.length - 1]}`) : '');
  const boundary =
    verdict === 'none'
      ? 'No executable starter. Every milestone is guidance, and serving and rollout (M5 and M6) need your platform.'
      : verdict === 'adaptable'
        ? `The starter has related code for ${range(adapt)}, usable only after the listed modifications. M0 is guidance; M5 and M6 need your platform.`
        : `The starter runs ${range(runs)} as code on synthetic data. M0 is guidance; serving and rollout (M5 and M6) need your platform.`;
  const summary =
    reached === 'guidance-only'
      ? `Executable artifacts reach: none. ${boundary}`
      : `Executable artifacts reach: ${COMPLETION_META[reached].label}${isConditional ? ' (only after the listed modifications)' : ''}. ${boundary} Nothing on this page is production-ready or shadow-ready: that is your platform's work.`;

  return { reached, conditional: isConditional, summary, boundary, states };
}
