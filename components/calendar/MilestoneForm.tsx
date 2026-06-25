'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function MilestoneForm({ projectId }: { projectId: number }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, dueDate: dueDate || null }),
    });
    setLoading(false);
    if (res.ok) {
      setTitle('');
      setDueDate('');
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
      className="flex flex-col gap-2 rounded-lg border bg-white dark:bg-gray-800 p-4 shadow-sm sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label className="block text-sm font-medium">マイルストーン名</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium">期限</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="mt-1 rounded border px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '作成中...' : 'マイルストーン作成'}
      </button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
