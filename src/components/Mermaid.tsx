'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Code2, Maximize2, X } from 'lucide-react';
import type mermaidType from 'mermaid';
import { useEffect, useId, useRef, useState } from 'react';
import { RenderBoundary } from './ErrorBoundary';

type MermaidApi = typeof mermaidType;
type Mode = 'light' | 'dark';

const PALETTE: Record<Mode, Record<string, string | boolean>> = {
  dark: {
    darkMode: true,
    background: '#10151d',
    primaryColor: '#161c27',
    primaryTextColor: '#e6edf6',
    primaryBorderColor: '#3b4a63',
    lineColor: '#7c8aa0',
    secondaryColor: '#1e1b3a',
    tertiaryColor: '#10151d',
    noteBkgColor: '#1e1b3a',
    noteTextColor: '#e0e7ff',
    actorBkg: '#161c27',
    actorBorder: '#3b4a63',
    actorTextColor: '#e6edf6',
    signalColor: '#93a1b5',
    signalTextColor: '#e6edf6',
    labelBoxBkgColor: '#161c27',
    labelTextColor: '#e6edf6',
    loopTextColor: '#e6edf6',
    activationBkgColor: '#0b2e25',
    classText: '#e6edf6',
  },
  light: {
    darkMode: false,
    background: '#ffffff',
    primaryColor: '#f1f5f9',
    primaryTextColor: '#0f172a',
    primaryBorderColor: '#94a3b8',
    lineColor: '#64748b',
    secondaryColor: '#e0e7ff',
    tertiaryColor: '#ffffff',
    noteBkgColor: '#e0e7ff',
    noteTextColor: '#312e81',
    actorBkg: '#f1f5f9',
    actorBorder: '#94a3b8',
    actorTextColor: '#0f172a',
    signalColor: '#475569',
    signalTextColor: '#0f172a',
    labelBoxBkgColor: '#f1f5f9',
    labelTextColor: '#0f172a',
    loopTextColor: '#0f172a',
    activationBkgColor: '#d1fae5',
    classText: '#0f172a',
  },
};

/**
 * The generators emit dark-theme `classDef` fills for the highlighted nodes (model, loop, agent, guard). The stored source stays
 * as generated (it is also what the .md export carries), and the fills are swapped here for the current theme.
 */
const CLASS_DEFS: Record<Mode, Record<string, string>> = {
  dark: {
    model: 'fill:#0b2e25,stroke:#34d399,color:#d1fae5',
    loop: 'fill:#1e1b3a,stroke:#818cf8,color:#e0e7ff',
    agent: 'fill:#1e1b3a,stroke:#818cf8,color:#e0e7ff',
    guard: 'fill:#33121a,stroke:#fb7185,color:#ffe4e6',
  },
  light: {
    model: 'fill:#d1fae5,stroke:#047857,color:#064e3b',
    loop: 'fill:#e0e7ff,stroke:#4338ca,color:#312e81',
    agent: 'fill:#e0e7ff,stroke:#4338ca,color:#312e81',
    guard: 'fill:#ffe4e6,stroke:#be123c,color:#881337',
  },
};

export const themeDiagram = (code: string, mode: Mode): string =>
  code.replace(
    /^(\s*)classDef (model|loop|agent|guard)\b.*$/gm,
    (_m, ind: string, name: string) => `${ind}classDef ${name} ${CLASS_DEFS[mode][name]}`,
  );

let mermaidMod: Promise<MermaidApi> | null = null;

/** Mermaid keeps one global config, so (re)apply the palette for the current theme before each render. */
async function loadMermaid(mode: Mode) {
  mermaidMod ??= import('mermaid').then((m) => m.default);
  const m = await mermaidMod;
  m.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    flowchart: { curve: 'basis', htmlLabels: true, useMaxWidth: false },
    sequence: {
      useMaxWidth: false,
      mirrorActors: false,
      showSequenceNumbers: false,
      actorMargin: 60,
      width: 150,
    },
    class: { useMaxWidth: false },
    themeVariables: { ...PALETTE[mode], fontSize: '14px' },
  });
  return m;
}

const currentMode = (): Mode => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

/** The resolved page theme, kept in sync with the toggle (and the OS while on "system"). */
function useThemeMode(): Mode {
  const [mode, setMode] = useState<Mode>('dark');
  useEffect(() => {
    setMode(currentMode());
    const mo = new MutationObserver(() => setMode(currentMode()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return mode;
}

function MermaidInner({ code, label }: { code: string; label: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState<Error | null>(null);
  const [showSource, setShowSource] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const mode = useThemeMode();

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let cancelled = false;
    const render = async () => {
      try {
        const mermaid = await loadMermaid(mode);
        const out = await mermaid.render(`mmd${uid}${mode}`, themeDiagram(code, mode));
        if (!cancelled) setSvg(out.svg);
      } catch (e) {
        if (!cancelled) setFailed(e as Error);
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((x) => x.isIntersecting)) {
          io.disconnect();
          void render();
        }
      },
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [code, uid, mode]);

  if (failed) throw failed; // handled by the surrounding RenderBoundary → raw source fallback

  return (
    <figure className="card overflow-hidden" data-testid="diagram">
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
        <figcaption className="font-mono text-[11px] uppercase tracking-wider text-mute">
          {label} <span className="normal-case tracking-normal text-dim">· scroll to pan</span>
        </figcaption>
        <div className="flex gap-1">
          <button
            className="btn !px-2 !py-1 text-xs"
            onClick={() => setShowSource((s) => !s)}
            aria-pressed={showSource}
            aria-label="Toggle Mermaid source"
          >
            <Code2 size={14} aria-hidden /> Source
          </button>
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button className="btn !px-2 !py-1 text-xs" aria-label={`Expand ${label}`} disabled={!svg}>
                <Maximize2 size={14} aria-hidden /> Expand
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
              <Dialog.Content
                aria-describedby={undefined}
                className="fixed inset-3 z-50 flex flex-col overflow-hidden rounded-xl border border-line bg-panel sm:inset-8"
              >
                <div className="flex items-center justify-between border-b border-line px-4 py-2">
                  <Dialog.Title className="font-mono text-xs uppercase tracking-wider text-mute">
                    {label}
                  </Dialog.Title>
                  <Dialog.Close className="btn !px-2 !py-1" aria-label="Close">
                    <X size={16} aria-hidden />
                  </Dialog.Close>
                </div>
                <div
                  className="mermaid-host min-h-0 flex-1 overflow-auto p-4"
                  dangerouslySetInnerHTML={{ __html: svg ?? '' }}
                />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
      <div
        ref={hostRef}
        className="mermaid-host overflow-x-auto p-4"
        style={{ minHeight: svg ? undefined : 160 }}
      >
        {svg ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <p className="font-mono text-xs text-dim">Rendering diagram…</p>
        )}
      </div>
      {showSource && (
        <pre className="max-h-72 overflow-auto border-t border-line bg-bg p-3 font-mono text-xs text-mute">
          {code}
        </pre>
      )}
    </figure>
  );
}

export function MermaidDiagram({ code, label }: { code: string; label: string }) {
  return (
    <RenderBoundary source={code} label={`${label} diagram`}>
      <MermaidInner code={code} label={label} />
    </RenderBoundary>
  );
}
