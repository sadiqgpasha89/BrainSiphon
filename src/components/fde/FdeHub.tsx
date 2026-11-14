'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdaptersTab } from './AdaptersTab';
import { DeployTab } from './DeployTab';
import { PlanTab, type UseCaseOption } from './PlanTab';
import { ToolkitTab } from './ToolkitTab';
import { TroubleTab } from './TroubleTab';
import { WorkspacesTab } from './WorkspacesTab';

const TABS = [
  ['workspaces', 'Workspaces'],
  ['plan', 'Plan'],
  ['toolkit', 'Pre-flight toolkit'],
  ['adapters', 'Adapters'],
  ['deploy', 'Deployment modes'],
  ['troubleshooting', 'Troubleshooting'],
] as const;
type Tab = (typeof TABS)[number][0];
const isTab = (v: string): v is Tab => TABS.some(([id]) => id === v);

export function FdeHub({ useCases }: { useCases: UseCaseOption[] }) {
  const [tab, setTab] = useState<Tab>('workspaces');
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1);
      if (isTab(h)) setTab(h);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const go = useCallback((t: Tab) => {
    setTab(t);
    history.replaceState(null, '', `#${t}`);
  }, []);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-line pb-4" role="tablist" aria-label="FDE hub">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            type="button"
            onClick={() => go(id)}
            className={`btn ${tab === id ? '!border-signal/50 !bg-signal-soft !text-signal' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'workspaces' && <WorkspacesTab goPlan={() => go('plan')} />}
        {tab === 'plan' && <PlanTab useCases={useCases} onCreated={() => go('workspaces')} />}
        {tab === 'toolkit' && <ToolkitTab />}
        {tab === 'adapters' && <AdaptersTab />}
        {tab === 'deploy' && <DeployTab />}
        {tab === 'troubleshooting' && <TroubleTab />}
      </div>
    </div>
  );
}
