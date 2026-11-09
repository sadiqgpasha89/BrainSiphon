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
import type { Domain, LatencySLA, Paradigm } from '../../schemas/usecase.schema';
import {
  DOMAIN_DIMENSIONS,
  PROFILES,
  PROFILE_IDS,
  defaultProfile,
  paramsAtDefault,
  type Baseline,
  type ProfileId,
  type ProfileParam,
} from '../../content/workload-profiles';

interface Props {
  domain: Domain;
  paradigms: Paradigm[];
  latency: LatencySLA;
  inputs: {
    a: number;
    k: number;
    steps?: number;
    tokensPerStep?: number;
    outcomeUnit?: string;
    reviewRate?: number;
    eventsPerDay?: number;
    driver?: string;
  };
  /** the solution archetype, which picks the workload profile the calculator opens with */
  archetype?: string;
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

/** Slider for one workload-profile parameter; log-scaled parameters are stored as log2 so one slider spans several orders of magnitude. */
function ParamSlider({
  def,
  value,
  onChange,
}: {
  def: ProfileParam;
  value: number;
  onChange: (v: number) => void;
}) {
  const log = Boolean(def.log);
  const shown = num(value, value < 10 ? 1 : 0);
  return (
    <Slider
      label={def.label}
      value={log ? Math.log2(value) : value}
      min={log ? Math.log2(def.min) : def.min}
      max={log ? Math.log2(def.max) : def.max}
      step={def.step}
      display={`${shown}${def.unit ? ` ${def.unit}` : ''}`}
      onChange={(v) => onChange(log ? 2 ** v : v)}
    />
  );
}

/** Re-runs the same capacity model that produced the static table, with the sliders as inputs. Defaults reproduce the table exactly. */
export function CapacityCalculator({ domain, paradigms, latency, inputs, archetype }: Props) {
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
  const baseline: Baseline = useMemo(
    () => ({
      eventsPerDay: base.eventsPerDay,
      avgQps: base.avgQps,
      a: inputs.a,
      k: inputs.k,
      peakFactor: base.peakFactor,
      steps: inputs.steps ?? 3,
      tokensPerStep: inputs.tokensPerStep ?? 350,
    }),
    [base, inputs],
  );
  const initialProfile = defaultProfile(domain, base.computeClass, archetype);
  const [profile, setProfile] = useState<ProfileId>(initialProfile);
  const [vals, setVals] = useState<Record<string, number>>({});
  const defs: ProfileParam[] = useMemo(
    () => (profile === 'session' ? [] : PROFILES[profile].params(baseline)),
    [profile, baseline],
  );
  const valueOf = (d: ProfileParam) => vals[d.id] ?? d.default;
  const pv = useMemo(
    () => Object.fromEntries(defs.map((d) => [d.id, vals[d.id] ?? d.default])),
    [defs, vals],
  );
  const profileAtDefault = profile !== 'session' && paramsAtDefault(defs, pv);

  const r: ScaleResult = useMemo(() => {
    const sla = baseSla ? { slaMs: baseSla * 2 ** s.sla } : {};
    if (profile !== 'session') {
      // at the published defaults a profile is the published model, untouched
      if (profileAtDefault && s.sla === 0) return base;
      const ap = PROFILES[profile].apply(pv, baseline);
      return computeScale({
        paradigms,
        latency,
        a: inputs.a,
        k: ap.k ?? inputs.k,
        steps: ap.steps ?? inputs.steps ?? 3,
        tokensPerStep: ap.tokensPerStep ?? inputs.tokensPerStep ?? 350,
        ...(inputs.outcomeUnit ? { outcomeUnit: inputs.outcomeUnit } : {}),
        ...(inputs.reviewRate ? { reviewRate: inputs.reviewRate } : {}),
        ...(ap.candidates ? { candidates: ap.candidates } : {}),
        ...(ap.stateGB ? { stateGB: ap.stateGB } : {}),
        ...(ap.peakFactor ? { peakFactor: ap.peakFactor } : {}),
        ...(profileAtDefault
          ? {}
          : { eventsPerDay: ap.eventsPerDay ?? base.eventsPerDay, driver: ap.driver ?? '' }),
        ...sla,
      });
    }
    return computeScale({
      paradigms,
      latency,
      a: inputs.a * s.aMul,
      k: inputs.k * s.kMul,
      ...(inputs.steps ? { steps: inputs.steps } : {}),
      ...(inputs.tokensPerStep ? { tokensPerStep: inputs.tokensPerStep } : {}),
      ...(inputs.outcomeUnit ? { outcomeUnit: inputs.outcomeUnit } : {}),
      ...(inputs.reviewRate ? { reviewRate: inputs.reviewRate } : {}),
      registeredUsers: Math.round(2 ** s.users),
      dauRatio: s.dau / 100,
      peakFactor: s.peak,
      ...sla,
    });
  }, [paradigms, latency, inputs, s, baseSla, profile, pv, profileAtDefault, base, baseline]);

  const changed =
    profile === 'session' ? JSON.stringify(s) !== JSON.stringify(defaults) : !profileAtDefault || s.sla !== 0;
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
    ['All-in monthly cost', usd(r.monthlyAllInUSD), delta(r.monthlyAllInUSD, base.monthlyAllInUSD)],
    [
      `Cost per ${r.outcomeUnit}`,
      usd(r.costPerOutcomeUSD),
      delta(r.costPerOutcomeUSD, base.costPerOutcomeUSD),
    ],
  ];

