import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/AuthService';
import { UserRepository } from '@/repositories/UserRepository';
import { getDb } from '@/lib/db/sqlite';
import { toPublicUser } from '@/lib/auth/getCurrentUser';
import { setSessionCookie } from '@/lib/auth/session';
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
    const { user, token } = authService.login(
      String(body.email ?? ''),
      String(body.password ?? '')
    );
    const response = NextResponse.json(
      { user: toPublicUser(user) },
      { status: 200 }
    );
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
