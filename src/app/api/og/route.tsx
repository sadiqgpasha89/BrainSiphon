import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { getIndex } from '../../../lib/content';
import { DOMAIN_META, LATENCY_LABEL } from '../../../schemas/usecase.schema';

export const runtime = 'nodejs';

const Q = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9-]+\/[a-z0-9-]+$/)
    .optional(),
});

/** Social card. Content comes from the validated index by slug, never from free-form query text. */
export async function GET(req: NextRequest) {
  const parsed = Q.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  const entry =
    parsed.success && parsed.data.slug
      ? (await getIndex()).find((e) => e.slug === parsed.data.slug)
      : undefined;
  const title = entry?.title ?? 'BrainSiphon';
  const domain = entry ? DOMAIN_META[entry.domain].name : 'Signal in. Noise out.';
  const latency = entry ? LATENCY_LABEL[entry.latencySLA] : '500 AI/ML blueprints';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 64,
        background: '#0a0d12',
        color: '#e6edf6',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, color: '#34d399' }}>
        <div style={{ width: 14, height: 14, borderRadius: 14, background: '#34d399' }} />
        BrainSiphon
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 28, color: '#93a1b5' }}>{domain}</div>
        <div style={{ fontSize: title.length > 48 ? 56 : 68, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
      </div>
      <div style={{ display: 'flex', gap: 20, fontSize: 28 }}>
        <div style={{ padding: '10px 22px', borderRadius: 999, background: '#16202b', color: '#93a1b5' }}>
          {latency}
        </div>
        {entry && (
          <div style={{ padding: '10px 22px', borderRadius: 999, background: '#0b2e25', color: '#34d399' }}>
            {`${entry.signalCount} signals`}
          </div>
        )}
        {entry && (
          <div style={{ padding: '10px 22px', borderRadius: 999, background: '#33121a', color: '#fb7185' }}>
            {`${entry.noiseCount} noise traps`}
          </div>
        )}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable' },
    },
  );
}
