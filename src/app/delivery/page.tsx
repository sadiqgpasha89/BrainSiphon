import type { Metadata } from 'next';
import { DeliveryGuide } from '../../components/delivery/DeliveryGuide';
import { DeliveryReference } from '../../components/delivery/Reference';
import { ALL_STEPS, DELIVERY_PHASES } from '../../content/delivery';
import { getIndex } from '../../lib/content';

export const revalidate = 86400;
export const metadata: Metadata = {
  title: 'Delivery guide',
  description: `From project scoping to deployment and monitoring: ${DELIVERY_PHASES.length} phases and ${ALL_STEPS.length} steps that apply to every use case, with who does what, when and how, a gate per phase and a RACI.`,
  alternates: { canonical: '/delivery', types: { 'text/markdown': '/delivery.md' } },
};

export default async function DeliveryPage() {
  const entries = (await getIndex()).map((e) => ({ slug: e.slug, title: e.title, domain: e.domain }));
  return (
    <DeliveryGuide entries={entries}>
      <DeliveryReference />
    </DeliveryGuide>
  );
}
