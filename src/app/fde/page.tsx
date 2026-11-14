import type { Metadata } from 'next';
import Link from 'next/link';
import { FdeHub } from '../../components/fde/FdeHub';
import { getIndex } from '../../lib/content';

export const metadata: Metadata = {
  title: 'FDE hub',
  description:
    'Customer workspaces, implementation plans, a pre-flight toolkit, reusable adapters, deployment modes and a troubleshooting knowledge base for forward deployed engineers.',
};

export default async function FdePage() {
  const useCases = (await getIndex()).map((e) => ({ slug: e.slug, title: e.title, domain: e.domain }));
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-wider text-signal">Forward deployed engineer</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">FDE hub</h1>
        <p className="mt-2 max-w-3xl text-sm text-mute" data-prose>
          Everything for taking a blueprint into a customer environment: a workspace per customer, a dated
          plan through twelve stages, executable pre-flight checks, adapters and mocks, eight deployment modes
          and a troubleshooting knowledge base. Everything here is mock-tested only until you record a run in
          the customer&apos;s environment.
        </p>
        <p className="mt-2 text-sm text-mute">
          Looking for deployment profiles, architecture packages and decision aids? See the{' '}
          <Link href="/workspace">architecture workspace</Link>.
        </p>
      </header>
      <FdeHub useCases={useCases} />
    </div>
  );
}
