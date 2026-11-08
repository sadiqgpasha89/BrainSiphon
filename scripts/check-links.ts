/**
 * Dataset link check: every playbook dataset URL must resolve, and on Kaggle a missing page must not
 * pass as the generic home page. Network required; run on a schedule and before publishing, not on every push.
 */
import { loadAllUseCases } from '../src/content/load';

const GENERIC_TITLES = ['Kaggle: Your Home for Data Science'];
const UA =
  'Mozilla/5.0 (compatible; BrainSiphonLinkCheck/1.0; +https://github.com/sadiqgpasha89/BrainSiphon)';

async function check(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: { 'user-agent': UA },
        signal: AbortSignal.timeout(25_000),
      });
      if (res.status >= 400) {
        if (attempt === 0) continue;
        return `HTTP ${res.status}`;
      }
      const title = /<title>([^<]*)/i.exec((await res.text()).slice(0, 200_000))?.[1]?.trim() ?? '';
      if (GENERIC_TITLES.includes(title)) return `redirected to a generic page ("${title}")`;
      return null;
    } catch (e) {
      if (attempt === 1) return `fetch failed: ${(e as Error).message}`;
    }
  }
  return null;
}

async function main() {
  const urls = new Map<string, string[]>();
  for (const u of loadAllUseCases())
    for (const d of u.playbook?.data.datasets ?? []) urls.set(d.url, [...(urls.get(d.url) ?? []), u.slug]);

  let bad = 0;
  for (const [url, used] of urls) {
    const err = await check(url);
    console.log(`${err ? '✖' : '✔'} ${url}${err ? `  — ${err} (${used.join(', ')})` : ''}`);
    if (err) bad++;
  }
  if (bad) {
    console.error(`${bad} of ${urls.size} dataset links are broken`);
    process.exit(1);
  }
  console.log(`check:links ✔ ${urls.size} dataset links`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
