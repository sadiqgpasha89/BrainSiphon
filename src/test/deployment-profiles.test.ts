import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENVIRONMENTS_SPEC, RECOVERY_TIERS, WORKLOAD_VARIANTS } from '../content/deployment-profiles';

const aws = readFileSync('deployment/terraform/aws/main.tf', 'utf8');

describe('deployment profiles', () => {
  it('describes the four environments, each with the files it names', () => {
    expect(ENVIRONMENTS_SPEC.map((e) => e.id)).toEqual(['dev', 'staging', 'preprod', 'production']);
    for (const e of ENVIRONMENTS_SPEC) {
      expect(() => readFileSync(e.tfvars, 'utf8'), e.tfvars).not.toThrow();
      const helm = readFileSync(e.helmValues, 'utf8');
      expect(helm, e.helmValues).toContain(`LATENCY_BUDGET_MS: '${e.helm.latencyBudgetMs}'`);
    }
  });

  it('agrees with the AWS Terraform on instance classes and the production-shaped split', () => {
    expect(aws).toContain('local.prod_like ? "c6i.4xlarge" : "c6i.xlarge"');
    expect(aws).toContain('local.prod_like ? "cache.m6g.xlarge" : "cache.t4g.medium"');
    expect(aws).toMatch(/local\.prod_like \? 2 : 0\.5/);
    for (const e of ENVIRONMENTS_SPEC) {
      const prodShaped = e.id === 'preprod' || e.id === 'production';
      expect(e.aws.nodes.includes('c6i.4xlarge'), e.id).toBe(prodShaped);
      expect(e.aws.deletionProtection, e.id).toBe(prodShaped);
    }
  });

  it('labels every recovery tier as a target with a split-brain control and a test cadence', () => {
    expect(RECOVERY_TIERS.length).toBeGreaterThanOrEqual(4);
    for (const t of RECOVERY_TIERS) {
      expect(t.splitBrain.length).toBeGreaterThan(10);
      expect(t.test.length).toBeGreaterThan(10);
    }
  });

  it('covers every workload class the review asked for', () => {
    expect(WORKLOAD_VARIANTS.map((w) => w.id)).toEqual(
      expect.arrayContaining([
        'online-inference',
        'batch-ml',
        'streaming',
        'computer-vision',
        'rag',
        'agentic',
        'training',
        'optimisation',
      ]),
    );
  });
});
