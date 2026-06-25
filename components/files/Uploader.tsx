'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export function Uploader({ projectId }: { projectId: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/projects/${projectId}/files`, {
      method: 'POST',
      body: form,
    });
    setLoading(false);
    if (res.ok) {
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    } else {
      const b = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(b?.error?.message ?? 'アップロードに失敗しました');
    }
  }

  return (
    <div className="rounded-lg border bg-white dark:bg-gray-800 p-4 shadow-sm">
      <label className="block text-sm font-medium">
        ファイルをアップロード
      </label>
      <input
        ref={inputRef}
        type="file"
        onChange={onFile}
        disabled={loading}
        className="mt-2 block text-sm"
        data-testid="file-input"
      />
      {loading && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          アップロード中...
        </p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
