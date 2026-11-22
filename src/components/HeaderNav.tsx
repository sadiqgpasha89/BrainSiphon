'use client';

import { ChevronDown, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { GUIDE_LINK, MORE_LINKS, TEMPLATES_LINK, START_LINK, isHere } from '../lib/nav';
import { DOMAINS, DOMAIN_META } from '../schemas/usecase.schema';
import { SearchTrigger } from './SearchTrigger';
import { ThemeToggle } from './ThemeToggle';

type MenuId = 'blueprints' | 'more' | 'mobile';

const TOP = 'flex items-center gap-1 rounded-md px-3 py-2 text-sm no-underline transition hover:bg-raised';
const LABEL = 'px-3 pb-1 pt-1 font-mono text-[11px] uppercase tracking-wider text-dim';
const ITEM = 'block rounded-md px-3 py-2 no-underline hover:bg-raised';
const tone = (on: boolean) => (on ? 'text-ink' : 'text-mute hover:text-ink');

/**
 * Everything to the right of the logo. Four things in the bar on a desktop: Start here, Blueprints (a menu of the ten industries),
 * the delivery guide, and More (a menu of the specialised pages, each with a plain-language line). The worked templates are a separate button so
 * it is never mistaken for free content. On a phone the same lists open as one menu panel; nothing changes by screen size
 * except where it is shown.
 */
export function HeaderNav() {
  const [open, setOpen] = useState<MenuId | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const here = (href: string) => isHere(pathname, href);
  const inIndustry = DOMAINS.some((d) => here(`/${d}`));
  const inMore = MORE_LINKS.some((l) => here(l.href));

  useEffect(() => setOpen(null), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(null);
      trigger.current?.focus();
    };
    const onDown = (e: globalThis.MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(null);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const toggle = (id: MenuId) => (e: MouseEvent<HTMLElement>) => {
    trigger.current = e.currentTarget;
    setOpen((cur) => (cur === id ? null : id));
  };

  return (
    <div ref={root} className="flex min-w-0 flex-1 items-center">
      {/* desktop */}
      <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
        <Link
          href={START_LINK.href}
          aria-current={here(START_LINK.href) ? 'page' : undefined}
          data-testid="nav-start"
          className={`${TOP} font-medium ${here(START_LINK.href) ? 'bg-raised text-signal' : 'text-signal hover:text-signal'}`}
        >
          {START_LINK.label}
        </Link>

        <div className="relative">
          <button
            type="button"
            className={`${TOP} ${tone(inIndustry || open === 'blueprints')}`}
            aria-expanded={open === 'blueprints'}
            aria-controls="menu-blueprints"
            onClick={toggle('blueprints')}
            data-testid="nav-blueprints"
          >
            Blueprints
            <ChevronDown
              size={14}
              className={`transition ${open === 'blueprints' ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
          <div
            id="menu-blueprints"
            hidden={open !== 'blueprints'}
            className="card absolute left-0 top-full z-50 mt-2 w-[36rem] p-2 shadow-xl shadow-black/20"
          >
            <nav aria-label="Industries">
              <p className={LABEL}>{DOMAINS.length} industries · 575 blueprints</p>
              <ul className="grid grid-cols-2 gap-0.5">
                {DOMAINS.map((d) => (
                  <li key={d}>
                    <Link
                      href={`/${d}`}
                      aria-current={here(`/${d}`) ? 'page' : undefined}
                      className={`${ITEM} ${here(`/${d}`) ? 'bg-raised' : ''}`}
                    >
                      <span className="block text-sm font-medium text-ink">{DOMAIN_META[d].short}</span>
                      <span className="block truncate text-xs text-mute">{DOMAIN_META[d].topics}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <Link
          href={GUIDE_LINK.href}
          aria-current={here(GUIDE_LINK.href) ? 'page' : undefined}
          className={`${TOP} ${here(GUIDE_LINK.href) ? 'bg-raised text-ink' : tone(false)}`}
        >
          {GUIDE_LINK.label}
        </Link>

        <div className="relative">
          <button
            type="button"
            className={`${TOP} ${tone(inMore || open === 'more')}`}
            aria-expanded={open === 'more'}
            aria-controls="menu-more"
            onClick={toggle('more')}
            data-testid="nav-more"
          >
            More
            <ChevronDown
              size={14}
              className={`transition ${open === 'more' ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
          <div
            id="menu-more"
            hidden={open !== 'more'}
            className="card absolute left-0 top-full z-50 mt-2 w-[22rem] p-2 shadow-xl shadow-black/20"
          >
            <ul>
              {MORE_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={here(l.href) ? 'page' : undefined}
                    className={`${ITEM} ${here(l.href) ? 'bg-raised' : ''}`}
                  >
                    <span className="block text-sm font-medium text-ink">{l.label}</span>
                    <span className="block text-xs text-mute">{l.blurb}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>

      {/* always visible */}
      <div className="ml-auto flex items-center gap-2">
        <SearchTrigger />
        <ThemeToggle />
        <Link
          href={TEMPLATES_LINK.href}
          aria-current={here(TEMPLATES_LINK.href) ? 'page' : undefined}
          data-testid="nav-templates"
          className="hidden items-center rounded-lg border border-line bg-raised px-3 py-1.5 text-sm font-medium text-ink no-underline transition hover:bg-raised md:inline-flex"
        >
          {TEMPLATES_LINK.label}
        </Link>
        <button
          type="button"
          className="btn !px-2.5 lg:hidden"
          aria-expanded={open === 'mobile'}
          aria-controls="menu-mobile"
          aria-label={open === 'mobile' ? 'Close menu' : 'Open menu'}
          onClick={toggle('mobile')}
          data-testid="nav-menu"
        >
          {open === 'mobile' ? <X size={16} aria-hidden /> : <Menu size={16} aria-hidden />}
        </button>
      </div>

      {/* phone and tablet */}
      <div
        id="menu-mobile"
        hidden={open !== 'mobile'}
        className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-line bg-bg shadow-xl shadow-black/30 lg:hidden"
      >
        <nav aria-label="Mobile" className="mx-auto max-w-7xl space-y-6 px-4 py-5">
          <div className="border-b border-line pb-2">
            <a href="https://sadiqgpasha89.github.io" className={`${ITEM} font-medium`}>
              <span className="block text-base font-semibold text-signal">← Portfolio</span>
              <span className="block text-sm text-mute">Return to sadiqgpasha89.github.io</span>
            </a>
          </div>

          <ul className="space-y-1">
            {[START_LINK, GUIDE_LINK, TEMPLATES_LINK].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={here(l.href) ? 'page' : undefined}
                  className={`${ITEM} ${here(l.href) ? 'bg-raised' : ''}`}
                >
                  <span
                    className={`block text-base font-semibold ${l.href === START_LINK.href ? 'text-signal' : 'text-ink'}`}
                  >
                    {l.label}
                  </span>
                  <span className="block text-sm text-mute">{l.blurb}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div>
            <p className={LABEL}>Blueprints by industry</p>
            <ul className="grid grid-cols-2 gap-1">
              {DOMAINS.map((d) => (
                <li key={d}>
                  <Link
                    href={`/${d}`}
                    aria-current={here(`/${d}`) ? 'page' : undefined}
                    className={`${ITEM} text-sm font-medium text-ink ${here(`/${d}`) ? 'bg-raised' : ''}`}
                  >
                    {DOMAIN_META[d].short}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className={LABEL}>More</p>
            <ul>
              {MORE_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={here(l.href) ? 'page' : undefined}
                    className={`${ITEM} ${here(l.href) ? 'bg-raised' : ''}`}
                  >
                    <span className="block text-sm font-medium text-ink">{l.label}</span>
                    <span className="block text-xs text-mute">{l.blurb}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </div>
  );
}
