import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/AuthService';
import { UserRepository } from '@/repositories/UserRepository';
import { getDb } from '@/lib/db/sqlite';
import { toPublicUser } from '@/lib/auth/getCurrentUser';
import { createSessionToken, setSessionCookie } from '@/lib/auth/session';
import { handleApiError, jsonError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'リクエスト本文が不正です');
  }

  const authService = new AuthService(new UserRepository(getDb()));
  try {
    const user = authService.register({
      name: String(body.name ?? ''),
      email: String(body.email ?? ''),
      password: String(body.password ?? ''),
    });
    // 登録成功と同時にログイン(セッションCookieを設定)
    const response = NextResponse.json(
      { user: toPublicUser(user) },
      { status: 201 }
    );
    setSessionCookie(response, createSessionToken(user.id));
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
