import { AUTH_COOKIE_NAME } from '@silaikaam/constants';
import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = [
  '/account',
  '/dashboard',
  '/existing-garment',
  '/custom-stitching',
  '/cart',
  '/checkout',
  '/orders',
];
const PROTECTED_PATTERNS = [/^\/marketplace\/[^/]+\/(buy|buy-fit)$/];
const AUTH_ONLY_PAGES = ['/login', '/register'];

// This only checks for the presence of the session cookie for UX-level
// routing (fast, edge-safe, no signature verification). The API Gateway is
// the actual security boundary — every protected request is re-verified
// there regardless of what middleware decided.
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  const isProtected =
    PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PROTECTED_PATTERNS.some((pattern) => pattern.test(pathname));

  if (isProtected && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the customer's in-progress product/journey selection
    // (size/color/qty query params) so they land back on it after login.
    loginUrl.searchParams.set('redirect', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (AUTH_ONLY_PAGES.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/account/:path*',
    '/dashboard/:path*',
    '/existing-garment/:path*',
    '/custom-stitching/:path*',
    '/cart/:path*',
    '/checkout/:path*',
    '/orders/:path*',
    '/marketplace/:slug/buy',
    '/marketplace/:slug/buy-fit',
    '/login',
    '/register',
  ],
};
