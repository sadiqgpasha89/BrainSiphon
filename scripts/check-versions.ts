/** Fails when a pinned version is past support, a review is overdue, or the registry and the files disagree. Run: npm run check:versions */
import { checkVersions, loadVersionRegistry } from '../src/content/versions';

const { errors, warnings } = checkVersions(loadVersionRegistry());
for (const w of warnings) console.warn(`  ! ${w}`);
if (errors.length) {
  console.error(`check:versions ✖ ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `check:versions ✔ ${loadVersionRegistry().entries.length} pinned versions are supported and match the files`,
);
