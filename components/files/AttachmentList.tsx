'use client';

import { useEffect, useState } from 'react';
import type { AttachmentView } from '@/lib/types';

/**
 * 添付ファイル一覧表示。画像はサムネイル(クリックでLightbox)、
 * それ以外はダウンロードリンク。チャット/掲示板で共通利用。
 */
export function AttachmentList({
  attachments,
}: {
  attachments: AttachmentView[];
}) {
  const [lightbox, setLightbox] = useState<AttachmentView | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  if (attachments.length === 0) return null;

  return (
    <>
      <ul className="mt-1 flex flex-wrap gap-2" data-testid="attachment-list">
        {attachments.map((a) => {
          const url = `/api/files/${a.fileId}/download`;
          const isImage = a.mimeType.startsWith('image/');
          return (
            <li
              key={a.id}
              className="overflow-hidden rounded border bg-gray-50"
              data-testid={`attachment-${a.id}`}
            >
              {isImage ? (
                <button
                  type="button"
                  onClick={() => setLightbox(a)}
                  className="block"
                  aria-label={`画像 ${a.originalName} を開く`}
                >
                  <img
                    src={url}
                    alt={a.originalName}
                    className="h-20 w-20 object-cover"
                  />
                </button>
              ) : (
                <a
                  href={url}
                  className="flex h-20 w-28 flex-col items-center justify-center px-2 text-center text-xs text-blue-600 hover:underline"
                >
                  <span className="mb-1">📎</span>
                  <span className="w-full truncate" title={a.originalName}>
                    {a.originalName}
                  </span>
                </a>
              )}
            </li>
          );
        })}
      </ul>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
          data-testid="attachment-lightbox"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded bg-black/50 px-2 py-0.5 text-2xl text-white hover:bg-black/70"
            aria-label="閉じる"
          >
            ×
          </button>
          <img
            src={`/api/files/${lightbox.fileId}/download`}
            alt={lightbox.originalName}
            className="max-h-full max-w-full rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
