export const SITE_NAME = 'BrainSiphon';
export const SITE_TAGLINE =
  'Signal in. Noise out. Blueprints for AI/ML systems that survive 10 million users.';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === '1';
export const SEARCH_MODE = process.env.NEXT_PUBLIC_SEARCH_MODE ?? 'static';

/** Prefix a root-relative path with the deployment base path (needed for plain <a>/fetch, not next/link). */
export const withBase = (p: string) => `${BASE_PATH}${p.startsWith('/') ? p : `/${p}`}`;
