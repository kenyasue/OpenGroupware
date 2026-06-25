'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const TYPES = [
  { value: '', label: 'すべて' },
  { value: 'thread', label: '掲示板' },
  { value: 'chat', label: 'チャット' },
  { value: 'todo', label: 'ToDo' },
  { value: 'file', label: 'ファイル' },
  { value: 'event', label: 'イベント' },
  { value: 'meeting', label: 'ミーティング' },
  { value: 'milestone', label: 'マイルストーン' },
  { value: 'note', label: 'メモ' },
];

export function SearchForm({
  projectId,
  initialQ,
  initialType,
}: {
  projectId: number;
  initialQ: string;
  initialType: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [type, setType] = useState(initialType);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (type) params.set('type', type);
    router.push(`/projects/${projectId}/search?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 rounded-lg border bg-white dark:bg-gray-800 p-4 shadow-sm sm:flex-row"
      data-testid="search-form"
    >
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="キーワード"
        className="flex-1 rounded border px-3 py-2"
        data-testid="search-input"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="rounded border px-2 py-2"
      >
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
      >
        検索
      </button>
    </form>
  );
}
