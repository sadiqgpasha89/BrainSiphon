import proCatalog from '../../content/pro-catalog.json';
import proConfig from '../../content/pro.json';

/**
 * The freemium split. The free site keeps one complete worked use case (its starter, worked example, reference implementation
 * and implementation pack); every other use case shows what its Pro worked template contains and links to the private repository's
 * listing. Plain data only, so server and client components can both import it.
 */
export const FREE_WORKED_EXAMPLE: string = proConfig.freeWorkedExample;
export const PRO_REPOSITORY: string = proConfig.proRepository;
export const PRO_PLANS = proConfig.plans;
export const PRO_CURRENCY: string = proConfig.currency;

export const isFreeWorkedExample = (slug: string): boolean => slug === FREE_WORKED_EXAMPLE;

/** Where the "Get Pro" button goes: the checkout when one is configured, otherwise a request-early-access email. */
export const PRO_CHECKOUT_URL: string =
  process.env.NEXT_PUBLIC_PRO_CHECKOUT_URL || proConfig.checkoutUrl || '';
export const PRO_CTA_HREF: string = PRO_CHECKOUT_URL || proConfig.contactHref;
export const PRO_CHECKOUT_LIVE: boolean = Boolean(PRO_CHECKOUT_URL);

export interface ProCatalogEntry {
  slug: string;
  engine: string;
  engineLabel: string;
  fit: 'exact' | 'adaptable' | 'authored';
  authoredStarter: boolean;
  fdePack: boolean;
  files: number;
  documents: number;
  contracts: number;
  path: string;
}

const entries = proCatalog.packs as ProCatalogEntry[];
const bySlug = new Map(entries.map((e) => [e.slug, e]));

export const PRO_PACK_COUNT: number = proCatalog.count;
export const proEntry = (slug: string): ProCatalogEntry | undefined => bySlug.get(slug);
export const PRO_ENGINE_COUNT: number = new Set(entries.map((e) => e.engine).filter((e) => e !== 'authored'))
  .size;

/** What every Pro worked template contains, in the order a reader meets it. Mirrors the pack layout in the private repository. */
export const PRO_PACK_CONTENTS: { path: string; what: string }[] = [
  {
    path: 'WORKED_EXAMPLE.md',
    what: 'A walk-through of the starter’s real results for this use case, step by step',
  },
  {
    path: 'docs/00 to 08',
    what: 'Use-case brief, discovery workbook, delivery plan, data and feature spec, evaluation plan, risk and governance register, operations runbook, model and data cards, capacity and cost',
  },
  {
    path: 'starter/',
    what: 'Runnable code on synthetic data, its tests, gates that must hold, and the results file from the last run',
  },
  {
    path: 'contracts/',
    what: 'OpenAPI, AsyncAPI, a data contract and reference SQL derived from the blueprint',
  },
  {
    path: 'deployment/',
    what: 'Serving configuration, Helm overrides sized from the capacity model, and a container file for the starter',
  },
  {
    path: 'FIT.md',
    what: 'How well the starter fits this use case and the exact changes to make before relying on it',
  },
];
