import { Hammer, Route, TriangleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DifficultyChip, LatencyChip, MaturityChip, ParadigmChips } from '../../../components/Badges';
import { ReaderShell } from '../../../components/reader/ReaderShell';
import { PlaybookSection, VERDICT_LABEL, VERDICT_TONE } from '../../../components/reader/Playbook';
import { COMPLETION_META } from '../../../lib/artifacts';
import { AgenticSection } from '../../../components/reader/Agentic';
import { Pager, Sections, tocFor } from '../../../components/reader/Sections';
import {
  DiscoverySection,
  EnterpriseSection,
  ExperimentationSection,
  GovernanceSection,
  MetricsSection,
  MlopsSection,
  OperationsSection,
  ValidationSection,
} from '../../../components/reader/Enterprise';
import { getIndex, getNeighbours, getRelease, getUseCase } from '../../../lib/content';
import { ReleaseLine, ValidationStatusStrip } from '../../../components/reader/ValidationStatus';
import { blueprintStatuses } from '../../../content/release';
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
  const release = await getRelease();
  const statuses = blueprintStatuses(uc, release);
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
    <ReaderShell
      toc={tocFor(Boolean(uc.playbook))}
      slug={uc.slug}
      markdownText={toMarkdown(uc, SITE_URL, release)}
    >
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
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={{ pathname: '/delivery', query: { uc: uc.slug } }}
            className="btn !border-signal/50 !bg-signal-soft !text-signal no-underline"
            data-testid="delivery-link"
          >
            <Route size={14} aria-hidden /> Deliver this use case: step-by-step guide
          </Link>
          {uc.playbook && (
            <a href="#playbook" className="btn no-underline" data-testid="playbook-link">
              <Hammer size={14} aria-hidden />{' '}
              {uc.playbook.compatibility.verdict === 'exact'
                ? 'Build playbook: data, milestones, runnable starter kit'
                : uc.playbook.compatibility.verdict === 'adaptable'
                  ? 'Build playbook: data, milestones, a starter kit to adapt'
                  : 'Build playbook: guidance only, no compatible starter kit'}
            </a>
          )}
        </div>
        {uc.playbook && (
          <p className="mt-3 max-w-3xl text-sm text-mute" data-testid="header-boundary" data-prose>
            <strong className="text-ink">Implementation boundary. </strong>
            {uc.playbook.completion.boundary}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={`/patterns/${uc.pattern}`}
            className="chip !border-signal/50 !bg-signal-soft !text-signal no-underline"
            data-testid="pattern-chip"
            title="The teaching archetype this system resembles. It is not a promise of a compatible starter kit: see the Starter chip for that"
          >
            Pattern: {uc.pattern}
          </Link>
          {uc.playbook && (
            <MaturityChip
              reached={uc.playbook.completion.reached}
              conditional={uc.playbook.completion.conditional}
            />
          )}
          {uc.playbook && (
            <a
              href="#pb-status"
              className={`chip no-underline ${VERDICT_TONE[uc.playbook.compatibility.verdict]}`}
              data-testid="starter-chip"
              title={uc.playbook.compatibility.statement}
            >
              Starter: {VERDICT_LABEL[uc.playbook.compatibility.verdict].toLowerCase()} · reaches{' '}
              {COMPLETION_META[uc.playbook.completion.reached].label.toLowerCase()}
              {uc.playbook.completion.conditional ? ' after changes' : ''}
            </a>
          )}
          <ParadigmChips paradigms={uc.mlParadigms} />
          <LatencyChip latency={uc.latencySLA} />
          <DifficultyChip difficulty={uc.difficulty} />
          <Link
            href={`/${uc.domain}`}
            className={`chip no-underline ${uc.governance.riskTier === 'low' ? '' : '!border-warn/40 !text-warn'}`}
            data-testid="risk-chip"
            title={uc.governance.treatment}
          >
            Risk tier: {uc.governance.riskTier}
          </Link>
        </div>
        <div className="mt-3 space-y-1.5" data-testid="validation-summary">
          <ValidationStatusStrip statuses={statuses} />
          <ReleaseLine release={release} />
          {stale && (
            <p className="flex items-center gap-1.5 text-xs text-warn">
              <TriangleAlert size={12} aria-hidden /> This blueprint was last generated {ageDays} days ago:
              re-check it before relying on it.
            </p>
          )}
        </div>
      </header>
      <article>
        <DiscoverySection uc={uc} />
        <EnterpriseSection uc={uc} />
        <Sections uc={uc} />
        <GovernanceSection uc={uc} />
        <ExperimentationSection uc={uc} />
        <MetricsSection uc={uc} />
        <MlopsSection uc={uc} />
        <OperationsSection uc={uc} />
        <AgenticSection ag={uc.agentic} />
        {uc.playbook && <PlaybookSection pb={uc.playbook} />}
        <ValidationSection uc={uc} release={release} />
      </article>
      <Pager prev={prev} next={next} related={related} />
    </ReaderShell>
  );
}
