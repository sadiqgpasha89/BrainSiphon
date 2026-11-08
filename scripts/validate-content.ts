/**
 * Content integrity gate (CI stage 2).
 *  - every use case validates against the strict Zod schema (done inside expand)
 *  - ≥ MIN_PER_DOMAIN use cases per domain, unique slugs/titles
 *  - every KaTeX loss compiles; every Mermaid block parses
 *  - flags use cases older than 180 days or lacking concrete failure modes
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import katex from 'katex';
import { loadAllUseCases } from '../src/content/load';
import { DOMAINS, type UseCase } from '../src/schemas/usecase.schema';

const MIN_PER_DOMAIN = Number(process.env.MIN_PER_DOMAIN ?? 50);
const STALE_DAYS = 180;
const errors: string[] = [];
const warnings: string[] = [];

async function main() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  const g = globalThis as unknown as Record<string, unknown>;
  g.window = dom.window;
  g.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  g.DOMPurify = undefined;
  const mermaid = (await import('mermaid')).default;
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });

  let all: UseCase[];
  try {
    all = loadAllUseCases();
  } catch (e) {
    console.error(`✖ ${(e as Error).message}`);
    process.exit(1);
  }

  const slugs = new Set<string>();
  const titles = new Set<string>();
  for (const u of all) {
    if (slugs.has(u.slug)) errors.push(`duplicate slug ${u.slug}`);
    slugs.add(u.slug);
    const tk = `${u.domain}:${u.title.toLowerCase()}`;
    if (titles.has(tk)) errors.push(`duplicate title in ${u.domain}: ${u.title}`);
    titles.add(tk);

    try {
      katex.renderToString(u.problemFormulation.mlObjectiveAndLoss, { throwOnError: true, strict: 'ignore' });
    } catch (e) {
      errors.push(`${u.slug}: KaTeX error — ${(e as Error).message}`);
    }

    const blocks: [string, string][] = [
      ['pipeline', u.architectureBlueprint.mermaidDiagram],
      ['hld', u.systemDesign.hld.mermaid],
      ['sequence', u.systemDesign.sequence.mermaid],
      ['classes', u.systemDesign.lld.classDiagram],
    ];
    for (const [name, code] of blocks) {
      try {
        await mermaid.parse(code);
      } catch (e) {
        errors.push(`${u.slug}: Mermaid(${name}) — ${String((e as Error).message ?? e).split('\n')[0]}`);
      }
    }

    if (u.playbook) {
      // Playbook use cases must also be deep: the shallow 2/3/2 shape is only acceptable without a playbook.
      const depth: [string, number, number][] = [
        ['signal-vs-noise rows', u.signalVsNoiseMatrix.length, 4],
        ['high-signal features', u.dataAndFeatures.highSignalFeatures.length, 5],
        ['noisy features', u.dataAndFeatures.noisyFeaturesToDrop.length, 3],
        ['edge cases', u.productionEdgeCases.length, 4],
      ];
      for (const [what, have, need] of depth)
        if (have < need) errors.push(`${u.slug}: has a playbook but only ${have} ${what} (need ≥ ${need})`);
      const cells = [
        ...u.signalVsNoiseMatrix.flatMap((r) => [r.trueSignal, r.commonNoise, r.whyEngineersFail]),
        ...u.dataAndFeatures.highSignalFeatures.flatMap((f) => [
          f.formulaOrLogic,
          f.intuition,
          f.leakageRisk,
        ]),
        ...u.productionEdgeCases.flatMap((e) => [e.failureMode, e.mitigationStrategy]),
      ];
      const thin = cells.filter((c) => c.trim().split(/\s+/).length < 3);
      if (thin.length) errors.push(`${u.slug}: ${thin.length} cell(s) are under 3 words, e.g. "${thin[0]}"`);
      for (const f of u.playbook.starter.files)
        if (/\bTODO\b|FIXME|NotImplementedError/.test(f.code))
          errors.push(`${u.slug}: starter file ${f.path} contains a stub marker`);
    }

    if (/\b(Infinity|NaN|undefined)\b/.test(JSON.stringify(u.systemDesign)))
      errors.push(`${u.slug}: generated design contains Infinity, NaN or undefined`);

    const ageDays = (Date.now() - new Date(u.lastVerifiedAt).getTime()) / 86_400_000;
    if (ageDays > STALE_DAYS)
      warnings.push(`${u.slug}: last verified ${Math.floor(ageDays)} days ago (> ${STALE_DAYS})`);
    for (const e of u.productionEdgeCases)
      if (e.failureMode.trim().length < 15)
        errors.push(
          `${u.slug}: failure mode too vague for "${e.scenario}" (${e.failureMode.trim().length} chars, need ≥ 15)`,
        );
  }

  console.log('domain            use cases');
  for (const d of DOMAINS) {
    const n = all.filter((u) => u.domain === d).length;
    console.log(
      `${d.padEnd(17)} ${String(n).padStart(3)} ${n >= MIN_PER_DOMAIN ? '✔' : `✖ need ≥ ${MIN_PER_DOMAIN}`}`,
    );
    if (n < MIN_PER_DOMAIN) errors.push(`domain ${d} has ${n} use cases, requires ≥ ${MIN_PER_DOMAIN}`);
  }

  // every playbook directory must belong to a live use case (no orphans after a rename)
  const pbRoot = 'content/playbooks';
  if (existsSync(pbRoot))
    for (const d of readdirSync(pbRoot, { withFileTypes: true }).filter((x) => x.isDirectory()))
      for (const k of readdirSync(`${pbRoot}/${d.name}`, { withFileTypes: true }).filter((x) =>
        x.isDirectory(),
      ))
        if (!slugs.has(`${d.name}/${k.name}`))
          errors.push(`${pbRoot}/${d.name}/${k.name} has no matching use case`);

  // slug history: every redirect must point at a live use case, and an old slug must never also be live
  const history = JSON.parse(readFileSync('content/slug-history.json', 'utf8')) as Record<string, string>;
  for (const [from, to] of Object.entries(history)) {
    if (!slugs.has(to)) errors.push(`slug-history: ${from} -> ${to} points at a missing use case`);
    if (slugs.has(from)) errors.push(`slug-history: ${from} is redirected but still exists`);
  }

  warnings.forEach((w) => console.warn(`⚠ ${w}`));
  if (errors.length) {
    errors.slice(0, 60).forEach((e) => console.error(`✖ ${e}`));
    if (errors.length > 60) console.error(`… and ${errors.length - 60} more`);
    process.exit(1);
  }
  const withPlaybook = all.filter((u) => u.playbook).length;
  console.log(
    `validate:content ✔ ${all.length} use cases, ${all.length * 4} Mermaid blocks, ${all.length} KaTeX blocks, ${withPlaybook} playbooks`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
