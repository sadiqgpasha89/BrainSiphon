import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOMAINS, type Domain, type UseCase, type UseCaseIndexEntry } from '../schemas/usecase.schema';
import { parseUseCaseFile } from './parse';
import { expand } from './expand';

/** Node-only: read every `content/usecases/<domain>.uc` and expand to validated use cases. */
export function loadAllUseCases(root = process.cwd()): UseCase[] {
  const dir = join(root, 'content', 'usecases');
  const files = readdirSync(dir).filter((f) => f.endsWith('.uc')).sort();
  const out: UseCase[] = [];
  for (const f of files) {
    const domain = f.split('.')[0] as Domain;
    if (!(DOMAINS as readonly string[]).includes(domain)) throw new Error(`content/usecases/${f}: filename must start with a known domain (${DOMAINS.join(', ')})`);
    const raws = parseUseCaseFile(`content/usecases/${f}`, readFileSync(join(dir, f), 'utf8'));
    for (const r of raws) out.push(expand(r, domain, undefined, root));
  }
  return out;
}

export function toIndexEntry(u: UseCase): UseCaseIndexEntry {
  const keywords = [
    ...u.dataAndFeatures.highSignalFeatures.map((f) => f.name),
    ...u.signalVsNoiseMatrix.map((r) => r.concept),
    u.architectureBlueprint.productionModel,
    u.problemFormulation.businessObjective,
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .slice(0, 600);
  return {
    id: u.id,
    slug: u.slug,
    title: u.title,
    domain: u.domain,
    mlParadigms: u.mlParadigms,
    latencySLA: u.latencySLA,
    difficulty: u.difficulty,
    summary: u.summary,
    signalCount: u.signalVsNoiseMatrix.length + u.dataAndFeatures.highSignalFeatures.length,
    noiseCount: u.dataAndFeatures.noisyFeaturesToDrop.length + u.signalVsNoiseMatrix.length,
    lastVerifiedAt: u.lastVerifiedAt,
    keywords,
    pattern: u.pattern,
    primitives: u.primitives,
    ...(u.playbook ? { playbook: u.playbook.provenance } : {}),
  };
}
