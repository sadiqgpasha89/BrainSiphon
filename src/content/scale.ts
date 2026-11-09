import type { LatencySLA, Paradigm } from '../schemas/usecase.schema';

/**
 * Back-of-envelope capacity model for 10M registered users.
 * Every number is derived from the use case's own `a` (events per active user per day)
 * and `k` (KB per event), so the table differs per use case. Unit costs are on-demand
 * list-price order-of-magnitude figures, not quotes.
 */
export const REGISTERED_USERS = 10_000_000;
export const DAU_RATIO = 0.3;
const SECONDS_PER_DAY = 86_400;
const HOURS_PER_MONTH = 730;
const CPU_POD_HOURLY = 0.34; // 8 vCPU / 32 GB general-purpose node
const GPU_HOURLY = 1.8; // L4 / L40S class
const LLM_GPU_HOURLY = 3.2; // H100 class, blended on-demand/committed
const STORAGE_PER_TB_MONTH = 23; // object storage
const RETENTION_DAYS = 400;

export type ComputeClass = 'cpu-scorer' | 'cpu-graph' | 'gpu-ranker' | 'gpu-vision' | 'gpu-encoder' | 'gpu-llm' | 'cpu-batch' | 'gpu-batch';

export interface ScaleInput {
  paradigms: Paradigm[];
  latency: LatencySLA;
  a: number;
  k: number;
  steps?: number;
  tokensPerStep?: number;
  /** Optional what-if overrides (used by the interactive calculator). Omitted = the published 10M-user defaults. */
  registeredUsers?: number;
  dauRatio?: number;
  peakFactor?: number;
  /** p99 target in ms. Tighter than the baseline SLA derates per-node utilisation; looser raises it. */
  slaMs?: number;
  /** Workload-profile override: model-touching events per day taken directly from a profile's native units (TPS, assets, documents, rows) instead of users × DAU × a. */
  eventsPerDay?: number;
  /** Human-readable description of that driver, shown in the first row of the table (e.g. "1,200 TPS average"). */
  driver?: string;
  /** What one model-touching event is in business terms ("forecast series-run", "document", "slate"): names the cost-per-outcome row. */
  outcomeUnit?: string;
  /** Candidates scored per request by a ranker. Per-GPU throughput is quoted at 1,500; fewer candidates run faster, more run slower. */
  candidates?: number;
  /** Resident online state (feature store, session or window state) in GB; sets a floor on cache shards. */
  stateGB?: number;
  /** Share of events that a person reviews or annotates (0..1). Adds a human-review line to the all-in cost. */
  reviewRate?: number;
}

/** The p99 the published table is sized for, per latency class. */
export const BASELINE_SLA_MS: Record<LatencySLA, number | null> = {
  'sub-10ms': 8,
  'sub-100ms': 80,
  seconds: 2500,
  batch: null,
};

export interface ScaleResult {
  mode: 'online' | 'interactive' | 'batch';
  computeClass: ComputeClass;
  dau: number;
  eventsPerDay: number;
  avgQps: number;
  peakQps: number;
  provisionedQps: number;
  peakFactor: number;
  nodes: number;
  nodeUnit: string;
  nodeCapacity: string;
  kafkaPartitions: number;
  peakMBps: number;
  featureLookupsPerSec: number;
  redisShards: number;
  rawGBPerDay: number;
  retainedTB: number;
  monthlyComputeUSD: number;
  monthlyTotalUSD: number;
  costPer1kUSD: number;
  batchWindowHours: number | null;
  llmOutputTokPerSec: number | null;
  /** demand ÷ (nodes × per-node rate) after the minimum-node clamp: must be ≤ 1, otherwise the table under-provisions */
  utilisation: number;
  rows: { metric: string; value: string; how: string }[];
  assumptions: string[];
  /** business meaning of one event, used to name the cost-per-outcome row */
  outcomeUnit: string;
  /** every monthly cost line behind the all-in figure; the first four sum to `monthlyTotalUSD` */
  costBreakdown: { item: string; monthlyUSD: number; basis: string }[];
  /** `monthlyTotalUSD` plus retraining, observability, data transfer, backup/DR and human review */
  monthlyAllInUSD: number;
  costPerOutcomeUSD: number;
  /** low = 0.8× load on committed/spot compute; expected = the table; high = 1.5× load at on-demand prices */
  costRange: { low: number; expected: number; high: number };
  /** the same model run at the median, P95 and P99 of the load distribution (batch: typical, growth, backfill) */
  scenarios: { label: string; load: string; nodes: number; monthlyUSD: number; note: string }[];
}

