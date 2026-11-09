/**
 * The starter-kit compatibility gate: run at build time (validate:content) and in the unit tests. A generated playbook must not
 * ship a starter kit its use case is not compatible with, silently substitute one task's kit for another's, or carry the
 * vocabulary of a different problem. Everything here re-derives the rule from the stored record, so a hand edit of the generator
 * or of the data cannot weaken it unnoticed.
 */
import { PROBLEM_LABEL, PROBLEM_TYPES } from '../lib/problem-types';
import type { UseCase } from '../schemas/usecase.schema';
import { loadCompatFiles } from './kit-compat';
import { foreignTerms, KIT_IDS } from './playbook-gen';

/** Cases the feedback called out, kept as regressions: the classifier must keep deciding these the same way. */
export const KNOWN_CASES: Record<string, { verdict: 'exact' | 'adaptable' | 'none'; problemType?: string; kitId?: string; source?: string }> = {
  'fintech/credit-default-survival-modeling': { verdict: 'none', problemType: 'survival-time-to-event' },
  'retail/personalized-search-ranking': { verdict: 'adaptable', problemType: 'search-ranking', kitId: 'recommender' },
  'saas/in-app-ai-copilot': { verdict: 'adaptable', problemType: 'agentic-write-actions', kitId: 'llm-agent' },
  'fintech/real-time-card-upi-fraud-detection': { verdict: 'exact', problemType: 'binary-event-classification', source: 'authored-starter' },
  'retail/session-based-next-item-recommendation': { verdict: 'exact', problemType: 'next-item-recommendation', source: 'authored-starter' },
  'fintech/atm-cash-demand-forecasting': { verdict: 'exact', problemType: 'forecasting', kitId: 'forecast' },
  'retail/demand-forecasting-sku-store': { verdict: 'adaptable', problemType: 'forecasting', kitId: 'forecast' },
  'adtech/uplift-modeling-campaign': { verdict: 'adaptable', problemType: 'uplift-causal-effect', kitId: 'bandit' },
  'adtech/marketing-mix-modeling-bayesian': { verdict: 'none', problemType: 'causal-measurement' },
  'retail/customer-segmentation-embeddings': { verdict: 'none', problemType: 'clustering-segmentation' },
  'supply-chain/vehicle-routing-with-time-windows': { verdict: 'adaptable', problemType: 'optimisation-allocation', kitId: 'optimize' },
};

const RANK = { exact: 0, adaptable: 1, none: 2 } as const;

const specText = (u: UseCase) =>
  JSON.stringify([u.title, u.summary, u.problemFormulation, u.dataAndFeatures, u.signalVsNoiseMatrix, u.productionEdgeCases, u.architectureBlueprint, u.evaluationAndMetrics]);

