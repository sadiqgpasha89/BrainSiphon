'use client';

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { createContext, useContext } from 'react';
import { ALL_STEPS, BLUEPRINT_ANCHORS, type BlueprintAnchor } from '../../content/delivery';

/** The use case the reader chose, shared with the server-rendered reference tables so their references become links too. */
export const GuideContext = createContext<{ uc: string }>({ uc: '' });

/** Blueprint sections to read: links into the chosen blueprint, or plain labels while none is chosen. */
export function BlueprintRefs({ anchors }: { anchors: readonly BlueprintAnchor[] }) {
  const { uc } = useContext(GuideContext);
  return (
    <>
      {anchors.map((a) =>
        uc ? (
          <Link key={a} href={`/${uc}#${a}`} className="chip chip-signal no-underline hover:underline">
            {BLUEPRINT_ANCHORS[a]} <ArrowUpRight size={11} aria-hidden />
          </Link>
        ) : (
          <span key={a} className="chip">
            {BLUEPRINT_ANCHORS[a]}
          </span>
        ),
      )}
    </>
  );
}

const STEP_TITLE = new Map(ALL_STEPS.map((s) => [s.id, s.title]));
/** The id a step carries on the page, so other parts of the guide can link to it. */
export const stepAnchor = (id: string) => `s${id}`;

/** Links to steps of the guide. Following one opens that step (see the hash handler in DeliveryGuide). */
export function StepLinks({ ids }: { ids: readonly string[] }) {
  return (
    <>
      {ids.map((id) => (
        <a
          key={id}
          href={`#${stepAnchor(id)}`}
          title={STEP_TITLE.get(id)}
          className="chip no-underline hover:border-signal hover:text-signal"
        >
          {id}
        </a>
      ))}
    </>
  );
}
