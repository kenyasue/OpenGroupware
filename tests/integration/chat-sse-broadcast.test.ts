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

describe('chat → SSE broadcast (integration)', () => {
  let db: SqliteDatabase;
  let service: ChatService;
  let hub: SseHub;
  let projectId: number;
  let authorId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    hub = new SseHub();
    const users = new UserRepository(db);
    authorId = users.create({
      name: 'A',
      email: 'a@example.com',
      passwordHash: 'h',
    }).id;
    projectId = new ProjectRepository(db).create({
      name: 'P',
      ownerId: authorId,
    }).id;
    const members = new ProjectMemberRepository(db);
    members.add(projectId, authorId, 'admin');
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

  function subscribe(projectId: number): SseClient & { received: string[] } {
    const received: string[] = [];
    const client: SseClient & { received: string[] } = {
      received,
      enqueue: (c) => received.push(c),
      close: () => undefined,
    };
    hub.addClient(projectId, client);
    return client;
  }

  it('a subscribed client receives the created message event in SSE format', () => {
    const client = subscribe(projectId);

    const message = service.sendMessage(authorId, projectId, 'hello realtime');

    expect(client.received).toHaveLength(1);
    const raw = client.received[0];
    expect(raw).toMatch(/^data: .+\n\n$/);
    const parsed = JSON.parse(raw.replace(/^data: /, '').replace(/\n\n$/, ''));
    expect(parsed.type).toBe('chat.message.created');
    expect(parsed.data.message.id).toBe(message.id);
    expect(parsed.data.message.body).toBe('hello realtime');
  });

  it('a client in another project does not receive the message', () => {
    const otherClient = subscribe(99999);

    service.sendMessage(authorId, projectId, 'hello');

    expect(otherClient.received).toHaveLength(0);
  });

  it('delete broadcasts a deleted event with the message id', () => {
    const client = subscribe(projectId);
    const message = service.sendMessage(authorId, projectId, 'to be deleted');
    client.received.length = 0;

    service.deleteMessage(authorId, message.id);

    const parsed = JSON.parse(
      client.received[0].replace(/^data: /, '').replace(/\n\n$/, '')
    );
    expect(parsed.type).toBe('chat.message.deleted');
    expect(parsed.data.id).toBe(message.id);
  });
});
