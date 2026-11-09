/**
 * Architecture Feasibility Validator.
 *
 * A blueprint must not pass validation merely because every section exists: its numbers have to agree with each other.
 * A review found a blueprint whose synchronous stage budgets summed to 8.6 ms against a stated 8 ms p99; this module is the
 * gate that catches that class of defect. It is pure (no Node imports), runs while a blueprint is generated (the result is
 * stored on the blueprint and shown on the page) and again in `npm run validate:content`, where any `fail` breaks the build.
 *
 * Checks: latency envelope, authored stage budgets vs the HLD, stated p99 constraints, throughput vs provisioned capacity,
 * availability vs redundancy, storage vs retention, cost sanity, RTO/RPO vs replication, and model memory vs serving hardware.
 */
import type { LatencySLA } from '../schemas/usecase.schema';
import type { ScaleResult } from './scale';

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'n/a';
export interface FeasibilityCheck {
  check: string;
  status: CheckStatus;
  detail: string;
}

export interface FeasibilityInput {
  latency: LatencySLA;
  /** total synchronous p99 envelope in ms (null for batch) */
  totalMs: number | null;
  components: { name: string; latencyBudgetMs: number | null }[];
  rationale: { stage: string; budget: string }[];
  constraints: string[];
  scale: ScaleResult;
  /** retention window the capacity table assumes */
  assumedRetentionDays: number;
  dr: { rpoSeconds: number; rtoSeconds: number; replication: 'sync' | 'async' | 'batch-rerun' };
  productionModel: string;
}

const r1 = (n: number) => Math.round(n * 1000) / 1000;
const GPU_MEM_GB: Partial<Record<ScaleResult['computeClass'], { name: string; gb: number }>> = {
  'gpu-ranker': { name: 'L4/L40S-class 24 GB', gb: 24 },
  'gpu-vision': { name: 'L4/L40S-class 24 GB', gb: 24 },
  'gpu-encoder': { name: 'L4/L40S-class 24 GB', gb: 24 },
  'gpu-batch': { name: 'L4/L40S-class 24 GB', gb: 24 },
  'gpu-llm': { name: 'H100-class 80 GB', gb: 80 },
};

