'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function BackupCreateButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/backups', { method: 'POST' });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      const b = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(b?.error?.message ?? '作成に失敗しました');
    }
  }

  return (
    <div className="rounded-lg border bg-white dark:bg-gray-800 p-4 shadow-sm">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        DBファイル + uploadsディレクトリをZIP化してバックアップを作成します。
      </p>
      <button
        type="button"
        onClick={onCreate}
        disabled={loading}
        className="mt-2 rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        data-testid="create-backup"
      >
        {loading ? '作成中...' : 'バックアップ作成'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
