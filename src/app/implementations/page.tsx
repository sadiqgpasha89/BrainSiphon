import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, CircleDashed, Terminal } from 'lucide-react';
import { ARCHETYPE_LABEL, type Archetype } from '../../schemas/usecase.schema';

export const revalidate = 86400;
export const metadata: Metadata = {
  title: 'Reference implementations — BrainSiphon',
  description:
    'Four complete, runnable systems, one per solution family: source system, CDC, validation, features, training, registry, serving, API, application, authentication, human review, monitoring and retraining. Clone, make setup, make demo.',
};

const REPO = 'https://github.com/sadiqgpasha89/BrainSiphon/tree/main/reference-implementations';

type Impl = {
  dir: string;
  family: string;
  useCase: string;
  blueprint: string;
  different: string;
  tests: number;
  checks: number;
};

const IMPLS: Impl[] = [
  {
    dir: 'realtime-decisioning',
    family: 'Real-time decisioning',
    useCase: 'Card and UPI fraud',
    blueprint: '/fintech/real-time-card-upi-fraud-detection',
    different:
      'A model in the request path under a deadline. Streaming features from CDC, labels that arrive weeks later, thresholds fitted to a false-decline budget, every block reviewed by an analyst.',
    tests: 26,
    checks: 19,
  },
  {
    dir: 'batch-forecasting',
    family: 'Forecasting, and the scheduled-batch shape of batch analytics',
    useCase: 'Demand sensing',
    blueprint: '/supply-chain/network-demand-sensing-short-term',
    different:
      'No model in a request path. A nightly run on the newest complete day, restated history applied through CDC, a rolling-origin backtest, implausible series held for a planner, overrides scored against actuals.',
    tests: 16,
    checks: 21,
  },
  {
    dir: 'rag-assistant',
    family: 'Retrieval-augmented generation',
    useCase: 'Developer documentation assistant',
    blueprint: '/saas/developer-docs-assistant',
    different:
      'The index is the versioned artefact. Access control before ranking, every sentence verified against the passage it cites, a refusal when the documents do not hold the answer, reviews that grow the evaluation set.',
    tests: 15,
    checks: 21,
  },
  {
    dir: 'agentic-workflow',
    family: 'Agentic workflow',
    useCase: 'SOC alert triage',
    blueprint: '/cybersecurity/soc-copilot-llm-investigation',
    different:
      'A planner inside a harness: read-only tools, a step budget, a full trace. Containment is proposed, approved by people (two for critical assets) and executed by a separate component.',
    tests: 17,
    checks: 23,
  },
];

/** Blueprint counts per archetype, from the content build this page was written against. */
const COVERAGE: { archetype: Archetype; count: number; status: 'own' | 'adapt' | 'none'; note: string }[] = [
  {
    archetype: 'batch-analytics',
    count: 119,
    status: 'adapt',
    note: 'Adapt batch-forecasting: same pipeline, different model, output table and accuracy join',
  },
  { archetype: 'realtime-decisioning', count: 100, status: 'own', note: 'realtime-decisioning' },
  { archetype: 'computer-vision', count: 66, status: 'none', note: 'No reference implementation yet' },
  { archetype: 'document-extraction', count: 48, status: 'none', note: 'No reference implementation yet' },
  { archetype: 'rag', count: 44, status: 'own', note: 'rag-assistant' },
  { archetype: 'forecasting', count: 35, status: 'own', note: 'batch-forecasting' },
  { archetype: 'agentic-workflow', count: 35, status: 'own', note: 'agentic-workflow' },
  { archetype: 'optimisation', count: 32, status: 'none', note: 'No reference implementation yet' },
  { archetype: 'recommendation', count: 21, status: 'none', note: 'No reference implementation yet' },
];

const CAPABILITIES: [string, string][] = [
  ['Source-system integration', 'A simulated operational system behind a versioned data contract'],
  ['Ingestion and CDC', 'Transactional outbox, relay with checkpoints, ordered log, offsets, dead letters'],
  [
    'Validation and transformation',
    'Contract checks, quarantine with reasons, dataset rules that stop a run',
  ],
  ['Feature engineering and storage', 'A registry file; one implementation for training and serving'],
  ['Training and evaluation', 'Time-aware splits, a baseline, gates on held-out data'],
  ['Packaging and registry', 'Immutable versions, checksum, lineage, promotion history, rollback'],
  ['Online inference or batch processing', 'Hot swap, fallbacks, idempotent runs'],
  ['Backend API and business logic', 'FastAPI with OpenAPI, idempotency, request contracts'],
  ['Consuming application', 'A console for the people who use and oversee the system'],
  ['Authentication and authorisation', 'OAuth2 bearer tokens, roles on every route, OIDC mode'],
  ['Human in the loop', 'Review queue with claim, SLA and four-eyes approval'],
  ['Monitoring, logging and alerting', 'JSON logs, Prometheus metrics, drift, alert rules with a runbook'],
  ['CI/CD and infrastructure', 'Dockerfile, Compose, Kubernetes manifests, a CI workflow'],
  ['Feedback and retraining', 'Outcomes become labels or evaluation examples; gated retrain'],
];

