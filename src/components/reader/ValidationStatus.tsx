import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  FileCheck2,
  Layers,
  ShieldAlert,
  Terminal,
  UserCheck,
} from 'lucide-react';
import {
  FEASIBILITY_WARNINGS,
  shortSha,
  type FeasibilityWarning,
  type MaturityItem,
  type MaturityScorecard,
  type ReleaseManifest,
  type StatusRow,
  type StatusState,
} from '../../content/release';

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
export function ValidationStatusStrip({ statuses }: { statuses: StatusRow[] }) {
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
      <li className="m-0 p-0">
        <a
          href="#maturity-scorecard"
          className="chip !border-signal/40 !bg-signal/10 !text-signal no-underline"
          title="Open complete 7-level maturity scorecard with test evidence and open issues"
        >
          <Layers size={12} aria-hidden /> Maturity Scorecard
        </a>
      </li>
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

/** Prominent high-risk regulated workload alert banner */
export function HighRiskNotice({ notice }: { notice: string }) {
  return (
    <aside
      className="my-6 rounded-lg border border-warn/50 bg-warn/10 p-4 text-ink"
      data-testid="high-risk-alert"
      aria-labelledby="high-risk-title"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 shrink-0 text-warn" size={20} aria-hidden />
        <div className="space-y-1">
          <h4 id="high-risk-title" className="text-sm font-semibold uppercase tracking-wider text-warn">
            High-Risk Regulated AI/ML Workload
          </h4>
          <p className="text-xs leading-relaxed text-ink/90">{notice}</p>
          <p className="font-mono text-[11px] text-mute">
            Mandatory Gates: Independent clinical / financial review · RPO=0 Failover Rehearsal · Human
            Oversight Protocol
          </p>
        </div>
      </div>
    </aside>
  );
}

/** 7-Level Implementation Maturity Scorecard with actual evidence */
export function MaturityScorecardPanel({ scorecard }: { scorecard: MaturityScorecard }) {
  const statusBadge = (s: MaturityItem['status']) => {
    switch (s) {
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-signal/15 px-2 py-0.5 font-mono text-[11px] font-medium text-signal">
            <CheckCircle2 size={11} aria-hidden /> Passed
          </span>
        );
      case 'conditional':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-warn/15 px-2 py-0.5 font-mono text-[11px] font-medium text-warn">
            <AlertTriangle size={11} aria-hidden /> Conditional
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-noise/15 px-2 py-0.5 font-mono text-[11px] font-medium text-noise">
            <CircleAlert size={11} aria-hidden /> Failed
          </span>
        );
      case 'not-applicable':
        return (
          <span className="bg-surface inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] font-medium text-dim">
            N/A
          </span>
        );
      default:
        return (
          <span className="bg-surface inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] font-medium text-mute">
            <CircleDashed size={11} aria-hidden /> Pending
          </span>
        );
    }
  };

  return (
    <section id="maturity-scorecard" className="scroll-mt-24 space-y-4" data-testid="maturity-scorecard">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-signal">
            Verification &amp; Readiness Scorecard
          </span>
          <h3 className="text-lg font-semibold text-ink">
            7-Level Implementation Maturity: {scorecard.score}/{scorecard.maxScore} Passed
          </h3>
        </div>
        <div className="bg-surface rounded-md border border-line px-3 py-1.5 text-right">
          <p className="font-mono text-[10px] uppercase text-dim">Current Classification</p>
          <p className="font-mono text-xs font-semibold text-signal">{scorecard.readinessLabel}</p>
        </div>
      </div>

      {scorecard.highRiskNotice && <HighRiskNotice notice={scorecard.highRiskNotice} />}

      <p className="text-xs text-mute" data-prose>
        BrainSiphon does not allow a schema validation pass to be interpreted as proof of implementation
        readiness. Every level below carries its own evidence, executable verification commands, reviewer
        profiles, and outstanding deployment blockers.
      </p>

      <ol className="space-y-3">
        {scorecard.items.map((item) => (
          <li
            key={item.id}
            className="card space-y-2 p-3 text-sm transition hover:border-signal/40"
            data-testid={`maturity-${item.id}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-ink">
                <span className="font-mono text-xs text-dim">L{item.order}. </span>
                {item.label}
              </span>
              {statusBadge(item.status)}
            </div>

            <p className="text-xs text-mute">{item.meaning}</p>
            <p className="text-xs text-ink/90">
              <strong className="text-ink">Evidence: </strong>
              {item.evidence}
            </p>

            {(item.testCommand || item.testCoverage || item.reviewer || item.reviewDate) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded bg-raised/40 px-2.5 py-1.5 font-mono text-[11px] text-mute">
                {item.testCommand && (
                  <span className="flex items-center gap-1">
                    <Terminal size={11} className="text-signal" />
                    <code>{item.testCommand}</code>
                  </span>
                )}
                {item.testCoverage && (
                  <span className="flex items-center gap-1">
                    <FileCheck2 size={11} className="text-signal" /> {item.testCoverage}
                  </span>
                )}
                {item.reviewer && (
                  <span className="flex items-center gap-1">
                    <UserCheck size={11} className="text-dim" /> {item.reviewer}
                  </span>
                )}
                {item.reviewDate && <span className="text-dim">Reviewed: {item.reviewDate}</span>}
              </div>
            )}

            {item.outstandingIssues && item.outstandingIssues.length > 0 && (
              <div className="bg-surface/50 rounded border border-line/60 p-2.5 text-xs">
                <p className="font-mono text-[11px] font-medium uppercase text-dim">
                  Outstanding Work Before Production Sign-Off:
                </p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-mute">
                  {item.outstandingIssues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
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

/** Feasibility warnings across the platform with affected blueprints and recommended remediation */
export function FeasibilityWarningsPanel({ warnings }: { warnings: FeasibilityWarning[] }) {
  const allWarnings = warnings.length > 0 ? warnings : FEASIBILITY_WARNINGS;

  return (
    <section
      id="feasibility-warnings"
      className="scroll-mt-24 space-y-4"
      data-testid="feasibility-warnings-panel"
    >
      <div className="border-b border-line pb-3">
        <span className="font-mono text-xs uppercase tracking-wider text-warn">
          Architecture Feasibility Warning Registry
        </span>
        <h3 className="text-lg font-semibold text-ink">
          {allWarnings.length} Platform Architecture Warnings &amp; Recommended Remediation
        </h3>
        <p className="mt-1 text-xs text-mute">
          The automated architecture feasibility gate validates 4,781 structural constraints. Seven blueprints
          carry deliberate warnings where hardware sizing, serving cascades, or node batching require platform
          adaptation before production rollout.
        </p>
      </div>

      <div className="space-y-3">
        {allWarnings.map((w) => (
          <div key={w.slug} className="card space-y-2 border-warn/40 bg-warn/5 p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono font-medium text-warn">{w.blueprintTitle}</span>
              <span className="rounded bg-warn/20 px-2 py-0.5 font-mono text-[11px] text-warn">
                {w.category}
              </span>
            </div>
            <p className="text-ink/90">
              <strong className="text-ink">Constraint Diagnostic: </strong>
              {w.detail}
            </p>
            <div className="bg-surface rounded border border-line p-2.5">
              <p className="font-mono text-[11px] font-semibold uppercase text-signal">
                Recommended Remediation:
              </p>
              <p className="mt-1 leading-relaxed text-mute">{w.remediation}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
