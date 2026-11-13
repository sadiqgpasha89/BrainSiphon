import {
  DIFFICULTIES,
  LATENCY_LABEL,
  PARADIGM_LABEL,
  type Difficulty,
  type LatencySLA,
  type Paradigm,
} from '../schemas/usecase.schema';
import { COMPLETION_META, type ReachedState } from '../lib/artifacts';

export function ParadigmChips({ paradigms }: { paradigms: Paradigm[] }) {
  return (
    <>
      {paradigms.map((p) => (
        <span key={p} className="chip chip-accent">
          {PARADIGM_LABEL[p]}
        </span>
      ))}
    </>
  );
}

export function LatencyChip({ latency }: { latency: LatencySLA }) {
  return <span className="chip">{LATENCY_LABEL[latency]}</span>;
}

const DIFF_STYLE: Record<Difficulty, string> = {
  foundational: 'chip',
  advanced: 'chip chip-signal',
  'staff-principal': 'chip border-warn/40 bg-warn/10 text-warn',
};

export function DifficultyChip({ difficulty }: { difficulty: Difficulty }) {
  return <span className={DIFF_STYLE[difficulty]}>{difficulty}</span>;
}

export const DIFFICULTY_ORDER: readonly Difficulty[] = DIFFICULTIES;

const MATURITY_STYLE: Record<ReachedState, string> = {
  'guidance-only': 'chip border-ink/20 text-mute',
  'prototype-ready': 'chip !border-signal/40 !bg-signal/5 text-ink',
  'evaluation-ready': 'chip !border-signal/60 !bg-signal-soft !text-signal font-medium',
  'integration-ready': 'chip !border-accent/60 !bg-accent-soft !text-accent font-medium',
  'shadow-ready': 'chip !border-warn/60 !bg-warn/10 !text-warn font-semibold',
  'production-ready': 'chip !border-signal !bg-signal !text-paper font-semibold',
};

export function MaturityChip({ reached, conditional }: { reached: ReachedState; conditional?: boolean }) {
  const meta = COMPLETION_META[reached];
  return (
    <span
      className={MATURITY_STYLE[reached]}
      title={`${meta.levelName}: ${meta.meaning}`}
      data-testid="maturity-chip"
      data-level={meta.levelCode}
    >
      <span className="font-mono font-semibold">{meta.levelCode}</span> · {meta.label}
      {conditional ? ' (after changes)' : ''}
    </span>
  );
}
