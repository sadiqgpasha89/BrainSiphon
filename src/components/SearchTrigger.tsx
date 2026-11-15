'use client';

import { Search } from 'lucide-react';
import { OPEN_PALETTE_EVENT } from './CommandPalette';

const openPalette = () => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));

/** The compact search button in the header: icon only on a phone, "Search ⌘K" from tablet up. */
export function SearchTrigger() {
  return (
    <button
      className="btn !gap-3 !px-2.5 sm:!px-3"
      onClick={openPalette}
      aria-label="Open search (Ctrl or Command + K)"
      data-testid="open-search"
    >
      <Search size={15} aria-hidden />
      <span className="hidden text-mute sm:inline">Search</span>
      <span className="kbd hidden sm:inline">⌘K</span>
    </button>
  );
}

/** A search box for the home page. It looks like an input so people know they can type, and opens the same palette. */
export function SearchBar() {
  return (
    <button
      type="button"
      onClick={openPalette}
      aria-label="Search blueprints"
      data-testid="hero-search"
      className="group flex w-full max-w-xl items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 text-left shadow-sm transition hover:border-mute"
    >
      <Search size={18} className="shrink-0 text-dim group-hover:text-signal" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-mute">
        Search blueprints<span className="hidden sm:inline">, e.g. “fraud detection”</span>
      </span>
      <span className="kbd hidden sm:inline">⌘K</span>
    </button>
  );
}
