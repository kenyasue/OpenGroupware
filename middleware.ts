import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/constants';

/**
 * 認証ミドルウェア（Edge Runtime）。
 * セッションCookieの「存在」のみを確認し、未所持なら保護画面を /login へリダイレクトする。
 * HMAC検証・DB参照はNode.js RuntimeのgetCurrentUserで行う（ここでは行わない）。
 * APIルートは各Route Handlerで401を返すため、本ミドルウェアの対象外とする。
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // /login, /api, _next 静的 assets, favicon, PWA静的リソース(manifest/SW/icon) を除外
    '/((?!login|api|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|icon\\.svg|icon-192\\.png|icon-512\\.png).*)',
  ],
};
