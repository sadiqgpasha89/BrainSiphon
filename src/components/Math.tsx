'use client';

import katex from 'katex';
import { useMemo } from 'react';
import { RenderBoundary } from './ErrorBoundary';

function MathInner({ tex }: { tex: string }) {
  // throwOnError: true so malformed LaTeX reaches the boundary and the raw source is shown instead.
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        displayMode: true,
        throwOnError: true,
        strict: 'ignore',
        output: 'htmlAndMathml',
      }),
    [tex],
  );
  return <div data-testid="math" className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function MathBlock({ tex }: { tex: string }) {
  return (
    <RenderBoundary source={tex} label="equation">
      <MathInner tex={tex} />
    </RenderBoundary>
  );
}
