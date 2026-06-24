/**
 * セッションCookie関連の定数。
 * Edge Runtime(middleware)からも安全に参照できるよう、依存を持たない定数のみ配置する。
 */
export const SESSION_COOKIE = 'session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
