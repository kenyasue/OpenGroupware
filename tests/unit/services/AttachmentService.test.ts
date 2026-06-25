import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { FileRepository } from '@/repositories/FileRepository';
import { AttachmentRepository } from '@/repositories/AttachmentRepository';
import { FileStorageService } from '@/services/FileStorageService';
import { AttachmentService } from '@/services/AttachmentService';
import { NotificationService } from '@/services/NotificationService';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { ActivityLogService } from '@/services/ActivityLogService';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { SseHub } from '@/lib/sse/hub';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

describe('AttachmentService', () => {
  let db: SqliteDatabase;
  let service: AttachmentService;
  let fileStorage: FileStorageService;
  let attachmentRepo: AttachmentRepository;
  let uploadsDir: string;
  let projectId: number;
  let authorId: number;
  let memberId: number;
  let outsiderId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-'));
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
    attachmentRepo = new AttachmentRepository(db);
    fileStorage = new FileStorageService(
      new FileRepository(db),
      members,
      new NotificationService(new NotificationRepository(db)),
      new ActivityLogService(new ActivityLogRepository(db)),
      new SseHub(),
      uploadsDir
    );
    service = new AttachmentService(
      attachmentRepo,
      new FileRepository(db),
      members
    );
  });

  afterEach(() => {
    db.close();
    fs.rmSync(uploadsDir, { recursive: true, force: true });
  });

  function uploadAttachment(actorId: number) {
    return fileStorage.uploadForAttachment(actorId, projectId, {
      originalName: 'pic.png',
      mimeType: 'image/png',
      data: Buffer.from('img'),
    });
  }

  it('attaches multiple files and returns their views', () => {
    const f1 = uploadAttachment(authorId);
    const f2 = uploadAttachment(authorId);
    const views = service.attach(authorId, projectId, 'chat_message', 1, [
      f1.id,
      f2.id,
    ]);
    expect(views).toHaveLength(2);
    expect(views.map((v) => v.fileId).sort()).toEqual([f1.id, f2.id].sort());
  });

  it('returns empty for no fileIds', () => {
    expect(service.attach(authorId, projectId, 'chat_message', 1, [])).toEqual(
      []
    );
  });

  it('deduplicates repeated fileIds', () => {
    const f1 = uploadAttachment(authorId);
    const views = service.attach(authorId, projectId, 'chat_message', 1, [
      f1.id,
      f1.id,
    ]);
    expect(views).toHaveLength(1);
  });

  it('forbids a non-member from attaching', () => {
    const f1 = uploadAttachment(authorId);
    expect(() =>
      service.attach(outsiderId, projectId, 'chat_message', 1, [f1.id])
    ).toThrow(ForbiddenError);
  });

  it('throws NotFoundError for a missing file', () => {
    expect(() =>
      service.attach(authorId, projectId, 'chat_message', 1, [99999])
    ).toThrow(NotFoundError);
  });

  it('forbids attaching a file from another project', () => {
    const otherProject = new ProjectRepository(db).create({
      name: 'P2',
      ownerId: authorId,
    }).id;
    const members = new ProjectMemberRepository(db);
    members.add(otherProject, authorId, 'admin');
    const otherFile = fileStorage.uploadForAttachment(authorId, otherProject, {
      originalName: 'x.png',
      mimeType: 'image/png',
      data: Buffer.from('x'),
    });
    expect(() =>
      service.attach(authorId, projectId, 'chat_message', 1, [otherFile.id])
    ).toThrow(ForbiddenError);
  });

  it('forbids attaching a file uploaded by another member', () => {
    const otherMemberFile = uploadAttachment(memberId);
    expect(() =>
      service.attach(authorId, projectId, 'chat_message', 1, [
        otherMemberFile.id,
      ])
    ).toThrow(ForbiddenError);
  });

  it('listViewsBatch returns views grouped by targetId', () => {
    const f1 = uploadAttachment(authorId);
    const f2 = uploadAttachment(authorId);
    service.attach(authorId, projectId, 'board_comment', 10, [f1.id]);
    service.attach(authorId, projectId, 'board_comment', 11, [f2.id]);
    const views = service.listViewsBatch('board_comment', [10, 11]);
    expect(views).toHaveLength(2);
  });

  it('detach soft-deletes attachments for the target', () => {
    const f1 = uploadAttachment(authorId);
    service.attach(authorId, projectId, 'chat_message', 5, [f1.id]);
    expect(service.listViews('chat_message', 5)).toHaveLength(1);
    service.detach('chat_message', 5);
    expect(service.listViews('chat_message', 5)).toHaveLength(0);
  });
});
