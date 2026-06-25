'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  ConflictWarning,
  type ScheduleConflict,
} from '@/components/meetings/ConflictWarning';

interface Member {
  userId: number;
  name: string;
}

export function MeetingForm({
  projectId,
  members,
}: {
  projectId: number;
  members: Member[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [conflicts, setConflicts] = useState<ScheduleConflict[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setConflicts(null);
    const res = await fetch(`/api/projects/${projectId}/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, startAt, endAt, memberIds: selected }),
    });
    setLoading(false);
    if (res.ok) {
      const data = (await res.json()) as {
        meeting: { id: number };
        conflicts: ScheduleConflict[];
      };
      setConflicts(data.conflicts);
      setTitle('');
      setStartAt('');
      setEndAt('');
      setSelected([]);
      router.refresh();
    } else {
      const b = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(b?.error?.message ?? '作成に失敗しました');
    }
  }

  function toggleMember(userId: number) {
    setSelected((prev) =>
      prev.includes(userId)
        ? prev.filter((u) => u !== userId)
        : [...prev, userId]
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-lg border bg-white dark:bg-gray-800 p-4 shadow-sm"
      data-testid="meeting-form"
    >
      <div>
        <label className="block text-sm font-medium">タイトル</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
          data-testid="meeting-title"
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium">開始</label>
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            required
            data-testid="meeting-start"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium">終了</label>
          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            required
            data-testid="meeting-end"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium">参加メンバー</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {members.map((m) => (
            <label
              key={m.userId}
              className="flex items-center gap-1 rounded border px-2 py-1 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(m.userId)}
                onChange={() => toggleMember(m.userId)}
              />
              {m.name}
            </label>
          ))}
        </div>
      </div>
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
        {loading ? '作成中...' : 'ミーティング作成'}
      </button>
      {conflicts && <ConflictWarning conflicts={conflicts} />}
    </form>
  );
}
