'use client';

import { useMemo, useState } from 'react';
import { TROUBLESHOOTING, rankScenarios } from '../../content/fde/troubleshooting';
import { fill } from '../../content/fde/deploy-modes';
import { Field, inputCls, List, Pre } from './ui';

const FLAGS = ['online', 'streaming', 'batch', 'gpu', 'llm', 'tenant', 'partners'] as const;
const AREAS = [
  'all',
  'identity',
  'network',
  'data',
  'model',
  'platform',
  'security',
  'configuration',
] as const;

export function TroubleTab() {
  const [q, setQ] = useState('');
  const [area, setArea] = useState<(typeof AREAS)[number]>('all');
  const [flags, setFlags] = useState<Record<(typeof FLAGS)[number], boolean>>({
    online: false,
    streaming: false,
    batch: false,
    gpu: false,
    llm: false,
    tenant: false,
    partners: false,
  });
  const [vars, setVars] = useState({
    ns: 'ai-solution-prod',
    service: 'scoring',
    issuer: 'https://idp.example.com',
  });
  const ranked = useMemo(
    () => (Object.values(flags).some(Boolean) ? rankScenarios(flags) : TROUBLESHOOTING.map((t) => t.id)),
    [flags],
  );
  const rows = ranked
    .map((id) => TROUBLESHOOTING.find((t) => t.id === id)!)
    .filter(
      (t) => (area === 'all' || t.area === area) && JSON.stringify(t).toLowerCase().includes(q.toLowerCase()),
    );
  const f = (xs: string[]) => xs.map((x) => fill(x, vars)).join('\n');
  return (
    <section className="space-y-6" aria-labelledby="trouble-h">
      <div>
        <h2 id="trouble-h" className="text-xl font-semibold text-ink">
          Troubleshooting knowledge base
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-mute">
          Fifteen scenarios that recur in customer environments. Each has symptoms, diagnostic commands,
          likely causes, remediation and a verification command. Tick what describes your use case to put the
          most relevant scenarios first.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Search">
          <input
            className={inputCls}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="401, lag, certificate, OOM…"
          />
        </Field>
        <Field label="Area">
          <select
            className={inputCls}
            value={area}
            onChange={(e) => setArea(e.target.value as (typeof AREAS)[number])}
          >
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Field>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-1 text-xs text-mute">
          {FLAGS.map((k) => (
            <label key={k} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={flags[k]}
                onChange={(e) => setFlags({ ...flags, [k]: e.target.checked })}
              />
              {k}
            </label>
          ))}
        </div>
      </div>
      <details className="card p-3">
        <summary className="cursor-pointer text-xs text-mute">Values filled into the commands</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(Object.keys(vars) as (keyof typeof vars)[]).map((k) => (
            <Field key={k} label={k}>
              <input
                className={inputCls}
                value={vars[k]}
                onChange={(e) => setVars({ ...vars, [k]: e.target.value })}
              />
            </Field>
          ))}
        </div>
      </details>
      <p className="text-xs text-dim" aria-live="polite">
        {rows.length} of {TROUBLESHOOTING.length} scenarios
      </p>
      <div className="space-y-3">
        {rows.map((t) => (
          <details key={t.id} id={t.id} className="card scroll-mt-28 p-4">
            <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-semibold text-ink">
              <span>{t.title}</span>
              <span className="chip">{t.area}</span>
            </summary>
            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-dim">Symptoms</h4>
                <List items={t.symptoms} />
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-dim">Likely causes</h4>
                <List items={t.causes} />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-dim">Diagnose</h4>
                <Pre text={f(t.diagnose)} />
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-dim">Remediation</h4>
                <List items={t.fix} />
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-dim">Verify</h4>
                <Pre text={f(t.verify)} />
              </div>
              <p className="text-xs text-mute lg:col-span-2">
                If it is not a customer-side problem, hand over to:{' '}
                <strong className="text-ink">{t.escalateTo}</strong>
              </p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
