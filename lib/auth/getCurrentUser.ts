import { UserRepository } from '@/repositories/UserRepository';
import { getDb } from '@/lib/db/sqlite';
import { getSessionUserId } from '@/lib/auth/session';
import type { User } from '@/lib/types';

/**
 * APIレスポンス等で外部に公開するユーザー情報（passwordHashを除く）
 */
export type PublicUser = Omit<User, 'passwordHash'>;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    theme: user.theme,
    locale: user.locale,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * 現在のリクエストからログインユーザーを解決する。
 * 未認証の場合は null を返す。
 */
export async function getCurrentUser(): Promise<User | null> {
  const userId = await getSessionUserId();
  if (userId === null) return null;
  const userRepository = new UserRepository(getDb());
  return userRepository.findById(userId);
}
