/**
 * Provenance: which parts of a blueprint were written by hand, which were generated from the specification and which from a shared
 * template, what kind of evidence stands behind each number, and who reviewed it. Generated content is useful and cheap to scale;
 * it must not read as independently verified architecture, so the distinction lives in the data.
 */
import type { Archetype, Governance, Provenance, Validation } from '../schemas/usecase.schema';
import { ARCHETYPE_LABEL, VALIDATION_LEVELS } from '../schemas/usecase.schema';
import type { Review } from './enterprise';

export interface ProvenanceInput {
  specFile: string;
  specKey: string;
  narrativeAuthored: boolean;
  playbook: 'authored' | 'generated' | 'none';
  kit: string;
  archetype: Archetype;
  review?: Review;
  governance: Pick<Governance, 'regulatory'>;
  levels: Validation['levels'];
  generatedAt: string;
  statedVolume: string | null;
  scaleDriver: string;
}

export function buildProvenance(i: ProvenanceInput): Provenance {
  const passed = (l: (typeof VALIDATION_LEVELS)[number]) => i.levels.find((x) => x.level === l)?.state === 'passed';
  const status = [...VALIDATION_LEVELS].reverse().find((l) => passed(l)) ?? 'schema-validated';
  const spec = `content/usecases/${i.specFile.split('/').pop()}`;
  const tpl = ARCHETYPE_LABEL[i.archetype].toLowerCase();

  return {
    status,
    owner: 'BrainSiphon maintainers',
    reviewer: i.review?.reviewer ?? null,
    reviewedAt: i.review?.date ?? null,
    generatedAt: i.generatedAt,
    sections: [
      { section: 'Signal versus noise, problem formulation, features, metrics and edge cases', origin: 'hand-authored', basis: `Written for this use case in ${spec} (entry "${i.specKey}").` },
      { section: 'Problem statement, solution approach, architecture rationale and end-to-end breakdown', origin: i.narrativeAuthored ? 'hand-authored' : 'generated-from-spec', basis: i.narrativeAuthored ? 'A hand-written narrative file for this use case.' : 'Assembled deterministically from the specification fields above; no one wrote these paragraphs for this use case.' },
      { section: 'Pipeline, high-level design and sequence diagrams', origin: 'generated-from-spec', basis: 'Built from the specification\'s own pipeline stages; stage budgets are modelled, not measured.' },
      { section: 'Low-level design', origin: 'generated-from-template', basis: `The ${tpl} template, filled with this use case's features, names and budgets. An illustrative scaffold, not production code.` },
      { section: 'Capacity and cost model', origin: 'generated-from-template', basis: i.statedVolume ? `The shared capacity model, sized from the stated volume "${i.statedVolume}".` : 'The shared capacity model at the published 10-million-user default; re-run it at your workload in the calculator.' },
      { section: 'Role lenses, enterprise context, AI decision matrix, governance, MLOps and operations', origin: 'generated-from-template', basis: 'Shared enterprise templates specialised by domain, latency, risk tier and pattern. Not reviewed by a domain specialist unless the status above says so.' },
      { section: 'Agentic verdict and solution', origin: 'generated-from-template', basis: 'A rule over the reference kit, latency class and presence of a review queue decides whether agents are recommended at all.' },
      { section: 'Statistical validation and experimentation', origin: 'generated-from-template', basis: 'A design chosen by archetype and latency, with the use case\'s own metrics inserted.' },
      { section: 'Metrics catalogue', origin: 'generated-from-spec', basis: 'Assembled from this use case\'s own offline and online metrics, signals and leakage risks, pipeline stages, edge cases, SLOs, capacity model, regulatory obligations and agents; the layer structure is shared. Targets are starting thresholds.' },
      { section: 'Build playbook and starter kit', origin: i.playbook === 'authored' ? 'hand-authored' : 'generated-from-template', basis: i.playbook === 'none' ? 'No playbook is attached to this blueprint.' : i.playbook === 'authored' ? 'Written for this use case with its own kit.' : `Generated from the blueprint and the "${i.kit}" reference kit; the kit's numbers are the kit's, not this use case's.` },
    ],
    numbers: [
      { item: 'Stage latency budgets and the p99 split', nature: 'modelled', note: 'Fixed weights per latency tier summing exactly to the p99, plus a network reserve. They are an allocation to design against, not a measurement.' },
      { item: 'Capacity, node counts and monthly cost', nature: 'modelled', note: `On-demand list-price order of magnitude (${i.scaleDriver}). Retraining, observability, transfer and backup are modelled shares.` },
      { item: 'SLOs, error budgets and alert thresholds', nature: 'proposed-target', note: 'Starting targets to negotiate with the service owner, not observed performance.' },
      { item: 'Metric targets in the metrics catalogue (PSI, ECE, kappa, faithfulness, coverage and similar)', nature: 'proposed-target', note: 'Rules-of-thumb starting values to replace with your own baseline; none is a measurement.' },
      { item: 'Model-quality, agent and release-gate thresholds', nature: 'proposed-target', note: 'Gates to adopt or change after measuring your own baseline.' },
      { item: 'Starter-kit and playbook results', nature: 'synthetic', note: 'Produced on synthetic data from a reference kit; they show the pipeline runs, not that this use case reaches those scores.' },
      { item: 'Example payloads, schemas and code', nature: 'illustrative', note: 'Shaped to the archetype; field names and values are examples.' },
      { item: 'Measured results from a pilot or production', nature: i.review ? 'pilot-measured' : 'illustrative', note: i.review ? `Reviewed by ${i.review.reviewer}; see the review scope above for what was covered.` : 'None recorded. No figure on this page comes from a real deployment.' },
    ],
    sources: [
      { kind: 'specification', ref: `${spec} entry "${i.specKey}"` },
      { kind: 'reference-kit', ref: `${i.kit} starter kit (synthetic data)` },
      ...i.governance.regulatory.slice(0, 3).map((r) => ({ kind: 'public-standard' as const, ref: `${r.obligation}: named for orientation; applicability depends on your jurisdiction and counsel` })),
      ...(i.review ? [{ kind: 'review' as const, ref: `${i.review.reviewer}, ${i.review.date}: ${i.review.scope}` }] : []),
    ],
    assumptions: [
      'The workload, latency tier and risk tier come from the specification entry and may not match your organisation.',
      'Technology choices are examples from a common stack; vendor selection, licensing and procurement are not assessed.',
      'Regulatory mapping is architectural orientation, not legal advice and not a claim of compliance.',
      'Data is assumed to be available with the freshness and quality the data contract states.',
    ],
    limitations: [
      i.review ? `Expert review covered: ${i.review.scope}. Anything outside that scope is still unreviewed.` : 'No named domain or engineering expert has reviewed this blueprint.',
      'The low-level design is an illustrative scaffold; authentication, tenancy, rate limits and dependency hardening are described but not implemented.',
      'No measured latency, throughput, accuracy or cost from a real deployment is recorded.',
      'Reference-kit and benchmark numbers belong to the kit; do not carry them over to this use case.',
    ],
  };
}
