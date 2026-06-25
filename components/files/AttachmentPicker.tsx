'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';

export interface AttachmentPickerHandle {
  getFileIds: () => number[];
  clear: () => void;
}

interface PickedFile {
  fileId: number;
  originalName: string;
  mimeType: string;
}

/**
 * チャット/掲示板用の添付ファイルピッカー。
 * 選択したファイルを添付用エンドポイントへアップロードし、
 * 親フォームは送信時に getFileIds() でファイルIDを取り出す。
 * 送信完了後は clear() で状態をリセットする。
 */
export const AttachmentPicker = forwardRef<
  AttachmentPickerHandle,
  { projectId: number; onLoadingChange?: (loading: boolean) => void }
>(function AttachmentPicker({ projectId, onLoadingChange }, ref) {
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reportLoading(next: boolean) {
    setLoading(next);
    onLoadingChange?.(next);
  }

  useImperativeHandle(
    ref,
    () => ({
      getFileIds: () => files.map((f) => f.fileId),
      clear: () => {
        setFiles([]);
        setError(null);
        if (inputRef.current) inputRef.current.value = '';
      },
    }),
    [files]
  );

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) return;
    reportLoading(true);
    setError(null);
    try {
      const uploaded: PickedFile[] = [];
      for (const f of selected) {
        const form = new FormData();
        form.append('file', f);
        const res = await fetch(`/api/projects/${projectId}/attachments`, {
          method: 'POST',
          body: form,
        });
        if (!res.ok) {
          const b = (await res.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          throw new Error(b?.error?.message ?? 'アップロードに失敗しました');
        }
        const data = (await res.json()) as {
          file: { id: number; originalName: string; mimeType: string };
        };
        uploaded.push({
          fileId: data.file.id,
          originalName: data.file.originalName,
          mimeType: data.file.mimeType,
        });
      }
      setFiles((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'アップロードに失敗しました'
      );
    } finally {
      reportLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function removeFile(fileId: number) {
    setFiles((prev) => prev.filter((f) => f.fileId !== fileId));
  }

  return (
    <div className="space-y-2" data-testid="attachment-picker">
      <label className="inline-flex cursor-pointer items-center gap-1 rounded border bg-white dark:bg-gray-800 px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
        📎 添付
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={onFile}
          disabled={loading}
          className="hidden"
          data-testid="attachment-input"
        />
      </label>
      {loading && (
        <p
          className="text-xs text-gray-500 dark:text-gray-400"
          data-testid="attachment-loading"
        >
          アップロード中...
        </p>
      )}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((f) => {
            const isImage = f.mimeType.startsWith('image/');
            const url = `/api/files/${f.fileId}/download`;
            return (
              <li
                key={f.fileId}
                className="relative overflow-hidden rounded border bg-gray-50 dark:bg-gray-900"
                data-testid={`attachment-picked-${f.fileId}`}
              >
                {isImage ? (
                  <img
                    src={url}
                    alt={f.originalName}
                    className="h-16 w-16 object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-24 items-center justify-center px-1 text-center text-[10px] text-blue-600">
                    <span className="truncate" title={f.originalName}>
                      {f.originalName}
                    </span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(f.fileId)}
                  className="absolute right-0 top-0 rounded-bl bg-black/50 px-1 text-xs text-white hover:bg-black/70"
                  aria-label={`${f.originalName} を削除`}
                  data-testid={`attachment-remove-${f.fileId}`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
