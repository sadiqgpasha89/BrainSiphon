import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Catalog } from '../../components/Catalog';
import Link from 'next/link';
import { getDomainEntries, getTracks } from '../../lib/content';
import { DifficultyChip } from '../../components/Badges';
import { DOMAINS, DOMAIN_META, DomainEnum } from '../../schemas/usecase.schema';

export const dynamicParams = false;
export const revalidate = 86400;

export function generateStaticParams() {
  return DOMAINS.map((domain) => ({ domain }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const d = DomainEnum.safeParse((await params).domain);
  if (!d.success) return {};
  return { title: DOMAIN_META[d.data].name, description: DOMAIN_META[d.data].blurb };
}

export default async function DomainPage({ params }: { params: Promise<{ domain: string }> }) {
  const parsed = DomainEnum.safeParse((await params).domain);
  if (!parsed.success) notFound();
  const domain = parsed.data;
  const meta = DOMAIN_META[domain];
  const entries = await getDomainEntries(domain);
  const { tracks, startHere } = await getTracks(domain);
  const bySlug = new Map(entries.map((e) => [e.slug, e]));

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10">
      <header className="mb-8 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-wider text-signal">
          Domain · {entries.length} blueprints
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{meta.name}</h1>
        <p className="mt-3 text-mute">{meta.blurb}</p>
      </header>
      <section aria-labelledby="start-h" className="mb-10" data-testid="start-here">
        <h2 id="start-h" className="font-mono text-xs uppercase tracking-wider text-signal">
          Start here
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-mute">{startHere.intro}</p>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {startHere.steps.map((st, i) => {
            const e = bySlug.get(st.slug)!;
            return (
              <li key={st.slug} className="card p-4">
                <p className="font-mono text-xs text-dim">Step {i + 1}</p>
                <Link
                  href={`/${e.slug}`}
                  className="mt-1 block font-semibold leading-snug text-ink no-underline hover:text-signal"
                >
                  {e.title}
                </Link>
                <p className="mt-2 text-sm text-mute">{st.why}</p>
                <div className="mt-3">
                  <DifficultyChip difficulty={e.difficulty} />
                </div>
              </li>
            );
          })}
        </ol>
      </section>
      <section aria-labelledby="tracks-h" className="mb-10" data-testid="tracks">
        <h2 id="tracks-h" className="font-mono text-xs uppercase tracking-wider text-signal">
          {tracks.length} tracks
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tracks.map((t) => (
            <li key={t.id}>
              <Link
                href={`/${domain}?track=${t.id}#catalog`}
                className="card block h-full p-4 no-underline transition hover:border-signal"
              >
                <p className="font-semibold leading-snug text-ink">{t.name}</p>
                <p className="mt-1 line-clamp-3 text-sm text-mute">{t.blurb}</p>
                <p className="mt-2 font-mono text-xs text-dim">{t.slugs.length} blueprints</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <div id="catalog" className="scroll-mt-20" />
      <Suspense fallback={<p className="text-mute">Loading catalog…</p>}>
        <Catalog entries={entries} domainName={meta.short} />
      </Suspense>
    </div>
  );
}
