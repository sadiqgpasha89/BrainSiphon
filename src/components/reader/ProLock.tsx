import { Lock } from 'lucide-react';
import Link from 'next/link';
import { PRO_CHECKOUT_LIVE, PRO_CTA_HREF, PRO_PACK_CONTENTS, proEntry } from '../../lib/pro';

const FIT_TEXT = {
  exact: 'The starter implements this problem type as it is.',
  adaptable: 'The starter implements a neighbouring problem; FIT.md lists the changes.',
  authored: 'A hand-written starter for exactly this use case.',
} as const;

/**
 * Shown in place of the worked example on every use case except the free one. It says exactly what the Pro worked template for this
 * use case contains, taken from the published catalogue, and makes no claim about results: the numbers live in the private repository.
 */
export function ProLockedWorkedExample({ slug, title }: { slug: string; title: string }) {
  const e = proEntry(slug);
  return (
    <div className="card space-y-3 border-signal/30 p-4" data-testid="pro-locked-example">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <Lock aria-hidden className="h-4 w-4 text-signal" /> The worked template for this use case is in
        BrainSiphon Pro
      </p>
      <p className="text-sm text-ink/90" data-prose>
        The free site shows one complete worked use case. For “{title}”, Pro adds a runnable worked template
        {e ? (
          <>
            {' '}
            built on the <strong>{e.engineLabel}</strong> engine
          </>
        ) : null}
        : its own starter run with real results, filled-in project documents, contracts and deployment sizing.
        {e ? <> {FIT_TEXT[e.fit]}</> : null}
      </p>
      <ul className="space-y-1 text-sm text-ink/90" data-prose>
        {PRO_PACK_CONTENTS.map((c) => (
          <li key={c.path}>
            <code className="font-mono text-xs text-signal">{c.path}</code> — {c.what}
          </li>
        ))}
      </ul>
      <p className="flex flex-wrap items-center gap-3 text-sm">
        <a
          href={PRO_CTA_HREF}
          data-testid="pro-cta"
          className="text-canvas rounded-md bg-signal px-3 py-1.5 font-medium no-underline hover:opacity-90"
          {...(PRO_CHECKOUT_LIVE ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {PRO_CHECKOUT_LIVE ? 'Get BrainSiphon Pro' : 'Ask for early access'}
        </a>
        <Link href="/pro" className="text-mute hover:text-ink">
          What Pro includes
        </Link>
      </p>
    </div>
  );
}
