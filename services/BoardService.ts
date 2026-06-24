import {
  BoardRepository,
  type ListThreadsOptions,
} from '@/repositories/BoardRepository';
import type { Paginated } from '@/repositories/BoardRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { NotificationService } from '@/services/NotificationService';
import { ActivityLogService } from '@/services/ActivityLogService';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import type { BoardCategory, BoardComment, BoardThread } from '@/lib/types';

const VALID_CATEGORIES: BoardCategory[] = [
  'notice',
  'spec',
  'minutes',
  'question',
  'decision',
  'trouble',
  'memo',
];

export interface CreateThreadInput {
  title: string;
  bodyMd: string;
  category?: BoardCategory;
}

export interface UpdateThreadInput {
  title?: string;
  bodyMd?: string;
  category?: BoardCategory;
  isPinned?: number;
  isImportant?: number;
}

/**
 * 掲示板の業務ロジックを担うService。
 * 権限チェック(プロジェクト参加者のみ)、スレッド/コメントCRUD、
 * コメント追加時の通知(board_commented)とアクティビティログ記録を行う。
 */
export class BoardService {
  constructor(
    private readonly boardRepository: BoardRepository,
    private readonly projectMemberRepository: ProjectMemberRepository,
    private readonly notificationService: NotificationService,
    private readonly activityLogService: ActivityLogService
  ) {}

  listThreads(
    actorId: number,
    projectId: number,
    opts: ListThreadsOptions = {}
  ): Paginated<BoardThread> {
    this.requireMember(projectId, actorId);
    return this.boardRepository.findThreads(projectId, opts);
  }

  getThread(actorId: number, threadId: number): BoardThread {
    const thread = this.boardRepository.findThreadById(threadId);
    if (!thread) throw new NotFoundError('BoardThread', threadId);
    this.requireMember(thread.projectId, actorId);
    return thread;
  }

  createThread(
    actorId: number,
    projectId: number,
    input: CreateThreadInput
  ): BoardThread {
    this.requireMember(projectId, actorId);
    this.validateThreadInput(input.title, input.bodyMd, input.category);
    const thread = this.boardRepository.createThread({
      projectId,
      title: input.title,
      bodyMd: input.bodyMd,
      authorId: actorId,
      category: input.category ?? null,
    });
    this.activityLogService.logActivity({
      projectId,
      actorId,
      action: 'board_posted',
      targetType: 'thread',
      targetId: thread.id,
    });
    return thread;
  }

  updateThread(
    actorId: number,
    threadId: number,
    input: UpdateThreadInput
  ): BoardThread {
    const thread = this.getThread(actorId, threadId);
    this.requireAuthorOrAdmin(thread.projectId, actorId, thread.authorId);
    if (
      input.title !== undefined ||
      input.bodyMd !== undefined ||
      input.category !== undefined
    ) {
      this.validateThreadInput(
        input.title ?? thread.title,
        input.bodyMd ?? thread.bodyMd,
        input.category
      );
    }
    const updated = this.boardRepository.updateThread(threadId, {
      title: input.title,
      bodyMd: input.bodyMd,
      category: input.category,
      isPinned: input.isPinned,
      isImportant: input.isImportant,
    });
    if (!updated) throw new NotFoundError('BoardThread', threadId);
    return updated;
  }

  deleteThread(actorId: number, threadId: number): void {
    const thread = this.getThread(actorId, threadId);
    this.requireAuthorOrAdmin(thread.projectId, actorId, thread.authorId);
    this.boardRepository.deleteThread(threadId);
  }

  listComments(
    actorId: number,
    threadId: number,
    page: number = 1
  ): Paginated<BoardComment> {
    const thread = this.getThread(actorId, threadId);
    return this.boardRepository.findCommentsByThread(thread.id, page);
  }

  createComment(
    actorId: number,
    threadId: number,
    bodyMd: string
  ): BoardComment {
    const thread = this.getThread(actorId, threadId);
    if (!bodyMd.trim()) {
      throw new ValidationError('コメント本文を入力してください', 'bodyMd');
    }
    const comment = this.boardRepository.createComment({
      threadId: thread.id,
      authorId: actorId,
      bodyMd,
    });
    // スレッド投稿者へ通知(自分自身へのコメントは通知しない)
    if (thread.authorId !== actorId) {
      this.notificationService.notifyOnEvent({
        type: 'board_commented',
        projectId: thread.projectId,
        title: `スレッド「${thread.title}」にコメントがつきました`,
        body: bodyMd.slice(0, 100),
        threadAuthorId: thread.authorId,
      });
    }
    this.activityLogService.logActivity({
      projectId: thread.projectId,
      actorId,
      action: 'comment_added',
      targetType: 'comment',
      targetId: comment.id,
    });
    return comment;
  }

  updateComment(
    actorId: number,
    commentId: number,
    bodyMd: string
  ): BoardComment {
    const comment = this.boardRepository.findCommentById(commentId);
    if (!comment) throw new NotFoundError('BoardComment', commentId);
    this.getThread(actorId, comment.threadId);
    if (comment.authorId !== actorId) {
      throw new ForbiddenError('自分のコメントのみ編集できます');
    }
    if (!bodyMd.trim()) {
      throw new ValidationError('コメント本文を入力してください', 'bodyMd');
    }
    const updated = this.boardRepository.updateComment(commentId, bodyMd);
    if (!updated) throw new NotFoundError('BoardComment', commentId);
    return updated;
  }

  deleteComment(actorId: number, commentId: number): void {
    const comment = this.boardRepository.findCommentById(commentId);
    if (!comment) throw new NotFoundError('BoardComment', commentId);
    const thread = this.getThread(actorId, comment.threadId);
    this.requireAuthorOrAdmin(thread.projectId, actorId, comment.authorId);
    this.boardRepository.deleteComment(commentId);
  }

  private requireMember(projectId: number, actorId: number): void {
    if (!this.projectMemberRepository.isMember(projectId, actorId)) {
      throw new ForbiddenError('プロジェクトに参加していません');
    }
  }

  private requireAuthorOrAdmin(
    projectId: number,
    actorId: number,
    authorId: number
  ): void {
    if (actorId === authorId) return;
    const role = this.projectMemberRepository.getRole(projectId, actorId);
    if (role !== 'admin') {
      throw new ForbiddenError(
        '投稿者またはプロジェクト管理者のみ操作できます'
      );
    }
  }

  private validateThreadInput(
    title: string,
    bodyMd: string,
    category?: BoardCategory
  ): void {
    if (!title.trim()) {
      throw new ValidationError('タイトルを入力してください', 'title');
    }
    if (title.length > 200) {
      throw new ValidationError(
        'タイトルは200文字以内で入力してください',
        'title'
      );
    }
    if (!bodyMd.trim()) {
      throw new ValidationError('本文を入力してください', 'bodyMd');
    }
    if (category && !VALID_CATEGORIES.includes(category)) {
      throw new ValidationError('無効なカテゴリです', 'category');
    }
  }
}