  return (
    <div className="card space-y-5 p-4" data-testid="capacity-calculator">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wider text-signal">Live sizing calculator</p>
        <button
          type="button"
          className="btn !px-2 !py-1 text-xs"
          onClick={() => {
            setS(defaults);
            setVals({});
          }}
          disabled={!changed}
          data-testid="calc-reset"
        >
          <RotateCcw size={12} aria-hidden /> Reset to published
        </button>
      </div>
      <div className="space-y-2" role="group" aria-label="Workload profile" data-testid="workload-profile">
        <p className="font-mono text-[11px] uppercase tracking-wider text-dim">Workload profile</p>
        <div className="flex flex-wrap gap-1.5">
          {PROFILE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`chip cursor-pointer ${profile === id ? 'chip-signal' : ''}`}
              aria-pressed={profile === id}
              onClick={() => {
                setProfile(id);
                setVals({});
              }}
              title={PROFILES[id].blurb}
              data-testid={`profile-${id}`}
            >
              {PROFILES[id].label}
              {id === initialProfile ? ' · recommended' : ''}
            </button>
          ))}
        </div>
        <p className="text-xs text-dim">
          {PROFILES[profile].blurb} Industries are sized in different units: {DOMAIN_DIMENSIONS[domain]}.
        </p>
      </div>
      <div className="grid gap-x-8 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
        {profile === 'session' ? (
          <>
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
          </>
        ) : (
          defs
            .filter((d) => !(batch && d.id === 'peak'))
            .map((d) => (
              <ParamSlider
                key={`${profile}-${d.id}`}
                def={d}
                value={valueOf(d)}
                onChange={(v) => setVals((p) => ({ ...p, [d.id]: v }))}
              />
            ))
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
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-live="polite">
        {kpis.map(([label, value, d]) => (
          <div key={label} className="rounded-lg border border-line bg-raised/40 p-3">
            <dt className="text-[11px] text-mute">{label}</dt>
            <dd className="font-mono text-lg font-semibold text-ink">{value}</dd>
            {changed && d && <dd className="font-mono text-[10px] text-dim">{d}</dd>}
          </div>
        ))}
      </dl>
      <div className="grid gap-4 lg:grid-cols-2" data-testid="capacity-scenarios">
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">
            {batch ? 'Volume scenarios' : 'Load scenarios'}: P50 / P95 / P99
          </p>
          <table className="bs-table w-full text-sm">
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Load</th>
                <th>{r.nodeUnit.split(' (')[0]}</th>
                <th>Monthly</th>
              </tr>
            </thead>
            <tbody>
              {r.scenarios.map((x) => (
                <tr key={x.label} title={x.note}>
                  <td>{x.label}</td>
                  <td className="font-mono text-xs">{x.load}</td>
                  <td className="font-mono">{num(x.nodes)}</td>
                  <td className="font-mono">{usd(x.monthlyUSD)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-dim">
            Cost range: low <span className="font-mono">{usd(r.costRange.low)}</span> · expected{' '}
            <span className="font-mono">{usd(r.costRange.expected)}</span> · high{' '}
            <span className="font-mono">{usd(r.costRange.high)}</span> per month.
          </p>
        </div>
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">Where the money goes</p>
          <table className="bs-table w-full text-sm">
            <tbody>
              {r.costBreakdown.map((c) => (
                <tr key={c.item} title={c.basis}>
                  <td>{c.item}</td>
                  <td className="font-mono">{usd(c.monthlyUSD)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-dim">
        Same model as the table above, re-run in your browser. A tighter p99 than the published target derates
        per-node utilisation (more headroom); a looser one lets nodes run hotter. Indicative on-demand list
        prices, not a quote.
      </p>
    </div>
  );
}
