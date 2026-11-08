'use client';

import { Search } from 'lucide-react';
import { OPEN_PALETTE_EVENT } from './CommandPalette';

export function SearchTrigger() {
  return (
    <button
      className="btn !gap-3"
      onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
      aria-label="Open search (Ctrl or Command + K)"
      data-testid="open-search"
    >
      <Search size={15} aria-hidden />
      <span className="hidden text-mute sm:inline">Search</span>
      <span className="kbd hidden sm:inline">⌘K</span>
    </button>
  );
}
