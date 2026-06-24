'use client';

import { useCallback, useState, type DragEvent } from 'react';
import type { TodoColumn, TodoItem } from '@/lib/types';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  normal: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};

export function KanbanBoard({
  projectId,
  columns,
  initialItems,
}: {
  projectId: number;
  columns: TodoColumn[];
  initialItems: TodoItem[];
}) {
  const [items, setItems] = useState<TodoItem[]>(initialItems);
  const [draggingId, setDraggingId] = useState<number | null>(null);

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
    // 楽観的にローカル更新したあとAPIで移動
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, columnId: column.id } : i))
    );
    fetch(`/api/projects/${projectId}/todos/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columnId: column.id, orderIndex: 0 }),
    }).then(() => reload());
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
            className="w-64 shrink-0 rounded-lg bg-gray-100 p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, column)}
            data-testid={`kanban-column-${column.id}`}
            data-column-id={column.id}
          >
            <h2 className="mb-2 text-sm font-semibold text-gray-700">
              {column.name} ({colItems.length})
            </h2>
            <ul className="space-y-2">
              {colItems.map((item) => (
                <li
                  key={item.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, item.id)}
                  className={`cursor-grab rounded border bg-white p-2 shadow-sm ${
                    draggingId === item.id ? 'opacity-50' : ''
                  } ${item.completedAt ? 'opacity-60 line-through' : ''}`}
                  data-testid={`todo-card-${item.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm">{item.title}</span>
                    <button
                      type="button"
                      onClick={() => toggleComplete(item.id)}
                      className="text-xs text-blue-600 hover:underline"
                      data-testid={`todo-complete-${item.id}`}
                    >
                      {item.completedAt ? '戻す' : '完了'}
                    </button>
                  </div>
                  <div className="mt-1 flex gap-1">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs ${
                        PRIORITY_COLORS[item.priority] ?? PRIORITY_COLORS.normal
                      }`}
                    >
                      {item.priority}
                    </span>
                    {item.dueDate && (
                      <span className="text-xs text-gray-500">
                        期限: {item.dueDate}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <NewTaskInput onAdd={(title) => addTask(column.id, title)} />
          </section>
        );
      })}
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
