'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DOMAINS, DOMAIN_META } from '../schemas/usecase.schema';

const LINK =
  'block whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm no-underline transition hover:bg-raised';

/**
 * Four destinations instead of a scrolling row of twelve: the delivery guide, the use cases (the ten domains, in a menu),
 * patterns and deployment. On a phone the last two move into the menu.
 */
export function HeaderNav() {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const here = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const inDomain = DOMAINS.some((d) => here(`/${d}`));

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  return (
    <nav aria-label="Main" className="flex min-w-0 flex-1 items-center gap-1">
      <Link
        href="/delivery"
        aria-current={here('/delivery') ? 'page' : undefined}
        className={`${LINK} hidden sm:block ${here('/delivery') ? 'text-signal' : 'text-mute hover:text-ink'}`}
      >
        Delivery guide
      </Link>
      <Link
        href="/workspace"
        aria-current={here('/workspace') ? 'page' : undefined}
        className={`${LINK} hidden sm:block ${here('/workspace') ? 'text-signal' : 'text-mute hover:text-ink'}`}
      >
        Workspace
      </Link>
      <div ref={wrap} className="sm:relative">
        <button
          type="button"
          className={`${LINK} flex items-center gap-1 ${inDomain || open ? 'text-ink' : 'text-mute hover:text-ink'}`}
          aria-expanded={open}
          aria-controls="usecases-menu"
          onClick={() => setOpen((v) => !v)}
          data-testid="usecases-button"
        >
          <span className="hidden sm:inline">Use cases</span>
          <span className="sm:hidden">Menu</span>
          <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        <div
          id="usecases-menu"
          hidden={!open}
          className="card absolute inset-x-3 top-full z-50 mt-1 p-2 shadow-xl shadow-black/20 sm:inset-x-auto sm:left-0 sm:mt-2 sm:w-[34rem]"
        >
          <Link
            href="/delivery"
            className="mb-1 block rounded-md px-3 py-2 text-sm font-medium text-signal no-underline hover:bg-raised sm:hidden"
          >
            Delivery guide
          </Link>
          <Link
            href="/workspace"
            className="mb-1 block rounded-md px-3 py-2 text-sm font-medium text-signal no-underline hover:bg-raised sm:hidden"
          >
            Workspace
          </Link>
          <Link
            href="/about"
            className="mb-1 block rounded-md px-3 py-2 text-sm font-medium text-signal no-underline hover:bg-raised sm:hidden"
          >
            About
          </Link>
          <nav aria-label="Domains">
            <p className="px-3 pb-1 pt-1 font-mono text-[11px] uppercase tracking-wider text-dim">
              {DOMAINS.length} domains · 50 use cases each
            </p>
            <ul className="grid gap-0.5 sm:grid-cols-2">
              {DOMAINS.map((d) => (
                <li key={d}>
                  <Link
                    href={`/${d}`}
                    aria-current={here(`/${d}`) ? 'page' : undefined}
                    className={`block rounded-md px-3 py-2 no-underline hover:bg-raised ${here(`/${d}`) ? 'bg-raised' : ''}`}
                  >
                    <span className="text-sm font-medium text-ink">{DOMAIN_META[d].short}</span>
                    <span className="hidden truncate text-xs text-mute sm:block">{DOMAIN_META[d].blurb}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-1 flex gap-1 border-t border-line pt-1 md:hidden">
            <Link href="/patterns" className={`${LINK} text-mute hover:text-ink`}>
              Patterns
            </Link>
            <Link href="/deployment" className={`${LINK} text-mute hover:text-ink`}>
              Deployment
            </Link>
            <Link href="/about" className={`${LINK} text-mute hover:text-ink sm:hidden`}>
              About
            </Link>
          </div>
        </div>
      </div>
      <Link
        href="/patterns"
        aria-current={here('/patterns') ? 'page' : undefined}
        className={`${LINK} hidden md:block ${here('/patterns') ? 'text-signal' : 'text-mute hover:text-ink'}`}
      >
        Patterns
      </Link>
      <Link
        href="/deployment"
        aria-current={here('/deployment') ? 'page' : undefined}
        className={`${LINK} hidden md:block ${here('/deployment') ? 'text-signal' : 'text-mute hover:text-ink'}`}
      >
        Deployment
      </Link>
      <Link
        href="/about"
        aria-current={here('/about') ? 'page' : undefined}
        className={`${LINK} hidden sm:block ${here('/about') ? 'text-signal' : 'text-mute hover:text-ink'}`}
      >
        About
      </Link>
    </nav>
  );
}
