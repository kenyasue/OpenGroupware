'use client';

import { useEffect, useRef, useState } from 'react';
import type { AttachmentView, TodoItem, TodoPriority } from '@/lib/types';
import type { ProjectMemberWithUser } from '@/repositories/ProjectMemberRepository';
import { AttachmentList } from '@/components/files/AttachmentList';
import {
  AttachmentPicker,
  type AttachmentPickerHandle,
} from '@/components/files/AttachmentPicker';

const PRIORITIES: TodoPriority[] = ['low', 'normal', 'high'];

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * ToDo編集/詳細ダイアログ。
 * カードクリックで開き、タイトル/説明/担当/優先度/開始日/期限/タグ/添付を
 * 編集・閲覧できる。完了日(完了時刻)・作成/更新日時は読み取り専用で表示。
 */
export function TodoDialog({
  projectId,
  item,
  members,
  onClose,
  onSaved,
}: {
  projectId: number;
  item: TodoItem;
  members: ProjectMemberWithUser[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? '');
  const [assigneeId, setAssigneeId] = useState<string>(
    item.assigneeId ? String(item.assigneeId) : ''
  );
  const [priority, setPriority] = useState<TodoPriority>(item.priority);
  const [startDate, setStartDate] = useState(item.startDate ?? '');
  const [dueDate, setDueDate] = useState(item.dueDate ?? '');
  const [tags, setTags] = useState(item.tags ?? '');
  const [attachments, setAttachments] = useState<AttachmentView[]>([]);
  const [current, setCurrent] = useState<TodoItem>(item);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pickerRef = useRef<AttachmentPickerHandle>(null);

  // 開封時に最新のアイテム+添付を取得
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/projects/${projectId}/todos/items/${item.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!alive || !data) return;
        const fetched = data.item as TodoItem;
        setTitle(fetched.title);
        setDescription(fetched.description ?? '');
        setAssigneeId(fetched.assigneeId ? String(fetched.assigneeId) : '');
        setPriority(fetched.priority);
        setStartDate(fetched.startDate ?? '');
        setDueDate(fetched.dueDate ?? '');
        setTags(fetched.tags ?? '');
        setAttachments((data.attachments as AttachmentView[]) ?? []);
        setCurrent(fetched);
      })
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [projectId, item.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function onSave() {
    setSaving(true);
    setError(null);
    const fileIds = pickerRef.current?.getFileIds() ?? [];
    const res = await fetch(
      `/api/projects/${projectId}/todos/items/${item.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          assigneeId: assigneeId ? Number(assigneeId) : null,
          priority,
          startDate: startDate || null,
          dueDate: dueDate || null,
          tags: tags || null,
          fileIds,
        }),
      }
    );
    setSaving(false);
    if (res.ok) {
      pickerRef.current?.clear();
      await onSaved();
      onClose();
    } else {
      const b = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(b?.error?.message ?? '保存に失敗しました');
    }
  }

  const tagList = parseTags(tags);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4"
      onClick={onClose}
      data-testid="todo-dialog-backdrop"
    >
      <div
        className="mt-8 w-full max-w-xl rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`ToDo ${item.title} の編集`}
        data-testid="todo-dialog"
      >
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-bold text-gray-800">ToDoの編集</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="閉じる"
            data-testid="todo-dialog-close"
          >
            ×
          </button>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-gray-400">読み込み中...</p>
        ) : (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
            <div>
              <label className="block text-sm font-medium">タイトル</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
                data-testid="todo-title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">説明</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 min-h-[80px] w-full rounded border px-3 py-2"
                data-testid="todo-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">担当者</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2"
                  data-testid="todo-assignee"
                >
                  <option value="">未割当</option>
                  {members.map((m) => (
                    <option key={m.user.id} value={String(m.user.id)}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">優先度</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TodoPriority)}
                  className="mt-1 w-full rounded border px-3 py-2"
                  data-testid="todo-priority"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">開始日</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2"
                  data-testid="todo-start-date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  期限 (deadline)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2"
                  data-testid="todo-due-date"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">
                タグ (カンマ区切り)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="frontend, urgent"
                className="mt-1 w-full rounded border px-3 py-2"
                data-testid="todo-tags"
              />
              {tagList.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {tagList.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-1 text-sm font-medium">添付ファイル</p>
              {attachments.length > 0 ? (
                <AttachmentList attachments={attachments} />
              ) : (
                <p className="text-xs text-gray-400">添付なし</p>
              )}
              <div className="mt-2">
                <AttachmentPicker
                  ref={pickerRef}
                  projectId={projectId}
                  onLoadingChange={setPickerLoading}
                />
              </div>
            </div>

            <div className="space-y-1 border-t pt-3 text-xs text-gray-500">
              <p>完了日時: {current.completedAt ?? '未完了'}</p>
              <p>作成: {current.createdAt}</p>
              <p>更新: {current.updatedAt}</p>
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded border px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || pickerLoading || loading}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            data-testid="todo-save"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
