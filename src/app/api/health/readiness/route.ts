import { NextResponse } from 'next/server';
import { dbConfigured, pingDb } from '../../../../lib/db';
import { getReadyRedis, redisConfigured } from '../../../../lib/redis';

export const dynamic = 'force-dynamic';

type Check = { status: 'ok' | 'fail' | 'not_configured'; ms?: number; error?: string };
const TIMEOUT_MS = 2000;

async function timed(fn: () => Promise<unknown>): Promise<Check> {
  const t = performance.now();
  try {
    await Promise.race([
      fn(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT_MS)),
    ]);
    return { status: 'ok', ms: Math.round(performance.now() - t) };
  } catch (e) {
    return { status: 'fail', ms: Math.round(performance.now() - t), error: (e as Error).message };
  }
}

/**
 * Ready only when every *configured* dependency answers within 2 s.
 * Set REQUIRE_DEPS=1 to treat unconfigured Postgres/Redis as not ready (production compose does).
 */
export async function GET() {
  const require = process.env.REQUIRE_DEPS === '1';
  const [postgres, redis] = await Promise.all([
    dbConfigured() ? timed(() => pingDb(TIMEOUT_MS)) : Promise.resolve<Check>({ status: 'not_configured' }),
    redisConfigured()
      ? timed(async () => {
          const r = await getReadyRedis(TIMEOUT_MS);
          if (!r) throw new Error('not connected');
          return r.ping();
        })
      : Promise.resolve<Check>({ status: 'not_configured' }),
  ]);
  const failed = [postgres, redis].some(
    (c) => c.status === 'fail' || (require && c.status === 'not_configured'),
  );
  return NextResponse.json(
    { status: failed ? 'unavailable' : 'ready', checks: { postgres, redis } },
    { status: failed ? 503 : 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
