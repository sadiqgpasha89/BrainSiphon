import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0d12',
        panel: '#10151d',
        raised: '#161c27',
        line: '#222b3a',
        ink: '#e6edf6',
        mute: '#93a1b5',
        dim: '#64748b',
        signal: { DEFAULT: '#34d399', soft: '#0b2e25', line: '#14584a' },
        noise: { DEFAULT: '#fb7185', soft: '#33121a', line: '#6b2432' },
        accent: { DEFAULT: '#818cf8', soft: '#1e1b3a' },
        warn: '#fbbf24',
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
