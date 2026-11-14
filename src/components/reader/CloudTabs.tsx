'use client';

import * as Tabs from '@radix-ui/react-tabs';
import { useCallback, useSyncExternalStore } from 'react';
import {
  CAPS,
  CLOUDS,
  CLOUD_IDS,
  cloudView,
  type CloudId,
  type ViewId,
  type ViewInput,
} from '../../content/cloud-views';
import { MermaidDiagram } from '../Mermaid';

const KEY = 'brainsiphon.cloud-view';
const EVENT = 'brainsiphon:cloud-view';
const VIEWS: ViewId[] = ['neutral', ...CLOUD_IDS];

/** The platform a reader chose, shared by every diagram on the page and remembered in this browser only. */
function useViewPref(): [ViewId, (v: ViewId) => void] {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener(EVENT, cb);
    window.addEventListener('storage', cb);
    return () => {
      window.removeEventListener(EVENT, cb);
      window.removeEventListener('storage', cb);
    };
  }, []);
  const read = (): ViewId => {
    try {
      const v = localStorage.getItem(KEY) as ViewId | null;
      return v && VIEWS.includes(v) ? v : 'neutral';
    } catch {
      return 'neutral';
    }
  };
  const value = useSyncExternalStore(subscribe, read, () => 'neutral' as ViewId);
  const set = useCallback((v: ViewId) => {
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* storage blocked: the tab still changes for this render through the event below */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [value, set];
}

export type DiagramKind = 'hld' | 'sequence' | 'c4' | 'agent-architecture' | 'agent-sequence';

const PICK = (v: ReturnType<typeof cloudView>, kind: DiagramKind): string | null =>
  kind === 'hld'
    ? v.hld
    : kind === 'sequence'
      ? v.sequence
      : kind === 'c4'
        ? v.c4Container
        : kind === 'agent-architecture'
          ? v.agentArchitecture
          : v.agentSequence;

/**
 * One diagram, five views: the blueprint's own cloud-neutral diagram, then the same design on AWS, Azure, GCP and OpenStack. The
 * structure and the edges are the blueprint's; only the infrastructure nodes gain the service that fills the role. The first diagram
 * on a page (`details`) also shows the service map, how the services connect for this use case, and what changes on that platform.
 */
export function CloudDiagramTabs({
  kind,
  label,
  code,
  input,
  details = false,
}: {
  kind: DiagramKind;
  label: string;
  code: string;
  input: ViewInput;
  details?: boolean;
}) {
  const [view, setView] = useViewPref();
  return (
    <div data-testid={`cloud-tabs-${kind}`}>
      <Tabs.Root value={view} onValueChange={(v) => setView(v as ViewId)}>
        <Tabs.List
          aria-label={`${label}: choose a platform`}
          className="mb-2 flex flex-wrap items-center gap-1 rounded-lg border border-line bg-raised/40 p-1"
        >
          {VIEWS.map((v) => (
            <Tabs.Trigger
              key={v}
              value={v}
              data-testid={`cloud-tab-${kind}-${v}`}
              className="rounded-md px-3 py-1.5 font-mono text-xs text-mute transition hover:text-ink data-[state=active]:bg-signal data-[state=active]:font-semibold data-[state=active]:text-white"
            >
              {v === 'neutral' ? 'Cloud-neutral' : CLOUDS[v].label}
            </Tabs.Trigger>
          ))}
          <span className="ml-auto hidden px-2 text-[11px] text-dim sm:block">
            same design, different platform
          </span>
        </Tabs.List>
        <Tabs.Content value="neutral" className="outline-none">
          <MermaidDiagram code={code} label={label} />
        </Tabs.Content>
        {CLOUD_IDS.map((c) => (
          <Tabs.Content key={c} value={c} className="outline-none">
            <CloudPanel kind={kind} cloud={c} label={label} input={input} details={details} />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  );
}

function CloudPanel({
  kind,
  cloud,
  label,
  input,
  details,
}: {
  kind: DiagramKind;
  cloud: CloudId;
  label: string;
  input: ViewInput;
  details: boolean;
}) {
  const v = cloudView(input, cloud);
  const code = PICK(v, kind);
  if (!code) return null;
  return (
    <div className="space-y-4" data-testid={`cloud-panel-${kind}-${cloud}`}>
      <MermaidDiagram code={code} label={`${label} · ${CLOUDS[cloud].blurb}`} />
      <p className="text-xs text-mute">
        Lines starting with ▸ are the {CLOUDS[cloud].label} services that fill each role. The structure and
        arrows are the blueprint&apos;s own.
      </p>
      {details && (
        <>
          <div className="card p-4" data-testid={`cloud-wiring-${cloud}`}>
            <p className="font-mono text-[11px] uppercase tracking-wider text-signal">
              How the {CLOUDS[cloud].label} services connect for this use case
            </p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-ink/90">
              {v.wiring.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ol>
          </div>
          {v.notes.length > 0 && (
            <div className="card border-signal-line p-4">
              <p className="font-mono text-[11px] uppercase tracking-wider text-signal">
                What changes on {CLOUDS[cloud].label} for this blueprint
              </p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-ink/90">
                {v.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="bs-table w-full text-xs" data-testid={`cloud-services-${cloud}`}>
              <thead>
                <tr>
                  <th>Building block</th>
                  <th>{CLOUDS[cloud].label} service</th>
                  {cloud === 'openstack' && <th>Who runs it</th>}
                </tr>
              </thead>
              <tbody>
                {v.services.map((s) => (
                  <tr key={s.cap}>
                    <td className="align-top font-medium text-ink">{CAPS[s.cap].label}</td>
                    <td className="align-top">{s.service}</td>
                    {cloud === 'openstack' && (
                      <td className="align-top">
                        {s.selfRun ? 'You deploy and operate it' : 'OpenStack service'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-mute">
            Service names are the common option for each role, not a recommendation or a price comparison.
            Catalogues change: check the vendor&apos;s current documentation before you commit.
          </p>
        </>
      )}
    </div>
  );
}
