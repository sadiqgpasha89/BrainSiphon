import {
  AlertTriangle,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleSlash,
  FileCheck2,
  FileText,
  Layers,
  ShieldAlert,
  Terminal,
  UserCheck,
} from 'lucide-react';
import {
  MATURITY_STATE_TEXT,
  shortSha,
  type FeasibilityWarning,
  type MaturityScorecard,
  type MaturityState,
  type ReleaseManifest,
  type StatusRow,
  type StatusState,
} from '../../content/release';
import { withBase } from '../../lib/site';

const TONE: Record<StatusState, string> = {
  passed: 'chip-signal',
  failed: '!border-noise/50 !bg-noise/10 !text-noise',
  'not-run': '',
  'not-reviewed': '',
  'not-available': '',
};

function StateIcon({ state }: { state: StatusState }) {
  if (state === 'passed') return <CircleCheck size={12} aria-hidden />;
  if (state === 'failed') return <CircleAlert size={12} aria-hidden />;
  return <CircleDashed size={12} aria-hidden />;
}

/**
 * The five validation statuses side by side. There is deliberately no combined "verified" label: a reader has to be able to see
 * that, say, the schema and feasibility checks passed while no expert has reviewed the blueprint and no production evidence exists.
 */
export function ValidationStatusStrip({
  statuses,
  scorecard,
}: {
  statuses: StatusRow[];
  scorecard?: MaturityScorecard;
}) {
  return (
    <ul
      className="m-0 flex list-none flex-wrap items-center gap-2 p-0"
      data-testid="validation-status"
      aria-label="Validation status"
    >
      {statuses.map((s) => (
        <li key={s.id} className="m-0 p-0">
          <a
            href="#validation"
            className={`chip no-underline ${TONE[s.state]}`}
            data-testid={`status-${s.id}`}
            data-state={s.state}
            title={s.detail}
          >
            <StateIcon state={s.state} />
            {s.label}: {s.text}
          </a>
        </li>
      ))}
      {scorecard && (
        <li className="m-0 p-0">
          <a
            href="#maturity-scorecard"
            className="chip !border-ink/30 no-underline"
            data-testid="maturity-classification"
            data-level={scorecard.level}
            title={scorecard.blockedBy ? `Stops here because of ${scorecard.blockedBy}` : undefined}
          >
            <Layers size={12} aria-hidden /> Maturity {scorecard.level} of {scorecard.items.length}:{' '}
            {scorecard.classificationLabel}
          </a>
        </li>
      )}
    </ul>
  );
}

/** Which commit and content this page was built from, and when it was last validated and deployed. */
export function ReleaseLine({ release }: { release: ReleaseManifest | null }) {
  if (!release)
    return <p className="font-mono text-xs text-dim">Release information is not available for this build.</p>;
  return (
    <p className="font-mono text-xs text-dim" data-testid="release-line">
      commit {shortSha(release.sourceCommit)}
      {release.sourceDirty ? '+dirty' : ''} · content {release.contentVersion} · validated{' '}
      {release.validatedAt
        ? release.validatedAt.slice(0, 16).replace('T', ' ') + ' UTC'
        : 'not in this build'}{' '}
      ·{' '}
      {release.deployedAt
        ? `deployed ${release.deployedAt.slice(0, 16).replace('T', ' ')} UTC`
        : 'not a deployment build'}
    </p>
  );
}

const STATE_TONE: Record<MaturityState, string> = {
  met: 'bg-signal/15 text-signal',
  'met-with-warnings': 'bg-warn/15 text-warn',
  partial: 'bg-warn/15 text-warn',
  failed: 'bg-noise/15 text-noise',
  'not-met': 'bg-raised text-mute',
  'not-run': 'bg-raised text-mute',
  'not-applicable': 'bg-raised text-mute',
};

