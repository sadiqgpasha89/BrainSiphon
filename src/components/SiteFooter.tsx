import Link from 'next/link';
import { DOMAINS, DOMAIN_META } from '../schemas/usecase.schema';
import { withBase } from '../lib/site';
import { getRelease } from '../lib/content';
import { ReleaseLine } from './reader/ValidationStatus';

export async function SiteFooter() {
  const release = await getRelease();
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm text-mute md:grid-cols-3">
        <div>
          <p className="font-semibold text-ink">BrainSiphon</p>
          <p className="mt-2 max-w-sm">
            Zero-noise engineering blueprints for AI/ML systems, and one delivery guide that takes any of them
            from scoping to monitoring.
          </p>
        </div>
        <nav aria-label="Footer domains">
          <p className="font-semibold text-ink">Domains</p>
          <ul className="mt-2 grid grid-cols-2 gap-1">
            {DOMAINS.map((d) => (
              <li key={d}>
                <Link href={`/${d}`} className="hover:text-ink">
                  {DOMAIN_META[d].short}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="font-semibold text-ink">Guides, and files for agents</p>
          <ul className="mt-2 space-y-1">
            <li>
              <a href={withBase('/llms.txt')} className="hover:text-ink">
                /llms.txt
              </a>{' '}
              — index of every blueprint
            </li>
            <li>
              Append <code className="kbd">.md</code> to any blueprint URL for clean markdown
            </li>
            <li>
              <Link href="/delivery" className="hover:text-ink">
                Delivery guide
              </Link>{' '}
              — scoping to monitoring, as a page or{' '}
              <a href={withBase('/delivery.md')} className="hover:text-ink">
                .md
              </a>
            </li>
            <li>
              <Link href="/patterns" className="hover:text-ink">
                Patterns &amp; primitives
              </Link>{' '}
              — canonical mechanisms, written once
            </li>
            <li>
              <Link href="/deployment" className="hover:text-ink">
                Deployment modes
              </Link>{' '}
              — what the static site includes and what it does not
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-8" data-testid="release-footer">
        <ReleaseLine release={release} />
        <p className="mt-1 text-xs text-dim">
          Each blueprint shows its own validation statuses.{' '}
          <a href={withBase('/release.json')} className="hover:text-ink">
            release.json
          </a>{' '}
          lists the commit, content version and check results this site was built from.
        </p>
      </div>
    </footer>
  );
}
