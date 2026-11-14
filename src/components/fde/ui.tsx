'use client';

import { CopyButton } from '../CopyButton';

export const inputCls = 'mt-1 w-full rounded-md border border-line bg-canvas px-2 py-1.5 text-sm text-ink';
export const Field = ({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <label className={`block text-xs text-mute ${className}`}>
    {label}
    {children}
  </label>
);
export const Bar = ({ pct, tone = 'signal' }: { pct: number; tone?: 'signal' | 'warn' | 'noise' }) => (
  <div
    className="h-2 w-full overflow-hidden rounded-full bg-raised"
    role="progressbar"
    aria-valuenow={pct}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <div
      className={`h-full ${tone === 'warn' ? 'bg-warn' : tone === 'noise' ? 'bg-noise' : 'bg-signal'}`}
      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
    />
  </div>
);
export const Stat = ({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) => (
  <div className="card p-3">
    <p className="font-mono text-[11px] uppercase tracking-wider text-dim">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    {sub && <p className="text-xs text-mute">{sub}</p>}
  </div>
);
export const Pre = ({ text, label = 'Copy' }: { text: string; label?: string }) => (
  <div className="relative">
    <pre className="bg-canvas overflow-x-auto rounded-md border border-line p-3 pr-20 font-mono text-xs text-ink">
      {text}
    </pre>
    <div className="absolute right-2 top-2">
      <CopyButton text={text} label={label} />
    </div>
  </div>
);
export const Table = ({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) => (
  <div className="card overflow-x-auto">
    <table className="bs-table">
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className={j === 0 ? 'font-medium text-ink' : undefined}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
export const List = ({ items }: { items: string[] }) => (
  <ul className="space-y-1.5 text-sm text-ink/90">
    {items.map((x) => (
      <li key={x} className="flex gap-2">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" aria-hidden />
        <span>{x}</span>
      </li>
    ))}
  </ul>
);