export const modeOf = (latency: LatencySLA): ScaleResult['mode'] =>
  latency === 'batch' ? 'batch' : latency === 'seconds' ? 'interactive' : 'online';

export function computeClassOf(p: Paradigm[], latency: LatencySLA): ComputeClass {
  const batch = latency === 'batch';
  if (p.includes('llm-agents')) return batch ? 'gpu-batch' : 'gpu-llm';
  if (p.includes('computer-vision')) return batch ? 'gpu-batch' : 'gpu-vision';
  if (p.includes('recommender') && !batch) return 'gpu-ranker';
  if (p.includes('nlp')) return batch ? 'gpu-batch' : 'gpu-encoder';
  if (batch) return 'cpu-batch';
  if (p.includes('graph')) return 'cpu-graph';
  return 'cpu-scorer';
}

const fmt = (n: number, d = 0) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}M` : n >= 1e4 ? `${(n / 1e3).toFixed(0)}K` : n.toLocaleString('en-US', { maximumFractionDigits: d });
export const usd = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : n >= 1 ? `$${n.toFixed(2)}` : n >= 0.01 || n === 0 ? `$${n.toFixed(3)}` : `$${n.toPrecision(2)}`;

export function computeScale(i: ScaleInput): ScaleResult {
  const mode = modeOf(i.latency);
  const computeClass = computeClassOf(i.paradigms, i.latency);
  const registered = i.registeredUsers ?? REGISTERED_USERS;
  const dauRatio = i.dauRatio ?? DAU_RATIO;
  const dau = registered * dauRatio;
  const eventsPerDay = i.eventsPerDay ?? dau * i.a;
  const avgQps = eventsPerDay / SECONDS_PER_DAY;
  const peakFactor = mode === 'batch' ? 1 : (i.peakFactor ?? (i.latency === 'sub-10ms' ? 8 : 6));
  const peakQps = avgQps * peakFactor;
  // Utilisation derating: a tighter p99 than the baseline needs more headroom per node (queueing delay grows
  // non-linearly near saturation); a looser one lets nodes run hotter. Exactly 1 at the baseline SLA.
  const baseSla = BASELINE_SLA_MS[i.latency];
  const slaDerate = mode === 'batch' || !i.slaMs || !baseSla ? 1 : Math.min(1.5, Math.max(0.6, 1 + 0.25 * Math.log2(baseSla / i.slaMs)));
  const provisionedQps = peakQps * 1.5 * slaDerate; // N+1 across three regions (lose one, serve peak)

  let nodes = 0;
  let nodeUnit = '8-vCPU pods';
  let nodeCapacity = '';
  let hourly = CPU_POD_HOURLY;
  let llmTok: number | null = null;
  let batchWindow: number | null = null;
  let rate = 1; // capacity per node in the same unit as `demand`
  let demand = 0;

  const steps = i.steps ?? 3;
  const tok = i.tokensPerStep ?? 350;

  switch (computeClass) {
    case 'cpu-scorer':
      nodeCapacity = '≈2,500 scores/s per pod (GBDT / small NN, features already in memory)';
      rate = 2500;
      demand = provisionedQps;
      nodes = Math.ceil(demand / rate);
      break;
    case 'cpu-graph':
      nodeCapacity = '≈800 scores/s per pod (cached neighbourhood embeddings + light head)';
      rate = 800;
      demand = provisionedQps;
      nodes = Math.ceil(demand / rate);
      break;
    case 'gpu-ranker':
      nodeUnit = 'GPUs (L4/L40S class)';
      {
        const cand = Math.max(50, i.candidates ?? 1500);
        rate = Math.max(40, Math.round((600 * 1500) / cand));
        nodeCapacity = `≈${fmt(rate)} ranked requests/s per GPU (${fmt(cand)} candidates per request, batched, fp16)`;
      }
      demand = provisionedQps;
      nodes = Math.ceil(demand / rate);
      hourly = GPU_HOURLY;
      break;
    case 'gpu-vision':
      nodeUnit = 'GPUs (L4/L40S class)';
      nodeCapacity = '≈80 inferences/s per GPU (detector + tracker, TensorRT fp16)';
      rate = 80;
      demand = provisionedQps;
      nodes = Math.ceil(demand / rate);
      hourly = GPU_HOURLY;
      break;
    case 'gpu-encoder':
      nodeUnit = 'GPUs (L4/L40S class)';
      nodeCapacity = '≈350 inferences/s per GPU (encoder ≤ 512 tokens, dynamic batching)';
      rate = 350;
      demand = provisionedQps;
      nodes = Math.ceil(demand / rate);
      hourly = GPU_HOURLY;
      break;
    case 'gpu-llm':
      nodeUnit = 'GPUs (H100 class)';
      llmTok = provisionedQps * steps * tok;
      nodeCapacity = `≈3,000 decoded tokens/s per GPU (8B-class, continuous batching); ${steps} steps × ${tok} output tokens per request`;
      rate = 3000;
      demand = llmTok * 1.2; // +20% prefill overhead
      nodes = Math.ceil(demand / rate);
      hourly = LLM_GPU_HOURLY;
      break;
    case 'cpu-batch':
    case 'gpu-batch': {
      const gpu = computeClass === 'gpu-batch';
      const brate = gpu ? 400 : 40_000; // rows/s per node
      batchWindow = 2;
      nodeUnit = gpu ? 'GPU workers' : '8-vCPU Spark executors';
      nodeCapacity = `≈${fmt(brate)} rows/s per node, target completion window ${batchWindow} h`;
      rate = brate * batchWindow * 3600;
      demand = eventsPerDay;
      nodes = Math.max(2, Math.ceil(demand / rate));
      hourly = gpu ? GPU_HOURLY : CPU_POD_HOURLY;
      break;
    }
  }
  nodes = Math.max(nodes, mode === 'batch' ? 2 : 6); // never fewer than 2 per region × 3 regions online

  const utilisation = demand / (nodes * rate);
  const computeHours = mode === 'batch' ? batchWindow! * 30 : HOURS_PER_MONTH;
  const monthlyComputeUSD = nodes * hourly * computeHours * (mode === 'batch' ? 1 : 1);

  const peakMBps = (peakQps * i.k) / 1024;
  const kafkaPartitions = Math.max(12, Math.ceil(peakMBps / 5 / 6) * 6);
  const lookups = peakQps * 4;
  const redisShards = Math.max(3, Math.ceil(lookups / 80_000), i.stateGB ? Math.ceil(i.stateGB / 24) : 0);
  const rawGBPerDay = (eventsPerDay * i.k * 1.5) / 1024 / 1024; // 1.5× = features + decision + label join
  const retainedTB = (rawGBPerDay * RETENTION_DAYS) / 1024;
  const storageUSD = retainedTB * STORAGE_PER_TB_MONTH;
  const overhead = monthlyComputeUSD * 0.35 + redisShards * 220 + Math.ceil(kafkaPartitions / 12) * 900;
  const monthlyTotalUSD = monthlyComputeUSD + storageUSD + overhead;
  const costPer1kUSD = monthlyTotalUSD / ((eventsPerDay * 30) / 1000);

  // ---- full cost model: scenarios, range and the lines the table above leaves out
  const minNodes = mode === 'batch' ? 2 : 6;
  const outcomeUnit = i.outcomeUnit ?? 'decision';
  const nodesAt = (mult: number) => Math.max(minNodes, Math.ceil((demand * mult) / rate));
  const priceAt = (mult: number, discount: number, unitUplift = 1) => {
    const n = nodesAt(mult);
    const compute = n * hourly * computeHours * (1 - discount) * unitUplift;
    const store = storageUSD * mult * unitUplift;
    const core = compute + store + compute * 0.35 + redisShards * 220 + Math.ceil(kafkaPartitions / 12) * 900;
    const retrain = compute * (computeClass === 'cpu-scorer' || computeClass === 'cpu-graph' || computeClass === 'cpu-batch' ? 0.04 : computeClass === 'gpu-llm' ? 0.08 : 0.15);
    const observability = (compute + compute * 0.35) * 0.04;
    const transfer = (rawGBPerDay * mult * 30 * 0.02) * unitUplift;
    const backup = store * 0.25;
    const review = i.reviewRate ? (eventsPerDay * mult * 30 * i.reviewRate * 3 * 40) / 60 : 0;
    return { n, compute, store, core, retrain, observability, transfer, backup, review, total: core + retrain + observability + transfer + backup + review };
  };
  const mid = priceAt(1, 0);
  const monthlyAllInUSD = mid.total;
  const costPerOutcomeUSD = monthlyAllInUSD / (eventsPerDay * 30);
  const costRange = { low: priceAt(0.8, 0.5).total, expected: monthlyAllInUSD, high: priceAt(1.5, 0, 1.2).total };
  const costBreakdown: ScaleResult['costBreakdown'] = [
    { item: 'Inference compute', monthlyUSD: mid.compute, basis: `${nodes} ${nodeUnit} × on-demand price × ${mode === 'batch' ? `${batchWindow} h × 30 runs` : '730 h'}` },
    { item: 'Platform overhead', monthlyUSD: mid.compute * 0.35, basis: '35% of compute: gateways, mesh, logging agents, control plane' },
    { item: 'Event bus and online feature store', monthlyUSD: redisShards * 220 + Math.ceil(kafkaPartitions / 12) * 900, basis: `${redisShards} cache shards, ${kafkaPartitions} partitions: a fixed minimum footprint that dominates when volume is small` },
    { item: 'Storage', monthlyUSD: mid.store, basis: `${fmt(retainedTB, 1)} TB retained at object-storage list price` },
    { item: 'Retraining and evaluation', monthlyUSD: mid.retrain, basis: 'modelled as a share of serving compute by compute class; replace with your retrain cadence × GPU-hours' },
    { item: 'Observability', monthlyUSD: mid.observability, basis: '4% of compute plus platform overhead: metrics, traces, log ingestion' },
    { item: 'Data transfer and ingestion', monthlyUSD: mid.transfer, basis: `${fmt(rawGBPerDay * 30, 0)} GB/month at $0.02/GB inter-zone and egress` },
    { item: 'Backup and disaster recovery', monthlyUSD: mid.backup, basis: '25% of storage for cross-region replicas and snapshots (compute standby is already in N+1)' },
    ...(i.reviewRate ? [{ item: 'Human review and annotation', monthlyUSD: mid.review, basis: `${Math.round(i.reviewRate * 1000) / 10}% of events × 3 min × $40/h` }] : []),
  ];
  const sc = (label: string, mult: number, note: string, load: string): ScaleResult['scenarios'][number] => {
    const p = priceAt(mult, 0);
    return { label, load, nodes: p.n, monthlyUSD: p.total, note };
  };
  const scenarios: ScaleResult['scenarios'] =
    mode === 'batch'
      ? [
          sc('Typical run (P50)', 1, 'the published volume and window', `${fmt(eventsPerDay)} rows`),
          sc('Growth or month-end (P95)', 1.5, 'volume one and a half times the typical run', `${fmt(eventsPerDay * 1.5)} rows`),
          sc('Backfill or reprocess (P99)', 3, 'a historical rebuild at three times the daily volume', `${fmt(eventsPerDay * 3)} rows`),
        ]
      : [
          sc('Median hour (P50)', 0.8 / peakFactor, 'a typical hour: 0.8× the daily average', `${fmt(avgQps * 0.8, 1)} req/s`),
          sc('Busy hour (P95)', 0.6, '60% of the peak factor: the busiest 5% of hours', `${fmt(avgQps * peakFactor * 0.6, 0)} req/s`),
          sc('Peak (P99)', 1, 'the design peak the table is sized for', `${fmt(peakQps, 0)} req/s`),
        ];

  const rows: ScaleResult['rows'] = [
    i.eventsPerDay === undefined
      ? { metric: 'Registered / daily active users', value: `${fmt(registered)} / ${fmt(dau)}`, how: `${Math.round(dauRatio * 1000) / 10}% DAU of ${fmt(registered)} registered` }
      : { metric: 'Workload driver', value: i.driver ?? `${fmt(eventsPerDay)} events/day`, how: 'stated by the use case or taken from the selected workload profile' },
    { metric: 'Model-touching events per day', value: fmt(eventsPerDay), how: i.eventsPerDay === undefined ? `${fmt(dau)} DAU × ${i.a} events/user/day` : 'from the stated volume or the selected workload profile' },
    mode === 'batch'
      ? { metric: 'Required throughput', value: `${fmt(eventsPerDay / (batchWindow! * 3600), 0)} rows/s`, how: `rows per run ÷ ${batchWindow} h completion window (not a request rate)` }
      : { metric: 'Average throughput', value: `${fmt(avgQps, 1)} req/s`, how: 'events/day ÷ 86,400' },
    { metric: mode === 'batch' ? 'Rows per run (daily)' : 'Peak throughput', value: mode === 'batch' ? fmt(eventsPerDay) : `${fmt(peakQps, 0)} req/s`, how: mode === 'batch' ? 'one partition per day' : `average × ${peakFactor} (diurnal + event spikes)` },
    { metric: mode === 'batch' ? 'Capacity target' : 'Provisioned capacity', value: mode === 'batch' ? `${batchWindow} h window` : `${fmt(provisionedQps, 0)} req/s`, how: mode === 'batch' ? 'finish before downstream consumers start' : 'peak × 1.5 so any one of three regions can fail' },
    { metric: `Compute (${nodeUnit})`, value: fmt(nodes), how: nodeCapacity },
    ...(llmTok ? [{ metric: 'Peak decode load', value: `${fmt(llmTok)} tok/s`, how: `provisioned req/s × ${steps} steps × ${tok} tokens` }] : []),
    { metric: 'Event bus', value: `${kafkaPartitions} partitions @ ${fmt(peakMBps, 1)} MB/s`, how: 'peak × payload KB; ≤ 5 MB/s per partition, rounded to 6 per AZ-set' },
    { metric: 'Online feature store', value: `${redisShards} shards @ ${fmt(lookups)} lookups/s`, how: 'peak × 4 entity lookups; ≈80K ops/s per shard' },
    { metric: 'Raw data growth', value: `${fmt(rawGBPerDay, 1)} GB/day`, how: 'events × payload × 1.5 (features + decision + label join)' },
    { metric: `Retained (${RETENTION_DAYS} days)`, value: `${fmt(retainedTB, 1)} TB`, how: 'columnar compression not assumed (conservative)' },
    { metric: 'Estimated monthly run cost', value: usd(monthlyTotalUSD), how: `compute + 35% platform overhead + cache/bus + storage (on-demand list price)` },
    { metric: 'Cost per 1,000 decisions', value: usd(costPer1kUSD), how: 'monthly cost ÷ (events/month ÷ 1000)' },
    { metric: 'All-in monthly cost', value: usd(monthlyAllInUSD), how: 'adds retraining, observability, data transfer, backup/DR' + (i.reviewRate ? ' and human review' : '') + ' to the run cost' },
    { metric: 'Cost range (low / expected / high)', value: `${usd(costRange.low)} / ${usd(costRange.expected)} / ${usd(costRange.high)}`, how: 'low = 0.8× load on committed/spot compute; high = 1.5× load at 20% higher unit prices' },
    { metric: `Cost per ${outcomeUnit}`, value: usd(costPerOutcomeUSD), how: 'all-in monthly cost ÷ outcomes per month' },
    { metric: 'Load scenarios (P50 / P95 / P99)', value: scenarios.map((x) => `${fmt(x.nodes)}`).join(' / ') + ` ${nodeUnit}`, how: scenarios.map((x) => `${x.label.split(' (')[1]!.replace(')', '')}: ${x.load}`).join('; ') },
  ];

  const assumptions = [
    i.eventsPerDay === undefined
      ? `${fmt(registered)} registered users, ${Math.round(dauRatio * 1000) / 10}% daily active; each active user triggers ${i.a} model-touching events per day.`
      : `Sized from the workload profile: ${i.driver ?? `${fmt(eventsPerDay)} events/day`}.`,
    `Average payload ${i.k} KB per event across request, features and decision log.`,
    mode === 'batch'
      ? 'One daily partition; runs must finish inside a 2-hour window so downstream consumers are never blocked.'
      : `Peak = ${peakFactor}× average; the stateless inference plane runs in three active-active regions sized so losing one still serves peak (×1.5).`,
    'Unit prices are indicative on-demand list prices; committed-use or spot discounts typically cut compute 30–60%.',
    'Retraining, observability, data transfer and backup are modelled shares of the run cost, not measurements; replace them with your own cadence, retention and tariffs.',
  ];

  return { mode, computeClass, dau, eventsPerDay, avgQps, peakQps, provisionedQps, peakFactor, nodes, nodeUnit, nodeCapacity, kafkaPartitions, peakMBps, featureLookupsPerSec: lookups, redisShards, rawGBPerDay, retainedTB, monthlyComputeUSD, monthlyTotalUSD, costPer1kUSD, batchWindowHours: batchWindow, llmOutputTokPerSec: llmTok, utilisation, rows, assumptions, outcomeUnit, costBreakdown, monthlyAllInUSD, costPerOutcomeUSD, costRange, scenarios };
}
