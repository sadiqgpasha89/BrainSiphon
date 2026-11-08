import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CodeBlock } from '../../../../components/Code';
import { PRIMITIVES, PRIMITIVE_BY_ID } from '../../../../content/primitives';
import { getIndex } from '../../../../lib/content';
import { DOMAIN_META } from '../../../../schemas/usecase.schema';

export const dynamicParams = false;
export const revalidate = 86400;

export function generateStaticParams() {
  return PRIMITIVES.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = PRIMITIVE_BY_ID[id];
  return p ? { title: `Primitive: ${p.title}`, description: p.summary } : {};
}

export default async function PrimitivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = PRIMITIVE_BY_ID[id];
  if (!p) notFound();
  const uses = (await getIndex()).filter((e) => e.primitives?.includes(p.id));
  const shown = uses.slice(0, 60);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10">
      <nav aria-label="Breadcrumb" className="mb-3 font-mono text-xs text-dim">
        <Link href="/patterns" className="hover:text-ink">
          Patterns
        </Link>{' '}
        / primitives
      </nav>
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-signal">Primitive · {p.id}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl" data-testid="primitive-title">
          {p.title}
        </h1>
        <p className="mt-3 max-w-3xl text-mute">{p.summary}</p>
      </header>

      <section className="card mb-8 p-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-dim">Reach for it when</p>
        <p className="text-sm text-ink/90">{p.whenToUse}</p>
      </section>

      <section className="mb-8">
        <h2 className="h-section mb-3">How it works</h2>
        <ol className="space-y-2 text-sm text-ink/90">
          {p.how.map((h, i) => (
            <li key={h} className="flex gap-3">
              <span className="font-mono text-dim">{i + 1}.</span>
              <span>{h}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="h-section mb-3">Reference sketch</h2>
        <CodeBlock code={p.code} lang={p.language} title={p.language} />
      </section>

      <section className="card mb-8 border-noise-line p-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-noise">Pitfalls</p>
        <ul className="space-y-2 text-sm">
          {p.pitfalls.map((x) => (
            <li key={x} className="text-ink/90">
              {x}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="h-section mb-3">Blueprints that use it ({uses.length})</h2>
        <ul className="grid gap-2 sm:grid-cols-2" data-testid="primitive-uses">
          {shown.map((e) => (
            <li key={e.id}>
              <Link
                href={`/${e.slug}`}
                className="card flex items-baseline justify-between gap-3 px-4 py-2 text-sm no-underline hover:border-mute"
              >
                <span className="text-ink">{e.title}</span>
                <span className="shrink-0 font-mono text-[11px] text-dim">{DOMAIN_META[e.domain].short}</span>
              </Link>
            </li>
          ))}
        </ul>
        {uses.length > shown.length && (
          <p className="mt-3 text-xs text-dim">
            Showing {shown.length} of {uses.length}; search for the rest.
          </p>
        )}
      </section>
    </div>
  );
}
