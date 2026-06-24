'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function CommentForm({
  projectId,
  threadId,
}: {
  projectId: number;
  threadId: number;
}) {
  const router = useRouter();
  const [bodyMd, setBodyMd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(
      `/api/projects/${projectId}/board/threads/${threadId}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodyMd }),
      }
    );
    setLoading(false);
    if (res.ok) {
      setBodyMd('');
      router.refresh();
    } else {
      const b = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(b?.error?.message ?? '投稿に失敗しました');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <textarea
        placeholder="コメント（Markdown）"
        value={bodyMd}
        onChange={(e) => setBodyMd(e.target.value)}
        className="min-h-[80px] w-full rounded border px-3 py-2"
        required
      />
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '投稿中...' : 'コメント投稿'}
      </button>
    </form>
  );
}
