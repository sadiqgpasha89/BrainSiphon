/**
 * Writes docs/DELIVERY_GUIDE.md from src/content/delivery.ts. Run it after editing the guide: a unit test fails when the
 * committed file and the source disagree. (The site's own copy, /delivery.md, is written by content:build.)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deliveryMarkdown } from '../src/content/delivery-markdown';

const dir = join(process.cwd(), 'docs');
mkdirSync(dir, { recursive: true });
const md = deliveryMarkdown();
writeFileSync(join(dir, 'DELIVERY_GUIDE.md'), md);
console.log(`guide:build ✔ docs/DELIVERY_GUIDE.md (${md.split('\n').length} lines)`);
