import { NextResponse, type NextRequest } from 'next/server';
import slugHistory from '../content/slug-history.json';

const history = slugHistory as Record<string, string>;

/**
 * 1. Correlation id: every request gets (or keeps) an x-request-id, echoed on the response and read by route handlers/loggers.
 * 2. Slug evolution: renamed or re-organised use cases 308-redirect to their canonical URL so bookmarks never 404.
 */
export function middleware(req: NextRequest) {
  const requestId = req.headers.get('x-request-id')?.slice(0, 64) || crypto.randomUUID();
  const path = req.nextUrl.pathname.replace(/^\/+|\/+$/g, '');
  const isMd = path.endsWith('.md');
  const key = isMd ? path.slice(0, -3) : path;
  const target = history[key];
  if (target) {
    const url = req.nextUrl.clone();
    url.pathname = `/${target}${isMd ? '.md' : ''}`;
    const res = NextResponse.redirect(url, 308);
    res.headers.set('x-request-id', requestId);
    res.headers.set('Cache-Control', 'public, max-age=86400');
    return res;
  }
  const headers = new Headers(req.headers);
  headers.set('x-request-id', requestId);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set('x-request-id', requestId);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|search-index.json|llms.txt).*)'],
};
