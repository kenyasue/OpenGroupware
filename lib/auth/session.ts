import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from './constants';

/**
 * 署名付きCookieによるステートレスセッション。
 * トークン形式: base64url(payloadJson).base64url(hmacSha256(secret, encodedPayload))
 * payload = { uid, iat }
 */

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured');
  }
  return secret;
}

function sign(encodedPayload: string): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(encodedPayload)
    .digest('base64url');
}

/**
 * ユーザーIDからセッショントークンを生成する
 */
export function createSessionToken(userId: number): string {
  const payload = JSON.stringify({ uid: userId, iat: Date.now() });
  const encoded = Buffer.from(payload, 'utf-8').toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

/**
 * セッショントークンを検証し、ユーザーIDを返す（不正時はnull）
 */
export function verifySessionToken(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  const expected = sign(encoded);

  const received = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (received.length !== wanted.length) return null;
  if (!crypto.timingSafeEqual(received, wanted)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf-8')
    ) as { uid?: unknown };
    if (typeof payload.uid !== 'number') return null;
    return payload.uid;
  } catch {
    return null;
  }
}

/**
 * 現在のリクエスト(Server Component / Route Handler)からセッションユーザーIDを取得する
 */
export async function getSessionUserId(): Promise<number | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * レスポンスにセッションCookieを設定する
 */
export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * レスポンスのセッションCookieを削除する（ログアウト）
 */
export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
