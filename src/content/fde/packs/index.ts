import type { ImplementationPlaybook } from '../../../schemas/implementation.schema';
import { FINTECH_FRAUD } from './fintech';

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

/**
 * The use cases with an executable pack under fde-packs/, keyed by `<domain>/<slug>`. The free site ships one (card and UPI fraud);
 * the other nine packs are in fde-packs/ in this repository and the site does not render them, so their use cases get the derived implementation playbook only.
 */
export const AUTHORED: Record<string, AuthoredPack> = {
  'fintech/real-time-card-upi-fraud-detection': FINTECH_FRAUD,
};
