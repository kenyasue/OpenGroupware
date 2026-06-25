'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FileAsset } from '@/lib/types';

export function FileList({
  files,
  canDelete,
}: {
  files: FileAsset[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [lightbox, setLightbox] = useState<FileAsset | null>(null);

  async function onDelete(fileId: number) {
    const res = await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
    if (res.ok) router.refresh();
  }

  if (files.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500">
        ファイルはありません。
      </p>
    );
  }

  return (
    <>
      <ul
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        data-testid="file-list"
      >
        {files.map((file) => {
          const isImage = file.mimeType.startsWith('image/');
          const isPdf = file.mimeType === 'application/pdf';
          const url = `/api/files/${file.id}/download`;
          return (
            <li
              key={file.id}
              className="rounded-lg border bg-white dark:bg-gray-800 p-3 shadow-sm"
              data-testid={`file-item-${file.id}`}
            >
              {isImage ? (
                <button
                  type="button"
                  onClick={() => setLightbox(file)}
                  className="block w-full"
                >
                  <img
                    src={url}
                    alt={file.originalName}
                    className="h-24 w-full rounded object-cover"
                  />
                </button>
              ) : isPdf ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-24 items-center justify-center rounded bg-gray-100 dark:bg-gray-700 text-sm text-blue-600 hover:underline"
                >
                  PDF を開く
                </a>
              ) : (
                <a
                  href={url}
                  className="flex h-24 items-center justify-center rounded bg-gray-100 dark:bg-gray-700 text-sm text-blue-600 hover:underline"
                >
                  ダウンロード
                </a>
              )}
              <p
                className="mt-2 truncate text-xs text-gray-700 dark:text-gray-200"
                title={file.originalName}
              >
                {file.originalName}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {file.size} bytes
              </p>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(file.id)}
                  className="mt-1 text-xs text-red-600 hover:underline"
                >
                  削除
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
          data-testid="lightbox"
        >
          <img
            src={`/api/files/${lightbox.id}/download`}
            alt={lightbox.originalName}
            className="max-h-full max-w-full rounded"
          />
        </div>
      )}
    </>
  );
}
