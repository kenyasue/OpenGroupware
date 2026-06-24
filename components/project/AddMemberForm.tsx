'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function AddMemberForm({ projectId }: { projectId: number }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });

    if (res.ok) {
      setEmail('');
      router.refresh();
      return;
    }

    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    setError(body?.error?.message ?? 'メンバー追加に失敗しました');
    setLoading(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 rounded border bg-white p-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label htmlFor="member-email" className="block text-sm font-medium">
          追加するユーザーのメールアドレス
        </label>
        <input
          id="member-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
      </div>
      <div>
        <label htmlFor="member-role" className="block text-sm font-medium">
          ロール
        </label>
        <select
          id="member-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mt-1 rounded border px-3 py-2"
        >
          <option value="member">member</option>
          <option value="admin">admin</option>
          <option value="guest">guest</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '追加中...' : 'メンバー追加'}
      </button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
