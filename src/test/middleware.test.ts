import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import history from '../../content/slug-history.json';
import { getIndexForTest } from './helpers';
import { middleware } from '../middleware';

describe('slug evolution', () => {
  it('308-redirects renamed slugs (and their .md form) to the canonical URL', () => {
    const res = middleware(new NextRequest('http://localhost/fintech/real-time-payment-fraud-detection'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/fintech/real-time-card-upi-fraud-detection');
    const md = middleware(new NextRequest('http://localhost/fintech/real-time-payment-fraud-detection.md'));
    expect(md.headers.get('location')).toBe('http://localhost/fintech/real-time-card-upi-fraud-detection.md');
  });

  it('every redirect target exists and no old slug is still live', async () => {
    const live = new Set((await getIndexForTest()).map((e) => e.slug));
    for (const [from, to] of Object.entries(history as Record<string, string>)) {
      expect(live.has(to), `${from} -> ${to}`).toBe(true);
      expect(live.has(from), `${from} should not also exist`).toBe(false);
    }
  });

  it('injects and preserves x-request-id', () => {
    const generated = middleware(new NextRequest('http://localhost/fintech'));
    expect(generated.headers.get('x-request-id')).toMatch(/[0-9a-f-]{36}/);
    const kept = middleware(
      new NextRequest('http://localhost/fintech', { headers: { 'x-request-id': 'abc-123' } }),
    );
    expect(kept.headers.get('x-request-id')).toBe('abc-123');
  });
});
