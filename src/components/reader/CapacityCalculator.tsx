'use client';

import { RotateCcw } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import {
  BASELINE_SLA_MS,
  DAU_RATIO,
  REGISTERED_USERS,
  computeScale,
  usd,
  type ScaleResult,
} from '../../content/scale';
import type { LatencySLA, Paradigm } from '../../schemas/usecase.schema';

interface Props {
  paradigms: Paradigm[];
  latency: LatencySLA;
  inputs: { a: number; k: number; steps?: number; tokensPerStep?: number };
}

const num = (n: number, d = 0) =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(1)}B`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}M`
      : n >= 1e4
        ? `${(n / 1e3).toFixed(0)}K`
        : n.toLocaleString('en-US', { maximumFractionDigits: d });

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between text-xs text-mute">
        <span>{label}</span>
        <span className="font-mono text-sm text-signal">{display}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-signal"
      />
    </div>
  );
}

/** Re-runs the same capacity model that produced the static table, with the sliders as inputs. Defaults reproduce the table exactly. */
export function CapacityCalculator({ paradigms, latency, inputs }: Props) {
  const batch = latency === 'batch';
  const baseSla = BASELINE_SLA_MS[latency];
  const basePeak = latency === 'sub-10ms' ? 8 : 6;
  const defaults = {
    // log2 of registered users, so one slider covers 1M..200M
    users: Math.log2(REGISTERED_USERS),
    dau: DAU_RATIO * 100,
    aMul: 1,
    kMul: 1,
    peak: basePeak,
    sla: 0, // log2(slaMs / baseline); 0 = published SLA
  };
  const [s, setS] = useState(defaults);
  const set = (patch: Partial<typeof defaults>) => setS((p) => ({ ...p, ...patch }));

  const base = useMemo(() => computeScale({ paradigms, latency, ...inputs }), [paradigms, latency, inputs]);
  const r: ScaleResult = useMemo(
    () =>
      computeScale({
        paradigms,
        latency,
        a: inputs.a * s.aMul,
        k: inputs.k * s.kMul,
        ...(inputs.steps ? { steps: inputs.steps } : {}),
        ...(inputs.tokensPerStep ? { tokensPerStep: inputs.tokensPerStep } : {}),
        registeredUsers: Math.round(2 ** s.users),
        dauRatio: s.dau / 100,
        peakFactor: s.peak,
        ...(baseSla ? { slaMs: baseSla * 2 ** s.sla } : {}),
      }),
    [paradigms, latency, inputs, s, baseSla],
  );

  const changed = JSON.stringify(s) !== JSON.stringify(defaults);
  const delta = (cur: number, ref: number) =>
    ref === 0 ? '' : `${cur >= ref ? '+' : ''}${(((cur - ref) / ref) * 100).toFixed(0)}% vs published`;
  const kpis: [string, string, string][] = [
    [
      batch ? 'Rows per run' : 'Provisioned req/s',
      batch ? num(r.eventsPerDay) : num(r.provisionedQps),
      batch ? '' : delta(r.provisionedQps, base.provisionedQps),
    ],
    [r.nodeUnit, num(r.nodes), delta(r.nodes, base.nodes)],
    ['Kafka partitions', String(r.kafkaPartitions), delta(r.kafkaPartitions, base.kafkaPartitions)],
    ['Feature-store shards', String(r.redisShards), delta(r.redisShards, base.redisShards)],
    ['Monthly run cost', usd(r.monthlyTotalUSD), delta(r.monthlyTotalUSD, base.monthlyTotalUSD)],
    ['Cost / 1,000 decisions', usd(r.costPer1kUSD), delta(r.costPer1kUSD, base.costPer1kUSD)],
  ];

  return (
    <div className="card space-y-5 p-4" data-testid="capacity-calculator">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wider text-signal">Live sizing calculator</p>
        <button
          type="button"
          className="btn !px-2 !py-1 text-xs"
          onClick={() => setS(defaults)}
          disabled={!changed}
          data-testid="calc-reset"
        >
          <RotateCcw size={12} aria-hidden /> Reset to published
        </button>
      </div>
      <div className="grid gap-x-8 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
        <Slider
          label="Registered users"
          value={s.users}
          min={Math.log2(1e6)}
          max={Math.log2(2e8)}
          step={0.05}
          display={num(Math.round(2 ** s.users))}
          onChange={(v) => set({ users: v })}
        />
        <Slider
          label="Daily active share"
          value={s.dau}
          min={2}
          max={80}
          step={1}
          display={`${s.dau}%`}
          onChange={(v) => set({ dau: v })}
        />
        <Slider
          label="Events per active user per day"
          value={s.aMul}
          min={0.25}
          max={4}
          step={0.05}
          display={num(inputs.a * s.aMul, 1)}
          onChange={(v) => set({ aMul: v })}
        />
        <Slider
          label="Payload per event (KB)"
          value={s.kMul}
          min={0.25}
          max={4}
          step={0.05}
          display={num(inputs.k * s.kMul, 1)}
          onChange={(v) => set({ kMul: v })}
        />
        {!batch && (
          <Slider
            label="Peak-to-average ratio"
            value={s.peak}
            min={1}
            max={20}
            step={0.5}
            display={`${s.peak}×`}
            onChange={(v) => set({ peak: v })}
          />
        )}
        {!batch && baseSla && (
          <Slider
            label="p99 SLA target"
            value={s.sla}
            min={-2}
            max={2}
            step={0.1}
            display={`${num(baseSla * 2 ** s.sla, baseSla < 20 ? 1 : 0)} ms`}
            onChange={(v) => set({ sla: v })}
          />
        )}
      </div>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6" aria-live="polite">
        {kpis.map(([label, value, d]) => (
          <div key={label} className="rounded-lg border border-line bg-raised/40 p-3">
            <dt className="text-[11px] text-mute">{label}</dt>
            <dd className="font-mono text-lg font-semibold text-ink">{value}</dd>
            {changed && d && <dd className="font-mono text-[10px] text-dim">{d}</dd>}
          </div>
        ))}
      </dl>
      <p className="text-xs text-dim">
        Same model as the table above, re-run in your browser. A tighter p99 than the published target derates
        per-node utilisation (more headroom); a looser one lets nodes run hotter. Indicative on-demand list
        prices, not a quote.
      </p>
    </div>
  );
}
