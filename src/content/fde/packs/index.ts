import type { ImplementationPlaybook } from '../../../schemas/implementation.schema';
import { ADTECH_CTR } from './adtech';
import { BFSI_BRANCH } from './bfsi';
import { CYBER_PHISHING } from './cybersecurity';
import { EDTECH_KT } from './edtech';
import { FINTECH_FRAUD } from './fintech';
import { HEALTHCARE_SEPSIS } from './healthcare';
import { REAL_ESTATE_AVM } from './real-estate';
import { RETAIL_FORECAST } from './retail';
import { SAAS_TRIAGE } from './saas';
import { SUPPLY_CHAIN_ETA } from './supply-chain';

type PB = ImplementationPlaybook;

/**
 * What an authored pack supplies. Anything omitted stays derived. `systems`, `integrations`, `identity`, `permissions`, `network`,
 * `connectors`, `localDev` and `rollout` replace the derived version; the other fields add rows in front of the derived ones.
 */
export interface AuthoredPack {
  note: string;
  summary?: string;
  systems?: PB['systems'];
  integrations?: PB['integrations'];
  identity?: PB['identity'];
  permissions?: PB['permissions'];
  network?: PB['network'];
  connectors?: PB['connectors'];
  localDev?: PB['localDev'];
  rollout?: PB['rollout'];
  discovery?: PB['discovery'];
  troubleshooting?: PB['troubleshooting']['specific'];
  criteria?: PB['acceptance']['criteria'];
  needsApproval?: PB['ownership']['needsApproval'];
  customerDependencies?: PB['deliverables']['customer'];
  testing?: PB['testing']['suites'];
}

/** The ten use cases with an executable pack under fde-packs/, keyed by `<domain>/<slug>`. */
export const AUTHORED: Record<string, AuthoredPack> = {
  'fintech/real-time-card-upi-fraud-detection': FINTECH_FRAUD,
  'retail/demand-forecasting-sku-store': RETAIL_FORECAST,
  'healthcare/sepsis-early-warning': HEALTHCARE_SEPSIS,
  'supply-chain/eta-prediction-for-shipments': SUPPLY_CHAIN_ETA,
  'adtech/ctr-prediction-ads': ADTECH_CTR,
  'cybersecurity/phishing-url-and-email-detection': CYBER_PHISHING,
  'edtech/knowledge-tracing-student-modeling': EDTECH_KT,
  'saas/support-ticket-triage-and-priority': SAAS_TRIAGE,
  'bfsi/branch-footfall-and-staffing-forecast': BFSI_BRANCH,
  'real-estate/automated-valuation-model': REAL_ESTATE_AVM,
};
