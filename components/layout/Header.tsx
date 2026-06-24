'use client';

import { useRouter } from 'next/navigation';
import type { PublicUser } from '@/lib/auth/getCurrentUser';

export function Header({ user }: { user: PublicUser }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-3">
      <a href="/dashboard" className="font-bold text-gray-800">
        シンプルグループウェア
      </a>
      <nav className="flex items-center gap-4 text-sm">
        <a href="/dashboard" className="text-gray-600 hover:underline">
          ダッシュボード
        </a>
        <a href="/profile" className="text-gray-600 hover:underline">
          {user.name} さん
        </a>
        <button
          type="button"
          onClick={handleLogout}
          className="text-blue-600 hover:underline"
        >
          ログアウト
        </button>
      </nav>
    </header>
  );
}
