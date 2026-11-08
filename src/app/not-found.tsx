'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import history from '../../content/slug-history.json';

const map = history as Record<string, string>;

/**
 * Server deployments redirect renamed slugs with 308 in middleware.
 * Static deployments (no middleware) get the same outcome here, client-side, so bookmarks never dead-end.
 */
export default function NotFound() {
  const pathname = usePathname();
  const router = useRouter();
  const key = (pathname ?? '').replace(/^\/+|\/+$/g, '');
  const target = map[key];

  useEffect(() => {
    if (target) router.replace(`/${target}`);
  }, [target, router]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="font-mono text-sm text-noise">404</p>
      <h1 className="mt-2 text-3xl font-semibold">{target ? 'This blueprint moved' : 'No signal here'}</h1>
      <p className="mt-3 text-mute">
        {target
          ? 'Redirecting to its new address…'
          : 'That page does not exist. Try search or pick a domain.'}
      </p>
      <Link href="/" className="btn mt-6 no-underline">
        Back to start
      </Link>
    </div>
  );
}
