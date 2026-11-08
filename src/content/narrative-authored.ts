/**
 * Hand-written narratives.
 *
 * The generator in `narrative.ts` assembles a problem statement, solution approach, architecture rationale and
 * end-to-end breakdown from each use case's own fields. For the use cases that have an authored playbook, an
 * engineer can write those four sections by hand instead, in `content/narratives/<domain>/<key>.yaml`.
 * When the file exists it replaces the generated text; the diagrams, tables and scale numbers stay derived.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import {
  ArchitectureRationaleSchema,
  E2EPhaseSchema,
  ProblemStatementSchema,
  SolutionApproachSchema,
} from '../schemas/usecase.schema';

const AuthoredNarrativeSchema = z
  .object({
    problemStatement: ProblemStatementSchema,
    solutionApproach: SolutionApproachSchema,
    architectureRationale: ArchitectureRationaleSchema,
    e2e: z.array(E2EPhaseSchema).min(8),
  })
  .strict();

export type AuthoredNarrative = z.infer<typeof AuthoredNarrativeSchema>;

/** Returns undefined when the use case has no authored narrative file. */
export function loadAuthoredNarrative(root: string, domain: string, key: string, stageLabels: string[]): AuthoredNarrative | undefined {
  const path = join(root, 'content', 'narratives', domain, `${key}.yaml`);
  if (!existsSync(path)) return undefined;
  const where = `content/narratives/${domain}/${key}.yaml`;

  const parsed = AuthoredNarrativeSchema.safeParse(parseYaml(readFileSync(path, 'utf8')));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`${where}: narrative validation failed\n${issues}`);
  }
  const n = parsed.data;

  // the rationale table has to describe the stages the diagrams actually draw, one row each, in order
  const got = n.architectureRationale.map((r) => r.stage);
  if (got.length !== stageLabels.length || got.some((s, i) => s !== stageLabels[i])) {
    throw new Error(`${where}: architectureRationale stages must be exactly, in order:\n  ${stageLabels.join('\n  ')}\nbut found:\n  ${got.join('\n  ')}`);
  }
  n.e2e.forEach((p, i) => {
    if (p.phase !== i + 1) throw new Error(`${where}: e2e phases must be numbered 1..${n.e2e.length} in order (phase ${p.phase} at position ${i + 1})`);
  });
  return n;
}
