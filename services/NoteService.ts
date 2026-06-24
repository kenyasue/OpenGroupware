import {
  ProjectNoteRepository,
  type ListNotesOptions,
} from '@/repositories/ProjectNoteRepository';
import type { Paginated } from '@/repositories/ProjectNoteRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { NotificationService } from '@/services/NotificationService';
import { ActivityLogService } from '@/services/ActivityLogService';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import type { ProjectNote } from '@/lib/types';

export interface CreateNoteInput {
  title: string;
  bodyMd: string;
  tags?: string;
}

export interface UpdateNoteInput {
  title?: string;
  bodyMd?: string;
  tags?: string | null;
  isPinned?: number;
}

/**
 * Markdownメモの業務ロジックを担うService。
 * 権限チェック、作成者/管理者による編集削除、更新時の note_updated 通知と
 * note_created/note_updated アクティビティログ記録を行う。
 */
export class NoteService {
  constructor(
    private readonly noteRepository: ProjectNoteRepository,
    private readonly projectMemberRepository: ProjectMemberRepository,
    private readonly notificationService: NotificationService,
    private readonly activityLogService: ActivityLogService
  ) {}

  listNotes(
    actorId: number,
    projectId: number,
    opts: ListNotesOptions = {}
  ): Paginated<ProjectNote> {
    this.requireMember(projectId, actorId);
    return this.noteRepository.findNotes(projectId, opts);
  }

  getNote(actorId: number, noteId: number): ProjectNote {
    const note = this.noteRepository.findNoteById(noteId);
    if (!note) throw new NotFoundError('ProjectNote', noteId);
    this.requireMember(note.projectId, actorId);
    return note;
  }

  createNote(
    actorId: number,
    projectId: number,
    input: CreateNoteInput
  ): ProjectNote {
    this.requireMember(projectId, actorId);
    this.validateNoteInput(input.title, input.bodyMd);
    const note = this.noteRepository.create({
      projectId,
      title: input.title,
      bodyMd: input.bodyMd,
      tags: input.tags ?? null,
      createdById: actorId,
    });
    this.activityLogService.logActivity({
      projectId,
      actorId,
      action: 'note_created',
      targetType: 'note',
      targetId: note.id,
    });
    return note;
  }

  updateNote(
    actorId: number,
    noteId: number,
    input: UpdateNoteInput
  ): ProjectNote {
    const note = this.getNote(actorId, noteId);
    this.requireAuthorOrAdmin(note.projectId, actorId, note.createdById);
    if (input.title !== undefined || input.bodyMd !== undefined) {
      this.validateNoteInput(
        input.title ?? note.title,
        input.bodyMd ?? note.bodyMd
      );
    }
    const updated = this.noteRepository.update(noteId, {
      title: input.title,
      bodyMd: input.bodyMd,
      tags: input.tags,
      isPinned: input.isPinned,
      updatedById: actorId,
    });
    if (!updated) throw new NotFoundError('ProjectNote', noteId);

    // プロジェクトメンバーへ更新通知(操作者本人を除く)
    const memberIds = this.projectMemberRepository
      .findByProject(note.projectId)
      .map((m) => m.userId)
      .filter((uid) => uid !== actorId);
    if (memberIds.length > 0) {
      this.notificationService.notifyOnEvent({
        type: 'note_updated',
        projectId: note.projectId,
        title: `メモ「${updated.title}」が更新されました`,
        body: updated.bodyMd.slice(0, 100),
        projectMemberIds: memberIds,
      });
    }
    this.activityLogService.logActivity({
      projectId: note.projectId,
      actorId,
      action: 'note_updated',
      targetType: 'note',
      targetId: note.id,
    });
    return updated;
  }

  deleteNote(actorId: number, noteId: number): void {
    const note = this.getNote(actorId, noteId);
    this.requireAuthorOrAdmin(note.projectId, actorId, note.createdById);
    this.noteRepository.delete(noteId);
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
        '作成者またはプロジェクト管理者のみ操作できます'
      );
    }
  }

  private validateNoteInput(title: string, bodyMd: string): void {
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
  }
}
