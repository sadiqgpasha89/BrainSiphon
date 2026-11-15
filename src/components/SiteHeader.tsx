import Link from 'next/link';
import { HeaderNav } from './HeaderNav';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="relative mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 lg:gap-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight no-underline"
          aria-label="BrainSiphon home"
        >
          <span
            className="inline-block h-3 w-3 rounded-full bg-signal shadow-[0_0_12px_rgb(var(--c-signal)/0.8)]"
            aria-hidden
          />
          <span>BrainSiphon</span>
        </Link>
        <HeaderNav />
      </div>
    </header>
  );
}
