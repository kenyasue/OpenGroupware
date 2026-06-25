import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { ChatRepository } from '@/repositories/ChatRepository';
import { FileRepository } from '@/repositories/FileRepository';
import { AttachmentRepository } from '@/repositories/AttachmentRepository';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { NotificationService } from '@/services/NotificationService';
import { AttachmentService } from '@/services/AttachmentService';
import { ChatService } from '@/services/ChatService';
import { SseHub, type SseClient } from '@/lib/sse/hub';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';

function makeClient(): SseClient & { received: string[] } {
  const received: string[] = [];
  return { received, enqueue: (c) => received.push(c), close: () => undefined };
}

describe('ChatService', () => {
  let db: SqliteDatabase;
  let service: ChatService;
  let hub: SseHub;
  let projectId: number;
  let authorId: number;
  let memberId: number;
  let outsiderId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    hub = new SseHub();
    const users = new UserRepository(db);
    authorId = users.create({
      name: 'A',
      email: 'a@example.com',
      passwordHash: 'h',
    }).id;
    memberId = users.create({
      name: 'M',
      email: 'm@example.com',
      passwordHash: 'h',
    }).id;
    outsiderId = users.create({
      name: 'O',
      email: 'o@example.com',
      passwordHash: 'h',
    }).id;
    projectId = new ProjectRepository(db).create({
      name: 'P',
      ownerId: authorId,
    }).id;
    const members = new ProjectMemberRepository(db);
    members.add(projectId, authorId, 'admin');
    members.add(projectId, memberId, 'member');
    service = new ChatService(
      new ChatRepository(db),
      members,
      users,
      new NotificationService(new NotificationRepository(db)),
      hub,
      new AttachmentService(
        new AttachmentRepository(db),
        new FileRepository(db),
        members
      ),
      db
    );
  });

  afterEach(() => db.close());

  it('sends a message and broadcasts chat.message.created', () => {
    const client = makeClient();
    hub.addClient(projectId, client);

    const message = service.sendMessage(authorId, projectId, 'hello');

    expect(message.body).toBe('hello');
    expect(client.received).toHaveLength(1);
    expect(client.received[0]).toContain('chat.message.created');
  });

  it('forbids a non-member from sending', () => {
    expect(() => service.sendMessage(outsiderId, projectId, 'hi')).toThrow(
      ForbiddenError
    );
  });

  it('rejects an empty message', () => {
    expect(() => service.sendMessage(authorId, projectId, '   ')).toThrow(
      ValidationError
    );
  });

  it('notifies a mentioned project member (@email) but not the sender', () => {
    service.sendMessage(authorId, projectId, `hi @m@example.com`);

    expect(new NotificationRepository(db).countUnreadByUser(memberId)).toBe(1);
    expect(new NotificationRepository(db).countUnreadByUser(authorId)).toBe(0);
  });

  it('does not notify a mentioned non-member', () => {
    service.sendMessage(authorId, projectId, `hi @o@example.com`);
    expect(new NotificationRepository(db).countUnreadByUser(outsiderId)).toBe(
      0
    );
  });

  it('only the author can edit their message', () => {
    const m = service.sendMessage(authorId, projectId, 'x');
    expect(() => service.editMessage(memberId, m.id, 'hacked')).toThrow(
      ForbiddenError
    );
    const updated = service.editMessage(authorId, m.id, 'edited');
    expect(updated.body).toBe('edited');
  });

  it('broadcasts chat.message.updated on edit', () => {
    const client = makeClient();
    hub.addClient(projectId, client);
    const m = service.sendMessage(authorId, projectId, 'x');
    client.received.length = 0;
    service.editMessage(authorId, m.id, 'edited');
    expect(client.received[0]).toContain('chat.message.updated');
  });

  it('admin can delete another member message; broadcasts deleted', () => {
    const client = makeClient();
    hub.addClient(projectId, client);
    const m = service.sendMessage(memberId, projectId, 'x');
    client.received.length = 0;
    service.deleteMessage(authorId, m.id); // authorId is admin
    expect(client.received[0]).toContain('chat.message.deleted');
    expect(() => service.getHistory(memberId, projectId)).not.toThrow();
  });

  it('non-admin non-author cannot delete', () => {
    const m = service.sendMessage(authorId, projectId, 'x');
    expect(() => service.deleteMessage(memberId, m.id)).toThrow(ForbiddenError);
  });

  it('throws NotFoundError for a non-existent message', () => {
    expect(() => service.deleteMessage(authorId, 99999)).toThrow(NotFoundError);
  });

  it('sendMessage with fileIds attaches files and broadcasts them', () => {
    const client = makeClient();
    hub.addClient(projectId, client);
    const fileRepo = new FileRepository(db);
    const f1 = fileRepo.create({
      projectId,
      uploaderId: authorId,
      filename: 'a.png',
      originalName: 'a.png',
      mimeType: 'image/png',
      size: 1,
      path: '/tmp/a.png',
      source: 'attachment',
    });
    const f2 = fileRepo.create({
      projectId,
      uploaderId: authorId,
      filename: 'b.png',
      originalName: 'b.png',
      mimeType: 'image/png',
      size: 1,
      path: '/tmp/b.png',
      source: 'attachment',
    });

    const message = service.sendMessage(authorId, projectId, 'see this', [
      f1.id,
      f2.id,
    ]);

    expect(message.attachments).toHaveLength(2);
    expect(client.received[0]).toContain('chat.message.created');
    expect(client.received[0]).toContain('"attachments"');
  });

  it('getHistory returns messages with their attachments', () => {
    const fileRepo = new FileRepository(db);
    const f1 = fileRepo.create({
      projectId,
      uploaderId: authorId,
      filename: 'a.png',
      originalName: 'a.png',
      mimeType: 'image/png',
      size: 1,
      path: '/tmp/a.png',
      source: 'attachment',
    });
    service.sendMessage(authorId, projectId, 'with file', [f1.id]);
    service.sendMessage(authorId, projectId, 'no file');

    const history = service.getHistory(authorId, projectId);
    const withFile = history.items.find((m) => m.body === 'with file');
    const noFile = history.items.find((m) => m.body === 'no file');
    expect(withFile?.attachments).toHaveLength(1);
    expect(noFile?.attachments).toEqual([]);
  });

  it('deleteMessage soft-deletes its attachments', () => {
    const fileRepo = new FileRepository(db);
    const f1 = fileRepo.create({
      projectId,
      uploaderId: authorId,
      filename: 'a.png',
      originalName: 'a.png',
      mimeType: 'image/png',
      size: 1,
      path: '/tmp/a.png',
      source: 'attachment',
    });
    const m = service.sendMessage(authorId, projectId, 'x', [f1.id]);
    expect(m.attachments).toHaveLength(1);
    service.deleteMessage(authorId, m.id);
    const history = service.getHistory(authorId, projectId);
    // 削除されたメッセージは履歴に無く、添付も残らない
    expect(history.items.find((msg) => msg.id === m.id)).toBeUndefined();
  });

  it('editMessage preserves attachments in history (regression)', () => {
    const fileRepo = new FileRepository(db);
    const f1 = fileRepo.create({
      projectId,
      uploaderId: authorId,
      filename: 'a.png',
      originalName: 'a.png',
      mimeType: 'image/png',
      size: 1,
      path: '/tmp/a.png',
      source: 'attachment',
    });
    const m = service.sendMessage(authorId, projectId, 'orig', [f1.id]);
    service.editMessage(authorId, m.id, 'edited');
    const history = service.getHistory(authorId, projectId);
    const edited = history.items.find((msg) => msg.id === m.id);
    expect(edited?.body).toBe('edited');
    // 編集後も添付は履歴に残る
    expect(edited?.attachments).toHaveLength(1);
  });
});
