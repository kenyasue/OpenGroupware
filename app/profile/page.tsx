'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicUser } from '@/lib/auth/getCurrentUser';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { user: PublicUser }) => {
        setUser(data.user);
        setName(data.user.name);
        setEmail(data.user.email);
        setAvatarUrl(data.user.avatarUrl ?? '');
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, avatarUrl }),
    });
    if (res.ok) {
      const data = (await res.json()) as { user: PublicUser };
      setUser(data.user);
      setSaved(true);
    } else {
      const data = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(data?.error?.message ?? '更新に失敗しました');
    }
  }

  async function onLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>読み込み中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-md rounded-lg border bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">プロフィール</h1>
          <button
            type="button"
            onClick={onLogout}
            className="text-sm text-blue-600 hover:underline"
          >
            ログアウト
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              表示名
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="avatarUrl" className="block text-sm font-medium">
              アイコン画像URL
            </label>
            <input
              id="avatarUrl"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {saved && (
            <p className="text-sm text-green-600">プロフィールを更新しました</p>
          )}

          <button
            type="submit"
            className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            保存
          </button>
        </form>

        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="mt-4 w-full text-center text-sm text-blue-600 hover:underline"
        >
          ダッシュボードへ
        </button>
        <p className="mt-2 text-center text-xs text-gray-500">
          ロール: {user?.role}
        </p>
      </div>
    </main>
  );
}
