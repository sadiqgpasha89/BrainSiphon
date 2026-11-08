import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Catalog } from '../../components/Catalog';
import { getDomainEntries } from '../../lib/content';
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

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10">
      <header className="mb-8 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-wider text-signal">
          Domain · {entries.length} blueprints
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{meta.name}</h1>
        <p className="mt-3 text-mute">{meta.blurb}</p>
      </header>
      <Suspense fallback={<p className="text-mute">Loading catalog…</p>}>
        <Catalog entries={entries} domainName={meta.short} />
      </Suspense>
    </div>
  );
}
