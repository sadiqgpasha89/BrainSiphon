import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;
export const metadata: Metadata = {
  title: 'Deployment modes',
  description:
    'What the static GitHub Pages site, the Docker stack and a cloud-hosted production deployment each include, what you lose in static mode and what you must provide yourself.',
};

type Row = { capability: string; staticMode: string; docker: string; cloud: string };

const ROWS: Row[] = [
  {
    capability: 'All 500 blueprints, diagrams, role lenses and the live sizing calculator',
    staticMode: 'Yes, prebuilt HTML and client-side code',
    docker: 'Yes',
    cloud: 'Yes',
  },
  {
    capability: 'Clean markdown twin of every blueprint and /llms.txt',
    staticMode: 'Yes, written at build time',
    docker: 'Yes',
    cloud: 'Yes',
  },
  {
    capability: 'Search',
    staticMode: 'Build-time MiniSearch index in the browser (keyword ranking)',
    docker:
      'Postgres full-text plus pgvector hybrid, fused by reciprocal rank, with a circuit breaker and MiniSearch fallback',
    cloud: 'As Docker, on managed Postgres; swap the hashing embeddings for a learned encoder',
  },
  {
    capability: 'API routes (/api/search, /api/og, health checks)',
    staticMode: 'Not available: the export has no server',
    docker: 'Yes',
    cloud: 'Yes, behind your load balancer',
  },
  {
    capability: 'Rate limiting',
    staticMode: 'None; the CDN or host must provide it',
    docker: 'Redis sliding window with an in-memory fallback',
    cloud: 'Redis plus edge or WAF limits',
  },
  {
    capability: 'Security headers (CSP, HSTS) and slug redirects (308)',
    staticMode: 'Headers depend on the host; redirects are done client-side in the 404 page',
    docker: 'Applied by middleware',
    cloud: 'Middleware plus CDN and WAF policy',
  },
  {
    capability: 'Telemetry and structured logs',
    staticMode: 'None server-side',
    docker: 'OpenTelemetry and Pino JSON logs with request ids',
    cloud: 'Exported to your observability platform with alerting',
  },
  {
    capability: 'Infrastructure you run',
    staticMode: 'A static file host or CDN',
    docker: 'App, Postgres with pgvector and Redis containers (docker compose)',
    cloud:
      'Container platform, managed Postgres and Redis, CDN, secrets manager, CI/CD: not provisioned by this repository',
  },
  {
    capability: 'Scaling and availability',
    staticMode: 'CDN-grade; nothing to scale',
    docker: 'Single host; no redundancy by default',
    cloud: 'Yours to design: multiple zones, autoscaling, backups, RTO and RPO',
  },
];

const LOSES = [
  'Hybrid semantic search: static mode ranks by keywords over the prebuilt index.',
  'Any /api route: there is no server in the export, so health checks, the OG image endpoint and live search do not exist.',
  'Server-side rate limiting, middleware headers and 308 redirects.',
  'Server telemetry: you cannot see request-level behaviour from the host.',
];

export default function DeploymentPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10">
      <header className="mb-8 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-wider text-signal">Deployment modes</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          What the live site demonstrates, and what it does not
        </h1>
        <p className="mt-3 text-mute">
          The public site is a <strong className="text-ink">static export</strong>: a reference you can read,
          search and size workloads against. It does not run the database, cache, middleware or API routes
          that the repository also contains. The full-stack Docker deployment does. A cloud production
          deployment is a design you assemble from that image; this repository does not provision it.
        </p>
      </header>

      <div className="overflow-x-auto" data-testid="deployment-table">
        <table className="bs-table w-full text-sm">
          <thead>
            <tr>
              <th>Capability</th>
              <th>Static documentation site</th>
              <th>Full-stack Docker</th>
              <th>Cloud-hosted production</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.capability} className="align-top">
                <th className="font-medium text-ink">{r.capability}</th>
                <td>{r.staticMode}</td>
                <td>{r.docker}</td>
                <td>{r.cloud}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-lg font-semibold">What you lose in static mode</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-mute">
            {LOSES.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-semibold">Which should I use?</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-mute">
            <li>
              <strong className="text-ink">Reading and sharing:</strong> the static site or your own static
              export (<code>npm run build:static</code>).
            </li>
            <li>
              <strong className="text-ink">Trying the full stack locally or inside a team:</strong>{' '}
              <code>docker compose up --build</code>.
            </li>
            <li>
              <strong className="text-ink">Running it as an internal platform:</strong> treat the Docker image
              as the starting point and design the rest (identity, network zones, backups, SLOs) the way the{' '}
              <Link href="/patterns" className="underline">
                enterprise patterns
              </Link>{' '}
              describe.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
