import type { FdeStageId, Hop, ImplementationPlaybook } from '../../../schemas/implementation.schema';
import { mm } from '../mm';

type PB = ImplementationPlaybook;
export type Layer = Hop['tests'][number]['layer'];

/** Compact authoring form of a hop. Tuples keep a pack readable: mappings are [external, internal, rule, example?], tests are [id, title, layer, given, when, then, command?]. */
export interface HopSpec {
  id: string;
  name: string;
  need: Hop['necessity'];
  dir: Hop['direction'];
  purpose: string;
  ext: Hop['external'];
  adapter: string;
  transform: string[];
  errors: string[];
  retry: string;
  timeout: string;
  idem: string;
  contract: { name: string; request: string; response: string; event: string };
  ack: { protocol: string; example: string; expected: string };
  map: [string, string, string, string?][];
  seq: [string, string, string][];
  tests: [string, string, Layer, string, string, string, string?][];
  artifacts: string[];
}

export function hop(h: HopSpec): Hop {
  const actors = [...new Set(h.seq.flatMap(([a, b]) => [a, b]))];
  const sequence = ['sequenceDiagram', ...actors.map((a, i) => `  participant P${i} as ${mm(a)}`), ...h.seq.map(([a, b, msg]) => `  P${actors.indexOf(a)}->>P${actors.indexOf(b)}: ${mm(msg)}`)].join('\n');
  return {
    id: h.id, name: h.name, necessity: h.need, direction: h.dir, purpose: h.purpose, external: h.ext,
    connector: { adapter: h.adapter, transformation: h.transform, errorHandling: h.errors, retry: h.retry, timeout: h.timeout, idempotency: h.idem },
    contract: h.contract, acknowledgement: { protocol: h.ack.protocol, example: h.ack.example, expectedOutput: h.ack.expected },
    mappings: h.map.map(([external, internal, rule, example]) => ({ external, internal, rule, ...(example ? { example } : {}) })),
    sequence, tests: h.tests.map(([id, title, layer, given, when, then, command]) => ({ id, title, layer, given, when, then, ...(command ? { command } : {}) })), artifacts: h.artifacts,
  };
}

type Sys = PB['systems'][number];
export const sys = (role: Sys['role'], name: string, purpose: string, need: Sys['need'], alts: [string, string?][], owner: string, ifNoAccess: string, adapter?: string): Sys => ({
  role, name, purpose, need, adapter, alternatives: alts.map(([n, a]) => ({ name: n, ...(a ? { adapter: a } : {}) })), customerOwner: owner, ifNoAccess,
});

export const q = (id: string, area: string, question: string, why: string, askWho: string, evidence: string): PB['discovery'][number] => ({ id, area, question, why, askWho, evidence });
export const perm = (system: string, permission: string, scope: string, why: string, approver: string): PB['permissions'][number] => ({ system, permission, scope, why, approver });
export const net = (id: string, from: string, to: string, port: string, protocol: string, purpose: string, change = 'Firewall or security-group rule with source, destination, port and a ticket'): PB['network'][number] => ({ id, from, to, port, protocol, purpose, change });
export const conn = (adapter: string, role: string, config: string, mock: string): PB['connectors'][number] => ({ adapter, role, config, mock });
export const crit = (id: string, category: string, criterion: string, measure: string, threshold: string, evidence: string, owner: string): PB['acceptance']['criteria'][number] => ({ id, category, criterion, measure, threshold, evidence, owner });
export const dep = (id: string, title: string, owner: string, neededBy: FdeStageId, blocks: string): PB['deliverables']['customer'][number] => ({ id, title, owner, neededBy, blocks });
export const tr = (title: string, symptoms: string[], diagnose: string[], cause: string, fix: string[], verify: string[]): PB['troubleshooting']['specific'][number] => ({ title, symptoms, diagnose, cause, fix, verify });
export const stage = (id: string, name: string, traffic: string, gate: string, rollback: string): PB['rollout']['stages'][number] => ({ stage: name, traffic, gate, rollback: rollback + (id ? '' : '') });
