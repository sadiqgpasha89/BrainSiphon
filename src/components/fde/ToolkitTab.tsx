'use client';

import { Download } from 'lucide-react';
import { DOWNLOAD_BUNDLES } from '../../content/downloads-meta';
import { TOOLKIT_CHECKS, TOOLKIT_TEMPLATES, TOOLKIT_TEMPLATE_TITLES } from '../../content/fde/catalog';
import { withBase } from '../../lib/site';
import { Pre, Table } from './ui';

const QUICK = `cd fde-toolkit
cp config/preflight.example.json preflight.json      # edit: your hosts, ports, endpoints; secrets by reference
python3 -m bs_preflight validate-config --config preflight.json
python3 -m bs_preflight run --config preflight.json --out readiness-report.json --markdown readiness-report.md

# air-gapped or no Python on the host: copy the folder, then
bash shell/preflight.sh targets.tsv readiness-report.json`;

export function ToolkitTab() {
  const bundle = DOWNLOAD_BUNDLES.find((b) => b.id === 'fde-toolkit');
  return (
    <section className="space-y-8" aria-labelledby="toolkit-h">
      <div>
        <h2 id="toolkit-h" className="text-xl font-semibold text-ink">
          Pre-flight toolkit
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-mute">
          Thirteen discovery templates to fill in with the customer, and executable checks that prove DNS,
          TCP, TLS, API authentication, identity, service accounts and databases from inside their network. It
          needs only Python 3.9+ and the standard library, has a shell fallback, and works offline. The result
          is a machine-readable readiness report.
        </p>
        {bundle && (
          <a className="btn mt-3 no-underline" href={withBase(`/downloads/${bundle.zip}`)}>
            <Download size={14} aria-hidden /> Download the toolkit (.zip)
          </a>
        )}
      </div>
      <div className="space-y-3">
        <h3 className="font-semibold text-ink">Run it</h3>
        <Pre text={QUICK} />
      </div>
      <div className="space-y-3">
        <h3 className="font-semibold text-ink">Templates to complete with the customer</h3>
        <Table
          head={['#', 'Template', 'File']}
          rows={TOOLKIT_TEMPLATES.map((t) => [
            t.slice(0, 2),
            TOOLKIT_TEMPLATE_TITLES[t],
            <a key={t} href={withBase(`/downloads/fde-toolkit/templates/${t}`)} className="font-mono text-xs">
              {t}
            </a>,
          ])}
        />
        <p className="text-sm text-mute">
          Start with{' '}
          <a href={withBase('/downloads/fde-toolkit/templates/00-readiness-checklist.md')}>
            00-readiness-checklist.md
          </a>
          : it orders the templates and the checks.
        </p>
      </div>
      <div className="space-y-3">
        <h3 className="font-semibold text-ink">What each check proves</h3>
        <Table
          head={['Check', 'What a pass means', 'Script']}
          rows={TOOLKIT_CHECKS.map((c) => [
            c.title,
            c.proves,
            <a key={c.script} href={withBase(`/downloads/${c.script}`)} className="font-mono text-xs">
              {c.script.split('/').pop()}
            </a>,
          ])}
        />
      </div>
      <div className="space-y-2 text-sm text-mute">
        <h3 className="font-semibold text-ink">Reading the report</h3>
        <p>
          Each check reports PASS, FAIL, WARN or SKIP with evidence and a remediation hint. Secrets never
          reach the report. The verdict is READY only when nothing blocking failed, and the JSON follows{' '}
          <a href={withBase('/downloads/fde-toolkit/schema/readiness-report.schema.json')}>
            readiness-report.schema.json
          </a>
          , so a workspace or a pipeline can read it. See{' '}
          <a href={withBase('/downloads/fde-toolkit/OFFLINE.md')}>OFFLINE.md</a> for restricted and air-gapped
          sites.
        </p>
      </div>
    </section>
  );
}
