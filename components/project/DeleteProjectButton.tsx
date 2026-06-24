'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteProjectButton({ projectId }: { projectId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (
      !window.confirm('プロジェクトを削除しますか？この操作は取り消せません。')
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
    setBusy(false);
    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      const body = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(body?.error?.message ?? '削除に失敗しました');
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {busy ? '削除中...' : 'プロジェクトを削除'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
