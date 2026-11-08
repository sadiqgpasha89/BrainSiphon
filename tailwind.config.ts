import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Colours are CSS variables (space-separated RGB) so that Tailwind opacity modifiers keep working and a
      // theme is just a different set of values: see :root and [data-theme='light'] in globals.css.
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        panel: 'rgb(var(--c-panel) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        mute: 'rgb(var(--c-mute) / <alpha-value>)',
        dim: 'rgb(var(--c-dim) / <alpha-value>)',
        signal: {
          DEFAULT: 'rgb(var(--c-signal) / <alpha-value>)',
          soft: 'rgb(var(--c-signal-soft) / <alpha-value>)',
          line: 'rgb(var(--c-signal-line) / <alpha-value>)',
        },
        noise: {
          DEFAULT: 'rgb(var(--c-noise) / <alpha-value>)',
          soft: 'rgb(var(--c-noise-soft) / <alpha-value>)',
          line: 'rgb(var(--c-noise-line) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--c-accent) / <alpha-value>)',
          soft: 'rgb(var(--c-accent-soft) / <alpha-value>)',
        },
        warn: 'rgb(var(--c-warn) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
