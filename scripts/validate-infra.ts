/** Static infrastructure checks (no cloud account, no Terraform binary). Run: npm run validate:infra */
import { checkInfra } from '../src/content/infra-checks';

const errors = checkInfra();
if (errors.length) {
  console.error(`validate:infra ✖ ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  'validate:infra ✔ four environments, pinned providers, encryption, private endpoints and network policy are in place',
);
