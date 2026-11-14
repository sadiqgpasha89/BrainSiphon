'use client';

import { FolderPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DEPLOY_MODES, type DeployModeId } from '../../content/fde/deploy-modes';
import { fetchPlaybook, loadWorkspaces, saveWorkspaces, setActive } from '../../lib/fde/storage';
import { newWorkspace } from '../../lib/fde/workspace';

/** Start a customer workspace from this blueprint's implementation playbook. It is stored in this browser only. */
export function AddToWorkspace({ slug }: { slug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState('');
  const [mode, setMode] = useState<DeployModeId>('customer-kubernetes');
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [state, setState] = useState<'idle' | 'busy' | { error: string }>('idle');

  const create = async () => {
    setState('busy');
    try {
      const playbook = await fetchPlaybook(slug);
      const now = new Date().toISOString();
      const ws = newWorkspace({
        id: `ws-${Date.now().toString(36)}`,
        customer: customer.trim(),
        playbook,
        mode,
        startDate: start,
        now,
        by: 'me',
      });
      if (!saveWorkspaces([...loadWorkspaces(), ws]))
        throw new Error(
          'This browser blocked storage, so the workspace could not be saved. Export is still available from the FDE hub.',
        );
      setActive(ws.id);
      router.push('/fde/#workspaces');
    } catch (e) {
      setState({ error: e instanceof Error ? e.message : 'Could not create the workspace.' });
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-testid="add-to-workspace"
      >
        <FolderPlus size={14} aria-hidden /> Add to an FDE workspace
      </button>
      {open && (
        <form
          className="card grid max-w-3xl gap-3 p-4 sm:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (customer.trim()) void create();
          }}
        >
          <label className="text-xs text-mute sm:col-span-2">
            Customer
            <input
              className="bg-canvas mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm text-ink"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Customer or project name"
              required
            />
          </label>
          <label className="text-xs text-mute">
            Deployment mode
            <select
              className="bg-canvas mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm text-ink"
              value={mode}
              onChange={(e) => setMode(e.target.value as DeployModeId)}
            >
              {DEPLOY_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-mute">
            Start date
            <input
              type="date"
              className="bg-canvas mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm text-ink"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </label>
          <div className="flex items-center gap-3 sm:col-span-4">
            <button
              type="submit"
              className="btn !border-signal/50 !bg-signal-soft !text-signal"
              disabled={state === 'busy'}
            >
              {state === 'busy' ? 'Creating…' : 'Create workspace'}
            </button>
            <span className="text-xs text-dim">
              Stored in this browser only. Nothing is sent to a server.
            </span>
          </div>
          {typeof state === 'object' && (
            <p role="alert" className="text-xs text-warn sm:col-span-4">
              {state.error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
