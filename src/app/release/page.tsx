import type { Metadata } from 'next';
import Link from 'next/link';
import {
  EvidenceLayers,
  KitRunsTable,
  ManifestSummary,
  MaturityLadder,
} from '../../components/ReleaseReport';
import { FeasibilityWarningsPanel } from '../../components/reader/ValidationStatus';
import { releaseOutstanding } from '../../content/release';
import { getRelease } from '../../lib/content';
import { withBase } from '../../lib/site';
import { loadWarningAcks } from '../../content/release-io';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Release report',
  description:
    'What has been checked for the published blueprints and what has not: maturity levels, check results, starter-kit test runs, open feasibility warnings and outstanding issues.',
  alternates: { canonical: '/release' },
};

const when = (iso: string | null, none: string) => (iso ? `${iso.slice(0, 16).replace('T', ' ')} UTC` : none);

export default async function ReleasePage() {
  const release = await getRelease();
  if (!release)
    return (
      <div className="mx-auto max-w-4xl px-4 py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Release report</h1>
        <p className="mt-4 text-mute">
          No release manifest was found for this build. Run <code>npm run content:build</code>.
        </p>
      </div>
    );
  const c = release.checks;
  const warnings = c.feasibility.warnings;
  const outstanding = releaseOutstanding(release);

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-14" data-testid="release-report">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-dim">Release report</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          What has been checked, and what has not
        </h1>
        <p className="mt-4 max-w-3xl text-mute">
          The {c.schema.useCases} blueprints on this site are reference designs. All of them pass automated
          checks for completeness and internal consistency. They are starting points to adapt and test in your
          own environment. This page is generated from the same manifest the site was built from.
        </p>
        <dl
          className="mt-6 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-[auto_1fr]"
          data-testid="release-identity"
        >
          <dt className="text-mute">Content version</dt>
          <dd className="m-0 font-mono text-xs">{release.contentVersion}</dd>
          <dt className="text-mute">Source commit</dt>
          <dd className="m-0 break-all font-mono text-xs">
            {release.sourceCommit ?? 'unknown'}
            {release.sourceDirty ? ' (uncommitted changes)' : ''}
          </dd>
          <dt className="text-mute">Content gate last passed</dt>
          <dd className="m-0 font-mono text-xs">{when(release.validatedAt, 'not for this content')}</dd>
          <dt className="text-mute">Starter kits last run</dt>
          <dd className="m-0 font-mono text-xs">{when(c.executable.ranAt, 'not for this content')}</dd>
          <dt className="text-mute">Deployment built</dt>
          <dd className="m-0 font-mono text-xs">{when(release.deployedAt, 'not a deployment build')}</dd>
        </dl>
      </header>

      <section aria-labelledby="summary" className="space-y-3">
        <h2 id="summary" className="text-xl font-semibold">
          Summary
        </h2>
        <ManifestSummary release={release} />
      </section>

      <section aria-labelledby="layers" className="space-y-3">
        <h2 id="layers" className="scroll-mt-24 text-xl font-semibold">
          Documentation and tested code are different things
        </h2>
        <p className="max-w-3xl text-sm text-mute">
          Every blueprint is documentation. A small number also have tested starter code. None is an
          operational solution. The shares below come from the manifest this site was built from.
        </p>
        <EvidenceLayers release={release} />
      </section>

      <section aria-labelledby="maturity" className="space-y-3">
        <h2 id="maturity" className="scroll-mt-24 text-xl font-semibold">
          Maturity levels
        </h2>
        <p className="max-w-3xl text-sm text-mute">
          Each level is a different kind of evidence, and none implies the one above it. A blueprint is
          classified at the highest level it reaches without skipping one; every blueprint page shows its own
          scorecard with the evidence for each level.
        </p>
        <MaturityLadder release={release} />
      </section>

      <section aria-labelledby="kits" className="space-y-3">
        <h2 id="kits" className="scroll-mt-24 text-xl font-semibold">
          Starter-kit test runs
        </h2>
        <p className="max-w-3xl text-sm text-mute">
          The executable evidence: one pytest run per kit, on generated data. A kit result belongs to the kit,
          not to every blueprint that points at it.
        </p>
        <KitRunsTable release={release} />
      </section>

      <section aria-labelledby="feasibility-warnings" className="space-y-3">
        <h2 id="feasibility-warnings" className="scroll-mt-24 text-xl font-semibold">
          Architecture-feasibility warnings ({warnings.length})
        </h2>
        <p className="max-w-3xl text-sm text-mute">
          {c.feasibility.checks.toLocaleString('en-US')} checks ran:{' '}
          {c.feasibility.pass.toLocaleString('en-US')} passed, {c.feasibility.notApplicable} did not apply,{' '}
          {c.feasibility.warn} raised a warning and {c.feasibility.fail} failed. A warning does not block the
          release; it marks a design whose numbers need changing before anyone builds it.
        </p>
        {warnings.length ? (
          <FeasibilityWarningsPanel warnings={warnings} linkBlueprints acks={loadWarningAcks()} />
        ) : (
          <p className="text-sm text-mute">No warnings are open.</p>
        )}
      </section>

      <section aria-labelledby="outstanding" className="space-y-3">
        <h2 id="outstanding" className="scroll-mt-24 text-xl font-semibold">
          Outstanding issues
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink/90" data-testid="release-outstanding">
          {outstanding.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-line pt-6 text-sm text-mute">
        The same report as <a href={withBase('/release.json')}>release.json</a> and{' '}
        <a href={withBase('/release-report.md')}>Markdown</a>. How the levels are defined:{' '}
        <Link href="/about#maturity-framework">about this project</Link>.
      </footer>
    </div>
  );
}
