import {
  COMPLIANCE_NOTICE,
  ENVIRONMENTS_SPEC,
  RECOVERY_TIERS,
  WORKLOAD_VARIANTS,
} from '../../content/deployment-profiles';
import { loadVersionRegistry } from '../../content/versions';
import { withBase } from '../../lib/site';

const Head = ({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) => (
  <div>
    <span className="font-mono text-xs uppercase tracking-wider text-signal">{kicker}</span>
    <h2 className="text-2xl font-semibold text-ink">{title}</h2>
    {children && <p className="mt-1 max-w-3xl text-sm text-mute">{children}</p>}
  </div>
);
const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-x-auto">{children}</div>
);

export function ComplianceNotice() {
  return (
    <aside
      className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-4 text-sm text-ink"
      data-testid="compliance-notice"
    >
      <strong>Architecture is not certification.</strong> {COMPLIANCE_NOTICE}
    </aside>
  );
}

export function EnvironmentMatrix() {
  return (
    <section className="space-y-4" id="environments" data-testid="environment-matrix">
      <Head kicker="Environments" title="Development, staging, pre-production and production">
        Four environments, each with its own variable file and Helm values. Pre-production is
        production-shaped on purpose, so a load test, a failover drill or a restore test there means
        something. The figures are read from the AWS Terraform and the Helm values, and a unit test fails if
        they drift apart.
      </Head>
      <Wrap>
        <table className="bs-table min-w-[56rem] text-xs">
          <thead>
            <tr>
              <th>Environment</th>
              <th>Purpose and data</th>
              <th>AWS reference stack</th>
              <th>Helm release</th>
              <th>Who may apply</th>
              <th>Files</th>
            </tr>
          </thead>
          <tbody>
            {ENVIRONMENTS_SPEC.map((e) => (
              <tr key={e.id} data-testid={`env-${e.id}`}>
                <td className="align-top font-semibold text-ink">{e.label}</td>
                <td className="align-top">
                  {e.purpose}
                  <br />
                  <span className="text-dim">
                    Data: {e.data}. Account: {e.cloudAccount}.
                  </span>
                </td>
                <td className="align-top">
                  Nodes {e.aws.nodes}
                  <br />
                  {e.aws.db}
                  <br />
                  Redis {e.aws.cache}
                  <br />
                  API endpoint {e.aws.apiEndpoint}
                  <br />
                  Deletion protection {e.aws.deletionProtection ? 'on' : 'off'}
                </td>
                <td className="align-top">
                  Replicas {e.helm.replicas}
                  <br />
                  Latency budget {e.helm.latencyBudgetMs} ms
                </td>
                <td className="align-top">{e.approval}</td>
                <td className="align-top font-mono text-[11px]">
                  <a className="text-signal underline" href={withBase(`/downloads/${e.tfvars}`)}>
                    {e.tfvars.split('/').pop()}
                  </a>
                  <br />
                  <a className="text-signal underline" href={withBase(`/downloads/${e.helmValues}`)}>
                    {e.helmValues.split('/').pop()}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Wrap>
    </section>
  );
}

export function VersionRegistryTable() {
  const reg = loadVersionRegistry();
  return (
    <section className="space-y-4" id="versions" data-testid="version-registry">
      <Head kicker="Versions" title="Pinned versions and their support dates">
        Every version the deployment material pins is listed here with the date its support ends, and CI fails
        when one passes that date, a quarterly review is overdue, or a file no longer matches. “Vendor page
        read” means the dates were read from the vendor’s own lifecycle page on the date shown; otherwise they
        come from the project’s published policy and must be re-read at the next review. Reviews are{' '}
        {reg.reviewCadence}.
      </Head>
      <Wrap>
        <table className="bs-table min-w-[48rem] text-xs">
          <thead>
            <tr>
              <th>Component</th>
              <th>Pinned</th>
              <th>Support ends</th>
              <th>Checked</th>
              <th>Review by</th>
              <th>Basis</th>
            </tr>
          </thead>
          <tbody>
            {reg.entries.map((e) => (
              <tr key={e.id}>
                <td className="align-top font-medium text-ink">
                  {e.component}
                  {e.note && <span className="mt-1 block font-normal text-mute">{e.note}</span>}
                </td>
                <td className="whitespace-nowrap align-top font-mono">{e.version}</td>
                <td className="whitespace-nowrap align-top font-mono">{e.supportEnds ?? 'no fixed date'}</td>
                <td className="whitespace-nowrap align-top font-mono">{e.checkedOn}</td>
                <td className="whitespace-nowrap align-top font-mono">{e.reviewBy}</td>
                <td className="align-top">
                  <a className="text-signal underline" href={e.source} rel="noreferrer">
                    {e.verified ? 'Vendor page read' : 'Published policy, to re-verify'}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Wrap>
      <p className="text-xs text-mute">
        Raw data:{' '}
        <a
          className="text-signal underline"
          href="https://github.com/sadiqgpasha89/BrainSiphon/blob/main/content/version-registry.json"
        >
          content/version-registry.json
        </a>
        . No version combination here has been provisioned in a live cloud account by this project.
      </p>
    </section>
  );
}

export function InfraValidationStatus() {
  const rows: [string, string, string][] = [
    [
      'Static checks (no cloud, no Terraform binary)',
      'Four environments, pinned providers, encryption, private endpoints, network policy, no out-of-support Kubernetes',
      'npm run validate:infra · runs in the content gate and in unit tests',
    ],
    [
      'Version registry',
      'Pinned versions inside vendor support; review dates not overdue',
      'npm run check:versions · runs in the content gate',
    ],
    [
      'terraform fmt, init -backend=false, validate',
      'AWS, Azure and GCP stacks parse and type-check',
      'CI job infrastructure-validation · report published as a workflow artifact',
    ],
    [
      'tflint and Checkov',
      'Provider-specific lint and static security scan of the Terraform',
      'CI job infrastructure-validation · Checkov findings are reported, not hidden',
    ],
    [
      'helm lint, helm template, kubeconform',
      'The chart renders for dev, staging, pre-production and production and validates against Kubernetes schemas',
      'CI job kubernetes-validation',
    ],
    [
      'conftest (OPA/Rego)',
      'Rendered manifests: non-root, read-only filesystem, no privilege escalation, memory limits, no :latest, no host networking',
      'CI job kubernetes-validation · policy and its own tests in deployment/policy/',
    ],
    [
      'terraform plan / apply in a cloud account',
      'NOT RUN. This project has no cloud account attached to it.',
      'You run this in your own account: commands below',
    ],
    [
      'Smoke test, restore test, failover drill',
      'NOT RUN against these stacks. Targets are targets.',
      'deployment/smoke-test.sh is the smoke test; the drills are in the runbooks',
    ],
  ];
  return (
    <section className="space-y-4" id="validation" data-testid="infra-validation">
      <Head kicker="Evidence" title="What has been validated for the infrastructure code, and what has not">
        Results of the CI jobs are on the{' '}
        <a
          className="text-signal underline"
          href="https://github.com/sadiqgpasha89/BrainSiphon/actions/workflows/ci-cd.yml"
        >
          workflow page
        </a>{' '}
        and attached to each run as <code>infra-report-*</code> artifacts. The jobs report; they do not
        provision anything.
      </Head>
      <Wrap>
        <table className="bs-table min-w-[44rem] text-xs">
          <thead>
            <tr>
              <th>Check</th>
              <th>What it covers</th>
              <th>Where it runs</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([a, b, c]) => (
              <tr key={a} className={b.startsWith('NOT RUN') ? 'bg-amber-500/5' : ''}>
                <td className="align-top font-medium text-ink">{a}</td>
                <td className="align-top">{b}</td>
                <td className="align-top">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Wrap>
    </section>
  );
}

export function RecoveryTiers() {
  return (
    <section className="space-y-4" id="recovery" data-testid="recovery-tiers">
      <Head kicker="Business continuity" title="Availability, RTO and RPO by workload class">
        There is no single right availability target. Each class below states what it would cost to meet it
        and what it gives up when it does not.{' '}
        <strong>
          These are targets. No failover, restore or disaster-recovery drill has been run against these
          stacks, so no measured recovery time exists.
        </strong>{' '}
        Record yours next to the target after each drill.
      </Head>
      <Wrap>
        <table className="bs-table min-w-[60rem] text-xs">
          <thead>
            <tr>
              <th>Class</th>
              <th>Availability</th>
              <th>RPO</th>
              <th>RTO</th>
              <th>Replication and failover</th>
              <th>Split-brain control</th>
              <th>Why this target</th>
              <th>Drill cadence</th>
            </tr>
          </thead>
          <tbody>
            {RECOVERY_TIERS.map((t) => (
              <tr key={t.id} data-testid={`tier-${t.id}`}>
                <td className="align-top font-semibold text-ink">
                  {t.id}: {t.name}
                  <span className="mt-1 block font-normal text-mute">{t.example}</span>
                </td>
                <td className="whitespace-nowrap align-top font-mono">{t.availability}</td>
                <td className="align-top font-mono">{t.rpo}</td>
                <td className="align-top font-mono">{t.rto}</td>
                <td className="align-top">
                  {t.replication}
                  <span className="mt-1 block text-mute">{t.failover}</span>
                </td>
                <td className="align-top">{t.splitBrain}</td>
                <td className="align-top">{t.justification}</td>
                <td className="align-top">{t.test}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Wrap>
    </section>
  );
}

export function WorkloadVariants() {
  return (
    <section className="space-y-4" id="variants" data-testid="workload-variants">
      <Head kicker="Architecture variants" title="Not every AI solution needs Kubernetes">
        The cloud-native profile centres on Kubernetes, PostgreSQL and Redis because that suits online
        decisioning. Other workloads have simpler answers. Sizing rules are formulas to fill in with your own
        benchmark, not figures to copy.
      </Head>
      <Wrap>
        <table className="bs-table min-w-[64rem] text-xs">
          <thead>
            <tr>
              <th>Workload</th>
              <th>Runs on</th>
              <th>Kubernetes?</th>
              <th>Serverless option</th>
              <th>Hardware</th>
              <th>Sizing rule</th>
              <th>Self-hosted or managed</th>
            </tr>
          </thead>
          <tbody>
            {WORKLOAD_VARIANTS.map((w) => (
              <tr key={w.id}>
                <td className="align-top font-semibold text-ink">{w.workload}</td>
                <td className="align-top">{w.runsOn}</td>
                <td className="align-top">{w.kubernetes}</td>
                <td className="align-top">{w.serverless}</td>
                <td className="align-top">{w.hardware}</td>
                <td className="align-top">{w.sizing}</td>
                <td className="align-top">{w.selfHostedVsManaged}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Wrap>
    </section>
  );
}
