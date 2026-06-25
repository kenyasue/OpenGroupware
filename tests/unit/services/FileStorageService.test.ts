import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { FileRepository } from '@/repositories/FileRepository';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { NotificationService } from '@/services/NotificationService';
import { ActivityLogService } from '@/services/ActivityLogService';
import { FileStorageService } from '@/services/FileStorageService';
import { SseHub } from '@/lib/sse/hub';
import { ForbiddenError, ValidationError } from '@/lib/errors';

describe('FileStorageService', () => {
  let db: SqliteDatabase;
  let service: FileStorageService;
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
    service = new FileStorageService(
      new FileRepository(db),
      members,
      new NotificationService(new NotificationRepository(db)),
      new ActivityLogService(new ActivityLogRepository(db)),
      new SseHub(),
      uploadsDir
    );
  });

  afterEach(() => {
    db.close();
    fs.rmSync(uploadsDir, { recursive: true, force: true });
  });

  it('uploads a file: writes to FS, stores metadata, notifies members, logs activity', () => {
    const file = service.upload(authorId, projectId, {
      originalName: 'photo.png',
      mimeType: 'image/png',
      data: Buffer.from('fake-png-bytes'),
    });

    expect(file.id).toBeGreaterThan(0);
    expect(file.originalName).toBe('photo.png');
    expect(fs.existsSync(file.path)).toBe(true);
    // メンバー(memberId)へ file_shared 通知
    expect(new NotificationRepository(db).countUnreadByUser(memberId)).toBe(1);
    expect(
      new ActivityLogRepository(db)
        .findByProject(projectId)
        .items.some((l) => l.action === 'file_uploaded')
    ).toBe(true);
  });

  it('rejects a disallowed MIME type', () => {
    expect(() =>
      service.upload(authorId, projectId, {
        originalName: 'evil.exe',
        mimeType: 'application/x-msdownload',
        data: Buffer.from('x'),
      })
    ).toThrow(ValidationError);
  });

  it('rejects an empty file', () => {
    expect(() =>
      service.upload(authorId, projectId, {
        originalName: 'empty.txt',
        mimeType: 'text/plain',
        data: Buffer.alloc(0),
      })
    ).toThrow(ValidationError);
  });

  it('forbids a non-member from uploading', () => {
    expect(() =>
      service.upload(outsiderId, projectId, {
        originalName: 'x.png',
        mimeType: 'image/png',
        data: Buffer.from('x'),
      })
    ).toThrow(ForbiddenError);
  });

  it('sanitizes the saved filename to a unique uuid-based name', () => {
    const file = service.upload(authorId, projectId, {
      originalName: 'photo.png',
      mimeType: 'image/png',
      data: Buffer.from('x'),
    });
    expect(file.filename).toMatch(/^[0-9a-f-]{36}\.png$/);
  });

  it('getFileInfo requires membership', () => {
    const file = service.upload(authorId, projectId, {
      originalName: 'a.txt',
      mimeType: 'text/plain',
      data: Buffer.from('hi'),
    });
    expect(service.getFileInfo(authorId, file.id).id).toBe(file.id);
    expect(() => service.getFileInfo(outsiderId, file.id)).toThrow(
      ForbiddenError
    );
  });

  it('delete: uploader can delete; non-uploader non-admin cannot', () => {
    const file = service.upload(memberId, projectId, {
      originalName: 'm.txt',
      mimeType: 'text/plain',
      data: Buffer.from('hi'),
    });
    expect(() => service.delete(outsiderId, file.id)).toThrow(ForbiddenError);
    // 作者(member)は削除可
    service.delete(memberId, file.id);
    expect(fs.existsSync(file.path)).toBe(false);
  });

  it('admin can delete another member file', () => {
    const file = service.upload(memberId, projectId, {
      originalName: 'm.txt',
      mimeType: 'text/plain',
      data: Buffer.from('hi'),
    });
    service.delete(authorId, file.id); // authorId is admin
    expect(() => service.getFileInfo(memberId, file.id)).toThrow();
  });
});
