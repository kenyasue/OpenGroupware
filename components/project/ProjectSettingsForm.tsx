'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/lib/types';

export function ProjectSettingsForm({
  project,
  canManage,
}: {
  project: Project;
  canManage: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [status, setStatus] = useState(project.status);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: description || undefined,
        status,
      }),
    });

    setLoading(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    } else {
      const body = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(body?.error?.message ?? '更新に失敗しました');
    }
  }

  if (!canManage) {
    return (
      <p className="text-sm text-gray-500">
        プロジェクトの設定変更には管理者権限が必要です。
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          プロジェクト名
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
        <label htmlFor="description" className="block text-sm font-medium">
          説明
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="status" className="block text-sm font-medium">
          ステータス
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) =>
            setStatus(
              e.target.value as 'active' | 'on_hold' | 'completed' | 'archived'
            )
          }
          className="mt-1 rounded border px-3 py-2"
        >
          <option value="active">active</option>
          <option value="on_hold">on_hold</option>
          <option value="completed">completed</option>
          <option value="archived">archived</option>
        </select>
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="text-sm text-green-600">プロジェクトを更新しました</p>
      )}
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
