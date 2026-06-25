'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ChatMessageWithAttachments } from '@/lib/types';
import { AttachmentPicker } from '@/components/files/AttachmentPicker';
import type { AttachmentPickerHandle } from '@/components/files/AttachmentPicker';
import { AttachmentList } from '@/components/files/AttachmentList';

interface ChatWindowProps {
  projectId: number;
  userName: string;
}

export function ChatWindow({ projectId, userName }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessageWithAttachments[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const pickerRef = useRef<AttachmentPickerHandle>(null);

  // 履歴取得
  useEffect(() => {
    fetch(`/api/projects/${projectId}/chat/messages`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items)
          setMessages(data.items as ChatMessageWithAttachments[]);
      })
      .catch(() => undefined);
  }, [projectId]);

  // SSE接続(自動再接続はEventSourceが行う)
  useEffect(() => {
    const es = new EventSource(`/api/projects/${projectId}/chat/stream`);
    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as {
          type: string;
          data: {
            message?: ChatMessageWithAttachments;
            id?: number;
          };
        };
        if (parsed.type === 'chat.message.created' && parsed.data.message) {
          setMessages((prev) =>
            prev.some((m) => m.id === parsed.data.message!.id)
              ? prev
              : [parsed.data.message!, ...prev]
          );
        } else if (
          parsed.type === 'chat.message.updated' &&
          parsed.data.message
        ) {
          // 編集イベントは本文のみ更新し、添付は既存のものを保持する
          setMessages((prev) =>
            prev.map((m) =>
              m.id === parsed.data.message!.id
                ? { ...m, ...parsed.data.message!, attachments: m.attachments }
                : m
            )
          );
        } else if (parsed.type === 'chat.message.deleted' && parsed.data.id) {
          setMessages((prev) => prev.filter((m) => m.id !== parsed.data.id));
        }
      } catch {
        // 無効なペイロードは無視
      }
    };
    return () => es.close();
  }, [projectId]);

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim()) return;
    setError(null);
    setSending(true);
    const fileIds = pickerRef.current?.getFileIds() ?? [];
    const res = await fetch(`/api/projects/${projectId}/chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: input, fileIds }),
    });
    setSending(false);
    if (res.ok) {
      setInput('');
      pickerRef.current?.clear();
    } else {
      const b = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(b?.error?.message ?? '送信に失敗しました');
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-lg border bg-white shadow-sm">
      <div className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2" data-testid="chat-messages">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`flex flex-col ${m.authorId === 0 ? 'items-end' : 'items-start'}`}
              data-message-id={m.id}
            >
              <span
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  m.body.includes(`@${userName}`)
                    ? 'bg-yellow-100 text-gray-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {m.body}
              </span>
              {m.attachments && m.attachments.length > 0 && (
                <div className="max-w-[80%]">
                  <AttachmentList attachments={m.attachments} />
                </div>
              )}
              <span className="mt-0.5 text-xs text-gray-400">
                {m.createdAt}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <form
        onSubmit={onSend}
        className="space-y-2 border-t p-3"
        data-testid="chat-form"
      >
        <AttachmentPicker
          ref={pickerRef}
          projectId={projectId}
          onLoadingChange={setPickerLoading}
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="メッセージを入力(@email でメンション)"
            className="flex-1 rounded border px-3 py-2"
            data-testid="chat-input"
          />
          <button
            type="submit"
            disabled={sending || pickerLoading}
            className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            data-testid="chat-send"
          >
            {sending ? '送信中...' : '送信'}
          </button>
        </div>
      </form>
      {error && (
        <p className="px-3 pb-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
