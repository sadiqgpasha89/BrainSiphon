/**
 * The independent-review programme. It describes what a review must cover and who is competent to give it. It records no reviews:
 * content/reviews.json is the only place a review exists, and it is empty until a real, named reviewer has done one.
 */
export interface ReviewPanel {
  domain: string;
  domains: string[];
  reviewers: string;
  highRiskNeeds: string[];
}

export const REVIEW_PANELS: ReviewPanel[] = [
  {
    domain: 'Healthcare (for example sepsis early warning)',
    domains: ['healthcare'],
    reviewers: 'A practising clinician in the relevant specialty, plus a clinical-informatics or patient-safety specialist.',
    highRiskNeeds: [
      'Clinically representative validation data and an independent clinical review of the labels and thresholds',
      'Prospective evaluation (silent mode) before any alert reaches a clinician',
      'Workflow-integration testing in the real EHR and an alert-fatigue evaluation',
      'Clinical safety case and regulatory classification for your jurisdiction (for example software as a medical device)',
    ],
  },
  {
    domain: 'Financial services (fraud, credit, AML)',
    domains: ['fintech', 'bfsi'],
    reviewers: 'A fraud-risk or model-risk specialist and a payment-systems architect; for credit, a person independent of the model’s developers.',
    highRiskNeeds: [
      'Realistic transaction replay against production-shaped data, and payment-network integration tests',
      'Independent model validation (conceptual soundness, outcomes analysis, stress tests) separate from the development team',
      'Production-grade failover and operational validation, with measured recovery times',
      'Fair-lending / fairness testing and adverse-action explanations where required',
    ],
  },
  {
    domain: 'Cybersecurity',
    domains: ['cybersecurity'],
    reviewers: 'A security practitioner who runs detection or response in production, and a red-team specialist.',
    highRiskNeeds: [
      'Continuously refreshed attack datasets, not a one-off snapshot',
      'Red-team exercises including adversarial and prompt-injection testing of any agent with tools',
      'False-positive operational analysis with real analyst workload',
      'Approval workflow validation for any destructive containment action',
    ],
  },
  {
    domain: 'AI copilots and agents (any domain)',
    domains: [],
    reviewers: 'An application-security engineer and the owner of the product the copilot acts on.',
    highRiskNeeds: [
      'Enterprise permission testing: the agent can never do more than the user on whose behalf it acts',
      'Real product API integrations, not mocks',
      'Adversarial tool-use testing, including indirect prompt injection through retrieved content',
      'Approval, rejection and audit workflows exercised by real approvers',
    ],
  },
  {
    domain: 'Supply chain, retail, logistics, forecasting',
    domains: ['supply-chain', 'retail'],
    reviewers: 'An operations or planning specialist who owns the decision the forecast feeds.',
    highRiskNeeds: [],
  },
];

export const REVIEW_CHECKLIST = [
  'Business assumptions: the problem, the decision it supports, and the cost of each kind of error',
  'Data assumptions: sources, labels, label delay, representativeness, and what is not available in practice',
  'Model selection: why this model family, and when an alternative should be preferred',
  'Decision thresholds and the operating point, with the people who own them',
  'Operational risks: failure modes, fallback, human oversight, monitoring and recovery',
  'Regulatory applicability for the stated jurisdiction, with the date the review was made',
];

export const REVIEW_RECORD_FIELDS: [string, string][] = [
  ['reviewer', 'Name of the independent reviewer'],
  ['organisation', 'Whom they acted for, if anyone'],
  ['qualifications', 'The registration, qualification or role that makes them competent in this domain'],
  ['date', 'When the review was done'],
  ['validUntil', 'When it expires. A review past this date stops counting automatically'],
  ['scope', 'Exactly what was reviewed. Anything outside is still unreviewed'],
  ['findings', 'What was raised and what was done about it, with links'],
];

export const HIGH_RISK_NOTICE =
  'Not suitable for real-world deployment. This blueprint has not been independently validated or approved, and until the validations listed for its domain are complete in your organisation, it must be used only to learn, design and prototype.';
