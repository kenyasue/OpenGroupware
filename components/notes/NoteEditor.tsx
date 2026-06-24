'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectNote } from '@/lib/types';

export function NoteEditor({
  projectId,
  note,
}: {
  projectId: number;
  note: ProjectNote;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [bodyMd, setBodyMd] = useState(note.bodyMd);
  const [tags, setTags] = useState(note.tags ?? '');
  const [isPinned, setIsPinned] = useState(note.isPinned === 1);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/projects/${projectId}/notes/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        bodyMd,
        tags: tags || null,
        isPinned: isPinned ? 1 : 0,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    } else {
      const b = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(b?.error?.message ?? '更新に失敗しました');
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-lg border bg-white p-4 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-gray-700">編集</h2>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded border px-3 py-2"
        required
        maxLength={200}
      />
      <textarea
        value={bodyMd}
        onChange={(e) => setBodyMd(e.target.value)}
        className="min-h-[160px] w-full rounded border px-3 py-2"
        required
      />
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="タグ（カンマ区切り）"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="flex-1 rounded border px-3 py-2"
        />
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
          />
          ピン留め
        </label>
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {saved && <p className="text-sm text-green-600">メモを更新しました</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '保存中...' : '保存'}
      </button>
    </form>
  );
}
