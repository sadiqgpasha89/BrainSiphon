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
] as const;
export type BundleId = (typeof DOWNLOAD_BUNDLES)[number]['id'];

