import type { Metadata, Viewport } from 'next';
import 'katex/dist/katex.min.css';
import './globals.css';
import { CommandPalette } from '../components/CommandPalette';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
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
  themeColor: '#0a0d12',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
