import Link from 'next/link';
import { MATURITY_LEVELS, kitLogFile, type ReleaseManifest } from '../content/release';
import { REVIEW_CHECKLIST, REVIEW_PANELS, REVIEW_RECORD_FIELDS } from '../content/review-programme';
import { withBase } from '../lib/site';

const n = (x: number) => x.toLocaleString('en-US');

/**
 * The release manifest in five figures. Every number is read from the manifest this build was made from; none is typed by hand,
 * and the two that are zero are shown as plainly as the ones that passed.
 */
export function ManifestSummary({ release }: { release: ReleaseManifest | null }) {
  if (!release)
    return (
      <p className="text-sm text-mute" data-testid="manifest-transparency">
        No release manifest was found for this build, so no validation figures are shown.
      </p>
    );
  const c = release.checks;
  const total = c.schema.useCases;
  const kits = c.executable.kits;
  const patternKits = kits.filter((k) => k.name.startsWith('kits/')).length;
  const tiles: { label: string; value: string; note: string; ok: boolean }[] = [
    {
      label: 'Schema validation',
      value: `${n(total)} of ${n(total)} passed`,
      note: 'The page is complete and well-typed. Says nothing about whether the design works.',
      ok: true,
    },
    {
      label: 'Architecture feasibility',
      value: `${n(c.feasibility.pass)} passed · ${c.feasibility.warn} warnings · ${c.feasibility.fail} failed`,
      note: `${n(c.feasibility.checks)} checks that the modelled numbers agree; ${n(c.feasibility.notApplicable)} did not apply.`,
      ok: c.feasibility.fail === 0,
    },
    {
      label: 'Executable validation',
      value:
        c.executable.status === 'not-run'
          ? 'Not run in this build'
          : `${patternKits} pattern kits · ${kits.length - patternKits} use-case starters`,
      note: 'Run on synthetic data only. Most blueprints reuse a pattern kit rather than having their own code.',
      ok: c.executable.status === 'passed',
    },
    {
      label: 'Domain-expert review',
      value: `${c.domainExpert.reviewed} of ${n(c.domainExpert.total)}`,
      note: 'Blueprints reviewed by a named domain specialist.',
      ok: c.domainExpert.reviewed > 0,
    },
    {
      label: 'Production evidence',
      value: `${c.productionEvidence.claimed} of ${n(c.productionEvidence.total)}`,
      note: 'Blueprints with results measured in a real deployment.',
      ok: c.productionEvidence.claimed > 0,
    },
  ];
  return (
    <div className="rounded-lg border border-line p-4" data-testid="manifest-transparency">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-2">
        <span className="font-mono text-xs font-medium uppercase tracking-wider text-ink">
          What has been checked, and what has not
        </span>
        <Link
          href="/release"
          className="font-mono text-xs text-mute hover:text-ink"
          data-testid="release-report-link"
        >
          Release report
        </Link>
      </div>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded bg-raised/50 p-2.5" data-testid="manifest-tile">
            <dt className="font-mono text-[11px] text-dim">{t.label}</dt>
            <dd className={`m-0 mt-0.5 font-mono text-xs font-semibold ${t.ok ? 'text-signal' : 'text-ink'}`}>
              {t.value}
            </dd>
            <dd className="m-0 mt-1 text-[11px] leading-snug text-mute">{t.note}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The seven maturity levels with how many blueprints meet each one, from the manifest. */
export function MaturityLadder({ release }: { release: ReleaseManifest | null }) {
  const total = release?.checks.schema.useCases ?? 0;
  return (
    <div className="overflow-x-auto" data-testid="maturity-ladder">
      <table className="bs-table w-full text-sm">
        <thead>
          <tr>
            <th>Level</th>
            <th>What it shows</th>
            <th className="text-right">Blueprints meeting it</th>
            <th className="text-right">Classified here</th>
          </tr>
        </thead>
        <tbody>
          {MATURITY_LEVELS.map((l, i) => {
            const row = release?.maturity.find((r) => r.id === l.id);
            return (
              <tr key={l.id} data-testid={`ladder-${l.id}`}>
                <td className="whitespace-nowrap align-top font-medium text-ink">
                  <span className="font-mono text-xs text-dim">{i + 1}. </span>
                  {l.label}
                </td>
                <td className="align-top text-mute">{l.meaning}</td>
                <td className="whitespace-nowrap text-right align-top font-mono text-xs">
                  {row
                    ? `${n(row.met)} of ${n(total)} (${total ? ((row.met / total) * 100).toFixed(1) : '0.0'}%)`
                    : 'unknown'}
                </td>
                <td className="text-right align-top font-mono text-xs">
                  {row ? n(row.classified) : 'unknown'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** One row per starter-kit run: result, test counts, line coverage, duration and the published log. */
export function KitRunsTable({ release }: { release: ReleaseManifest }) {
  const exec = release.checks.executable;
  if (exec.status === 'not-run')
    return (
      <p className="text-sm text-mute" data-testid="kit-runs">
        The starter kits were not run for this content, so no result is shown. Run{' '}
        <code>npm run test:playbooks</code> and rebuild.
      </p>
    );
  return (
    <div className="overflow-x-auto" data-testid="kit-runs">
      <table className="bs-table w-full text-sm">
        <thead>
          <tr>
            <th>Kit</th>
            <th>Result</th>
            <th>Tests</th>
            <th className="text-right">Line coverage</th>
            <th className="text-right">Seconds</th>
            <th>Log</th>
          </tr>
        </thead>
        <tbody>
          {exec.kits.map((k) => (
            <tr key={k.name} data-testid="kit-run">
              <td className="font-mono text-xs text-ink">{k.name}</td>
              <td className={k.status === 'passed' ? 'text-signal' : 'text-noise'}>{k.status}</td>
              <td className="font-mono text-xs">
                {k.tests
                  ? `${k.tests.passed} passed, ${k.tests.failed} failed, ${k.tests.skipped} skipped`
                  : 'not recorded'}
              </td>
              <td className="text-right font-mono text-xs">
                {typeof k.coveragePct === 'number' ? `${k.coveragePct}%` : 'not measured'}
              </td>
              <td className="text-right font-mono text-xs">{k.seconds.toFixed(1)}</td>
              <td>
                <a href={withBase(kitLogFile(k.name))} className="font-mono text-xs">
                  pytest output
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The three kinds of thing the site holds, and how many of the 500 blueprints are at each, so documentation is never mistaken for a solution. */
export function EvidenceLayers({ release }: { release: ReleaseManifest }) {
  const total = release.checks.schema.useCases;
  const met = (id: string) => release.maturity.find((m) => m.id === id)?.met ?? 0;
  const layers: { name: string; what: string; count: number }[] = [
    {
      name: 'Generated documentation',
      what: 'A complete, schema-valid blueprint with modelled numbers. It describes a solution; it is not one.',
      count: met('schema-validated'),
    },
    {
      name: 'Architecture-validated',
      what: 'The blueprint’s own numbers agree with each other. Modelled, not measured.',
      count: met('feasibility-validated'),
    },
    {
      name: 'Tested reference code',
      what: 'A starter or kit for this problem ran on synthetic data and passed its tests.',
      count: met('synthetic-tested'),
    },
    {
      name: 'Domain-reviewed',
      what: 'A named, qualified specialist reviewed it, with scope and expiry recorded.',
      count: met('expert-validated'),
    },
    {
      name: 'Platform-integrated',
      what: 'Connected to real source systems, identity and a serving platform.',
      count: met('platform-integrated'),
    },
    {
      name: 'Operational (production-evidenced)',
      what: 'Deployed, monitored, with results measured in production.',
      count: met('production-evidenced'),
    },
  ];
  return (
    <div className="overflow-x-auto" data-testid="evidence-layers">
      <table className="bs-table w-full text-sm">
        <thead>
          <tr>
            <th>Evidence layer</th>
            <th>What it means</th>
            <th className="text-right">Blueprints</th>
            <th className="text-right">Share</th>
          </tr>
        </thead>
        <tbody>
          {layers.map((l) => (
            <tr key={l.name}>
              <td className="align-top font-medium text-ink">{l.name}</td>
              <td className="align-top text-mute">{l.what}</td>
              <td className="whitespace-nowrap text-right align-top font-mono text-xs">
                {n(l.count)} of {n(total)}
              </td>
              <td className="whitespace-nowrap text-right align-top font-mono text-xs">
                {total ? ((l.count / total) * 100).toFixed(1) : '0.0'}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReviewProgramme() {
  return (
    <div className="space-y-4 text-sm" data-testid="review-programme">
      <p className="max-w-3xl text-mute">
        A review is only recorded when a named, qualified person has done it and it is entered in{' '}
        <code>content/reviews.json</code> against the schema{' '}
        <a
          href={withBase(
            'https://github.com/sadiqgpasha89/BrainSiphon/blob/main/content/reviews.schema.json',
          )}
        >
          reviews.schema.json
        </a>
        . A review expires on its <code>validUntil</code> date and the blueprint then returns to “not
        reviewed”. This programme exists to recruit reviewers;{' '}
        <strong>it has not completed any review yet</strong>, and the counts above say so.
      </p>
      <div className="overflow-x-auto">
        <table className="bs-table w-full text-xs">
          <thead>
            <tr>
              <th>Panel</th>
              <th>Who is competent to review</th>
              <th>Before any real-world deployment of a high-risk blueprint</th>
            </tr>
          </thead>
          <tbody>
            {REVIEW_PANELS.map((p) => (
              <tr key={p.domain}>
                <td className="align-top font-medium text-ink">{p.domain}</td>
                <td className="align-top">{p.reviewers}</td>
                <td className="align-top">
                  {p.highRiskNeeds.length ? (
                    <ul className="list-disc space-y-1 pl-4">
                      {p.highRiskNeeds.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  ) : (
                    'Not classed high-risk by default; the same review checklist applies.'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="font-semibold text-ink">Review checklist</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-mute">
            {REVIEW_CHECKLIST.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-ink">What a review record contains</h3>
          <dl className="mt-1 space-y-1 text-mute">
            {REVIEW_RECORD_FIELDS.map(([k, v]) => (
              <div key={k}>
                <dt className="inline font-mono text-xs text-ink">{k}</dt> <dd className="inline">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3">
            Found a problem in a blueprint?{' '}
            <a
              className="text-signal underline"
              href="https://github.com/sadiqgpasha89/BrainSiphon/issues/new?template=blueprint-review.yml"
            >
              Raise a finding against that section
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
