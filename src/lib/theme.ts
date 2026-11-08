export const THEME_KEY = 'bs:theme';
export type ThemePref = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

/** Runs in <head> before first paint so there is no flash of the wrong theme. Must stay dependency-free. */
export const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement,t=localStorage.getItem('${THEME_KEY}');var dark=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);d.dataset.theme=dark?'dark':'light';d.dataset.themePref=t==='light'||t==='dark'?t:'system'}catch(e){document.documentElement.dataset.theme='dark'}})()`;

export const resolveTheme = (pref: ThemePref): ResolvedTheme =>
  pref === 'system'
    ? typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark'
    : pref;
