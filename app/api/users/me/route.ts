import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/AuthService';
import { UserRepository } from '@/repositories/UserRepository';
import { getDb } from '@/lib/db/sqlite';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError, jsonError } from '@/lib/api/handleError';
import type { Locale, Theme } from '@/lib/types';
import { PREF_MAX_AGE } from '@/lib/i18n/constants';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return handleApiError(new UnauthorizedError());
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'リクエスト本文が不正です');
  }

  // theme/locale は生値を Service に渡し、バリデータで不正値を弾く(→ ValidationError → 400)
  const authService = new AuthService(new UserRepository(getDb()));
  try {
    const updated = authService.updateProfile(currentUser.id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      email: typeof body.email === 'string' ? body.email : undefined,
      avatarUrl:
        typeof body.avatarUrl === 'string' ? body.avatarUrl : undefined,
      theme: typeof body.theme === 'string' ? (body.theme as Theme) : undefined,
      locale:
        typeof body.locale === 'string' ? (body.locale as Locale) : undefined,
    });
    const res = NextResponse.json({ user: toPublicUser(updated) });
    // 保存結果の theme/locale をCookieに反映(SSRでレイアウトが読めるように)
    res.cookies.set('theme', updated.theme, {
      path: '/',
      maxAge: PREF_MAX_AGE,
      sameSite: 'lax',
    });
    res.cookies.set('locale', updated.locale, {
      path: '/',
      maxAge: PREF_MAX_AGE,
      sameSite: 'lax',
    });
    return res;
  } catch (error) {
    return handleApiError(error);
  }
}
