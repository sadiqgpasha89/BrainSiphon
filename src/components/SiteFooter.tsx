import Link from 'next/link';
import { DOMAINS, DOMAIN_META } from '../schemas/usecase.schema';
import { withBase } from '../lib/site';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm text-mute md:grid-cols-3">
        <div>
          <p className="font-semibold text-ink">BrainSiphon</p>
          <p className="mt-2 max-w-sm">
            Zero-noise engineering blueprints for AI/ML systems. Every page: signals, noise traps, HLD, LLD,
            sequence diagram and a 10M-user capacity model.
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
          <p className="font-semibold text-ink">For agents & IDEs</p>
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
          </ul>
        </div>
      </div>
    </footer>
  );
}
