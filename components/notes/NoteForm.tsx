'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function NoteForm({ projectId }: { projectId: number }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [bodyMd, setBodyMd] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, bodyMd, tags: tags || undefined }),
    });
    setLoading(false);
    if (res.ok) {
      const data = (await res.json()) as { note: { id: number } };
      router.push(`/projects/${projectId}/notes/${data.note.id}`);
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
      className="space-y-3 rounded-lg border bg-white dark:bg-gray-800 p-4 shadow-sm"
    >
      <input
        type="text"
        placeholder="タイトル"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded border px-3 py-2"
        required
        maxLength={200}
      />
      <textarea
        placeholder="本文（Markdown）"
        value={bodyMd}
        onChange={(e) => setBodyMd(e.target.value)}
        className="min-h-[120px] w-full rounded border px-3 py-2"
        required
      />
      <input
        type="text"
        placeholder="タグ（カンマ区切り）"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="w-full rounded border px-3 py-2"
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
        {loading ? '作成中...' : 'メモ作成'}
      </button>
    </form>
  );
}
