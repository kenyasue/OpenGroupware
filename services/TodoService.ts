import { TodoRepository } from '@/repositories/TodoRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { NotificationService } from '@/services/NotificationService';
import { ActivityLogService } from '@/services/ActivityLogService';
import { SseHub } from '@/lib/sse/hub';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import type { TodoColumn, TodoItem, TodoPriority } from '@/lib/types';

const STANDARD_COLUMNS = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
const VALID_PRIORITIES: TodoPriority[] = ['low', 'normal', 'high'];

export interface CreateItemInput {
  title: string;
  columnId: number;
  description?: string;
  assigneeId?: number | null;
  priority?: TodoPriority;
  dueDate?: string | null;
}

export interface UpdateItemRequest {
  title?: string;
  description?: string | null;
  assigneeId?: number | null;
  priority?: TodoPriority;
  dueDate?: string | null;
  columnId?: number;
  orderIndex?: number;
  milestoneId?: number | null;
}

/**
 * ToDo/Kanbanの業務ロジックを担うService。
 * 標準カラム初期生成、権限チェック、タスクCRUD/移動/完了、
 * 担当者割当時の通知(todo_assigned)とアクティビティログ(todo_*)、SSE配信を行う。
 */
export class TodoService {
  constructor(
    private readonly todoRepository: TodoRepository,
    private readonly projectMemberRepository: ProjectMemberRepository,
    private readonly notificationService: NotificationService,
    private readonly activityLogService: ActivityLogService,
    private readonly sseHub: SseHub
  ) {}

  getColumns(actorId: number, projectId: number): TodoColumn[] {
    this.requireMember(projectId, actorId);
    let columns = this.todoRepository.findColumns(projectId);
    if (columns.length === 0) {
      // 標準カラム初期生成
      STANDARD_COLUMNS.forEach((name, idx) => {
        this.todoRepository.createColumn({
          projectId,
          name,
          orderIndex: idx,
        });
      });
      columns = this.todoRepository.findColumns(projectId);
    }
    return columns;
  }

  getItems(actorId: number, projectId: number): TodoItem[] {
    this.requireMember(projectId, actorId);
    return this.todoRepository.findItemsByProject(projectId);
  }

  createColumn(
    actorId: number,
    projectId: number,
    name: string,
    orderIndex?: number
  ): TodoColumn {
    this.requireMember(projectId, actorId);
    if (!name.trim()) {
      throw new ValidationError('カラム名を入力してください', 'name');
    }
    const idx = orderIndex ?? this.todoRepository.findColumns(projectId).length;
    return this.todoRepository.createColumn({
      projectId,
      name,
      orderIndex: idx,
    });
  }

  updateColumn(
    actorId: number,
    columnId: number,
    input: { name?: string; orderIndex?: number }
  ): TodoColumn {
    const column = this.todoRepository.findColumnById(columnId);
    if (!column) throw new NotFoundError('TodoColumn', columnId);
    this.requireMember(column.projectId, actorId);
    const updated = this.todoRepository.updateColumn(columnId, input);
    if (!updated) throw new NotFoundError('TodoColumn', columnId);
    return updated;
  }

  deleteColumn(actorId: number, columnId: number): void {
    const column = this.todoRepository.findColumnById(columnId);
    if (!column) throw new NotFoundError('TodoColumn', columnId);
    this.requireAdmin(column.projectId, actorId);
    this.todoRepository.deleteColumn(columnId);
  }

  createItem(
    actorId: number,
    projectId: number,
    input: CreateItemInput
  ): TodoItem {
    this.requireMember(projectId, actorId);
    if (!input.title.trim()) {
      throw new ValidationError('タイトルを入力してください', 'title');
    }
    const column = this.todoRepository.findColumnById(input.columnId);
    if (!column || column.projectId !== projectId) {
      throw new NotFoundError('TodoColumn', input.columnId);
    }
    if (input.priority && !VALID_PRIORITIES.includes(input.priority)) {
      throw new ValidationError('無効な優先度です', 'priority');
    }
    const orderIndex =
      input.columnId !== undefined
        ? this.todoRepository.maxItemOrderIndex(input.columnId) + 1
        : 0;
    const item = this.todoRepository.createItem({
      projectId,
      columnId: input.columnId,
      title: input.title,
      creatorId: actorId,
      description: input.description ?? null,
      assigneeId: input.assigneeId ?? null,
      priority: input.priority,
      dueDate: input.dueDate ?? null,
      orderIndex,
    });

    if (input.assigneeId && input.assigneeId !== actorId) {
      this.notifyAssigned(projectId, input.assigneeId, item.title);
    }
    this.logTodo(projectId, actorId, 'todo_created', item.id);
    this.broadcastTodo(projectId);
    return item;
  }

