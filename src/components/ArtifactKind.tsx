import { ARTIFACT_KINDS, ARTIFACT_META, type ArtifactKind } from '../lib/artifacts';

const TONE: Record<ArtifactKind, string> = {
  'production-code': 'chip-signal',
  'executable-reference': 'chip-accent',
  pseudocode: '!border-warn/40 !bg-warn/10 !text-warn',
  'architectural-illustration': '',
};

/** One label on every code block, schema, contract and diagram: what kind of thing is this? */
export function KindBadge({ kind }: { kind: ArtifactKind }) {
  const m = ARTIFACT_META[kind];
  return (
    <span
      className={`chip ${TONE[kind]}`}
      title={`${m.label}: ${m.meaning} ${m.runs}`}
      data-testid="artifact-kind"
      data-kind={kind}
    >
      {m.label}
    </span>
  );
}

/** A labelled heading line for a block that is not a CodeBlock (a diagram, a table). */
export function KindLine({ kind, children }: { kind: ArtifactKind; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[11px] uppercase tracking-wider text-mute">{children}</span>
      <KindBadge kind={kind} />
    </div>
  );
}

/** The four labels, defined once, so nobody has to infer what a block of code is. */
export function ArtifactLegend() {
  return (
    <details className="card p-4 text-sm" data-testid="artifact-legend">
      <summary className="cursor-pointer font-medium text-ink">
        What the labels on code and schemas mean
      </summary>
      <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-[13rem_minmax(0,1fr)]">
        {ARTIFACT_KINDS.map((k) => (
          <div key={k} className="contents">
            <dt>
              <KindBadge kind={k} />
            </dt>
            <dd className="text-mute">
              {ARTIFACT_META[k].meaning} <span className="text-dim">{ARTIFACT_META[k].runs}</span>
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
