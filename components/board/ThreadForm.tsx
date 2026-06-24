'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  { value: '', label: 'なし' },
  { value: 'notice', label: 'notice' },
  { value: 'spec', label: 'spec' },
  { value: 'minutes', label: 'minutes' },
  { value: 'question', label: 'question' },
  { value: 'decision', label: 'decision' },
  { value: 'trouble', label: 'trouble' },
  { value: 'memo', label: 'memo' },
] as const;

export function ThreadForm({ projectId }: { projectId: number }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [bodyMd, setBodyMd] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/board/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        bodyMd,
        category: category || undefined,
      }),
    });
    setLoading(false);
    if (res.ok) {
      const data = (await res.json()) as { thread: { id: number } };
      router.push(`/projects/${projectId}/board/${data.thread.id}`);
      router.refresh();
    } else {
      const b = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(b?.error?.message ?? '作成に失敗しました');
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-lg border bg-white p-4 shadow-sm"
    >
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="タイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded border px-3 py-2"
          required
          maxLength={200}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded border px-2 py-2"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        placeholder="本文（Markdown）"
        value={bodyMd}
        onChange={(e) => setBodyMd(e.target.value)}
        className="min-h-[120px] w-full rounded border px-3 py-2"
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
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '作成中...' : 'スレッド作成'}
      </button>
    </form>
  );
}
