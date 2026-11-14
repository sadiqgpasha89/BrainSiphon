'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { DEPLOY_MODES, fill, type DeployModeId } from '../../content/fde/deploy-modes';
import { download } from '../../lib/fde/storage';
import { Field, inputCls, List, Pre } from './ui';

const VARS: [string, string][] = [
  ['env', 'prod'],
  ['release', 'ai-solution'],
  ['ns', 'ai-solution-prod'],
  ['service', 'scoring'],
  ['endpoint', 'scoring.example.internal'],
  ['registry', 'registry.example.internal'],
  ['source_registry', 'ghcr.io/brainsiphon'],
  ['image', 'scoring'],
  ['tag', '1.0.0'],
  ['digest', 'sha256:<digest>'],
  ['cluster', 'customer-cluster'],
  ['region', 'eu-west-1'],
  ['project', 'customer-project'],
  ['resource_group', 'customer-rg'],
];

export function DeployTab() {
  const [mode, setMode] = useState<DeployModeId>('customer-kubernetes');
  const [vars, setVars] = useState<Record<string, string>>(() => Object.fromEntries(VARS));
  const m = DEPLOY_MODES.find((x) => x.id === mode)!;
  const f = (xs: string[]) => xs.map((x) => fill(x, vars)).join('\n');
  const script = [
    '#!/usr/bin/env bash',
    `# ${m.name}: generated from the BrainSiphon FDE hub. Review every line; run each stage on its own.`,
    'set -euo pipefail',
    '',
    '## 1. Validate before deploying',
    f(m.validateBeforeDeploy),
    '',
    '## 2. Deploy',
    f(m.deploy),
    '',
    '## 3. Verify',
    f(m.verify),
    '',
    '## 4. Roll back (only if verification fails)',
    ...m.rollback.map((x) => `# ${fill(x, vars)}`),
    '',
    '## 5. Clean up (decommissioning only)',
    ...m.cleanup.map((x) => `# ${fill(x, vars)}`),
    '',
  ].join('\n');
  return (
    <section className="space-y-6" aria-labelledby="deploy-h">
      <div>
        <h2 id="deploy-h" className="text-xl font-semibold text-ink">
          Deployment modes
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-mute">
          Eight ways the solution reaches a customer. Each states what must run inside their boundary, how
          images and packages arrive (private registries, internal mirrors, offline install), what to validate
          before applying, and exact deploy, verify, rollback and cleanup commands with your values filled in.
        </p>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Deployment modes">
        {DEPLOY_MODES.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === mode}
            type="button"
            onClick={() => setMode(x.id)}
            className={`btn ${x.id === mode ? '!border-signal/50 !bg-signal-soft !text-signal' : ''}`}
          >
            {x.name}
          </button>
        ))}
      </div>
      <p className="max-w-3xl text-sm text-ink/90" data-prose>
        {m.summary}
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="font-semibold text-ink">Runs inside the customer environment</h3>
          <List items={m.inside} />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-ink">May run outside it</h3>
          <List items={m.outside} />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-ink">Prerequisites</h3>
          <List items={m.prerequisites} />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-ink">Registries, packages and offline install</h3>
          <List
            items={[
              `Registry: ${m.registries.privateRegistry}`,
              `Packages: ${m.registries.packages}`,
              `Artifacts: ${m.registries.artifacts}`,
            ]}
          />
        </div>
      </div>
      <details className="card p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink">
          Customer values used in the commands
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {VARS.map(([k]) => (
            <Field key={k} label={k}>
              <input
                className={inputCls}
                value={vars[k] ?? ''}
                onChange={(e) => setVars({ ...vars, [k]: e.target.value })}
              />
            </Field>
          ))}
        </div>
      </details>
      <div className="space-y-2">
        <h3 className="font-semibold text-ink">Offline and mirrored install</h3>
        <Pre text={f(m.registries.offline)} />
      </div>
      {(
        [
          ['Validate before deploying', m.validateBeforeDeploy],
          ['Deploy', m.deploy],
          ['Verify', m.verify],
          ['Roll back', m.rollback],
          ['Clean up', m.cleanup],
        ] as [string, string[]][]
      ).map(([t, xs]) => (
        <div key={t} className="space-y-2">
          <h3 className="font-semibold text-ink">{t}</h3>
          <Pre text={f(xs)} />
        </div>
      ))}
      <div className="space-y-2">
        <h3 className="font-semibold text-ink">Risks to watch</h3>
        <List items={m.risks} />
      </div>
      <button
        type="button"
        className="btn"
        onClick={() => download(`deploy-${m.id}.sh`, script, 'text/x-shellscript')}
      >
        <Download size={14} aria-hidden /> Download as a reviewed script
      </button>
    </section>
  );
}
