import katex from 'katex';

/** One symbol from a formula, rendered on the server with KaTeX (no client JavaScript). Falls back to the raw source. */
export function SymbolText({ tex }: { tex: string }) {
  let html: string;
  try {
    html = katex.renderToString(tex, {
      displayMode: false,
      throwOnError: true,
      strict: 'ignore',
      output: 'htmlAndMathml',
    });
  } catch {
    return <code className="font-mono text-xs">{tex}</code>;
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
