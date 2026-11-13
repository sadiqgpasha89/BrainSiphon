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
import { checkKitCompatibility, compatibilitySummary } from '../src/content/kit-gate';
import { DISCOVERY_QUESTION_IDS, DOMAINS, isAgentic, type UseCase } from '../src/schemas/usecase.schema';
import { PRIMITIVE_BY_ID } from '../src/content/primitives';
import { loadTracksFile, resolveTracks } from '../src/content/tracks';
import { TOTAL_BUDGET_MS } from '../src/content/design';
import { ROLE_IDS } from '../src/lib/roles';
import {
  clearReport,
  computeContentDigest,
  gitInfo,
  VALIDATION_REPORT,
  writeReport,
} from '../src/content/release-io';
import { RELEASE_SCHEMA_VERSION, staleRemediations } from '../src/content/release';

const MIN_PER_DOMAIN = Number(process.env.MIN_PER_DOMAIN ?? 50);
const STALE_DAYS = 180;
const errors: string[] = [];
const warnings: string[] = [];

async function main() {
  // a pass is only ever recorded by the last line of a fully successful run; remove any earlier one first
  clearReport(process.cwd(), VALIDATION_REPORT);
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

    for (const v of u.problemFormulation.lossVariables) {
      try {
        katex.renderToString(v.symbol, { throwOnError: true, strict: 'ignore' });
      } catch (e) {
        errors.push(`${u.slug}: loss symbol ${v.symbol} does not render — ${(e as Error).message}`);
      }
      if (v.meaning.trim().split(/\s+/).length < 2)
        errors.push(`${u.slug}: meaning of ${v.symbol} is a single word`);
    }
    if (
      new Set(u.problemFormulation.lossVariables.map((v) => v.symbol)).size !==
      u.problemFormulation.lossVariables.length
    )
      errors.push(`${u.slug}: duplicate loss symbols`);

    // role lenses and primitive links must resolve to a real canonical write-up
    for (const id of [
      ...u.primitives,
      ...u.roleLenses.flatMap((l) => l.items.flatMap((i) => (i.primitive ? [i.primitive] : []))),
    ])
      if (!PRIMITIVE_BY_ID[id])
        errors.push(`${u.slug}: unknown primitive "${id}" (add it to src/content/primitives.ts)`);

    const blocks: [string, string][] = [
      ['pipeline', u.architectureBlueprint.mermaidDiagram],
      ['hld', u.systemDesign.hld.mermaid],
      ['sequence', u.systemDesign.sequence.mermaid],
      ['classes', u.systemDesign.lld.classDiagram],
      ['agent-architecture', u.agentic.architecture],
      ['agent-sequence', u.agentic.sequence],
      ['c4-context', u.enterpriseContext.c4Context],
      ['c4-container', u.enterpriseContext.c4Container],
      ['metric-tree', u.metrics.tree],
    ];
    for (const [name, code] of blocks) {
      try {
        await mermaid.parse(code);
      } catch (e) {
        errors.push(`${u.slug}: Mermaid(${name}) — ${String((e as Error).message ?? e).split('\n')[0]}`);
      }
    }

    if (u.playbook?.provenance === 'generated') {
      const pb = u.playbook;
      const text = JSON.stringify({ ...pb, starter: pb.starter ? { ...pb.starter, files: [] } : undefined });
      if (/\b(undefined|NaN|Infinity)\b|\[object|\$\{|\{\{/.test(text))
        errors.push(`${u.slug}: generated playbook contains an unresolved placeholder`);
      if (pb.compatibility.verdict !== 'none' && !pb.starter?.kitId)
        errors.push(`${u.slug}: generated playbook has no reference kit`);
      if (pb.compatibility.verdict === 'none' && pb.starter)
        errors.push(`${u.slug}: generated playbook ships a starter kit although no kit is compatible`);
      if (pb.milestones.filter((m) => /\d/.test(m.gate.threshold)).length < 5)
        errors.push(`${u.slug}: fewer than 5 generated milestone gates carry a number`);
      if (pb.domainKnowledge.glossary.length < 15 || pb.domainKnowledge.concepts.length < 5)
        errors.push(`${u.slug}: generated domain knowledge is too thin`);
      if (
        new Set(pb.domainKnowledge.glossary.map((g) => g.term.toLowerCase())).size !==
        pb.domainKnowledge.glossary.length
      )
        errors.push(`${u.slug}: duplicate glossary terms`);
    }
    if (u.playbook?.provenance === 'authored') {
      // Hand-written playbooks must also be deep: the shallow 2/3/2 shape is only acceptable without a playbook.
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
      const dk = u.playbook.domainKnowledge;
      const terms = dk.glossary.map((g) => g.term.toLowerCase());
      if (new Set(terms).size !== terms.length) errors.push(`${u.slug}: duplicate glossary terms`);
      for (const g of dk.glossary)
        if (g.definition.trim().split(/\s+/).length < 6)
          errors.push(`${u.slug}: glossary definition for "${g.term}" is under 6 words`);
      for (const c of dk.concepts)
        if (c.explanation.trim().split(/\s+/).length < 20 || c.whyItMatters.trim().split(/\s+/).length < 8)
          errors.push(
            `${u.slug}: domain concept "${c.name}" is too thin (explanation >= 20 words, why it matters >= 8)`,
          );
      for (const f of u.playbook.starter?.files ?? [])
        if (/\bTODO\b|FIXME|NotImplementedError/.test(f.code))
          errors.push(`${u.slug}: starter file ${f.path} contains a stub marker`);
    }

    if (/\b(undefined|NaN|Infinity)\b|\[object|\$\{|\{\{/.test(JSON.stringify(u.agentic)))
      errors.push(`${u.slug}: agentic section contains an unresolved placeholder`);
    {
      const toolSet = new Set(u.agentic.tools.map((t) => t.name));
      if (toolSet.size !== u.agentic.tools.length) errors.push(`${u.slug}: duplicate agent tool names`);
      if (isAgentic(u.agentic.fit) && !u.agentic.tools.some((t) => t.access === 'write'))
        errors.push(`${u.slug}: agentic section has no write tool, so no approval path is described`);
      if (new Set(u.agentic.agents.map((a) => a.name)).size !== u.agentic.agents.length)
        errors.push(`${u.slug}: duplicate agent names`);
      if (u.agentic.rationale.trim().split(/\s+/).length < 40)
        errors.push(`${u.slug}: agentic rationale is too thin`);
      if ((u.latencySLA === 'sub-10ms' || u.latencySLA === 'sub-100ms') && u.agentic.fit === 'core')
        errors.push(`${u.slug}: an agent cannot be the core of a ${u.latencySLA} decision path`);
      // the decision table must be self-consistent: exactly one chosen architecture, and a "no agent" verdict must say why
      const chosen = u.agentic.decision.options.filter((o) => o.verdict === 'chosen');
      if (chosen.length !== 1)
        errors.push(
          `${u.slug}: agent decision must choose exactly one architecture (found ${chosen.length})`,
        );
      if (
        new Set(u.agentic.decision.options.map((o) => o.approach)).size !== u.agentic.decision.options.length
      )
        errors.push(`${u.slug}: agent decision lists an approach twice`);
      if (!isAgentic(u.agentic.fit) && u.agentic.rationale.trim().split(/\s+/).length < 40)
        errors.push(`${u.slug}: a non-agentic verdict needs a full rationale`);
    }

    // LLD: the archetype decides the shape; a generated LLD must say it is a scaffold
    {
      const lld = u.systemDesign.lld;
      if (!u.systemDesign.lld.apiContract.path.startsWith('/v1/'))
        errors.push(`${u.slug}: LLD API path is not versioned`);
      if (
        lld.status === 'illustrative-scaffold' &&
        u.validation.levels.find((l) => l.level === 'domain-expert-reviewed')?.state === 'passed'
      )
        errors.push(`${u.slug}: LLD is a scaffold but the blueprint claims expert review`);
      const kind = lld.archetype;
      const ddl = lld.dataModelDDL;
      const must: Partial<Record<typeof kind, RegExp>> = {
        forecasting: /_forecasts/,
        recommendation: /_impressions/,
        rag: /_chunks/,
        'agentic-workflow': /_steps/,
        'computer-vision': /_detections/,
        'document-extraction': /_fields/,
        optimisation: /_plans/,
        'batch-analytics': /_runs/,
        'realtime-decisioning': /_decisions/,
      };
      if (must[kind] && !must[kind]!.test(ddl))
        errors.push(`${u.slug}: ${kind} LLD data model has no ${must[kind]} table`);
      if (kind !== 'realtime-decisioning' && /\/decide$/.test(lld.apiContract.path))
        errors.push(`${u.slug}: ${kind} LLD uses the generic /decide endpoint`);
    }

    // Blueprint 2.0 enterprise layer: no unresolved placeholders, every role lens, compulsory Phase 0 and architecture feasibility
    {
      const ent = JSON.stringify([
        u.enterpriseContext,
        u.decisionMatrix,
        u.governance,
        u.mlops,
        u.operations,
        u.validation,
        u.discovery,
      ]);
      if (/\b(undefined|NaN|Infinity)\b|\[object|\$\{|\{\{/.test(ent))
        errors.push(`${u.slug}: enterprise layer contains an unresolved placeholder`);
      if (u.roleLenses.length !== ROLE_IDS.length)
        errors.push(`${u.slug}: expected ${ROLE_IDS.length} role lenses`);
      // Phase 0 is compulsory: every discovery question answered once, requirements testable, gate open until a client confirms
      {
        const ids = u.discovery.questions.map((q) => q.id);
        for (const id of DISCOVERY_QUESTION_IDS)
          if (ids.filter((x) => x === id).length !== 1)
            errors.push(`${u.slug}: Phase 0 must answer discovery question "${id}" exactly once`);
        for (const r of u.discovery.requirements)
          if (!/^given .+, when .+, then .+/i.test(r.acceptance))
            errors.push(`${u.slug}: ${r.id} acceptance criterion is not in given/when/then form`);
        if (!u.discovery.raci.some((r) => r.responsible.includes('Business Analyst')))
          errors.push(`${u.slug}: Phase 0 RACI has no activity the Business Analyst is responsible for`);
        if (u.discovery.exitGate.some((g) => g.status !== 'open'))
          errors.push(`${u.slug}: Phase 0 exit gate cannot be closed without a recorded client confirmation`);
      }
      if (u.decisionMatrix.alternatives.filter((a) => a.verdict === 'chosen').length !== 1)
        errors.push(`${u.slug}: decision matrix must name exactly one chosen option`);
      if (
        (u.governance.riskTier === 'high' || u.governance.riskTier === 'critical') &&
        u.decisionMatrix.humanOversight.mode === 'autonomous-with-audit'
      )
        errors.push(
          `${u.slug}: ${u.governance.riskTier}-risk use case cannot be autonomous without human oversight`,
        );
      if (
        u.mlops.llmops &&
        !(u.pattern === 'llm-rag' || u.pattern === 'llm-agent' || u.mlParadigms.includes('llm-agents'))
      )
        errors.push(`${u.slug}: LLMOps section on a non-LLM use case`);
      // Architecture Feasibility Validator: every stored check must not fail, and the latency sum is re-derived independently
      for (const f of u.validation.feasibility)
        if (f.status === 'fail') errors.push(`${u.slug}: feasibility — ${f.check}: ${f.detail}`);
        else if (f.status === 'warn') warnings.push(`${u.slug}: feasibility — ${f.check}: ${f.detail}`);
      const total = TOTAL_BUDGET_MS[u.latencySLA];
      if (total !== null) {
        const sum =
          Math.round(u.systemDesign.hld.components.reduce((a, c) => a + (c.latencyBudgetMs ?? 0), 0) * 1000) /
          1000;
        if (sum > total + 1e-9)
          errors.push(`${u.slug}: synchronous budgets sum to ${sum} ms against a ${total} ms p99`);
      }
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

  // the end-to-end breakdown must be specific: almost none of its steps may be shared word for word between use cases
  {
    const seen = new Map<string, number>();
    for (const u of all)
      for (const s of new Set(u.systemDesign.e2e.flatMap((p) => p.steps)))
        seen.set(s, (seen.get(s) ?? 0) + 1);
    let total = 0;
    let shared = 0;
    for (const u of all) {
      const steps = u.systemDesign.e2e.flatMap((p) => p.steps);
      const own = steps.filter((s) => (seen.get(s) ?? 0) > 1).length;
      total += steps.length;
      shared += own;
      if (own / steps.length > 0.12)
        errors.push(
          `${u.slug}: ${own} of ${steps.length} end-to-end steps are identical to another use case's`,
        );
    }
    if (shared / total > 0.03)
      errors.push(
        `end-to-end steps shared word for word across use cases: ${((100 * shared) / total).toFixed(1)}% (limit 3%)`,
      );
    const deliverables = new Map<string, number>();
    for (const u of all)
      for (const p of u.systemDesign.e2e)
        deliverables.set(p.deliverable, (deliverables.get(p.deliverable) ?? 0) + 1);
    const generic = [...deliverables.values()].filter((n) => n > 1).length;
    if (generic) errors.push(`${generic} end-to-end deliverables are shared between use cases`);
    for (const u of all) {
      const text = JSON.stringify([u.problemStatement, u.solutionApproach, u.architectureRationale]);
      if (/\b(undefined|NaN|Infinity)\b|\[object|\$\{/.test(text))
        errors.push(`${u.slug}: narrative contains an unresolved placeholder`);
    }
  }

  // tracks must partition each domain exactly and every start-here step must exist
  const tracksFile = loadTracksFile();
  for (const d of DOMAINS) {
    try {
      resolveTracks(
        d,
        tracksFile,
        all.filter((u) => u.domain === d).map((u) => u.slug),
      );
    } catch (e) {
      errors.push(`tracks: ${(e as Error).message}`);
    }
  }

  // starter-kit compatibility: a kit is shipped only for the problem it implements, and nothing claims to be production code
  errors.push(...checkKitCompatibility(all));

  // a written remediation must belong to a warning that still exists, so the release report never advises on a fixed problem
  for (const k of staleRemediations(all))
    errors.push(`release: REMEDIATION_OVERRIDES["${k}"] matches no feasibility warning; remove or rename it`);

  warnings.forEach((w) => console.warn(`⚠ ${w}`));
  if (errors.length) {
    errors.slice(0, 60).forEach((e) => console.error(`✖ ${e}`));
    if (errors.length > 60) console.error(`… and ${errors.length - 60} more`);
    process.exit(1);
  }
  const withPlaybook = all.filter((u) => u.playbook).length;
  const kits = compatibilitySummary(all);
  console.log(
    `starter-kit compatibility: ${kits.exact + kits.authored} exact (${kits.authored} hand-written), ${kits.adaptable} adaptable, ${kits.none} with no compatible kit; executable artifacts reach ${Object.entries(
      kits.reached,
    )
      .map(([k, n]) => `${k} ${n}`)
      .join(', ')}`,
  );
  const feas = all.flatMap((u) => u.validation.feasibility);
  const git = gitInfo();
  writeReport(process.cwd(), VALIDATION_REPORT, {
    schemaVersion: RELEASE_SCHEMA_VERSION,
    commit: git.commit,
    dirty: git.dirty,
    contentDigest: computeContentDigest(),
    validatedAt: new Date().toISOString(),
    useCases: all.length,
    feasibility: {
      checks: feas.length,
      pass: feas.filter((f) => f.status === 'pass').length,
      notApplicable: feas.filter((f) => f.status === 'n/a').length,
      warn: feas.filter((f) => f.status === 'warn').length,
      fail: feas.filter((f) => f.status === 'fail').length,
    },
    warnings: warnings.length,
  });
  console.log(
    `validate:content ✔ ${all.length} use cases, ${all.length * 9} Mermaid blocks, ${all.length} KaTeX blocks, ${withPlaybook} playbooks, ${all.length} agentic sections, ${all.length} enterprise-context layers, ${feas.length} feasibility checks`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
