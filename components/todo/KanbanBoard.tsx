'use client';

import { useCallback, useState, type DragEvent } from 'react';
import type { TodoColumn, TodoItem } from '@/lib/types';
import type { ProjectMemberWithUser } from '@/repositories/ProjectMemberRepository';
import { TodoDialog } from '@/components/todo/TodoDialog';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  normal: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
};

export function KanbanBoard({
  projectId,
  columns,
  initialItems,
  members,
}: {
  projectId: number;
  columns: TodoColumn[];
  initialItems: TodoItem[];
  members: ProjectMemberWithUser[];
}) {
  const [items, setItems] = useState<TodoItem[]>(initialItems);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<TodoItem | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/todos/items`);
    if (res.ok) {
      const data = (await res.json()) as { items: TodoItem[] };
      setItems(data.items);
    }
  }, [projectId]);

  function onDragStart(e: DragEvent<HTMLElement>, itemId: number) {
    setDraggingId(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(itemId));
  }

  function onDrop(e: DragEvent<HTMLElement>, column: TodoColumn) {
    e.preventDefault();
    const itemId = Number(e.dataTransfer.getData('text/plain'));
    if (!itemId) return;
    const item = items.find((i) => i.id === itemId);
    if (!item || item.columnId === column.id) {
      setDraggingId(null);
      return;
    }
    // 楽観的にローカル更新したあとAPIで移動(失敗時は再取得で巻き戻す)
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, columnId: column.id } : i))
    );
    fetch(`/api/projects/${projectId}/todos/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columnId: column.id, orderIndex: 0 }),
    })
      .catch(() => undefined)
      .finally(() => reload());
    setDraggingId(null);
  }

  async function addTask(columnId: number, title: string) {
    const res = await fetch(`/api/projects/${projectId}/todos/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, columnId }),
    });
    if (res.ok) await reload();
  }

  async function toggleComplete(itemId: number) {
    await fetch(`/api/projects/${projectId}/todos/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toggleComplete: true }),
    });
    await reload();
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" data-testid="kanban-board">
      {columns.map((column) => {
        const colItems = items.filter((i) => i.columnId === column.id);
        return (
          <section
            key={column.id}
            className="w-64 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-700 p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, column)}
            data-testid={`kanban-column-${column.id}`}
            data-column-id={column.id}
          >
            <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              {column.name} ({colItems.length})
            </h2>
            <ul className="space-y-2">
              {colItems.map((item) => {
                const tags = item.tags
                  ?.split(',')
                  .map((t) => t.trim())
                  .filter(Boolean);
                const assignee = members.find(
                  (m) => m.user.id === item.assigneeId
                );
                return (
                  <li
                    key={item.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, item.id)}
                    onClick={() => setSelectedItem(item)}
                    className={`cursor-grab rounded border bg-white dark:bg-gray-800 p-2 shadow-sm ${
                      draggingId === item.id ? 'opacity-50' : ''
                    } ${item.completedAt ? 'opacity-60 line-through' : ''}`}
                    data-testid={`todo-card-${item.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="text-sm hover:text-blue-600 hover:underline"
                        data-testid={`todo-open-${item.id}`}
                      >
                        {item.title}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComplete(item.id);
                        }}
                        className="text-xs text-blue-600 hover:underline"
                        data-testid={`todo-complete-${item.id}`}
                      >
                        {item.completedAt ? '戻す' : '完了'}
                      </button>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          PRIORITY_COLORS[item.priority] ??
                          PRIORITY_COLORS.normal
                        }`}
                      >
                        {item.priority}
                      </span>
                      {item.dueDate && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          期限: {item.dueDate}
                        </span>
                      )}
                      {item.startDate && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          開始: {item.startDate}
                        </span>
                      )}
                      {assignee && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          @{assignee.user.name}
                        </span>
                      )}
                    </div>
                    {tags && tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-600 dark:text-gray-300"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <NewTaskInput onAdd={(title) => addTask(column.id, title)} />
          </section>
        );
      })}

      {selectedItem && (
        <TodoDialog
          projectId={projectId}
          item={selectedItem}
          members={members}
          onClose={() => setSelectedItem(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}

function NewTaskInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState('');
  return (
    <form
      className="mt-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd(title);
        setTitle('');
      }}
    >
      <input
        type="text"
        placeholder="タスクを追加"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded border px-2 py-1 text-sm"
        data-testid="new-task-input"
      />
    </form>
  );
}