export function checkFeasibility(i: FeasibilityInput): FeasibilityCheck[] {
  const out: FeasibilityCheck[] = [];
  const add = (check: string, status: CheckStatus, detail: string) => out.push({ check, status, detail });

  // 1. the synchronous envelope is a sum
  if (i.totalMs === null) {
    add('End-to-end latency budget', 'n/a', 'Batch workload: governed by the run window, not a request p99.');
  } else {
    const parts = i.components.filter((c) => c.latencyBudgetMs !== null);
    const sum = r1(parts.reduce((a, c) => a + (c.latencyBudgetMs ?? 0), 0));
    const list = parts.map((c) => `${c.latencyBudgetMs}`).join(' + ');
    add(
      'End-to-end latency budget',
      sum <= i.totalMs + 1e-9 ? 'pass' : 'fail',
      `${list} = ${sum} ms against a ${i.totalMs} ms p99 (edge + synchronous stages + network and serialisation reserve).`,
    );
    const reserve = i.components.find((c) => /reserve/i.test(c.name))?.latencyBudgetMs ?? 0;
    add(
      'Network and serialisation overhead is budgeted',
      reserve > 0 ? 'pass' : 'fail',
      reserve > 0
        ? `${reserve} ms (${r1((reserve / i.totalMs) * 100)}% of the envelope) is held back for hops, (de)serialisation and GC pauses.`
        : 'No reserve for inter-service hops; stage budgets would be spent twice.',
    );
  }

  // 2. authored or generated rationale numbers must equal the HLD numbers
  {
    const bad: string[] = [];
    for (const r of i.rationale) {
      const m = /^([\d.]+) ms of ([\d.]+) ms$/.exec(r.budget.trim());
      if (!m) continue;
      const comp = i.components.find((c) => c.name === r.stage);
      if (!comp || comp.latencyBudgetMs === null) continue;
      if (Math.abs(Number(m[1]) - comp.latencyBudgetMs) > 1e-9 || (i.totalMs !== null && Number(m[2]) !== i.totalMs))
        bad.push(`${r.stage}: rationale says "${r.budget}", HLD says ${comp.latencyBudgetMs} ms of ${i.totalMs} ms`);
    }
    add(
      'Stage rationale matches HLD budgets',
      bad.length ? 'fail' : i.totalMs === null ? 'n/a' : 'pass',
      bad.length ? bad.join('; ') : i.totalMs === null ? 'No per-request budgets in batch mode.' : 'Every "X ms of Y ms" in the stage rationale equals the HLD component budget.',
    );
  }

  // 3. a p99 stated in the constraints must not be tighter than the envelope the stages were given
  {
    const stated = i.constraints.map((c) => /p99\s*(?:under|below|<|of)?\s*([\d.]+)\s*ms/i.exec(c)).find(Boolean);
    if (!stated || i.totalMs === null) add('Stated p99 constraint vs envelope', 'n/a', 'No explicit p99 figure in the constraints.');
    else {
      const ms = Number(stated[1]);
      add(
        'Stated p99 constraint vs envelope',
        i.totalMs <= ms + 1e-9 ? 'pass' : 'fail',
        `Constraint says p99 under ${ms} ms; the stage envelope is ${i.totalMs} ms.`,
      );
    }
  }

  // 4. throughput vs provisioned capacity
  add(
    'Throughput vs provisioned capacity',
    i.scale.utilisation <= 1 + 1e-9 ? 'pass' : 'fail',
    `${i.scale.nodes} ${i.scale.nodeUnit} run at ${r1(i.scale.utilisation * 100)}% of the provisioned demand (${i.scale.nodeCapacity}).`,
  );

  // 5. availability vs actual redundancy
  {
    const stated = i.constraints.map((c) => /(99\.9{1,3})\s*%/.exec(c)).find(Boolean);
    if (!stated) add('Availability vs redundancy', 'n/a', 'No availability target in the constraints.');
    else {
      const target = Number(stated[1]);
      const regionsOk = i.scale.mode !== 'batch' && i.scale.nodes >= 6;
      add(
        'Availability vs redundancy',
        target >= 99.99 && !regionsOk ? 'warn' : 'pass',
        regionsOk
          ? `${stated[1]}% target with N+1 across three regions (${i.scale.nodes} nodes, losing one region still serves peak).`
          : `${stated[1]}% target on a ${i.scale.mode} workload: redundancy is run-level (re-run in standby), so state the availability of the result, not of a request path.`,
      );
    }
  }

  // 6. storage vs retention
  {
    const yrs = i.constraints.map((c) => /(\d+)\s*(?:-|\s)?years?[^;]*?(?:retention|retain|retained|audit|archive)|(?:retention|retain|retained|audit|archive)[^;]*?(\d+)\s*(?:-|\s)?years?/i.exec(c)).find(Boolean);
    if (!yrs) add('Storage vs retention', 'pass', `${r1(i.scale.retainedTB)} TB for the assumed ${i.assumedRetentionDays}-day retention; no longer retention is required by the constraints.`);
    else {
      const years = Number(yrs[1] ?? yrs[2]);
      const need = r1((i.scale.rawGBPerDay * years * 365) / 1024);
      add(
        'Storage vs retention',
        years * 365 > i.assumedRetentionDays ? 'warn' : 'pass',
        `Constraints require ${years} years; the table assumes ${i.assumedRetentionDays} days (${r1(i.scale.retainedTB)} TB). ${years} years is about ${need} TB before compression; tier older data to cold storage.`,
      );
    }
  }

  // 7. cost sanity
  {
    const c = i.scale.costPer1kUSD;
    const ok = Number.isFinite(c) && c > 0 && Number.isFinite(i.scale.monthlyTotalUSD) && i.scale.monthlyTotalUSD > 0;
    add(
      'Cost vs expected traffic',
      !ok ? 'fail' : c > 100 ? 'warn' : 'pass',
      !ok
        ? 'Cost is zero or not finite; traffic inputs are broken.'
        : `$${Math.round(i.scale.monthlyTotalUSD).toLocaleString('en-US')}/month for ${Math.round(i.scale.eventsPerDay).toLocaleString('en-US')} events/day = $${c < 1 ? c.toFixed(4) : c.toFixed(2)} per 1,000 decisions${c > 100 ? ' (very high: a fixed fleet floor or heavy per-event compute dominates at this volume; check the minimum node count, batching and the model cascade)' : ''}.`,
    );
  }

  // 8. RTO / RPO vs replication
  {
    const { rpoSeconds, rtoSeconds, replication } = i.dr;
    const bad =
      (rpoSeconds === 0 && replication !== 'sync') || (replication === 'async' && rpoSeconds === 0) || rtoSeconds < 0;
    add(
      'RTO/RPO vs replication strategy',
      bad ? 'fail' : 'pass',
      `RPO ${rpoSeconds === 0 ? '0' : `${rpoSeconds} s`}, RTO ${rtoSeconds} s with ${replication === 'sync' ? 'a synchronous in-jurisdiction standby' : replication === 'async' ? 'asynchronous replication (data loss up to the replication lag)' : 're-run from replicated input partitions'}.`,
    );
  }

  // 9. model memory vs serving hardware
  {
    const gpu = GPU_MEM_GB[i.scale.computeClass];
    const m = /(\d+(?:\.\d+)?)\s*B\b(?!\w)/.exec(i.productionModel);
    if (!gpu || !m) add('Model memory vs serving hardware', 'n/a', gpu ? 'No parameter count stated for the production model.' : 'CPU-served model.');
    else {
      const params = Number(m[1]);
      const weights = params * 2; // fp16 GB
      add(
        'Model memory vs serving hardware',
        weights > gpu.gb * 0.8 ? 'warn' : 'pass',
        `${params}B parameters need about ${weights} GB at FP16 against ${gpu.name}. ${weights > gpu.gb * 0.8 ? `Does not fit one device with KV-cache room: quantise (INT8/FP8: about ${weights / 2} GB) or shard with tensor parallelism across ${Math.ceil((weights * 1.3) / gpu.gb)}+ GPUs and size the table accordingly.` : 'Leaves headroom for activations and KV cache.'}`,
      );
    }
  }

  return out;
}

export const feasibilityFailures = (checks: FeasibilityCheck[]) => checks.filter((c) => c.status === 'fail');
