/**
 * The kind of problem a use case is, independent of which reference kit looks closest. Client-safe.
 *
 * A broad paradigm such as "tabular" says almost nothing about the task: survival modelling, uplift, regression, event
 * classification and clustering are all tabular and none of them can use another's starter code. The problem type is what the
 * starter-kit compatibility check compares.
 */
export const PROBLEM_TYPES = [
  'binary-event-classification',
  'multiclass-classification',
  'regression-estimation',
  'survival-time-to-event',
  'uplift-causal-effect',
  'causal-measurement',
  'forecasting',
  'time-series-anomaly-detection',
  'tabular-anomaly-detection',
  'next-item-recommendation',
  'personalised-ranking',
  'search-ranking',
  'entity-resolution',
  'graph-analytics',
  'vision-classification',
  'vision-detection-segmentation',
  'text-classification',
  'information-extraction',
  'speech-audio',
  'grounded-qa',
  'grounded-generation',
  'agentic-read-only',
  'agentic-write-actions',
  'off-policy-decisioning',
  'sequential-control-simulation',
  'optimisation-allocation',
  'clustering-segmentation',
  'generative-or-other',
] as const;
export type ProblemType = (typeof PROBLEM_TYPES)[number];

export const PROBLEM_LABEL: Record<ProblemType, string> = {
  'binary-event-classification': 'Event classification with delayed labels',
  'multiclass-classification': 'Multi-class classification',
  'regression-estimation': 'Regression (a continuous target)',
  'survival-time-to-event': 'Survival analysis (time to an event, with censoring)',
  'uplift-causal-effect': 'Uplift and treatment-effect modelling',
  'causal-measurement': 'Causal measurement and attribution',
  forecasting: 'Multi-horizon forecasting',
  'time-series-anomaly-detection': 'Anomaly detection on time series',
  'tabular-anomaly-detection': 'Anomaly detection on entity features',
  'next-item-recommendation': 'Next-item recommendation from sessions',
  'personalised-ranking': 'Personalised ranking',
  'search-ranking': 'Search and query-document ranking',
  'entity-resolution': 'Entity resolution and record linkage',
  'graph-analytics': 'Graph analytics and clustering',
  'vision-classification': 'Image classification',
  'vision-detection-segmentation': 'Detection and segmentation in images',
  'text-classification': 'Text classification',
  'information-extraction': 'Information extraction from text or documents',
  'speech-audio': 'Speech and audio',
  'grounded-qa': 'Grounded question answering over documents',
  'grounded-generation': 'Grounded text generation',
  'agentic-read-only': 'Agent with read-only tools',
  'agentic-write-actions': 'Agent that performs authorised actions',
  'off-policy-decisioning': 'Decisions from logged data (bandits, off-policy evaluation)',
  'sequential-control-simulation': 'Sequential control and simulation',
  'optimisation-allocation': 'Allocation, routing and scheduling optimisation',
  'clustering-segmentation': 'Clustering and segmentation',
  'generative-or-other': 'Generative or other specialised task',
};

/** Said, verbatim, on every playbook whose use case has no compatible executable starter kit. */
export const NO_KIT_STATEMENT =
  'No compatible executable starter kit exists. This playbook provides architecture and implementation guidance only.';
