import Link from 'next/link';
import { DOMAINS, DOMAIN_META } from '../schemas/usecase.schema';
import { SearchTrigger } from './SearchTrigger';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight no-underline"
          aria-label="BrainSiphon home"
        >
          <span
            className="inline-block h-3 w-3 rounded-full bg-signal shadow-[0_0_12px_#34d399]"
            aria-hidden
          />
          <span>BrainSiphon</span>
        </Link>
        <nav aria-label="Domains" className="min-w-0 flex-1 overflow-x-auto">
          <ul className="flex w-max items-center gap-1">
            {DOMAINS.map((d) => (
              <li key={d}>
                <Link
                  href={`/${d}`}
                  className="block whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-mute no-underline transition hover:bg-raised hover:text-ink"
                >
                  {DOMAIN_META[d].short}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <SearchTrigger />
      </div>
    </header>
  );
}
