'use client';

import { Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  download,
  getActive,
  loadWorkspaces,
  parseWorkspaceFile,
  saveWorkspaces,
  setActive,
} from '../../lib/fde/storage';
import type { Workspace } from '../../lib/fde/workspace';
import { Field, inputCls } from './ui';
import { WorkspaceView } from './WorkspaceView';

const ACTOR = 'bs-fde-actor-v1';

export function WorkspacesTab({ goPlan }: { goPlan: () => void }) {
  const [list, setList] = useState<Workspace[] | null>(null);
  const [active, setActiveId] = useState<string | null>(null);
  const [actor, setActor] = useState('me');
  const [msg, setMsg] = useState('');
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const l = loadWorkspaces();
    setList(l);
    const a = getActive();
    setActiveId(a && l.some((w) => w.id === a) ? a : (l[0]?.id ?? null));
    try {
      setActor(localStorage.getItem(ACTOR) ?? 'me');
    } catch {
      /* storage blocked */
    }
  }, []);

  const persist = (next: Workspace[]) => {
    setList(next);
    if (!saveWorkspaces(next))
      setMsg(
        'This browser would not store the workspace. Export it from the Export tab before leaving the page.',
      );
  };
  const update = (w: Workspace) => persist((list ?? []).map((x) => (x.id === w.id ? w : x)));
  const choose = (id: string | null) => {
    setActiveId(id);
    setActive(id);
  };
  const current = list?.find((w) => w.id === active) ?? null;

  const onImport = async (f: File | undefined) => {
    if (!f) return;
    const r = parseWorkspaceFile(await f.text());
    if (!r.ok) return setMsg(r.reason);
    const exists = list?.some((w) => w.id === r.workspace.id);
    if (exists && !window.confirm('A workspace with this id exists. Replace it with the imported one?'))
      return;
    persist([...(list ?? []).filter((w) => w.id !== r.workspace.id), r.workspace]);
    choose(r.workspace.id);
    setMsg(`Imported ${r.workspace.customer} (${r.workspace.history.length} history entries verified).`);
  };

  if (list === null) return <p className="text-sm text-mute">Loading workspaces…</p>;
  return (
    <section className="space-y-6" aria-labelledby="ws-h">
      <div>
        <h2 id="ws-h" className="text-xl font-semibold text-ink">
          Customer workspaces
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-mute">
          One workspace per customer engagement: the blueprint it started from, configuration, decisions,
          integration and deployment status, test results, issues, blockers, evidence and a tamper-evident
          change history. It lives in this browser; export it to share or back it up, and export open work to
          GitHub Issues, Jira or Azure DevOps.
        </p>
      </div>
      {msg && (
        <p role="status" className="rounded-md border border-line p-2 text-xs text-mute">
          {msg}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Acting as (recorded in the history)">
          <input
            className={`${inputCls} w-48`}
            value={actor}
            onChange={(e) => {
              setActor(e.target.value);
              try {
                localStorage.setItem(ACTOR, e.target.value);
              } catch {
                /* ignore */
              }
            }}
          />
        </Field>
        <button type="button" className="btn" onClick={goPlan}>
          New workspace from a blueprint
        </button>
        <button type="button" className="btn" onClick={() => file.current?.click()}>
          <Upload size={14} aria-hidden /> Import
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            void onImport(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {list.length === 0 ? (
        <div className="card p-6 text-sm text-mute">
          No workspaces yet. Open any use case, choose{' '}
          <strong className="text-ink">Add to an FDE workspace</strong> in its Customer implementation
          playbook, or start one from the Plan tab.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
          <ul className="space-y-2" aria-label="Workspaces">
            {list.map((w) => (
              <li
                key={w.id}
                className={`card flex items-start gap-2 p-3 ${w.id === active ? '!border-signal' : ''}`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => choose(w.id)}
                  aria-current={w.id === active}
                >
                  <span className="block truncate text-sm font-semibold text-ink">{w.customer}</span>
                  <span className="block truncate text-xs text-mute">{w.title}</span>
                  <span className="text-[11px] text-dim">updated {w.updatedAt.slice(0, 10)}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${w.customer}`}
                  className="text-dim hover:text-warn"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete the workspace for ${w.customer}? Export it first if you need it.`,
                      )
                    ) {
                      persist(list.filter((x) => x.id !== w.id));
                      if (active === w.id) choose(null);
                    }
                  }}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="btn w-full"
                onClick={() =>
                  current &&
                  download(
                    `${current.id}.workspace.json`,
                    JSON.stringify(current, null, 2),
                    'application/json',
                  )
                }
                disabled={!current}
              >
                Back up the selected workspace
              </button>
            </li>
          </ul>
          <div>
            {current ? (
              <WorkspaceView ws={current} onChange={update} actor={actor} />
            ) : (
              <p className="text-sm text-mute">Select a workspace.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
