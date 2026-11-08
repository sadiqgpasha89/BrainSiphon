'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { THEME_KEY, resolveTheme, type ThemePref } from '../lib/theme';

const OPTIONS: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'System theme', Icon: Monitor },
  { value: 'light', label: 'Light theme', Icon: Sun },
  { value: 'dark', label: 'Dark theme', Icon: Moon },
];

function apply(pref: ThemePref) {
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(pref);
  root.dataset.themePref = pref;
}

/** System / Light / Dark. The choice is remembered in localStorage; "system" follows the OS live. */
export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>('system');

  useEffect(() => {
    const p = document.documentElement.dataset.themePref;
    if (p === 'light' || p === 'dark' || p === 'system') setPref(p);
  }, []);

  // while on "system", follow OS changes without a reload
  useEffect(() => {
    if (pref !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const on = () => apply('system');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [pref]);

  const choose = useCallback((v: ThemePref) => {
    setPref(v);
    apply(v);
    try {
      if (v === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, v);
    } catch {
      /* storage unavailable: the choice still applies for this page view */
    }
  }, []);

  return (
    <div
      role="group"
      aria-label="Colour theme"
      data-testid="theme-toggle"
      className="flex shrink-0 items-center rounded-lg border border-line bg-raised p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => choose(value)}
          aria-pressed={pref === value}
          aria-label={label}
          title={label}
          data-testid={`theme-${value}`}
          className={`rounded-md p-1.5 transition ${pref === value ? 'bg-signal-soft text-signal' : 'text-mute hover:text-ink'}`}
        >
          <Icon size={14} aria-hidden />
        </button>
      ))}
    </div>
  );
}
