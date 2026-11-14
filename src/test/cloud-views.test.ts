import { describe, expect, it } from 'vitest';
import {
  CAPS,
  CLOUD_IDS,
  capForNode,
  cloudView,
  relabelFlowchart,
  serviceMatrix,
  viewInputOf,
} from '../content/cloud-views';
import { toMarkdown } from '../content/markdown';
import { loadAllUseCases } from '../content/load';

const all = loadAllUseCases();
const fraud = all.find((u) => u.slug === 'fintech/real-time-card-upi-fraud-detection')!;

describe('cloud views', () => {
  it('names a service for every building block on every platform, with characters Mermaid accepts', () => {
    for (const [id, cap] of Object.entries(CAPS))
      for (const c of CLOUD_IDS) {
        expect(cap.svc[c].length, `${id} ${c}`).toBeGreaterThan(3);
        expect(cap.svc[c], `${id} ${c}`).not.toMatch(/[;#<>&"]/);
      }
  });

  it('keeps the blueprint structure: same node ids and edges, only labels gain services', () => {
    const v = cloudView(viewInputOf(fraud), 'azure');
    const ids = (s: string) =>
      [...s.matchAll(/^\s*([A-Za-z][A-Za-z0-9]*)\s*(?:-->|-\.->|-\.|--)/gm)].map((m) => m[1]);
    expect(ids(v.hld)).toEqual(ids(fraud.systemDesign.hld.mermaid));
    expect(v.hld).toContain('Azure Front Door');
    expect(v.hld).not.toContain('CloudFront');
    expect(v.hld.split('\n').length).toBe(fraud.systemDesign.hld.mermaid.split('\n').length);
  });

  it("uses each platform's own services, never another platform's", () => {
    const marks: Record<string, RegExp> = {
      aws: /Azure |Vertex AI|Magnum|BigQuery/,
      azure: /CloudFront|SageMaker|Vertex AI|Magnum|BigQuery/,
      gcp: /CloudFront|SageMaker|Azure |Magnum/,
      openstack: /CloudFront|SageMaker|Azure |Vertex AI|BigQuery/,
    };
    for (const c of CLOUD_IDS) expect(cloudView(viewInputOf(fraud), c).hld, c).not.toMatch(marks[c]!);
  });

  it('says how the services connect, and which of them an OpenStack operator must run', () => {
    for (const c of CLOUD_IDS) expect(cloudView(viewInputOf(fraud), c).wiring.length, c).toBeGreaterThan(8);
    const o = cloudView(viewInputOf(fraud), 'openstack');
    expect(o.services.some((s) => s.selfRun)).toBe(true);
    expect(o.notes.join(' ')).toMatch(/operate \d+ of the \d+ building blocks/);
  });

  it('adapts to the blueprint: batch designs get orchestration, online ones do not', () => {
    const batch = all.find((u) => u.systemDesign.mode === 'batch')!;
    const online = all.find((u) => u.systemDesign.mode === 'online')!;
    const caps = (u: typeof batch) => cloudView(viewInputOf(u), 'gcp').services.map((s) => s.cap);
    expect(caps(batch)).toContain('orchestrator');
    expect(caps(online)).not.toContain('orchestrator');
    expect(caps(online)).toContain('eventBus');
  });

  it('works for every blueprint and platform without dropping a node', () => {
    for (const u of all) {
      const base = viewInputOf(u).hld;
      for (const c of CLOUD_IDS) {
        const r = relabelFlowchart(base, c).code;
        const n = (s: string) => (s.match(/\["|\(\["|\[\("|\[\["/g) ?? []).length;
        expect(n(r), `${u.slug} ${c}`).toBe(n(base));
      }
    }
  });

  it("leaves the customer's own systems and people alone", () => {
    expect(capForNode('U', '10M users / upstream systems')).toBeNull();
    expect(capForNode('SRC', 'Source systems<br/>OLTP, events, files')).toBeNull();
    expect(capForNode('APPS', 'Consumers<br/>apps, CRM, BI, APIs')).toBeNull();
  });

  it('puts the service map in the markdown export', () => {
    const md = toMarkdown(fraud, 'https://example.test', null);
    expect(md).toContain('### The same design on AWS, Azure, GCP and OpenStack');
    expect(md).toContain('| Building block | AWS | Azure | GCP | OpenStack |');
    expect(serviceMatrix(viewInputOf(fraud)).length).toBeGreaterThan(10);
  });
});
