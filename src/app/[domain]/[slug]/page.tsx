import { BadgeCheck, Hammer, TriangleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DifficultyChip, LatencyChip, ParadigmChips } from '../../../components/Badges';
import { ReaderShell } from '../../../components/reader/ReaderShell';
import { PlaybookSection } from '../../../components/reader/Playbook';
import { AgenticSection } from '../../../components/reader/Agentic';
import { Pager, Sections, tocFor } from '../../../components/reader/Sections';
import { getIndex, getNeighbours, getUseCase } from '../../../lib/content';
import { toMarkdown } from '../../../content/markdown';
import { IS_STATIC, SITE_URL } from '../../../lib/site';
import { DOMAIN_META } from '../../../schemas/usecase.schema';

export const dynamicParams = false;
export const revalidate = 86400;

const STALE_DAYS = 180;

export async function generateStaticParams() {
  return (await getIndex()).map((e) => ({ domain: e.domain, slug: e.slug.split('/')[1]! }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string; slug: string }>;
}): Promise<Metadata> {
  const { domain, slug } = await params;
  const uc = await getUseCase(`${domain}/${slug}`);
  if (!uc) return {};
  return {
    title: uc.title,
    description: uc.summary,
    alternates: { canonical: `/${uc.slug}`, types: { 'text/markdown': `/${uc.slug}.md` } },
    openGraph: {
      title: uc.title,
      description: uc.summary,
      type: 'article',
      ...(IS_STATIC ? {} : { images: [`/api/og?slug=${uc.slug}`] }),
    },
  };
}

export default async function UseCasePage({ params }: { params: Promise<{ domain: string; slug: string }> }) {
  const { domain, slug } = await params;
  const full = `${domain}/${slug}`;
  const uc = await getUseCase(full);
  if (!uc) notFound();
  const { prev, next, related } = await getNeighbours(full);
  const entry = (await getIndex()).find((e) => e.slug === full);

  const ageDays = Math.floor((Date.now() - new Date(uc.lastVerifiedAt).getTime()) / 86_400_000);
  const stale = ageDays > STALE_DAYS;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: uc.title,
    description: uc.summary,
    dateModified: uc.lastVerifiedAt,
    articleSection: DOMAIN_META[uc.domain].name,
    url: `${SITE_URL}/${uc.slug}`,
  };

  return (
    <ReaderShell toc={tocFor(Boolean(uc.playbook))} slug={uc.slug} markdownText={toMarkdown(uc, SITE_URL)}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <header className="mb-8">
        <nav aria-label="Breadcrumb" className="mb-3 font-mono text-xs text-dim">
          <Link href="/" className="hover:text-ink">
            BrainSiphon
          </Link>{' '}
          /{' '}
          <Link href={`/${uc.domain}`} className="hover:text-ink">
            {DOMAIN_META[uc.domain].short}
          </Link>
          {entry?.trackId && (
            <>
              {' '}
              /{' '}
              <Link
                href={`/${uc.domain}?track=${entry.trackId}#catalog`}
                className="hover:text-ink"
                data-testid="track-crumb"
              >
                {entry.trackName}
              </Link>
            </>
          )}
        </nav>
        <h1
          className="max-w-4xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
          data-testid="uc-title"
        >
          {uc.title}
        </h1>
        <p className="mt-3 max-w-3xl text-lg text-mute" data-prose>
          {uc.summary}
        </p>
        {uc.playbook && (
          <a
            href="#playbook"
            className="btn mt-4 !border-signal/50 !bg-signal-soft !text-signal no-underline"
            data-testid="playbook-link"
          >
            <Hammer size={14} aria-hidden /> Build playbook: data, milestones, runnable starter kit
          </a>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={`/patterns/${uc.pattern}`}
            className="chip !border-signal/50 !bg-signal-soft !text-signal no-underline"
            data-testid="pattern-chip"
            title="The reference pattern and runnable kit this system is an instance of"
          >
            Pattern: {uc.pattern}
          </Link>
          <ParadigmChips paradigms={uc.mlParadigms} />
          <LatencyChip latency={uc.latencySLA} />
          <DifficultyChip difficulty={uc.difficulty} />
          <span
            className={`chip ${stale ? '!border-warn/40 !bg-warn/10 !text-warn' : 'chip-signal'}`}
            data-testid="verified-badge"
            title="Last verified against production standards"
          >
            {stale ? <TriangleAlert size={12} aria-hidden /> : <BadgeCheck size={12} aria-hidden />}
            {stale ? 'Needs re-verification' : 'Verified against production standards'} · {uc.lastVerifiedAt}
          </span>
        </div>
      </header>
      <article>
        <Sections uc={uc} />
        <AgenticSection ag={uc.agentic} />
        {uc.playbook && <PlaybookSection pb={uc.playbook} />}
      </article>
      <Pager prev={prev} next={next} related={related} />
    </ReaderShell>
  );
}
