import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Process is up and the event loop is responsive. Never touches dependencies. */
export function GET() {
  return NextResponse.json(
    { status: 'ok', uptimeSeconds: Math.round(process.uptime()) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
