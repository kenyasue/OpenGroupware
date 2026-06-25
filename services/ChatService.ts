import {
  ChatRepository,
  type ListMessagesOptions,
} from '@/repositories/ChatRepository';
import type { Paginated } from '@/repositories/ChatRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { UserRepository } from '@/repositories/UserRepository';
import { NotificationService } from '@/services/NotificationService';
import { AttachmentService } from '@/services/AttachmentService';
import { SseHub } from '@/lib/sse/hub';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import type {
  AttachmentView,
  ChatMessage,
  ChatMessageWithAttachments,
} from '@/lib/types';

const MENTION_RE = /@([^\s@]+@[^\s@]+\.[^\s@]+)/g;

/**
 * チャットの業務ロジックを担うService。
 * 権限チェック、メッセージ送信/編集/削除、メンション通知、添付ファイル紐付け、SSE配信を行う。
 */
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly projectMemberRepository: ProjectMemberRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
    private readonly sseHub: SseHub,
    private readonly attachmentService: AttachmentService,
    private readonly db: SqliteDatabase
  ) {}

  getHistory(
    actorId: number,
    projectId: number,
    opts: ListMessagesOptions = {}
  ): Paginated<ChatMessageWithAttachments> {
    this.requireMember(projectId, actorId);
    const page = this.chatRepository.findMessages(projectId, opts);
    const byTarget = this.indexAttachments(
      'chat_message',
      page.items.map((m) => m.id)
    );
    return {
      items: page.items.map((m) => this.withAttachments(m, byTarget.get(m.id))),
      total: page.total,
    };
  }

  sendMessage(
    actorId: number,
    projectId: number,
    body: string,
    fileIds?: number[]
  ): ChatMessageWithAttachments {
    this.requireMember(projectId, actorId);
    if (!body.trim()) {
      throw new ValidationError('メッセージを入力してください', 'body');
    }
    // メッセージ本体と添付紐付けはトランザクション内で一貫保存する
    const { message, attachments } = this.db.transaction(() => {
      const msg = this.chatRepository.create({
        projectId,
        authorId: actorId,
        body,
      });
      const atts =
        fileIds && fileIds.length > 0
          ? this.attachmentService.attach(
              actorId,
              projectId,
              'chat_message',
              msg.id,
              fileIds
            )
          : [];
      return { message: msg, attachments: atts };
    });

    // メンション検出(@email) → 通知
    const mentionedEmails = this.extractMentions(body);
    for (const email of mentionedEmails) {
      const mentioned = this.userRepository.findByEmail(email);
      if (
        mentioned &&
        mentioned.id !== actorId &&
        this.projectMemberRepository.isMember(projectId, mentioned.id)
      ) {
        this.notificationService.notifyOnEvent({
          type: 'mention',
          projectId,
          title: `${email} にメンションされました`,
          body: body.slice(0, 100),
          mentionedUserId: mentioned.id,
        });
      }
    }

    const messageWithAttachments = this.withAttachments(message, attachments);
    this.sseHub.broadcast(projectId, {
      type: 'chat.message.created',
      data: { projectId, message: messageWithAttachments },
    });
    return messageWithAttachments;
  }

  editMessage(actorId: number, messageId: number, body: string): ChatMessage {
    const message = this.chatRepository.findMessageById(messageId);
    if (!message) throw new NotFoundError('ChatMessage', messageId);
    this.requireMember(message.projectId, actorId);
    if (message.authorId !== actorId) {
      throw new ForbiddenError('自分のメッセージのみ編集できます');
    }
    if (!body.trim()) {
      throw new ValidationError('メッセージを入力してください', 'body');
    }
    const updated = this.chatRepository.update(messageId, body);
    if (!updated) throw new NotFoundError('ChatMessage', messageId);
    this.sseHub.broadcast(message.projectId, {
      type: 'chat.message.updated',
      data: { projectId: message.projectId, message: updated },
    });
    return updated;
  }

  deleteMessage(actorId: number, messageId: number): void {
    const message = this.chatRepository.findMessageById(messageId);
    if (!message) throw new NotFoundError('ChatMessage', messageId);
    this.requireMember(message.projectId, actorId);
    const role = this.projectMemberRepository.getRole(
      message.projectId,
      actorId
    );
    if (message.authorId !== actorId && role !== 'admin') {
      throw new ForbiddenError('投稿者または管理者のみ削除できます');
    }
    this.db.transaction(() => {
      this.chatRepository.delete(messageId);
      this.attachmentService.detach('chat_message', messageId);
    });
    this.sseHub.broadcast(message.projectId, {
      type: 'chat.message.deleted',
      data: { projectId: message.projectId, id: messageId },
    });
  }

  private withAttachments(
    message: ChatMessage,
    attachments: AttachmentView[] | undefined
  ): ChatMessageWithAttachments {
    return { ...message, attachments: attachments ?? [] };
  }

  private indexAttachments(
    targetType: 'chat_message',
    targetIds: number[]
  ): Map<number, AttachmentView[]> {
    const map = new Map<number, AttachmentView[]>();
    if (targetIds.length === 0) return map;
    const views = this.attachmentService.listViewsBatch(targetType, targetIds);
    for (const v of views) {
      const list = map.get(v.targetId) ?? [];
      list.push(v);
      map.set(v.targetId, list);
    }
    return map;
  }

  private requireMember(projectId: number, actorId: number): void {
    if (!this.projectMemberRepository.isMember(projectId, actorId)) {
      throw new ForbiddenError('プロジェクトに参加していません');
    }
  }

  private extractMentions(body: string): string[] {
    const emails = new Set<string>();
    let match: RegExpExecArray | null;
    MENTION_RE.lastIndex = 0;
    while ((match = MENTION_RE.exec(body)) !== null) {
      emails.add(match[1]);
    }
    return [...emails];
  }
}
