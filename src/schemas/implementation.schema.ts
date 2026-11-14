import { z } from 'zod';
import { DomainEnum, PATTERN_IDS } from './usecase.schema';

/**
 * The Customer Implementation Playbook: what a Forward Deployed Engineer needs, for one use case, to take the blueprint into a
 * customer's environment, build the integrations, deploy, prove acceptance and hand over, without inventing the engineering.
 */
const s = z.string().trim().min(2);
const list = (min = 1) => z.array(s).min(min);

export const FDE_STAGE_IDS = [
  'customer-discovery',
  'environment-discovery',
  'integration-discovery',
  'data-access',
  'solution-configuration',
  'local-development',
  'customer-deployment',
  'integration-testing',
  'uat',
  'production-rollout',
  'customer-acceptance',
  'day-two-support',
] as const;
export type FdeStageId = (typeof FDE_STAGE_IDS)[number];
export const FdeStageEnum = z.enum(FDE_STAGE_IDS);

export const MappingRowSchema = z.object({
  external: s,
  internal: s,
  rule: s,
  example: z.string().optional(),
});

export const TestCaseSchema = z.object({
  id: s,
  title: s,
  layer: z.enum(['contract', 'integration', 'resilience', 'security', 'performance', 'acceptance']),
  given: s,
  when: s,
  then: s,
  command: z.string().optional(),
});

/** One integration hop in four layers: external protocol, connector and transformation, internal contract, acknowledgement. */
export const HopSchema = z.object({
  id: s,
  name: s,
  necessity: z.enum(['core', 'conditional', 'optional']),
  direction: z.enum(['inbound', 'outbound', 'bidirectional']),
  purpose: s,
  external: z.object({ source: s, target: s, protocol: s, boundary: s, authentication: s, network: s }),
  connector: z.object({
    adapter: s,
    transformation: list(),
    errorHandling: list(),
    retry: s,
    timeout: s,
    idempotency: s,
  }),
  contract: z.object({ name: s, request: s, response: s, event: s }),
  acknowledgement: z.object({ protocol: s, example: s, expectedOutput: s }),
  mappings: z.array(MappingRowSchema).min(2),
  sequence: s,
  tests: z.array(TestCaseSchema).min(3),
  /** repository paths of runnable code for this hop (adapters, simulators, fixtures); checked to exist by a test */
  artifacts: z.array(s),
});
export type Hop = z.infer<typeof HopSchema>;
export type TestCase = z.infer<typeof TestCaseSchema>;

export const SystemSchema = z.object({
  role: z.enum(['source', 'target', 'system-of-record', 'identity', 'optional']),
  name: s,
  purpose: s,
  need: z.enum(['core', 'conditional', 'optional']),
  alternatives: z.array(z.object({ name: s, adapter: z.string().optional() })).min(1),
  adapter: z.string().optional(),
  customerOwner: s,
  ifNoAccess: s,
});

export const TaskSchema = z.object({
  id: s,
  title: s,
  detail: s,
  stage: FdeStageEnum,
  owner: z.enum(['fde', 'customer', 'shared']),
  approval: z.string().optional(),
  evidence: s,
});
export type FdeTask = z.infer<typeof TaskSchema>;

export const ImplementationPlaybookSchema = z.object({
  version: z.literal(1),
  slug: s,
  title: s,
  domain: DomainEnum,
  pattern: z.enum(PATTERN_IDS),
  mode: z.enum(['online', 'interactive', 'batch']),
  provenance: z.object({ kind: z.enum(['authored', 'derived']), note: s, packDir: z.string().optional() }),
  summary: s,
  ownership: z.object({
    fdeOwns: list(3),
    fdeSupports: list(2),
    raci: z
      .array(
        z.object({
          deliverable: s,
          fde: z.string(),
          platform: z.string(),
          architect: z.string(),
          aiEngineer: z.string(),
          sre: z.string(),
          customer: z.string(),
        }),
      )
      .min(5),
    independent: z.array(z.object({ task: s, evidence: s })).min(4),
    needsApproval: z.array(z.object({ task: s, approver: s, evidence: s })).min(4),
    escalation: z.array(z.object({ trigger: s, to: s, within: s, how: s })).min(3),
  }),
  maturity: z.object({ reached: s, verdict: s, next: s, tasks: z.array(TaskSchema).min(3) }),
  discovery: z.array(z.object({ id: s, area: s, question: s, why: s, askWho: s, evidence: s })).min(10),
  systems: z.array(SystemSchema).min(4),
  integrations: z.array(HopSchema).min(3),
  identity: z.object({ workforce: s, machine: s, partner: z.string().optional(), notes: list(2) }),
  permissions: z.array(z.object({ system: s, permission: s, scope: s, why: s, approver: s })).min(3),
  network: z.array(z.object({ id: s, from: s, to: s, port: s, protocol: s, purpose: s, change: s })).min(3),
  connectors: z.array(z.object({ adapter: s, role: s, config: s, mock: s })).min(2),
  localDev: z.object({
    prerequisites: list(2),
    steps: z.array(z.object({ title: s, command: s, expect: s })).min(3),
  }),
  configuration: z.object({
    files: z
      .array(z.object({ path: s, language: z.enum(['yaml', 'json', 'env', 'hcl', 'bash']), content: s }))
      .min(2),
    keys: z.array(z.object({ key: s, description: s, example: s, required: z.boolean() })).min(4),
  }),
  testing: z.object({
    suites: z.array(z.object({ name: s, covers: s, command: s })).min(3),
    acceptance: z.array(TestCaseSchema).min(3),
  }),
  rollout: z.object({
    strategy: s,
    stages: z.array(z.object({ stage: s, traffic: s, gate: s, rollback: s })).min(4),
    fallback: s,
    reconciliation: list(2),
  }),
  deployment: z.object({
    note: s,
    commands: z.object({
      preflight: list(),
      deploy: list(),
      verify: list(),
      rollback: list(),
      cleanup: list(),
    }),
  }),
  troubleshooting: z.object({
    scenarioIds: list(5),
    specific: z
      .array(
        z.object({ title: s, symptoms: list(), diagnose: list(), cause: s, fix: list(), verify: list() }),
      )
      .min(3),
  }),
  deliverables: z.object({
    fde: z.array(z.object({ id: s, title: s, stage: FdeStageEnum, evidence: s })).min(6),
    customer: z.array(z.object({ id: s, title: s, owner: s, neededBy: FdeStageEnum, blocks: s })).min(6),
  }),
  acceptance: z.object({
    criteria: z
      .array(z.object({ id: s, category: s, criterion: s, measure: s, threshold: s, evidence: s, owner: s }))
      .min(10),
    handover: list(6),
  }),
  checklist: z
    .array(
      z.object({
        id: s,
        stage: FdeStageEnum,
        item: s,
        owner: z.enum(['fde', 'customer', 'shared']),
        approval: z.boolean(),
      }),
    )
    .min(15),
});
export type ImplementationPlaybook = z.infer<typeof ImplementationPlaybookSchema>;
