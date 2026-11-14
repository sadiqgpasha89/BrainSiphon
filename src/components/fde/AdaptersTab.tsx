'use client';

import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DOWNLOAD_BUNDLES } from '../../content/downloads-meta';
import { ADAPTERS } from '../../content/fde/catalog';
import { download } from '../../lib/fde/storage';
import { withBase } from '../../lib/site';
import { inputCls, Pre, Table } from './ui';

const QUICK = `cd fde-adapters
python3 -m fde_adapters list
python3 -m fde_adapters check --config configs/salesforce.connector.json --mock      # against the bundled mock
python3 -m fde_adapters check --config configs/salesforce.connector.json             # against the customer sandbox, once credentials exist
python3 -m pytest tests -q`;

/** Machine-readable registry: what each adapter has been proven against. Nothing here claims a vendor or customer-environment run. */
const registry = () =>
  JSON.stringify(
    {
      generatedFor: 'BrainSiphon FDE adapters',
      note: 'vendorSandbox is "not run" for every adapter: record your own verification in the workspace.',
      adapters: ADAPTERS.map((a) => ({
        id: a.id,
        systems: a.systems,
        protocol: a.protocol,
        auth: a.auth,
        apiVersion: a.apiVersion,
        mock: a.mock,
        testedAgainst: a.testedAgainst,
        vendorSandbox: a.vendorSandbox,
        idempotency: a.idempotency,
        module: a.module,
        config: a.config,
      })),
    },
    null,
    2,
  );

export function AdaptersTab() {
  const [q, setQ] = useState('');
  const rows = useMemo(
    () =>
      ADAPTERS.filter((a) =>
        `${a.title} ${a.systems.join(' ')} ${a.protocol}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [q],
  );
  const bundle = DOWNLOAD_BUNDLES.find((b) => b.id === 'fde-adapters');
  return (
    <section className="space-y-8" aria-labelledby="adapters-h">
      <div>
        <h2 id="adapters-h" className="text-xl font-semibold text-ink">
          Reusable adapters and mocks
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-mute">
          A standard adapter lifecycle (configure, health, read, write, close) with one error taxonomy, retry
          and deadline handling, idempotency and declarative field mapping. Connectors are config-driven and
          each ships with a vendor-shaped mock.{' '}
          <strong className="text-ink">
            Every adapter is tested against its mock only: no vendor sandbox has been run.
          </strong>{' '}
          Record your own verification per customer.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {bundle && (
            <a className="btn no-underline" href={withBase(`/downloads/${bundle.zip}`)}>
              <Download size={14} aria-hidden /> Download the adapters (.zip)
            </a>
          )}
          <button
            type="button"
            className="btn"
            onClick={() => download('connector-registry.json', registry(), 'application/json')}
          >
            <Download size={14} aria-hidden /> Connector registry (.json)
          </button>
        </div>
      </div>
      <Pre text={QUICK} />
      <label className="block max-w-sm text-xs text-mute">
        Filter by system or protocol
        <input
          className={inputCls}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Salesforce, Kafka, HL7…"
        />
      </label>
      <Table
        head={[
          'Adapter',
          'Systems',
          'Protocol and auth',
          'Idempotency',
          'Tested against',
          'Vendor sandbox',
          'Files',
        ]}
        rows={rows.map((a) => [
          a.title,
          a.systems.join(', '),
          `${a.protocol}; ${a.auth}`,
          a.idempotency,
          `${a.mock}: ${a.testedAgainst}`,
          <span key="v" className="chip !border-warn/40 !text-warn">
            {a.vendorSandbox}
          </span>,
          <span key="f" className="space-x-2 text-xs">
            <a href={withBase(`/downloads/${a.module}`)}>code</a>
            <a href={withBase(`/downloads/${a.config}`)}>config</a>
          </span>,
        ])}
      />
      {rows.length === 0 && (
        <p className="text-sm text-mute">
          No adapter matches. A customer system without an adapter uses the framework: subclass{' '}
          <code>Adapter</code>, declare its READ and WRITE specs and add a config.
        </p>
      )}
    </section>
  );
}
