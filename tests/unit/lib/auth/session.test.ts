import { describe, it, expect } from 'vitest';
import { createSessionToken, verifySessionToken } from '@/lib/auth/session';

describe('session token', () => {
  it('round-trips a user id through create and verify', () => {
    const token = createSessionToken(42);

    expect(verifySessionToken(token)).toBe(42);
  });

  it('returns null for a tampered signature', () => {
    const token = createSessionToken(42);
    const [encoded] = token.split('.');
    const tampered = `${encoded}.aW52YWxpZHNpZ25hdHVyZQ`;

    expect(verifySessionToken(tampered)).toBeNull();
  });

  it('returns null for a tampered payload', () => {
    const token = createSessionToken(42);
    const [, signature] = token.split('.');
    // payload を別ユーザーIDに書き換えたトークン（署名は元のまま）
    const forgedPayload = Buffer.from(
      JSON.stringify({ uid: 99, iat: Date.now() })
    ).toString('base64url');
    const forged = `${forgedPayload}.${signature}`;

    expect(verifySessionToken(forged)).toBeNull();
  });

  it('returns null for a malformed token', () => {
    expect(verifySessionToken('not-a-valid-token')).toBeNull();
    expect(verifySessionToken('only.one.too.many')).toBeNull();
    expect(verifySessionToken('')).toBeNull();
  });

  it('returns null when the payload uid is not a number', () => {
    const encoded = Buffer.from(
      JSON.stringify({ uid: 'not-a-number', iat: Date.now() })
    ).toString('base64url');
    // 署名は無意味でも構造は整える
    expect(verifySessionToken(`${encoded}.${encoded}`)).toBeNull();
  });
});
