import { CircleAlert, CircleCheck, CircleDashed } from 'lucide-react';
import { shortSha, type ReleaseManifest, type StatusRow, type StatusState } from '../../content/release';

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
