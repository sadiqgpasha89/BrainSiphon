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
}

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
  rows: { metric: string; value: string; how: string }[];
  assumptions: string[];
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
export const usd = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(3)}`);

export function computeScale(i: ScaleInput): ScaleResult {
  const mode = modeOf(i.latency);
  const computeClass = computeClassOf(i.paradigms, i.latency);
  const dau = REGISTERED_USERS * DAU_RATIO;
  const eventsPerDay = dau * i.a;
  const avgQps = eventsPerDay / SECONDS_PER_DAY;
  const peakFactor = mode === 'batch' ? 1 : i.latency === 'sub-10ms' ? 8 : 6;
  const peakQps = avgQps * peakFactor;
  const provisionedQps = peakQps * 1.5; // N+1 across three regions (lose one, serve peak)

  let nodes = 0;
  let nodeUnit = '8-vCPU pods';
  let nodeCapacity = '';
  let hourly = CPU_POD_HOURLY;
  let llmTok: number | null = null;
  let batchWindow: number | null = null;

  const steps = i.steps ?? 3;
  const tok = i.tokensPerStep ?? 350;

  switch (computeClass) {
    case 'cpu-scorer':
      nodeCapacity = '≈2,500 scores/s per pod (GBDT / small NN, features already in memory)';
      nodes = Math.ceil(provisionedQps / 2500);
      break;
    case 'cpu-graph':
      nodeCapacity = '≈800 scores/s per pod (cached neighbourhood embeddings + light head)';
      nodes = Math.ceil(provisionedQps / 800);
      break;
    case 'gpu-ranker':
      nodeUnit = 'GPUs (L4/L40S class)';
      nodeCapacity = '≈600 ranked requests/s per GPU (1,500 candidates, batched, fp16)';
      nodes = Math.ceil(provisionedQps / 600);
      hourly = GPU_HOURLY;
      break;
    case 'gpu-vision':
      nodeUnit = 'GPUs (L4/L40S class)';
      nodeCapacity = '≈80 inferences/s per GPU (detector + tracker, TensorRT fp16)';
      nodes = Math.ceil(provisionedQps / 80);
      hourly = GPU_HOURLY;
      break;
    case 'gpu-encoder':
      nodeUnit = 'GPUs (L4/L40S class)';
      nodeCapacity = '≈350 inferences/s per GPU (encoder ≤ 512 tokens, dynamic batching)';
      nodes = Math.ceil(provisionedQps / 350);
      hourly = GPU_HOURLY;
      break;
    case 'gpu-llm':
      nodeUnit = 'GPUs (H100 class)';
      llmTok = provisionedQps * steps * tok;
      nodeCapacity = `≈3,000 decoded tokens/s per GPU (8B-class, continuous batching); ${steps} steps × ${tok} output tokens per request`;
      nodes = Math.ceil((llmTok * 1.2) / 3000); // +20% prefill overhead
      hourly = LLM_GPU_HOURLY;
      break;
    case 'cpu-batch':
    case 'gpu-batch': {
      const gpu = computeClass === 'gpu-batch';
      const rate = gpu ? 400 : 40_000; // rows/s per node
      batchWindow = 2;
      nodeUnit = gpu ? 'GPU workers' : '8-vCPU Spark executors';
      nodeCapacity = `≈${fmt(rate)} rows/s per node, target completion window ${batchWindow} h`;
      nodes = Math.max(2, Math.ceil(eventsPerDay / (rate * batchWindow * 3600)));
      hourly = gpu ? GPU_HOURLY : CPU_POD_HOURLY;
      break;
    }
  }
  nodes = Math.max(nodes, mode === 'batch' ? 2 : 6); // never fewer than 2 per region × 3 regions online

  const computeHours = mode === 'batch' ? batchWindow! * 30 : HOURS_PER_MONTH;
  const monthlyComputeUSD = nodes * hourly * computeHours * (mode === 'batch' ? 1 : 1);

  const peakMBps = (peakQps * i.k) / 1024;
  const kafkaPartitions = Math.max(12, Math.ceil(peakMBps / 5 / 6) * 6);
  const lookups = peakQps * 4;
  const redisShards = Math.max(3, Math.ceil(lookups / 80_000));
  const rawGBPerDay = (eventsPerDay * i.k * 1.5) / 1024 / 1024; // 1.5× = features + decision + label join
  const retainedTB = (rawGBPerDay * RETENTION_DAYS) / 1024;
  const storageUSD = retainedTB * STORAGE_PER_TB_MONTH;
  const overhead = monthlyComputeUSD * 0.35 + redisShards * 220 + Math.ceil(kafkaPartitions / 12) * 900;
  const monthlyTotalUSD = monthlyComputeUSD + storageUSD + overhead;
  const costPer1kUSD = monthlyTotalUSD / ((eventsPerDay * 30) / 1000);

  const rows: ScaleResult['rows'] = [
    { metric: 'Registered / daily active users', value: `${fmt(REGISTERED_USERS)} / ${fmt(dau)}`, how: `${DAU_RATIO * 100}% DAU of 10M registered` },
    { metric: 'Model-touching events per day', value: fmt(eventsPerDay), how: `${fmt(dau)} DAU × ${i.a} events/user/day` },
    { metric: 'Average throughput', value: `${fmt(avgQps, 1)} req/s`, how: 'events/day ÷ 86,400' },
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
  ];

  const assumptions = [
    `${fmt(REGISTERED_USERS)} registered users, ${DAU_RATIO * 100}% daily active; each active user triggers ${i.a} model-touching events per day.`,
    `Average payload ${i.k} KB per event across request, features and decision log.`,
    mode === 'batch'
      ? 'One daily partition; runs must finish inside a 2-hour window so downstream consumers are never blocked.'
      : `Peak = ${peakFactor}× average; three active-active regions sized so losing one still serves peak (×1.5).`,
    'Unit prices are indicative on-demand list prices; committed-use or spot discounts typically cut compute 30–60%.',
  ];

  return { mode, computeClass, dau, eventsPerDay, avgQps, peakQps, provisionedQps, peakFactor, nodes, nodeUnit, nodeCapacity, kafkaPartitions, peakMBps, featureLookupsPerSec: lookups, redisShards, rawGBPerDay, retainedTB, monthlyComputeUSD, monthlyTotalUSD, costPer1kUSD, batchWindowHours: batchWindow, llmOutputTokPerSec: llmTok, rows, assumptions };
}
