'use client';

import { Download } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DEPLOY_MODES, type DeployModeId } from '../../content/fde/deploy-modes';
import type { ImplementationPlaybook } from '../../schemas/implementation.schema';
import { download, fetchPlaybook, loadWorkspaces, saveWorkspaces, setActive } from '../../lib/fde/storage';
import { buildPlan, newWorkspace, planMarkdown } from '../../lib/fde/workspace';
import { Field, inputCls, List, Table } from './ui';

export interface UseCaseOption {
  slug: string;
  title: string;
  domain: string;
}

export function PlanTab({ useCases, onCreated }: { useCases: UseCaseOption[]; onCreated: () => void }) {
  const [filter, setFilter] = useState('');
  const [slug, setSlug] = useState(useCases[0]?.slug ?? '');
  const [customer, setCustomer] = useState('');
  const [mode, setMode] = useState<DeployModeId>('customer-kubernetes');
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [scale, setScale] = useState(1);
  const [pb, setPb] = useState<ImplementationPlaybook | null>(null);
  const [err, setErr] = useState('');
  const options = useMemo(
    () =>
      useCases
        .filter((u) => `${u.title} ${u.slug}`.toLowerCase().includes(filter.toLowerCase()))
        .slice(0, 60),
    [useCases, filter],
  );

  useEffect(() => {
    if (!slug) return;
    let live = true;
    setPb(null);
    setErr('');
    fetchPlaybook(slug)
      .then((p) => live && setPb(p))
      .catch((e: unknown) => live && setErr(e instanceof Error ? e.message : 'Could not load the playbook.'));
    return () => {
      live = false;
    };
  }, [slug]);
  const plan = useMemo(
    () =>
      pb ? buildPlan(pb, { customer: customer || 'the customer', mode, startDate: start, scale }) : null,
    [pb, customer, mode, start, scale],
  );

  const create = () => {
    if (!pb || !customer.trim()) return;
    const ws = newWorkspace({
      id: `ws-${Date.now().toString(36)}`,
      customer: customer.trim(),
      playbook: pb,
      mode,
      startDate: start,
      now: new Date().toISOString(),
      by: 'me',
    });
    if (!saveWorkspaces([...loadWorkspaces(), ws]))
      return setErr(
        'This browser blocked storage, so the workspace could not be saved. Download the plan instead.',
      );
    setActive(ws.id);
    onCreated();
  };

  return (
    <section className="space-y-6" aria-labelledby="plan-h">
      <div>
        <h2 id="plan-h" className="text-xl font-semibold text-ink">
          Implementation plan generator
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-mute">
          Pick a blueprint and get a dated, stage-by-stage plan through the twelve FDE stages (customer
          discovery to day-two support): prerequisites, activities, commands, deliverables, what the customer
          must provide, exit criteria and the use case&apos;s own tasks. Dates are estimates for a small first
          release; scale them to your engagement.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Find a use case" className="md:col-span-2">
          <input
            className={inputCls}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="fraud, sepsis, forecasting…"
          />
        </Field>
        <Field label={`Blueprint (${options.length} shown)`} className="md:col-span-2">
          <select className={inputCls} value={slug} onChange={(e) => setSlug(e.target.value)} size={1}>
            {options.map((u) => (
              <option key={u.slug} value={u.slug}>
                {u.title} · {u.domain}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Customer">
          <input
            className={inputCls}
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Customer or project name"
          />
        </Field>
        <Field label="Deployment mode">
          <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value as DeployModeId)}>
            {DEPLOY_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Start date">
          <input type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label={`Pace: ${scale === 1 ? 'default' : `${scale}× durations`}`}>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.25}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="mt-3 w-full"
          />
        </Field>
      </div>
      {err && (
        <p role="alert" className="text-sm text-warn">
          {err}
        </p>
      )}
      {!pb && !err && (
        <p className="text-sm text-mute" aria-live="polite">
          Loading the playbook…
        </p>
      )}
      {pb && plan && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">{plan.stages.length} stages</span>
            <span className="chip">
              {plan.startDate} to {plan.endDate}
            </span>
            <span className="chip">{pb.integrations.length} integration hops</span>
            <span className="chip">{pb.checklist.length} tasks</span>
            <span
              className={`chip ${pb.provenance.kind === 'authored' ? '!border-signal/50 !text-signal' : ''}`}
            >
              {pb.provenance.kind === 'authored' ? 'authored pack' : 'derived from the blueprint'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn"
              onClick={() => download(`${slug.replace('/', '-')}-implementation-plan.md`, planMarkdown(plan))}
            >
              <Download size={14} aria-hidden /> Download the plan (.md)
            </button>
            <button
              type="button"
              className="btn !border-signal/50 !bg-signal-soft !text-signal"
              disabled={!customer.trim()}
              onClick={create}
              title={customer.trim() ? '' : 'Enter a customer name first'}
            >
              Create a workspace from this plan
            </button>
          </div>
          <Table
            head={['#', 'Stage', 'Start', 'End', 'Days', 'Tasks', 'Customer provides']}
            rows={plan.stages.map((s) => [
              s.n,
              s.name,
              s.start,
              s.end,
              s.days,
              s.tasks.length + s.maturityTasks.length,
              s.customerDependencies.length + s.customerNeeds.length,
            ])}
          />
          <div className="space-y-3">
            {plan.stages.map((s) => (
              <details key={s.id} className="card p-4">
                <summary className="cursor-pointer text-sm font-semibold text-ink">
                  {s.n}. {s.name}{' '}
                  <span className="font-normal text-dim">
                    {s.start} to {s.end}
                  </span>
                </summary>
                <div className="mt-4 grid gap-5 lg:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-dim">
                      Before it starts
                    </h4>
                    <List items={s.prerequisites} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-dim">Activities</h4>
                    <List items={s.activities} />
                  </div>
                  {s.commands.length > 0 && (
                    <div className="space-y-2 lg:col-span-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-dim">Commands</h4>
                      <pre className="bg-canvas overflow-x-auto rounded-md border border-line p-3 font-mono text-xs text-ink">
                        {s.commands.join('\n')}
                      </pre>
                    </div>
                  )}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-dim">Deliverables</h4>
                    <List items={s.deliverables} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-dim">
                      Needed from the customer
                    </h4>
                    <List
                      items={[
                        ...s.customerDependencies,
                        ...s.customerNeeds.map((c) => `${c.title} (${c.owner})`),
                      ]}
                    />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-dim">Exit criteria</h4>
                    <List items={s.exitCriteria} />
                  </div>
                  {(s.tasks.length > 0 || s.maturityTasks.length > 0) && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-dim">
                        This use case
                      </h4>
                      <List
                        items={[
                          ...s.maturityTasks.map((t) => `${t.title}: ${t.detail}`),
                          ...s.tasks.map((t) => t.item),
                        ]}
                      />
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