function MaturityStateBadge({ state }: { state: MaturityState }) {
  const Icon =
    state === 'met'
      ? CircleCheck
      : state === 'met-with-warnings' || state === 'partial'
        ? AlertTriangle
        : state === 'failed'
          ? CircleAlert
          : state === 'not-applicable'
            ? CircleSlash
            : CircleDashed;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] font-medium ${STATE_TONE[state]}`}
    >
      <Icon size={11} aria-hidden /> {MATURITY_STATE_TEXT[state]}
    </span>
  );
}

/**
 * The maturity scorecard of one blueprint: seven levels, each with its own state and the evidence behind it. The classification is
 * the highest level reached without skipping one, so a schema pass can never be read as proof that an implementation is ready.
 */
export function MaturityScorecardPanel({ scorecard }: { scorecard: MaturityScorecard }) {
  return (
    <section id="maturity-scorecard" className="scroll-mt-24 space-y-4" data-testid="maturity-scorecard">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-dim">Maturity scorecard</span>
          <h3 className="text-lg font-semibold text-ink" data-testid="maturity-headline">
            Level {scorecard.level} of {scorecard.items.length}: {scorecard.classificationLabel}
          </h3>
        </div>
        <a href={withBase('/release')} className="font-mono text-xs text-mute hover:text-ink">
          Release report
        </a>
      </div>

      <p className="text-sm text-mute" data-prose>
        A blueprint is classified at the highest level it reaches without skipping one.{' '}
        {scorecard.blockedBy
          ? `This one stops at level ${scorecard.level} because of the next: ${scorecard.blockedBy}`
          : ''}{' '}
        Passing the schema shows the page is complete. It does not show that the design has been built,
        reviewed or run anywhere.
      </p>

      {scorecard.highRisk && (
        <aside
          className="flex items-start gap-3 rounded-lg border border-warn/50 bg-warn/10 p-4"
          data-testid="high-risk-alert"
        >
          <ShieldAlert className="mt-0.5 shrink-0 text-warn" size={18} aria-hidden />
          <p className="text-sm text-ink/90">
            <strong className="text-ink">High-risk use case.</strong> Nothing on this page has been reviewed
            by a domain specialist or run in production. Treat it as a design to review, not as an approved
            implementation, until levels 5 to 7 below are met in your own organisation.
          </p>
        </aside>
      )}

      <ol className="m-0 list-none space-y-3 p-0">
        {scorecard.items.map((item) => (
          <li
            key={item.id}
            className="card space-y-2 p-3 text-sm"
            data-testid={`maturity-${item.id}`}
            data-state={item.state}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-ink">
                <span className="font-mono text-xs text-dim">{item.level}. </span>
                {item.label}
              </span>
              <MaturityStateBadge state={item.state} />
            </div>
            <p className="text-xs text-mute">{item.meaning}</p>
            <p className="text-ink/90">
              <span className="font-mono text-[11px] uppercase text-dim">Evidence </span>
              {item.evidence}
            </p>
            {item.coverage && (
              <p className="text-xs text-mute">
                <FileCheck2 size={11} className="mr-1 inline text-dim" aria-hidden />
                <span className="font-mono text-[11px] uppercase text-dim">Coverage </span>
                {item.coverage}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded bg-raised/40 px-2.5 py-1.5 font-mono text-[11px] text-mute">
              <span className="flex items-center gap-1">
                <UserCheck size={11} className="text-dim" aria-hidden /> Reviewer: {item.reviewer}
              </span>
              <span>Date: {item.date ?? 'none'}</span>
              {item.command && (
                <span className="flex items-center gap-1">
                  <Terminal size={11} className="text-dim" aria-hidden />
                  <code>{item.command}</code>
                </span>
              )}
              {item.log && (
                <a href={withBase(item.log)} className="flex items-center gap-1 text-mute hover:text-ink">
                  <FileText size={11} aria-hidden />{' '}
                  {item.log.endsWith('.txt') ? 'Test log' : 'Release report'}
                </a>
              )}
            </div>
            {item.outstanding.length > 0 && (
              <div className="text-xs">
                <p className="font-mono text-[11px] uppercase text-dim">Outstanding</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-mute">
                  {item.outstanding.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Feasibility warnings with the blueprint each affects and what to do about it. Used on a blueprint and in the release report. */
export function FeasibilityWarningsPanel({
  warnings,
  linkBlueprints = false,
}: {
  warnings: FeasibilityWarning[];
  linkBlueprints?: boolean;
}) {
  return (
    <div className="space-y-3" data-testid="feasibility-warnings-panel">
      {warnings.map((w) => (
        <article
          key={`${w.slug}-${w.check}`}
          className="card space-y-2 border-warn/40 p-4 text-sm"
          data-testid="feasibility-warning"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            {linkBlueprints ? (
              <a href={withBase(`/${w.slug}#validation`)} className="font-medium text-ink">
                {w.title}
              </a>
            ) : (
              <span className="font-medium text-ink">{w.title}</span>
            )}
            <span className="rounded bg-warn/15 px-2 py-0.5 font-mono text-[11px] text-warn">{w.check}</span>
          </div>
          <p className="text-ink/90">
            <span className="font-mono text-[11px] uppercase text-dim">Finding </span>
            {w.detail}
          </p>
          <p className="text-ink/90">
            <span className="font-mono text-[11px] uppercase text-dim">Recommended remediation </span>
            {w.remediation}
          </p>
        </article>
      ))}
    </div>
  );
}
