'use client';

import { useEffect, useMemo, useState } from 'react';
import { RECOVERY_TIERS } from '../../content/deployment-profiles';
import {
  FAMILY_LABEL,
  RUNTIME_LABEL,
  generatePackage,
  packageZip,
  recommend,
  type Cloud,
  type EnvId,
  type Family,
  type PackageInput,
  type Runtime,
} from '../../lib/package-generator';

const STORE = 'brainsiphon.workspace.package.v1';
const DEFAULT: PackageInput = {
  projectName: 'My AI solution',
  family: 'realtime-decisioning',
  cloud: 'aws',
  environment: 'staging',
  tier: 'T2',
  peakRps: 100,
  platformTeam: false,
  selfHostedModel: false,
  regulated: false,
  region: 'us-east-1',
  vpcCidr: '10.20.0.0/16',
};

const field = 'w-full rounded border border-line bg-canvas px-2 py-1.5 text-xs text-ink';
const label = 'block text-[11px] font-medium text-mute';

export function PackageGenerator() {
  const [input, setInput] = useState<PackageInput>(DEFAULT);
  const [override, setOverride] = useState<Runtime | ''>('');
  const [reason, setReason] = useState('');
  const [selected, setSelected] = useState(0);
  const [saved, setSaved] = useState<'idle' | 'saved' | 'unavailable'>('idle');

  // saved configuration: browser-local only, never sent anywhere
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const v = JSON.parse(raw) as { input: PackageInput; override: Runtime | ''; reason: string };
        setInput({ ...DEFAULT, ...v.input });
        setOverride(v.override ?? '');
        setReason(v.reason ?? '');
      }
    } catch {
      /* storage blocked: the page works without it */
    }
  }, []);

  const set = <K extends keyof PackageInput>(k: K, v: PackageInput[K]) => setInput((p) => ({ ...p, [k]: v }));
  const rec = useMemo(() => recommend(input), [input]);
  const files = useMemo(
    () => generatePackage(input, override ? { runtime: override, reason } : undefined),
    [input, override, reason],
  );
  const current = files[Math.min(selected, files.length - 1)]!;

  const save = () => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ input, override, reason }));
      setSaved('saved');
    } catch {
      setSaved('unavailable');
    }
  };
  const download = (name: string, data: BlobPart, type: string) => {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };
  const slug =
    input.projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'package';

  return (
    <div className="space-y-6" data-testid="package-generator">
      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <form
          className="card space-y-3 p-4"
          onSubmit={(e) => e.preventDefault()}
          aria-label="Package configuration"
        >
          <div>
            <label className={label} htmlFor="pg-name">
              Project name
            </label>
            <input
              id="pg-name"
              className={field}
              value={input.projectName}
              onChange={(e) => set('projectName', e.target.value)}
            />
          </div>
          <div>
            <label className={label} htmlFor="pg-family">
              Solution family (reference implementation)
            </label>
            <select
              id="pg-family"
              className={field}
              value={input.family}
              onChange={(e) => set('family', e.target.value as Family)}
            >
              {Object.entries(FAMILY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="pg-cloud">
                Cloud
              </label>
              <select
                id="pg-cloud"
                className={field}
                value={input.cloud}
                onChange={(e) => set('cloud', e.target.value as Cloud)}
              >
                <option value="aws">AWS</option>
                <option value="azure">Azure</option>
                <option value="gcp">GCP</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="pg-env">
                Environment
              </label>
              <select
                id="pg-env"
                className={field}
                value={input.environment}
                onChange={(e) => set('environment', e.target.value as EnvId)}
              >
                <option value="dev">Development</option>
                <option value="staging">Staging</option>
                <option value="preprod">Pre-production</option>
                <option value="production">Production</option>
              </select>
            </div>
          </div>
          <div>
            <label className={label} htmlFor="pg-tier">
              Recovery tier (a target, not a measurement)
            </label>
            <select
              id="pg-tier"
              className={field}
              value={input.tier}
              onChange={(e) => set('tier', e.target.value as PackageInput['tier'])}
            >
              {RECOVERY_TIERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id}: {t.name} ({t.availability})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="pg-rps">
                Peak requests / second
              </label>
              <input
                id="pg-rps"
                type="number"
                min={0}
                className={field}
                value={input.peakRps}
                onChange={(e) => set('peakRps', Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <div>
              <label className={label} htmlFor="pg-region">
                Region
              </label>
              <input
                id="pg-region"
                className={field}
                value={input.region}
                onChange={(e) => set('region', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="pg-cidr">
              VPC / VNet CIDR
            </label>
            <input
              id="pg-cidr"
              className={field}
              value={input.vpcCidr}
              onChange={(e) => set('vpcCidr', e.target.value)}
            />
          </div>
          {(
            [
              ['platformTeam', 'We have a platform team that will operate Kubernetes'],
              ['selfHostedModel', 'We self-host the model (GPUs)'],
              ['regulated', 'Regulated data'],
            ] as const
          ).map(([k, text]) => (
            <label key={k} className="flex items-center gap-2 text-xs text-ink">
              <input type="checkbox" checked={input[k]} onChange={(e) => set(k, e.target.checked)} />
              {text}
            </label>
          ))}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              className="rounded border border-line px-3 py-1.5 text-xs font-medium hover:border-signal"
            >
              Save in this browser
            </button>
            <button
              type="button"
              onClick={() => {
                setInput(DEFAULT);
                setOverride('');
                setReason('');
              }}
              className="rounded border border-line px-3 py-1.5 text-xs text-mute hover:border-signal"
            >
              Reset
            </button>
          </div>
          <p className="text-[11px] text-mute" role="status">
            {saved === 'saved' &&
              'Saved. It stays in this browser only; it is not synchronised or sent anywhere.'}
            {saved === 'unavailable' && 'This browser blocked storage, so nothing was saved.'}
            {saved === 'idle' && 'Saved configurations stay in this browser only.'}
          </p>
        </form>

        <div className="space-y-4">
          <div className="card space-y-2 p-4" data-testid="pg-recommendation">
            <p className="font-mono text-[11px] uppercase tracking-wider text-signal">Recommendation</p>
            <p className="text-sm font-semibold text-ink">{rec.summary}</p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-mute">
              {rec.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="pt-1 text-[11px] font-medium text-ink">Rejected</p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-mute">
              {rec.rejected.map((r) => (
                <li key={r.option}>
                  <strong className="text-ink">{r.option}:</strong> {r.why}
                </li>
              ))}
            </ul>
            <div className="grid gap-2 pt-2 sm:grid-cols-[14rem_1fr]">
              <div>
                <label className={label} htmlFor="pg-override">
                  Override the recommendation
                </label>
                <select
                  id="pg-override"
                  className={field}
                  value={override}
                  onChange={(e) => setOverride(e.target.value as Runtime | '')}
                >
                  <option value="">Accept the recommendation</option>
                  {(Object.keys(RUNTIME_LABEL) as Runtime[]).map((r) => (
                    <option key={r} value={r}>
                      {RUNTIME_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="pg-reason">
                  Reason (recorded in the ADR)
                </label>
                <input
                  id="pg-reason"
                  className={field}
                  value={reason}
                  disabled={!override}
                  placeholder={override ? 'Why are you overriding it?' : 'Only needed for an override'}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-signal">
                Preview ({files.length} files)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="pg-download-zip"
                  className="rounded bg-signal px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  onClick={() =>
                    download(
                      `${slug}-${input.environment}-package.zip`,
                      packageZip(files) as BlobPart,
                      'application/zip',
                    )
                  }
                >
                  Download all (.zip)
                </button>
                <button
                  type="button"
                  className="rounded border border-line px-3 py-1.5 text-xs hover:border-signal"
                  onClick={() => download(current.path.split('/').pop()!, current.content, 'text/plain')}
                >
                  Download this file
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[14rem_1fr]">
              <ul className="space-y-1 text-xs" aria-label="Generated files">
                {files.map((f, i) => (
                  <li key={f.path}>
                    <button
                      type="button"
                      onClick={() => setSelected(i)}
                      className={`w-full rounded px-2 py-1 text-left font-mono ${i === selected ? 'bg-raised text-ink' : 'text-mute hover:text-ink'}`}
                    >
                      {f.path}
                      <span
                        className={`ml-1 text-[10px] ${f.status === 'static-checked' ? 'text-signal' : 'text-dim'}`}
                      >
                        {f.status === 'static-checked' ? 'static-checked' : 'unvalidated'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <pre
                className="max-h-[28rem] overflow-auto rounded border border-line bg-raised/40 p-3 font-mono text-[11px] leading-relaxed"
                data-testid="pg-preview"
              >
                {current.content}
              </pre>
            </div>
            <p className="mt-2 text-[11px] text-mute">
              “static-checked” means the same variables are covered by <code>npm run validate:infra</code>.
              “unvalidated” means a template you must read and run yourself. Nothing generated here has been
              applied to a cloud account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
