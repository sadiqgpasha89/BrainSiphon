import {
  DIFFICULTIES,
  LATENCY_LABEL,
  PARADIGM_LABEL,
  type Difficulty,
  type LatencySLA,
  type Paradigm,
} from '../schemas/usecase.schema';

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
  'production-grade': 'chip chip-signal',
  'staff-principal': 'chip border-warn/40 bg-warn/10 text-warn',
};

export function DifficultyChip({ difficulty }: { difficulty: Difficulty }) {
  return <span className={DIFF_STYLE[difficulty]}>{difficulty}</span>;
}

export const DIFFICULTY_ORDER: readonly Difficulty[] = DIFFICULTIES;
