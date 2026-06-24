import {
  ChatRepository,
  type ListMessagesOptions,
} from '@/repositories/ChatRepository';
import type { Paginated } from '@/repositories/ChatRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { UserRepository } from '@/repositories/UserRepository';
import { NotificationService } from '@/services/NotificationService';
import { SseHub } from '@/lib/sse/hub';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';

const MENTION_RE = /@([^\s@]+@[^\s@]+\.[^\s@]+)/g;

/**
 * チャットの業務ロジックを担うService。
 * 権限チェック、メッセージ送信/編集/削除、メンション通知、SSE配信を行う。
 */
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly projectMemberRepository: ProjectMemberRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
    private readonly sseHub: SseHub
  ) {}

  getHistory(
    actorId: number,
    projectId: number,
    opts: ListMessagesOptions = {}
  ): Paginated<ChatMessage> {
    this.requireMember(projectId, actorId);
    return this.chatRepository.findMessages(projectId, opts);
  }

  sendMessage(actorId: number, projectId: number, body: string): ChatMessage {
    this.requireMember(projectId, actorId);
    if (!body.trim()) {
      throw new ValidationError('メッセージを入力してください', 'body');
    }
    const message = this.chatRepository.create({
      projectId,
      authorId: actorId,
      body,
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

    this.sseHub.broadcast(projectId, {
      type: 'chat.message.created',
      data: { projectId, message },
    });
    return message;
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
    this.chatRepository.delete(messageId);
    this.sseHub.broadcast(message.projectId, {
      type: 'chat.message.deleted',
      data: { projectId: message.projectId, id: messageId },
    });
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
