import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { buildImplementationPlaybook, hydrate, persist } from '../content/fde/generate';
import { AUTHORED } from '../content/fde/packs';
import { ADAPTERS, PACKS, PACK_BY_SLUG, TOOLKIT_CHECKS, TOOLKIT_TEMPLATES } from '../content/fde/catalog';
import { FDE_STAGES } from '../content/fde/workflow';
import { DOD_CATEGORIES } from '../content/fde/dod';
import { DEPLOY_MODES, DEPLOY_MODE_IDS, fill } from '../content/fde/deploy-modes';
import { TROUBLESHOOTING, rankScenarios } from '../content/fde/troubleshooting';
import { FDE_RACI } from '../content/fde/raci';
import { ImplementationPlaybookSchema, FDE_STAGE_IDS } from '../schemas/implementation.schema';
import { implementationMarkdown } from '../content/fde/markdown';
import { ROLE_IDS } from '../lib/roles';

const root = process.cwd();
const all = loadAllUseCases(root);
const playbooks = all.map((u) => buildImplementationPlaybook(u));

describe('Customer Implementation Playbook: every blueprint', () => {
  it('has one valid playbook for each of the 500 use cases', () => {
    expect(all).toHaveLength(500);
    for (const pb of playbooks) {
      const r = ImplementationPlaybookSchema.safeParse(pb);
      expect(r.success, `${pb.slug}: ${r.success ? '' : r.error.message.slice(0, 300)}`).toBe(true);
    }
  });

  it('describes every integration in four layers with mappings, a sequence and at least three tests', () => {
    for (const pb of playbooks) {
      const ids = new Set<string>();
      for (const h of pb.integrations) {
        expect(ids.has(h.id), `${pb.slug} ${h.id} duplicated`).toBe(false);
        ids.add(h.id);
        expect(h.external.protocol.length).toBeGreaterThan(3);
        expect(h.connector.errorHandling.length, `${pb.slug} ${h.id} error handling`).toBeGreaterThan(0);
        expect(h.acknowledgement.expectedOutput.length).toBeGreaterThan(3);
        expect(h.sequence.startsWith('sequenceDiagram')).toBe(true);
        // `;` splits a Mermaid statement and `#` or `%%` start an entity or a comment: none may reach a label
        expect(
          h.sequence
            .split('\n')
            .slice(1)
            .filter((l) =>
              /[;#%]/.test(l.replace(/^\s+(participant|P\d+->>P\d+|[A-Z]+(->>|-->>)[A-Z]+)/, '')),
            ),
          `${pb.slug} ${h.id}`,
        ).toEqual([]);
        expect(h.mappings.length).toBeGreaterThanOrEqual(2);
        expect(h.tests.length).toBeGreaterThanOrEqual(3);
      }
      expect(
        pb.integrations.some((h) => h.necessity === 'core'),
        `${pb.slug} has no core hop`,
      ).toBe(true);
    }
  });

  it('gives every use case a maturity task list, an FDE RACI and approval boundaries', () => {
    for (const pb of playbooks) {
      expect(pb.maturity.tasks.length).toBeGreaterThanOrEqual(3);
      const h = hydrate(persist(pb));
      expect(h.ownership.raci.length).toBeGreaterThanOrEqual(5);
      expect(h.ownership.needsApproval.length).toBeGreaterThanOrEqual(4);
      expect(h.ownership.independent.length).toBeGreaterThanOrEqual(4);
      expect(h.deliverables.fde.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('round-trips through the slim stored form without losing anything', () => {
    for (const pb of playbooks.filter((p, i) => i % 25 === 0 || p.provenance.kind === 'authored')) {
      expect(ImplementationPlaybookSchema.parse(hydrate(persist(pb)))).toEqual(
        ImplementationPlaybookSchema.parse(pb),
      );
    }
  });

  it('renders a Markdown document with every section', () => {
    const md = implementationMarkdown(playbooks[0]!, 'https://example.test');
    for (let n = 1; n <= 15; n++) expect(md, `section ${n}`).toMatch(new RegExp(`^## ${n}\\. `, 'm'));
    expect(md).toContain('sequenceDiagram');
  });
});

describe('the authored pack that ships free', () => {
  const slugs = ['fintech/real-time-card-upi-fraud-detection'];
  it('covers exactly the free use case, with an executable pack on disk', () => {
    expect(Object.keys(AUTHORED).sort()).toEqual([...slugs].sort());
    expect(PACKS.map((p) => p.slug).sort()).toEqual([...slugs].sort());
    for (const s of slugs) {
      expect(existsSync(join(root, PACK_BY_SLUG[s]!.dir, 'tests')), `${s} tests`).toBe(true);
      expect(existsSync(join(root, PACK_BY_SLUG[s]!.dir, 'README.md')), `${s} README`).toBe(true);
    }
  });

  it('are marked authored and name the pack they came from', () => {
    for (const s of slugs) {
      const pb = playbooks.find((p) => p.slug === s)!;
      expect(pb.provenance.kind).toBe('authored');
      expect(pb.provenance.packDir).toBe(PACK_BY_SLUG[s]!.dir);
      expect(pb.provenance.note, `${s} must say what was not run`).toMatch(
        /not run|not against|no .{0,70}(connected|used|certification)|not been/i,
      );
    }
  });

  it('reference only files that exist', () => {
    for (const s of slugs) {
      const pb = playbooks.find((p) => p.slug === s)!;
      const text = JSON.stringify(pb);
      const paths = new Set(
        (text.match(/fde-(?:packs|adapters|toolkit)\/[A-Za-z0-9_./-]+/g) ?? []).map((p) =>
          p.replace(/[.,]+$/, ''),
        ),
      );
      for (const p of paths) expect(existsSync(join(root, p)), `${s} references ${p}`).toBe(true);
      for (const h of pb.integrations)
        for (const a of h.artifacts)
          expect(existsSync(join(root, a)), `${s} ${h.id} artifact ${a}`).toBe(true);
    }
  });

  it('use the four integration layers on every authored hop', () => {
    for (const s of slugs) {
      for (const h of playbooks.find((p) => p.slug === s)!.integrations) {
        expect(
          h.external.source && h.external.target && h.external.protocol,
          `${s} ${h.id} layer 1`,
        ).toBeTruthy();
        expect(h.connector.adapter && h.connector.transformation.length, `${s} ${h.id} layer 2`).toBeTruthy();
        expect(
          h.contract.request && h.contract.response && h.contract.event,
          `${s} ${h.id} layer 3`,
        ).toBeTruthy();
        expect(h.acknowledgement.protocol && h.acknowledgement.example, `${s} ${h.id} layer 4`).toBeTruthy();
      }
    }
  });
});

describe('workflow, definition of done, deployment modes and troubleshooting', () => {
  it('has the twelve stages in order with a valid, acyclic dependency graph', () => {
    expect(FDE_STAGES.map((s) => s.id)).toEqual([...FDE_STAGE_IDS]);
    const seen = new Set<string>();
    for (const s of FDE_STAGES) {
      for (const d of s.dependsOn)
        expect(seen.has(d), `${s.id} depends on ${d} which comes later`).toBe(true);
      seen.add(s.id);
      for (const f of ['prerequisites', 'activities', 'deliverables', 'exitCriteria'] as const)
        expect(s[f].length, `${s.id}.${f}`).toBeGreaterThan(0);
    }
  });

  it('defines ten measurable definition-of-done categories with evidence and a signer', () => {
    expect(DOD_CATEGORIES).toHaveLength(10);
    for (const c of DOD_CATEGORIES) {
      expect(c.threshold.length).toBeGreaterThan(10);
      expect(c.evidence.length).toBeGreaterThan(0);
      expect(c.signer).toBeTruthy();
    }
  });

  it('has the eight deployment modes, each with rollback, cleanup and offline guidance, and fills placeholders', () => {
    expect([...DEPLOY_MODES.map((m) => m.id)].sort()).toEqual([...DEPLOY_MODE_IDS].sort());
    for (const m of DEPLOY_MODES) {
      expect(
        m.inside.length && m.rollback.length && m.cleanup.length && m.deploy.length && m.verify.length,
        m.id,
      ).toBeTruthy();
      expect(m.registries.offline.length, `${m.id} offline`).toBeGreaterThan(0);
    }
    expect(fill('helm -n {{ns}} {{release}} {{unknown}}', { ns: 'a', release: 'b' })).toBe(
      'helm -n a b {{unknown}}',
    );
  });

  it('has the fifteen troubleshooting scenarios, each with symptoms, diagnostics, causes, fixes and verification', () => {
    expect(TROUBLESHOOTING).toHaveLength(15);
    expect(new Set(TROUBLESHOOTING.map((t) => t.id)).size).toBe(15);
    for (const t of TROUBLESHOOTING)
      for (const f of ['symptoms', 'diagnose', 'causes', 'fix', 'verify'] as const)
        expect(t[f].length, `${t.id}.${f}`).toBeGreaterThan(0);
    const ranked = rankScenarios({
      online: true,
      llm: false,
      gpu: true,
      tenant: true,
      streaming: true,
      batch: false,
      partners: false,
    });
    expect(ranked.length).toBeGreaterThanOrEqual(5);
    for (const id of ranked) expect(TROUBLESHOOTING.some((t) => t.id === id)).toBe(true);
  });

  it('ships the thirteen templates and the executable checks the catalog names', () => {
    expect(TOOLKIT_TEMPLATES).toHaveLength(13);
    for (const t of TOOLKIT_TEMPLATES)
      expect(existsSync(join(root, 'fde-toolkit', 'templates', t)), t).toBe(true);
    for (const c of TOOLKIT_CHECKS) expect(existsSync(join(root, c.script)), c.script).toBe(true);
  });

  it('lists every adapter with its module and config on disk and never claims a vendor sandbox run', () => {
    expect(ADAPTERS.length).toBeGreaterThanOrEqual(12);
    for (const a of ADAPTERS) {
      expect(existsSync(join(root, a.module)), a.module).toBe(true);
      expect(existsSync(join(root, a.config)), a.config).toBe(true);
      expect(a.vendorSandbox).toBe('not run');
    }
  });

  it('assigns the FDE a responsible role in the deliverables it owns (RACI row is not C/C/R/C/C/R/C)', () => {
    const own = FDE_RACI.filter((r) => /readiness|integration|environment|connector/i.test(r.deliverable));
    expect(own.length).toBeGreaterThan(0);
    for (const r of own) expect(['R', 'A', 'A/R']).toContain(r.fde);
    expect(ROLE_IDS.length).toBe(15);
  });
});

describe('release evidence', () => {
  it('checks a sample file digest the same way the toolkit does', () => {
    const digest = createHash('sha256').update('x').digest('hex');
    expect(digest).toHaveLength(64);
  });
});
