import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DifficultyChip, LatencyChip } from '../../../components/Badges';
import { getIndex, getPatterns } from '../../../lib/content';
import { DOMAINS, DOMAIN_META, PATTERN_IDS, type UseCaseIndexEntry } from '../../../schemas/usecase.schema';
import { PROBLEM_LABEL, type ProblemType } from '../../../lib/problem-types';

export const dynamicParams = false;
export const revalidate = 86400;

const KIT_BASE = 'https://github.com/sadiqgpasha89/BrainSiphon/tree/main/content/kits';

export function generateStaticParams() {
  return PATTERN_IDS.map((kit) => ({ kit }));
}

export async function generateMetadata({ params }: { params: Promise<{ kit: string }> }): Promise<Metadata> {
  const { kit } = await params;
  const p = (await getPatterns()).find((x) => x.id === kit);
  return p ? { title: `Pattern: ${p.label}`, description: p.summary } : {};
}

export default async function PatternPage({ params }: { params: Promise<{ kit: string }> }) {
  const { kit } = await params;
  const [patterns, index] = await Promise.all([getPatterns(), getIndex()]);
  const p = patterns.find((x) => x.id === kit);
  if (!p) notFound();
  const uses = index.filter((e) => e.pattern === p.id);
  // a pattern is a teaching archetype; a kit is a starter only for the blueprints whose compatibility check chose it
  const exact = index.filter((e) => e.starter?.kitId === p.id && e.starter.verdict === 'exact');
  const adaptable = index.filter((e) => e.starter?.kitId === p.id && e.starter.verdict === 'adaptable');
  const background = uses.filter((e) => e.starter?.kitId !== p.id);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10">
      <nav aria-label="Breadcrumb" className="mb-3 font-mono text-xs text-dim">
        <Link href="/patterns" className="hover:text-ink">
          Patterns
        </Link>
      </nav>
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-signal">Pattern · {p.id}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl" data-testid="pattern-title">
          {p.label}
        </h1>
        <p className="mt-3 max-w-3xl text-mute">{p.summary}</p>
        <a
          className="btn mt-4 no-underline"
          href={`${KIT_BASE}/${p.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open the reference kit on GitHub
        </a>
      </header>

      <section className="mb-10 grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">What it predicts</p>
          <p className="text-sm text-ink/90">{p.target}</p>
        </div>
        <div className="card p-4">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">Run it ({p.runtime})</p>
          <pre className="overflow-x-auto rounded-md bg-panel p-3 text-xs">{p.run.join('\n')}</pre>
          <p className="mt-2 text-xs text-mute">{p.expected}</p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-mono text-xs uppercase tracking-wider text-signal">Traps this pattern teaches</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {p.lessons.map((l) => (
            <li key={l.trap} className="card p-4">
              <p className="font-semibold text-ink">{l.trap}</p>
              <p className="mt-1 text-sm text-mute">{l.evidence}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10 space-y-6" data-testid="pattern-starter-fit">
        <h2 className="font-mono text-xs uppercase tracking-wider text-signal">
          Which blueprints this kit is a starter for
        </h2>
        <p className="max-w-3xl text-sm text-mute">
          A pattern is a teaching archetype; a kit is a starter only where it implements the same fundamental
          problem. Sharing a broad paradigm is not enough. Each blueprint&apos;s compatibility check chose, or
          refused, this kit.
        </p>
        <KitList
          title="Exact match"
          note="The kit implements the same problem. It runs on synthetic data; serving and rollout are yours."
          items={exact}
          testId="kit-exact"
        />
        <KitList
          title="Adaptable match"
          note="Reusable parts only. Each blueprint lists the modifications needed before the kit does its job."
          items={adaptable}
          testId="kit-adaptable"
        />
        <KitList
          title="Same pattern, but not this kit"
          note="These blueprints resemble this pattern, but the kit is not their starter: they have a better-fitting kit or none at all. Read the kit for background only."
          items={background}
          testId="kit-background"
        />
      </section>

      <section className="mb-16" data-testid="pattern-usecases">
        <h2 className="font-mono text-xs uppercase tracking-wider text-signal">
          {uses.length} blueprints use this pattern
        </h2>
        {DOMAINS.map((d) => {
          const list = uses.filter((e) => e.domain === d);
          if (!list.length) return null;
          return (
            <div key={d} className="mt-6">
              <h3 className="mb-2 font-semibold text-ink">
                <Link href={`/${d}`} className="no-underline hover:text-signal">
                  {DOMAIN_META[d].name}
                </Link>{' '}
                <span className="font-mono text-xs text-dim">{list.length}</span>
              </h3>
              <ul className="divide-y divide-line/70 overflow-hidden rounded-xl border border-line">
                {list.map((e) => (
                  <li key={e.slug}>
                    <Link
                      href={`/${e.slug}`}
                      className="flex flex-wrap items-center gap-2 px-4 py-3 no-underline hover:bg-raised/70"
                    >
                      <span className="min-w-0 flex-1 text-sm font-medium text-ink">{e.title}</span>
                      {e.trackName && <span className="chip">{e.trackName}</span>}
                      <LatencyChip latency={e.latencySLA} />
                      <DifficultyChip difficulty={e.difficulty} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function KitList({
  title,
  note,
  items,
  testId,
}: {
  title: string;
  note: string;
  items: UseCaseIndexEntry[];
  testId: string;
}) {
  return (
    <div data-testid={testId}>
      <h3 className="font-semibold text-ink">
        {title} <span className="font-mono text-xs text-dim">{items.length}</span>
      </h3>
      <p className="mb-2 text-sm text-mute">{note}</p>
      {items.length > 0 && (
        <ul className="divide-y divide-line/70 overflow-hidden rounded-xl border border-line">
          {items.map((e) => (
            <li key={e.slug}>
              <Link
                href={`/${e.slug}#pb-status`}
                className="flex flex-wrap items-center gap-2 px-4 py-2 no-underline hover:bg-raised/70"
              >
                <span className="min-w-0 flex-1 text-sm font-medium text-ink">{e.title}</span>
                {e.starter && (
                  <span className="chip">{PROBLEM_LABEL[e.starter.problemType as ProblemType]}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
