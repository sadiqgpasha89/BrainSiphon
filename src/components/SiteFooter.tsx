import Link from 'next/link';
import { DOMAINS, DOMAIN_META } from '../schemas/usecase.schema';
import { withBase } from '../lib/site';
import { GUIDE_LINK, MORE_LINKS, PRO_LINK, START_LINK } from '../lib/nav';
import { getRelease } from '../lib/content';
import { ReleaseLine } from './reader/ValidationStatus';

const H = 'text-sm font-semibold text-ink';
const A = 'text-mute no-underline hover:text-ink hover:underline';

export async function SiteFooter() {
  const release = await getRelease();
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 text-sm md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <p className={H}>BrainSiphon</p>
          <p className="mt-2 max-w-xs text-mute">
            Blueprints for AI/ML systems, and one guide that takes any of them from scoping to monitoring.
            Free to read.
          </p>
          <p className="mt-3">
            <a
              href="https://github.com/sadiqgpasha89/BrainSiphon"
              className={A}
              rel="noopener noreferrer"
              target="_blank"
            >
              Source on GitHub
            </a>
          </p>
        </div>

        <nav aria-label="Footer: explore">
          <p className={H}>Explore</p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href={START_LINK.href} className={A}>
                {START_LINK.label}
              </Link>
            </li>
            <li>
              <Link href={GUIDE_LINK.href} className={A}>
                {GUIDE_LINK.label}
              </Link>
            </li>
            <li>
              <Link href={PRO_LINK.href} className={A}>
                BrainSiphon Pro
              </Link>
            </li>
            {MORE_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={A}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Footer: industries" className="md:col-span-2">
          <p className={H}>Blueprints by industry</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
            {DOMAINS.map((d) => (
              <li key={d}>
                <Link href={`/${d}`} className={A}>
                  {DOMAIN_META[d].short}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl space-y-3 px-4 pb-10" data-testid="release-footer">
        <ReleaseLine release={release} />
        <p className="text-xs text-dim">
          Each blueprint shows its own maturity scorecard. The{' '}
          <Link href="/release" className="hover:text-ink" data-testid="footer-release-report">
            release report
          </Link>{' '}
          says what has and has not been checked, with every open warning.
        </p>
        <p className="text-xs text-dim">
          For tools and AI agents:{' '}
          <a href={withBase('/llms.txt')} className="hover:text-ink">
            /llms.txt
          </a>{' '}
          indexes every blueprint, append <code className="kbd">.md</code> to a blueprint URL for clean
          markdown, the{' '}
          <a href={withBase('/delivery.md')} className="hover:text-ink">
            delivery guide
          </a>{' '}
          is available as markdown, and{' '}
          <a href={withBase('/release.json')} className="hover:text-ink">
            release.json
          </a>{' '}
          lists the commit and check results this site was built from.
        </p>
      </div>
    </footer>
  );
}
