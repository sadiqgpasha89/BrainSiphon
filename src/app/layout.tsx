import type { Metadata, Viewport } from 'next';
import 'katex/dist/katex.min.css';
import './globals.css';
import { CommandPalette } from '../components/CommandPalette';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { THEME_INIT_SCRIPT } from '../lib/theme';
import { IS_STATIC, SITE_NAME, SITE_TAGLINE, SITE_URL } from '../lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — AI/ML system blueprints`, template: `%s · ${SITE_NAME}` },
  description: SITE_TAGLINE,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    description: SITE_TAGLINE,
    ...(IS_STATIC ? {} : { images: ['/api/og'] }),
  },
  alternates: { types: { 'text/markdown': '/llms.txt' } },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0d12' },
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
  ],
  colorScheme: 'dark light',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set by the inline script before paint, so the server markup and the client attribute differ on purpose
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-raised focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <CommandPalette />
      </body>
    </html>
  );
}