export default function ImplementationsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-10">
      <header className="max-w-4xl space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-signal-line bg-signal-soft px-3 py-1 font-mono text-xs font-medium text-signal">
          <Terminal size={14} aria-hidden />
          <span>Clone, make setup, make demo</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
          Reference implementations
        </h1>
        <p className="text-lg leading-relaxed text-mute">
          A blueprint tells you what to build. Each of these is one complete system for a family of
          blueprints, running end to end on your machine: source system, change data capture, validation,
          features, training, a registry, serving, an API with authentication, a consuming application, human
          review, monitoring and a retraining loop. No cloud account, API key or Docker is needed for the
          default profile.
        </p>
        <pre className="bg-surface overflow-x-auto rounded-lg border border-line p-4 font-mono text-xs text-ink">
          {`git clone https://github.com/sadiqgpasha89/BrainSiphon.git
cd BrainSiphon/reference-implementations/realtime-decisioning
make setup      # virtual environment, pinned dependencies, generated secrets
make demo       # seed, CDC, train, serve, verify, monitor, retrain: ends with DEMO PASSED`}
        </pre>
      </header>

      <section className="space-y-5" data-testid="implementations-list">
        <h2 className="text-xl font-semibold text-ink">Four systems, because the families differ in kind</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {IMPLS.map((i) => (
            <article key={i.dir} className="card space-y-3 p-6">
              <p className="font-mono text-xs uppercase tracking-wide text-dim">{i.family}</p>
              <h3 className="text-lg font-semibold text-ink">
                <a href={`${REPO}/${i.dir}`} className="hover:text-signal">
                  {i.dir}
                </a>
              </h3>
              <p className="text-sm leading-relaxed text-mute">{i.different}</p>
              <p className="text-xs text-mute">
                Worked use case:{' '}
                <Link href={i.blueprint} className="text-signal hover:underline">
                  {i.useCase}
                </Link>
                {' · '}
                {i.tests} tests{' · '}
                {i.checks}-check end-to-end verification
              </p>
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <a href={`${REPO}/${i.dir}#readme`} className="text-signal hover:underline">
                  README
                </a>
                <a href={`${REPO}/${i.dir}/docs/ARCHITECTURE.md`} className="text-signal hover:underline">
                  Architecture
                </a>
                <a href={`${REPO}/${i.dir}/docs/RUNBOOK.md`} className="text-signal hover:underline">
                  Runbook
                </a>
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Coverage of the 500 blueprints</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-mute">
          Every blueprint has one of nine solution archetypes. 214 blueprints have an implementation of their
          own family, 119 have one to adapt with named changes, and 167 have none yet. Where there is none,
          the site says so instead of pointing at the nearest look-alike.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="implementations-coverage">
            <thead className="text-xs uppercase text-dim">
              <tr>
                <th className="py-2 pr-4">Solution archetype</th>
                <th className="py-2 pr-4 text-right">Blueprints</th>
                <th className="py-2">Reference implementation</th>
              </tr>
            </thead>
            <tbody>
              {COVERAGE.map((c) => (
                <tr key={c.archetype} className="border-t border-line">
                  <td className="py-2 pr-4 text-ink">{ARCHETYPE_LABEL[c.archetype]}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-mute">{c.count}</td>
                  <td className="py-2 text-mute">
                    <span className="inline-flex items-center gap-1.5">
                      {c.status === 'none' ? (
                        <CircleDashed size={14} className="text-dim" aria-hidden />
                      ) : (
                        <CheckCircle2 size={14} className="text-signal" aria-hidden />
                      )}
                      {c.status === 'own' ? (
                        <a href={`${REPO}/${c.note}`} className="text-signal hover:underline">
                          {c.note}
                        </a>
                      ) : (
                        c.note
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">What every implementation contains</h2>
        <ul className="grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
          {CAPABILITIES.map(([name, what]) => (
            <li key={name} className="flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-signal" aria-hidden />
              <span>
                <strong className="text-ink">{name}.</strong> <span className="text-mute">{what}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="max-w-3xl text-sm leading-relaxed text-mute">
          Every implementation has the same layout (<code>configs</code>, <code>data</code>,{' '}
          <code>features</code>, <code>training</code>, <code>models</code>, <code>serving</code>,{' '}
          <code>api</code>, <code>monitoring</code>, <code>infrastructure</code>, <code>scripts</code>,{' '}
          <code>tests</code>, <code>docs</code>, <code>src</code>) and a README with prerequisites,
          environment variables, commands, expected results, troubleshooting and teardown.
        </p>
      </section>

      <section className="card space-y-3 p-6" data-testid="implementations-verified">
        <h2 className="text-xl font-semibold text-ink">What has and has not been verified</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-mute">
          <li>
            <strong className="text-ink">Run and passing:</strong> every test suite on SQLite and on
            PostgreSQL, every end-to-end demo, and every command printed in a README.
          </li>
          <li>
            <strong className="text-ink">Checked for syntax only:</strong> the Compose files and the
            Kubernetes manifests. The CI workflow builds each image and runs each Compose profile.
          </li>
          <li>
            <strong className="text-ink">Not run:</strong> the two optional Claude code paths (the RAG
            generator and the agent planner). The defaults are deterministic and need no key.
          </li>
          <li>
            <strong className="text-ink">Simulated by design:</strong> the source systems and their data. A
            metric in a README is a statement about wiring, not about performance on your data.
          </li>
          <li>
            <strong className="text-ink">Not claimed:</strong> load testing at production scale, a security
            review, or use in a real deployment.
          </li>
        </ul>
      </section>
    </div>
  );
}