  updateItem(
    actorId: number,
    itemId: number,
    input: UpdateItemRequest
  ): TodoItem {
    const item = this.todoRepository.findItemById(itemId);
    if (!item) throw new NotFoundError('TodoItem', itemId);
    this.requireMember(item.projectId, actorId);
    if (input.priority && !VALID_PRIORITIES.includes(input.priority)) {
      throw new ValidationError('無効な優先度です', 'priority');
    }
    const previousAssignee = item.assigneeId;
    const updated = this.todoRepository.updateItem(itemId, input);
    if (!updated) throw new NotFoundError('TodoItem', itemId);

    if (
      input.assigneeId !== undefined &&
      input.assigneeId !== previousAssignee &&
      input.assigneeId !== null &&
      input.assigneeId !== actorId
    ) {
      this.notifyAssigned(item.projectId, input.assigneeId, updated.title);
    }
    this.logTodo(item.projectId, actorId, 'todo_updated', itemId);
    this.broadcastTodo(item.projectId);
    return updated;
  }

  moveItem(
    actorId: number,
    itemId: number,
    columnId: number,
    orderIndex: number
  ): TodoItem {
    const item = this.todoRepository.findItemById(itemId);
    if (!item) throw new NotFoundError('TodoItem', itemId);
    this.requireMember(item.projectId, actorId);
    const column = this.todoRepository.findColumnById(columnId);
    if (!column || column.projectId !== item.projectId) {
      throw new NotFoundError('TodoColumn', columnId);
    }
    const updated = this.todoRepository.updateItem(itemId, {
      columnId,
      orderIndex,
    });
    if (!updated) throw new NotFoundError('TodoItem', itemId);
    this.logTodo(item.projectId, actorId, 'todo_updated', itemId);
    this.broadcastTodo(item.projectId);
    return updated;
  }

  toggleComplete(actorId: number, itemId: number): TodoItem {
    const item = this.todoRepository.findItemById(itemId);
    if (!item) throw new NotFoundError('TodoItem', itemId);
    this.requireMember(item.projectId, actorId);
    const now = item.completedAt === null ? new Date().toISOString() : null;
    const updated = this.todoRepository.updateItem(itemId, {
      completedAt: now,
    });
    if (!updated) throw new NotFoundError('TodoItem', itemId);
    if (now) {
      this.logTodo(item.projectId, actorId, 'todo_completed', itemId);
    } else {
      this.logTodo(item.projectId, actorId, 'todo_updated', itemId);
    }
    this.broadcastTodo(item.projectId);
    return updated;
  }

  deleteItem(actorId: number, itemId: number): void {
    const item = this.todoRepository.findItemById(itemId);
    if (!item) throw new NotFoundError('TodoItem', itemId);
    this.requireMember(item.projectId, actorId);
    const role = this.projectMemberRepository.getRole(item.projectId, actorId);
    if (item.creatorId !== actorId && role !== 'admin') {
      throw new ForbiddenError('作成者または管理者のみ削除できます');
    }
    this.todoRepository.deleteItem(itemId);
    this.broadcastTodo(item.projectId);
  }

  private requireMember(projectId: number, actorId: number): void {
    if (!this.projectMemberRepository.isMember(projectId, actorId)) {
      throw new ForbiddenError('プロジェクトに参加していません');
    }
  }

  private requireAdmin(projectId: number, actorId: number): void {
    this.requireMember(projectId, actorId);
    if (this.projectMemberRepository.getRole(projectId, actorId) !== 'admin') {
      throw new ForbiddenError('プロジェクト管理者権限が必要です');
    }
  }

  private notifyAssigned(
    projectId: number,
    assigneeId: number,
    title: string
  ): void {
    this.notificationService.notifyOnEvent({
      type: 'todo_assigned',
      projectId,
      title: `ToDo「${title}」の担当者に割り当てられました`,
      body: title,
      assigneeId,
    });
  }

  private logTodo(
    projectId: number,
    actorId: number,
    action: string,
    targetId: number
  ): void {
    this.activityLogService.logActivity({
      projectId,
      actorId,
      action,
      targetType: 'todo',
      targetId,
    });
  }

  private broadcastTodo(projectId: number): void {
    this.sseHub.broadcast(projectId, {
      type: 'todo.updated',
      data: { projectId },
    });
  }
}