export function checkKitCompatibility(all: UseCase[], root = process.cwd()): string[] {
  const errors: string[] = [];
  const files = loadCompatFiles(root);
  const slugs = new Set(all.map((u) => u.slug));

  for (const [slug, o] of Object.entries(files.overrides)) {
    if (!slugs.has(slug)) errors.push(`content/kit-compatibility.json: override "${slug}" names no use case`);
    if (!(PROBLEM_TYPES as readonly string[]).includes(o.problemType)) errors.push(`content/kit-compatibility.json: "${slug}" has unknown problem type "${o.problemType}"`);
    if (!o.reason || o.reason.trim().split(/\s+/).length < 4) errors.push(`content/kit-compatibility.json: "${slug}" needs a reason of at least four words`);
  }

  for (const u of all) {
    const pb = u.playbook;
    if (!pb) {
      errors.push(`${u.slug}: has no playbook, so no compatibility verdict`);
      continue;
    }
    const c = pb.compatibility;
    const where = `${u.slug}:`;

    if (!PROBLEM_LABEL[c.problemType]) errors.push(`${where} unknown problem type ${c.problemType}`);

    if (pb.provenance === 'generated') {
      // every kit was compared, and the verdict is the best of them: nothing is chosen by default
      const ids = c.evaluated.map((e) => e.kitId).sort().join(',');
      if (ids !== [...KIT_IDS].sort().join(',')) errors.push(`${where} the compatibility record does not show all ${KIT_IDS.length} reference kits as compared`);
      const best = Math.min(...c.evaluated.map((e) => RANK[e.verdict]));
      if (RANK[c.verdict] !== best) errors.push(`${where} verdict "${c.verdict}" is not the best of the kits compared`);

      if (c.verdict === 'none') {
        if (c.evaluated.some((e) => e.verdict !== 'none')) errors.push(`${where} verdict none, yet a compared kit was ${c.evaluated.find((e) => e.verdict !== 'none')!.verdict}`);
        if (pb.starter || pb.data.synthetic || pb.data.sample) errors.push(`${where} ships a starter, synthetic data or a sample without a compatible kit`);
        if (!JSON.stringify(c).includes('No compatible executable starter kit exists. This playbook provides architecture and implementation guidance only.')) errors.push(`${where} the standard no-compatible-kit statement is missing`);
        if (!pb.milestones.every((m) => m.delivery === 'guidance' || m.delivery === 'your-platform')) errors.push(`${where} a milestone claims code that does not exist`);
      } else {
        const kit = c.kitId as (typeof KIT_IDS)[number] | undefined;
        const contract = kit ? files.contracts[kit] : undefined;
        if (!kit || !contract) errors.push(`${where} names an unknown starter kit "${c.kitId}"`);
        else {
          const handles = contract.problemTypes.includes(c.problemType) ? 'exact' : contract.adaptable[c.problemType] ? 'adaptable' : null;
          if (!handles) errors.push(`${where} the "${kit}" kit does not claim problem type "${c.problemType}": silent kit substitution`);
          if (handles === 'adaptable' && c.verdict === 'exact') errors.push(`${where} an adjacent problem was called an exact match`);
          if (pb.starter?.kitId !== kit) errors.push(`${where} ships the "${pb.starter?.kitId}" starter but the check chose "${kit}"`);
          const mismatch = c.dimensions.filter((d) => d.status === 'mismatch');
          if (mismatch.length) errors.push(`${where} a kit with a mismatched dimension (${mismatch.map((d) => d.dimension).join(', ')}) was accepted`);
        }
      }
    }

    // nothing claims to be production code
    const kinds = [...Object.values(u.systemDesign.lld.artifacts), ...(pb.starter?.files.map((f) => f.kind) ?? [])];
    if (kinds.includes('production-code')) errors.push(`${where} an artifact is labelled production code; nothing on this site is`);
    if (pb.starter?.files.some((f) => f.kind !== 'executable-reference')) errors.push(`${where} a starter file is not labelled executable reference code`);
    if (u.systemDesign.lld.artifacts.algorithm !== 'pseudocode') errors.push(`${where} the generated hot-path code must be labelled pseudocode`);

    // vocabulary of another problem must not leak in. With no kit, the whole plan must be free of it; with a kit, its teaching sections must be.
    const own = specText(u);
    // the closest kit's own description (provides) is reference material; everything else is the plan for this use case
    const plan = { ...pb, compatibility: { ...c, evaluated: [], dimensions: c.dimensions.map((d) => ({ ...d, provides: '' })) } };
    const scan = c.verdict === 'none' ? JSON.stringify(plan) : JSON.stringify({ d: pb.domainKnowledge, ds: pb.data.datasets });
    if (pb.provenance === 'generated') {
      const leaked = foreignTerms(scan, own, c.problemType);
      if (leaked.length) {
        const at = scan.toLowerCase().indexOf(leaked[0]!.toLowerCase());
        errors.push(`${where} the playbook uses the vocabulary of another problem ("${leaked[0]}") that this use case never mentions: …${scan.slice(Math.max(0, at - 70), at + 50)}…`);
      }
    }
  }

  for (const [slug, want] of Object.entries(KNOWN_CASES)) {
    const u = all.find((x) => x.slug === slug);
    if (!u) {
      errors.push(`known case ${slug} is missing`);
      continue;
    }
    const c = u.playbook!.compatibility;
    if (c.verdict !== want.verdict) errors.push(`${slug}: expected verdict ${want.verdict}, got ${c.verdict}`);
    if (want.problemType && c.problemType !== want.problemType) errors.push(`${slug}: expected problem type ${want.problemType}, got ${c.problemType}`);
    if (want.kitId && c.kitId !== want.kitId) errors.push(`${slug}: expected kit ${want.kitId}, got ${c.kitId ?? 'none'}`);
    if (want.source && c.source !== want.source) errors.push(`${slug}: expected source ${want.source}, got ${c.source}`);
  }
  return errors;
}

export function compatibilitySummary(all: UseCase[]) {
  const count = { exact: 0, adaptable: 0, none: 0, authored: 0 };
  const reached: Record<string, number> = {};
  for (const u of all) {
    const pb = u.playbook;
    if (!pb) continue;
    if (pb.compatibility.source === 'authored-starter') count.authored++;
    else count[pb.compatibility.verdict]++;
    const key = `${pb.completion.reached}${pb.completion.conditional ? ' (after modifications)' : ''}`;
    reached[key] = (reached[key] ?? 0) + 1;
  }
  return { ...count, reached };
}
