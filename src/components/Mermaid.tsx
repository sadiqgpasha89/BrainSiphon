'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Code2, Maximize2, X } from 'lucide-react';
import type mermaidType from 'mermaid';
import { useEffect, useId, useRef, useState } from 'react';
import { RenderBoundary } from './ErrorBoundary';

type MermaidApi = typeof mermaidType;
let initPromise: Promise<MermaidApi> | null = null;

function loadMermaid() {
  initPromise ??= import('mermaid').then((m) => {
    m.default.initialize({
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
      themeVariables: {
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
        fontSize: '14px',
      },
    });
    return m.default;
  });
  return initPromise;
}

function MermaidInner({ code, label }: { code: string; label: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState<Error | null>(null);
  const [showSource, setShowSource] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let cancelled = false;
    const render = async () => {
      try {
        const mermaid = await loadMermaid();
        const out = await mermaid.render(`mmd${uid}`, code);
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
  }, [code, uid]);

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
