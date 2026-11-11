/**
 * What kind of thing is this? Client-safe vocabulary shared by the schema, the generators and the reader.
 *
 * An engineer should never have to infer whether a block of code is production code, runnable reference code, pseudocode or an
 * architectural illustration, or how far the executable artifacts on a page actually get them. Two small vocabularies answer both.
 */

/** Every code block, schema, contract or diagram carries exactly one of these. */
export const ARTIFACT_KINDS = [
  'production-code',
  'executable-reference',
  'pseudocode',
  'architectural-illustration',
] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export const ARTIFACT_META: Record<
  ArtifactKind,
  { label: string; short: string; meaning: string; runs: string }
> = {
  'production-code': {
    label: 'Production code',
    short: 'Production',
    meaning: 'Reviewed, hardened and operated code you can deploy as it is.',
    runs: 'Runs in production. No artifact on this site is in this category.',
  },
  'executable-reference': {
    label: 'Executable reference code',
    short: 'Runs',
    meaning:
      'Code that runs and is tested in CI, on synthetic data, to teach the mechanics. Not hardened, not connected to your systems.',
    runs: 'Runs on a laptop with the commands shown; its numbers belong to the synthetic data.',
  },
  pseudocode: {
    label: 'Pseudocode',
    short: 'Pseudocode',
    meaning:
      'Code-shaped text that shows the logic. It has never been compiled, run or tested, and may not execute as written.',
    runs: 'Does not run as written.',
  },
  'architectural-illustration': {
    label: 'Architectural illustration',
    short: 'Illustration',
    meaning:
      'A diagram, schema, contract or configuration that shows the shape of a design. Field names, values and limits are examples to replace.',
    runs: 'Not executable.',
  },
};

/** How far a use case's executable artifacts get an engineer. The five states form the L1-L5 completion ladder; guidance-only is L0. */
export const COMPLETION_STATES = [
  'prototype-ready',
  'evaluation-ready',
  'integration-ready',
  'shadow-ready',
  'production-ready',
] as const;
export type CompletionState = (typeof COMPLETION_STATES)[number];
export const REACHED_STATES = ['guidance-only', ...COMPLETION_STATES] as const;
export type ReachedState = (typeof REACHED_STATES)[number];

export const COMPLETION_META: Record<
  ReachedState,
  { label: string; meaning: string; levelCode: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5'; levelName: string }
> = {
  'guidance-only': {
    levelCode: 'L0',
    levelName: 'L0 · Architecture Guidance',
    label: 'Guidance only',
    meaning: 'No executable artifact is supplied. The page gives architecture and implementation guidance.',
  },
  'prototype-ready': {
    levelCode: 'L1',
    levelName: 'L1 · Prototype-Ready',
    label: 'Prototype-ready',
    meaning: 'Synthetic data and an initial algorithm run end to end on a laptop.',
  },
  'evaluation-ready': {
    levelCode: 'L2',
    levelName: 'L2 · Evaluation-Ready',
    label: 'Evaluation-ready',
    meaning:
      'Reproducible experiments with baselines, a leak-proof split, metrics with intervals and tests that fail when the method is wrong.',
  },
  'integration-ready': {
    levelCode: 'L3',
    levelName: 'L3 · Integration-Ready',
    label: 'Integration-ready',
    meaning:
      'Executable service boundaries, database migrations, REST/OpenAPI, event schemas, and mock external dependencies.',
  },
  'shadow-ready': {
    levelCode: 'L4',
    levelName: 'L4 · Shadow-Ready',
    label: 'Shadow-ready',
    meaning: 'Production-connected scoring that sees live traffic but changes no business decision.',
  },
  'production-ready': {
    levelCode: 'L5',
    levelName: 'L5 · Production-Ready',
    label: 'Production-ready',
    meaning: 'Approved live deployment with monitored operations, rollback and a named support owner.',
  },
};

/** How a milestone's work is supplied. */
export const MILESTONE_DELIVERIES = [
  'executable-reference',
  'adapt-reference',
  'guidance',
  'your-platform',
] as const;
export type MilestoneDelivery = (typeof MILESTONE_DELIVERIES)[number];

export const DELIVERY_META: Record<MilestoneDelivery, { label: string; meaning: string }> = {
  'executable-reference': {
    label: 'Runs in the starter',
    meaning: 'The starter kit implements this milestone as running, tested code (on synthetic data).',
  },
  'adapt-reference': {
    label: 'Adapt the starter',
    meaning:
      'The starter kit has a related implementation. It needs the modifications listed under "Fit with the starter kit" before it does this milestone.',
  },
  guidance: {
    label: 'Guidance only',
    meaning: 'Written guidance and a gate. No code is supplied for this milestone.',
  },
  'your-platform': {
    label: 'Your platform',
    meaning: 'Needs your serving, data, security and release platform. Nothing here implements it.',
  },
};
