'use client';

import { useState } from 'react';
import { MermaidDiagram } from '../Mermaid';

/** A sequence diagram that is only drawn once its disclosure is opened, so a page with many hops stays light. */
export function LazySequence({ code, label }: { code: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="rounded-md border border-line px-3 py-2"
    >
      <summary className="cursor-pointer text-sm text-mute">Sequence diagram</summary>
      {open && (
        <div className="mt-3">
          <MermaidDiagram code={code} label={label} />
        </div>
      )}
    </details>
  );
}
