import type { Metadata } from 'next';
import Link from 'next/link';
import { getIndex, getPatterns } from '../../lib/content';
import { PRIMITIVES } from '../../content/primitives';
import { DOMAIN_META } from '../../schemas/usecase.schema';

export const revalidate = 86400;
export const metadata: Metadata = {
  title: 'Patterns',
  description:
    'Eleven reference patterns cover all 500 blueprints. Learn a pattern once with a runnable kit, then apply it across domains.',
};

export default async function PatternsPage() {
  const [patterns, index] = await Promise.all([getPatterns(), getIndex()]);
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10">
      <header className="mb-8 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-wider text-signal">Learn by pattern</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          11 patterns, {index.length} blueprints
        </h1>
        <p className="mt-3 text-mute">
          Every blueprint is an instance of one of eleven patterns. Each pattern has a runnable reference kit
          that shows its traps on synthetic data. Learn a pattern once, then see it in every domain.
        </p>
      </header>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="pattern-list">
        {patterns.map((p) => {
          const uses = index.filter((e) => e.pattern === p.id);
          const domains = [...new Set(uses.map((e) => e.domain))];
          return (
            <li key={p.id}>
              <Link
                href={`/patterns/${p.id}`}
                className="card block h-full p-5 no-underline transition hover:border-signal"
              >
                <p className="font-mono text-xs text-dim">{p.id}</p>
                <h2 className="mt-1 text-lg font-semibold leading-snug text-ink">{p.label}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-mute">{p.summary}</p>
                <p className="mt-3 font-mono text-xs text-signal">
                  {uses.length} blueprints · {domains.map((d) => DOMAIN_META[d].short).join(', ')}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      <section aria-labelledby="primitives" className="mt-14">
        <h2 id="primitives" className="h-section">
          {PRIMITIVES.length} architectural primitives
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-mute">
          Mechanisms that repeat across blueprints (point-in-time joins, budget pacers, load shedding, outbox
          + CDC) are written up once here. Blueprints link to them instead of repeating the detail.
        </p>
        <ul className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3" data-testid="primitive-list">
          {PRIMITIVES.map((p) => {
            const n = index.filter((e) => e.primitives?.includes(p.id)).length;
            return (
              <li key={p.id}>
                <Link
                  href={`/patterns/primitives/${p.id}`}
                  className="card block h-full p-4 no-underline transition hover:border-signal"
                >
                  <h3 className="font-semibold text-ink">{p.title}</h3>
                  <p className="mt-1 line-clamp-3 text-sm text-mute">{p.summary}</p>
                  <p className="mt-2 font-mono text-xs text-signal">{n} blueprints</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
