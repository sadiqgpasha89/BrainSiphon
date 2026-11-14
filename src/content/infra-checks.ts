import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Static checks on the infrastructure files that need no cloud account and no Terraform binary. They are a floor, not a substitute for
 * `terraform validate`, `tflint`, `checkov` and `conftest`, which run in CI (see the infrastructure-validation job).
 */
export const ENVIRONMENTS = ['dev', 'staging', 'preprod', 'production'] as const;
const CLOUDS = ['aws', 'azure', 'gcp'] as const;

const read = (root: string, p: string) => readFileSync(join(root, p), 'utf8');

export function checkInfra(root = process.cwd()): string[] {
  const errors: string[] = [];
  const fail = (m: string) => errors.push(m);

  for (const c of CLOUDS) {
    const p = `deployment/terraform/${c}/main.tf`;
    if (!existsSync(join(root, p))) {
      fail(`${p} is missing`);
      continue;
    }
    const s = read(root, p);
    if (!/required_version\s*=\s*">= 1\.\d+\.\d+"/.test(s)) fail(`${p}: no required_version`);
    for (const m of s.matchAll(/source\s*=\s*"[^"]+"\s*\n\s*version\s*=\s*"([^"]+)"/g))
      if (!m[1]!.startsWith('~>')) fail(`${p}: provider version "${m[1]}" is not pinned with ~>`);
    if (!/validation\s*\{[^}]*dev[^}]*staging[^}]*preprod[^}]*production/s.test(s))
      fail(`${p}: the environment variable does not validate dev, staging, preprod and production`);
    if (/"0\.0\.0\.0\/0"/.test(s) && /ingress/.test(s)) fail(`${p}: contains an ingress rule open to 0.0.0.0/0`);
    if (/(version|kubernetes_version)\s*=\s*"1\.30"/.test(s)) fail(`${p}: pins Kubernetes 1.30, which is out of support`);
  }

  const aws = read(root, 'deployment/terraform/aws/main.tf');
  for (const needle of ['storage_encrypted       = true', 'kms_key_id', 'endpoint_private_access = true'])
    if (!aws.includes(needle)) fail(`aws/main.tf: missing ${needle}`);
  if (/endpoint_public_access\s*=\s*true/.test(aws)) fail('aws/main.tf: the EKS API endpoint is public in every environment');

  // four environments, each with a tfvars and a Helm values file; CIDRs must not overlap by being identical
  const cidrs = new Map<string, string>();
  for (const e of ENVIRONMENTS) {
    const tf = e === 'production' ? 'prod' : e;
    const f = `deployment/terraform/environments/${tf}.tfvars`;
    if (!existsSync(join(root, f))) {
      fail(`${f} is missing`);
      continue;
    }
    const s = read(root, f);
    if (!new RegExp(`environment\\s*=\\s*"${e}"`).test(s)) fail(`${f}: environment is not "${e}"`);
    const cidr = /vpc_cidr\s*=\s*"([^"]+)"/.exec(s)?.[1];
    if (!cidr) fail(`${f}: no vpc_cidr`);
    else if (cidrs.has(cidr)) fail(`${f}: vpc_cidr ${cidr} is also used by ${cidrs.get(cidr)}`);
    else cidrs.set(cidr, f);
    const h = `deployment/helm/ai-solution/values-${tf === 'dev' ? 'dev' : tf}.yaml`;
    if (!existsSync(join(root, h))) fail(`${h} is missing`);
    else if (!new RegExp(`ENVIRONMENT:\\s*${e}\\b`).test(read(root, h))) fail(`${h}: ENVIRONMENT is not ${e}`);
  }

  const base = 'deployment/kubernetes/base/network-policy.yaml';
  if (!existsSync(join(root, base))) fail(`${base} is missing: workloads would have no network policy`);
  const values = read(root, 'deployment/helm/ai-solution/values.yaml');
  for (const needle of ['runAsNonRoot: true', 'readOnlyRootFilesystem: true', 'allowPrivilegeEscalation: false'])
    if (!values.includes(needle)) fail(`helm values.yaml: missing ${needle}`);
  if (!existsSync(join(root, 'deployment/helm/ai-solution/templates/network-policy.yaml')))
    fail('the Helm chart has no network-policy template');
  for (const f of ['deployment/policy/kubernetes.rego', 'deployment/policy/checkov.yaml', 'deployment/terraform/bootstrap-state.sh'])
    if (!existsSync(join(root, f))) fail(`${f} is missing`);
  return errors;
}
