import Link from 'next/link';
import { HeaderNav } from './HeaderNav';
import { SearchTrigger } from './SearchTrigger';
import { ThemeToggle } from './ThemeToggle';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="relative mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:gap-4">
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
        <HeaderNav />
        <ThemeToggle />
        <SearchTrigger />
      </div>
    </header>
  );
}
