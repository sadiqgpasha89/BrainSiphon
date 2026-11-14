import { describe, expect, it } from 'vitest';
import { ALL_STEPS } from '../content/delivery';
import {
  backlogCsv,
  generatePackage,
  packageZip,
  recommend,
  type PackageInput,
} from '../lib/package-generator';

const base: PackageInput = {
  projectName: 'Card Fraud',
  family: 'realtime-decisioning',
  cloud: 'aws',
  environment: 'staging',
  tier: 'T3',
  peakRps: 1200,
  platformTeam: true,
  selfHostedModel: false,
  regulated: true,
  region: 'us-east-1',
  vpcCidr: '10.20.0.0/16',
};

describe('package generator', () => {
  it('recommends Kubernetes for high-rate decisioning, and says why', () => {
    const r = recommend(base);
    expect(r.runtime).toBe('kubernetes');
    expect(r.rejected.length).toBeGreaterThan(0);
  });

  it('does not recommend Kubernetes for batch, or for RAG on a provider-hosted model', () => {
    expect(recommend({ ...base, family: 'batch-forecasting' }).runtime).toBe('serverless-batch');
    expect(recommend({ ...base, family: 'rag-assistant', peakRps: 500 }).runtime).toBe('managed-containers');
    expect(recommend({ ...base, family: 'agentic-workflow' }).runtime).toBe('durable-workflow');
  });

  it('warns when Kubernetes is recommended without a platform team', () => {
    expect(recommend({ ...base, platformTeam: false }).reasons.join(' ')).toMatch(/platform team/);
  });

  it('generates every promised file, with environment-specific content', () => {
    const files = generatePackage(base);
    const paths = files.map((f) => f.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        'terraform/staging.tfvars',
        'helm/values-staging.yaml',
        '.env.staging',
        'COMMANDS.md',
        'adr/0001-runtime-and-recovery.md',
        'backlog.csv',
        'VALIDATION.md',
      ]),
    );
    expect(files.find((f) => f.path === 'terraform/staging.tfvars')!.content).toContain(
      'environment = "staging"',
    );
    expect(files.find((f) => f.path === 'helm/values-staging.yaml')!.content).toContain(
      "LATENCY_BUDGET_MS: '20'",
    );
    expect(files.find((f) => f.path === 'COMMANDS.md')!.content).toContain('destroy');
  });

  it('never hides what was not validated, and never embeds secrets', () => {
    const files = generatePackage(base);
    expect(files.find((f) => f.path === 'VALIDATION.md')!.content).toMatch(
      /No recovery target in this package has been measured/,
    );
    expect(files.find((f) => f.path === '.env.staging')!.content).not.toMatch(
      /password\s*=|secret\s*=\s*\S/i,
    );
  });

  it('records an override and its reason in the ADR', () => {
    const files = generatePackage(base, {
      runtime: 'managed-containers',
      reason: 'No platform engineers until Q3',
    });
    const adr = files.find((f) => f.path.startsWith('adr/'))!.content;
    expect(adr).toContain('## Override');
    expect(adr).toContain('No platform engineers until Q3');
  });

  it('turns all 69 delivery steps into backlog rows with an owner and acceptance criteria', () => {
    const lines = backlogCsv(base).trim().split('\n');
    expect(lines.length).toBe(1 + ALL_STEPS.length + 3);
    expect(lines[0]).toContain('Acceptance criteria');
  });

  it('packs into a valid zip', () => {
    const z = packageZip(generatePackage(base));
    expect(z[0]).toBe(0x50);
    expect(z[1]).toBe(0x4b);
  });
});
