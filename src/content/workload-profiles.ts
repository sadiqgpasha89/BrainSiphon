/**
 * Workload-profile sizing. "10 million registered users" is the right unit for a consumer product and the wrong one for a
 * payment switch (transactions per second), a hospital (beds and observations), a plant (assets and telemetry) or a document
 * pipeline (documents and pages). Each profile expresses the same capacity model (`scale.ts`) in the unit that workload is
 * actually sized in. At the published defaults a profile reproduces the published table exactly (tested).
 * Client-safe: plain data and pure functions.
 */
import type { Domain } from '../schemas/usecase.schema';
import type { ComputeClass, ScaleInput } from './scale';
import { REGISTERED_USERS } from './scale';

export const PROFILE_IDS = ['session', 'transaction', 'asset', 'media', 'llm', 'batch', 'forecast', 'stream', 'recsys'] as const;
export type ProfileId = (typeof PROFILE_IDS)[number];

export interface ProfileParam {
  id: string;
  label: string;
  /** slider scale: log for quantities that span orders of magnitude */
  log?: boolean;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

/** The published traffic profile that every other profile is derived from. */
export interface Baseline {
  eventsPerDay: number;
  avgQps: number;
  a: number;
  k: number;
  peakFactor: number;
  steps: number;
  tokensPerStep: number;
}

export interface ProfileDef {
  id: ProfileId;
  label: string;
  blurb: string;
  params: (b: Baseline) => ProfileParam[];
  apply: (v: Record<string, number>, b: Baseline) => Partial<Pick<ScaleInput, 'eventsPerDay' | 'driver' | 'k' | 'peakFactor' | 'steps' | 'tokensPerStep' | 'candidates' | 'stateGB'>>;
}

const SECONDS = 86_400;
const fmt = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${Math.round(n * 10) / 10}`;
const span = (d: number, lo = 0.05, hi = 20) => ({ min: Math.max(d * lo, 1e-6), max: d * hi });

export const PROFILES: Record<ProfileId, ProfileDef> = {
  session: {
    id: 'session',
    label: 'User / session-driven',
    blurb: 'Registered users, daily active share and events per active user. The default consumer-product model.',
    params: (b) => [
      { id: 'users', label: 'Registered users', log: true, ...{ min: 1e6, max: 2e8 }, step: 0.05, default: REGISTERED_USERS },
      { id: 'dau', label: 'Daily active share', min: 2, max: 80, step: 1, default: 30, unit: '%' },
      { id: 'a', label: 'Events per active user per day', log: true, ...span(b.a, 0.25, 4), step: 0.05, default: b.a },
      { id: 'k', label: 'Payload per event', log: true, ...span(b.k, 0.25, 4), step: 0.05, default: b.k, unit: 'KB' },
      { id: 'peak', label: 'Peak-to-average ratio', min: 1, max: 20, step: 0.5, default: b.peakFactor, unit: '×' },
    ],
    apply: (v) => ({ k: v.k!, peakFactor: v.peak! }),
  },
  transaction: {
    id: 'transaction',
    label: 'Transaction-driven',
    blurb: 'Average transactions per second, peak ratio, payload and entity lookups. Payments, bidding, order flow.',
    params: (b) => [
      { id: 'tps', label: 'Average transactions per second', log: true, ...span(b.avgQps), step: 0.05, default: b.avgQps, unit: 'TPS' },
      { id: 'peak', label: 'Peak-to-average ratio', min: 1, max: 20, step: 0.5, default: b.peakFactor, unit: '×' },
      { id: 'k', label: 'Payload per transaction', log: true, ...span(b.k, 0.25, 4), step: 0.05, default: b.k, unit: 'KB' },
    ],
    apply: (v) => ({ eventsPerDay: v.tps! * SECONDS, k: v.k!, peakFactor: v.peak!, driver: `${fmt(v.tps!)} TPS average` }),
  },
  asset: {
    id: 'asset',
    label: 'Asset / equipment-driven',
    blurb: 'Monitored entities (patients, vehicles, endpoints, properties, SKUs) times readings or updates each. Telemetry and monitoring.',
    params: (b) => {
      const per = Math.max(1, Math.round(b.a));
      return [
        { id: 'assets', label: 'Monitored assets or entities', log: true, ...span(b.eventsPerDay / per), step: 0.05, default: b.eventsPerDay / per },
        { id: 'per', label: 'Readings or updates per asset per day', log: true, min: 0.25, max: Math.max(per * 50, 100), step: 0.05, default: per },
        { id: 'peak', label: 'Peak-to-average ratio', min: 1, max: 20, step: 0.5, default: b.peakFactor, unit: '×' },
        { id: 'k', label: 'Payload per reading', log: true, ...span(b.k, 0.25, 4), step: 0.05, default: b.k, unit: 'KB' },
      ];
    },
    apply: (v) => ({ eventsPerDay: v.assets! * v.per!, k: v.k!, peakFactor: v.peak!, driver: `${fmt(v.assets!)} assets × ${fmt(v.per!)} readings/day` }),
  },
  media: {
    id: 'media',
    label: 'Document / image / video',
    blurb: 'Items per day times pages or frames per item, and the size of each unit. Document intelligence, imaging, video.',
    params: (b) => [
      { id: 'items', label: 'Items (documents, images, clips) per day', log: true, ...span(b.eventsPerDay / 8), step: 0.05, default: b.eventsPerDay / 8 },
      { id: 'units', label: 'Pages or frames per item', log: true, min: 1, max: 600, step: 0.05, default: 8 },
      { id: 'k', label: 'Size per page or frame', log: true, ...span(b.k, 0.25, 40), step: 0.05, default: b.k, unit: 'KB' },
      { id: 'peak', label: 'Peak-to-average ratio', min: 1, max: 20, step: 0.5, default: b.peakFactor, unit: '×' },
    ],
    apply: (v) => ({ eventsPerDay: v.items! * v.units!, k: v.k!, peakFactor: v.peak!, driver: `${fmt(v.items!)} items/day × ${fmt(v.units!)} units` }),
  },
  llm: {
    id: 'llm',
    label: 'LLM / agent',
    blurb: 'Requests per day, agent steps per request and output tokens per step. Tokens, not requests, are the unit of cost.',
    params: (b) => [
      { id: 'req', label: 'Requests per day', log: true, ...span(b.eventsPerDay), step: 0.05, default: b.eventsPerDay },
      { id: 'steps', label: 'Model calls (steps) per request', min: 1, max: 20, step: 1, default: b.steps },
      { id: 'tok', label: 'Output tokens per step', log: true, min: 20, max: 4000, step: 0.05, default: b.tokensPerStep },
      { id: 'peak', label: 'Peak-to-average ratio', min: 1, max: 20, step: 0.5, default: b.peakFactor, unit: '×' },
    ],
    apply: (v) => ({ eventsPerDay: v.req!, steps: v.steps!, tokensPerStep: v.tok!, peakFactor: v.peak!, driver: `${fmt(v.req!)} requests/day × ${fmt(v.steps!)} steps × ${fmt(v.tok!)} tokens` }),
  },
  batch: {
    id: 'batch',
    label: 'Batch / analytics',
    blurb: 'Rows per run, runs per day and bytes per row. Scheduled scoring, planning and reporting.',
    params: (b) => [
      { id: 'rows', label: 'Rows per run', log: true, ...span(b.eventsPerDay), step: 0.05, default: b.eventsPerDay },
      { id: 'runs', label: 'Runs per day', min: 1, max: 24, step: 1, default: 1 },
      { id: 'k', label: 'Payload per row', log: true, ...span(b.k, 0.25, 4), step: 0.05, default: b.k, unit: 'KB' },
    ],
    apply: (v) => ({ eventsPerDay: v.rows! * v.runs!, k: v.k!, driver: `${fmt(v.rows!)} rows × ${fmt(v.runs!)} runs/day` }),
  },
  forecast: {
    id: 'forecast',
    label: 'Forecasting',
    blurb: 'Series to forecast, runs per day, horizon and quantiles. A nightly SKU-store forecast is sized in series and horizon, not in users or requests per second.',
    params: (b) => [
      { id: 'series', label: 'Series forecast per run (entities x locations)', log: true, ...span(b.eventsPerDay), step: 0.05, default: b.eventsPerDay },
      { id: 'runs', label: 'Forecast runs per day', min: 1, max: 24, step: 1, default: 1 },
      { id: 'horizon', label: 'Forecast horizon (periods)', log: true, min: 1, max: 365, step: 0.05, default: 28 },
      { id: 'q', label: 'Quantiles per period', min: 1, max: 9, step: 1, default: 3 },
      { id: 'k', label: 'History window and covariates per series', log: true, ...span(b.k, 0.25, 8), step: 0.05, default: b.k, unit: 'KB' },
    ],
    apply: (v) => ({
      eventsPerDay: v.series! * v.runs!,
      // output volume: 16 bytes per quantile per period, relative to the published 28 periods x 3 quantiles
      k: Math.max(0.05, v.k! + (v.horizon! - 28) * v.q! * 0.016 + (v.q! - 3) * 28 * 0.016),
      driver: `${fmt(v.series!)} series x ${fmt(v.runs!)} run/day x ${fmt(v.horizon!)}-period horizon x ${fmt(v.q!)} quantiles`,
    }),
  },
  stream: {
    id: 'stream',
    label: 'Streaming events',
    blurb: 'Events per second, burst ratio, event size and the online state the processors hold (windows, sessions, counters).',
    params: (b) => [
      { id: 'eps', label: 'Average events per second', log: true, ...span(b.avgQps), step: 0.05, default: b.avgQps, unit: 'ev/s' },
      { id: 'peak', label: 'Burst-to-average ratio', min: 1, max: 30, step: 0.5, default: b.peakFactor, unit: 'x' },
      { id: 'k', label: 'Event size', log: true, ...span(b.k, 0.25, 8), step: 0.05, default: b.k, unit: 'KB' },
      { id: 'state', label: 'Resident online state (windows, sessions, counters)', min: 0, max: 2000, step: 10, default: 0, unit: 'GB' },
    ],
    apply: (v) => ({ eventsPerDay: v.eps! * SECONDS, k: v.k!, peakFactor: v.peak!, stateGB: v.state!, driver: `${fmt(v.eps!)} events/s average, ${fmt(v.state!)} GB state` }),
  },
  recsys: {
    id: 'recsys',
    label: 'Recommendation and ranking',
    blurb: 'Requests per second and the candidates scored per request. Ranking cost scales with the candidate pool, so a retrieval change moves the fleet.',
    params: (b) => [
      { id: 'qps', label: 'Average ranking requests per second', log: true, ...span(b.avgQps), step: 0.05, default: b.avgQps, unit: 'req/s' },
      { id: 'peak', label: 'Peak-to-average ratio', min: 1, max: 20, step: 0.5, default: b.peakFactor, unit: 'x' },
      { id: 'cand', label: 'Candidates scored per request', log: true, min: 100, max: 20000, step: 0.05, default: 1500 },
      { id: 'k', label: 'Payload per request', log: true, ...span(b.k, 0.25, 4), step: 0.05, default: b.k, unit: 'KB' },
    ],
    apply: (v) => ({ eventsPerDay: v.qps! * SECONDS, k: v.k!, peakFactor: v.peak!, candidates: v.cand!, driver: `${fmt(v.qps!)} req/s x ${fmt(v.cand!)} candidates` }),
  },
};

/** What each industry is really sized in (the dimensions a reviewer should ask for before accepting "10M users"). */
export const DOMAIN_DIMENSIONS: Record<Domain, string> = {
  fintech: 'Transactions per second, accounts, daily transaction volume',
  bfsi: 'Accounts, policies, daily batch volume, settlement messages',
  retail: 'SKUs, stores, searches per second, orders and sessions',
  healthcare: 'Patients, beds, observations, images and hospitals',
  'supply-chain': 'Shipments, vehicles, SKUs, warehouses and telemetry events',
  adtech: 'Impressions per second, bids per second and campaigns',
  cybersecurity: 'Endpoints, logs per second, events and alerts',
  edtech: 'Learners, concurrent sessions, assessments and content items',
  saas: 'Tenants, seats, API calls and concurrent sessions',
  'real-estate': 'Listings, properties, images and property updates',
};

const DOMAIN_PROFILE: Record<Domain, ProfileId> = {
  fintech: 'transaction',
  bfsi: 'transaction',
  adtech: 'transaction',
  retail: 'session',
  edtech: 'session',
  saas: 'session',
  healthcare: 'asset',
  'supply-chain': 'asset',
  cybersecurity: 'asset',
  'real-estate': 'asset',
};

/** The profile a use case opens with: its compute class first (LLM, vision, batch), then its industry. */
export function defaultProfile(domain: Domain, computeClass: ComputeClass, archetype?: string): ProfileId {
  if (archetype === 'forecasting') return 'forecast';
  if (computeClass === 'gpu-llm') return 'llm';
  if (computeClass === 'gpu-vision') return 'media';
  if (computeClass === 'cpu-batch' || computeClass === 'gpu-batch') return 'batch';
  return DOMAIN_PROFILE[domain];
}

export const paramsAtDefault = (defs: ProfileParam[], v: Record<string, number>) => defs.every((d) => Math.abs((v[d.id] ?? d.default) - d.default) <= 1e-12 * Math.max(1, Math.abs(d.default)));
