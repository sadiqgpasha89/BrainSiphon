import { NextResponse, type NextRequest } from 'next/server';
import { SearchQuerySchema } from '../../../schemas/usecase.schema';
import { clientIp, rateLimit } from '../../../lib/ratelimit';
import { search } from '../../../lib/search/service';
import { requestLogger } from '../../../lib/telemetry/logger';

export const dynamic = 'force-dynamic';

const LIMIT = Number(process.env.SEARCH_RATE_LIMIT ?? 60);

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id');
  const log = requestLogger(requestId);
  const started = performance.now();

  const rl = await rateLimit(`search:${clientIp(req.headers)}`, { limit: LIMIT, windowMs: 60_000 });
  const rlHeaders = {
    'X-RateLimit-Limit': String(LIMIT),
    'X-RateLimit-Remaining': String(rl.remaining),
    'X-RateLimit-Backend': rl.backend,
  };
  if (!rl.allowed) {
    log.warn({ ip: clientIp(req.headers) }, 'rate limited');
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { ...rlHeaders, 'Retry-After': String(Math.ceil(rl.resetMs / 1000) || 1) } },
    );
  }

  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = SearchQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'invalid_query',
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      { status: 400, headers: rlHeaders },
    );
  }

  const result = await search(parsed.data);
  const ms = Math.round(performance.now() - started);
  log.info({ q: parsed.data.q, source: result.source, total: result.total, ms }, 'search');
  return NextResponse.json(result, {
    headers: {
      ...rlHeaders,
      'Server-Timing': `search;dur=${ms}`,
      'Cache-Control': result.degraded ? 'no-store' : 'public, s-maxage=30, stale-while-revalidate=120',
    },
  });
}
