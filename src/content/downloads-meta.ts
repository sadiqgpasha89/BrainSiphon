/** Folders of the repository that are published as direct downloads, and the bundle each belongs to. */
export const DOWNLOAD_BUNDLES = [
  {
    id: 'delivery-templates',
    dir: 'delivery/templates',
    zip: 'brainsiphon-delivery-templates.zip',
    title: 'All delivery templates',
    note: 'Every template, schema and example from the delivery guide, in editable Markdown, YAML, SQL, CSV and Python.',
  },
  {
    id: 'deployment-kit',
    dir: 'deployment',
    zip: 'brainsiphon-deployment-kit.zip',
    title: 'Deployment kit',
    note: 'Terraform for AWS, Azure and GCP, Helm chart, Kubernetes base, runbooks, smoke test and validation policy.',
  },
  {
    id: 'fde-toolkit',
    dir: 'fde-toolkit',
    zip: 'brainsiphon-fde-preflight-toolkit.zip',
    title: 'FDE pre-flight toolkit',
    note: 'Thirteen templates, executable DNS, TCP, TLS, API, IdP and database checks, a machine-readable readiness report, and an offline mode for restricted and air-gapped sites.',
  },
  {
    id: 'fde-adapters',
    dir: 'fde-adapters',
    zip: 'brainsiphon-fde-adapters.zip',
    title: 'Reusable adapters and mocks',
    note: 'A standard adapter framework, config-driven connectors for fifteen systems, protocol parsers and vendor-shaped mocks. Mock-tested only: no vendor sandbox has been run.',
  },
  {
    id: 'fde-evidence',
    dir: 'fde-evidence',
    zip: 'brainsiphon-fde-handover-evidence.zip',
    title: 'Handover evidence tools',
    note: 'Infrastructure inventory from Terraform and kubectl output, release identity (commit, image digests, config and model versions), and a checksummed, sealed handover pack with a verifier.',
  },
  {
    id: 'fde-packs',
    dir: 'fde-packs',
    zip: 'brainsiphon-fde-use-case-packs.zip',
    title: 'Use-case implementation packs',
    note: 'Ten executable packs with their tests, fixtures and customer documentation: fraud, forecasting, sepsis, ETA, CTR, phishing, knowledge tracing, ticket triage, branch footfall and valuation.',
  },
] as const;
export type BundleId = (typeof DOWNLOAD_BUNDLES)[number]['id'];

