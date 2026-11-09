import { createHighlighter, type Highlighter } from 'shiki';
import type { ArtifactKind } from '../lib/artifacts';
import { KindBadge } from './ArtifactKind';
import { CopyButton } from './CopyButton';

type Lang = 'sql' | 'python' | 'yaml' | 'json' | 'typescript' | 'text';
let hl: Promise<Highlighter> | null = null;

const getHighlighter = () =>
  (hl ??= createHighlighter({
    themes: ['github-dark-default', 'github-light'],
    langs: ['sql', 'python', 'yaml', 'json', 'typescript'],
  }));

/** Server-side Shiki highlighting: zero highlighter JavaScript ships to the browser. */
export async function CodeBlock({
  code,
  lang,
  title,
  kind,
}: {
  code: string;
  lang: Lang;
  title?: string;
  kind?: ArtifactKind;
}) {
  const h = await getHighlighter();
  const html =
    lang === 'text'
      ? null
      : h.codeToHtml(code.trim(), {
          lang,
          themes: { dark: 'github-dark-default', light: 'github-light' },
          defaultColor: false,
        });
  return (
    <div className="shiki-host">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-mute">{title ?? lang}</span>
          {kind && <KindBadge kind={kind} />}
        </span>
        <CopyButton text={code.trim()} />
      </div>
      {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <pre>{code}</pre>}
    </div>
  );
}
