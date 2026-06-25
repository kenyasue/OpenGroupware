import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { FileRepository } from '@/repositories/FileRepository';
import { AttachmentRepository } from '@/repositories/AttachmentRepository';

describe('AttachmentRepository', () => {
  let db: SqliteDatabase;
  let repo: AttachmentRepository;
  let fileRepo: FileRepository;
  let projectId: number;
  let userId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    repo = new AttachmentRepository(db);
    fileRepo = new FileRepository(db);
    userId = new UserRepository(db).create({
      name: 'U',
      email: 'u@example.com',
      passwordHash: 'h',
    }).id;
    projectId = new ProjectRepository(db).create({
      name: 'P',
      ownerId: userId,
    }).id;
    new ProjectMemberRepository(db).add(projectId, userId, 'admin');
  });

  afterEach(() => db.close());

  function createFile(name: string) {
    return fileRepo.create({
      projectId,
      uploaderId: userId,
      filename: `${name}.bin`,
      originalName: name,
      mimeType: 'image/png',
      size: 10,
      path: `/tmp/${name}.bin`,
      source: 'attachment',
    });
  }

  it('creates and finds an attachment by target', () => {
    const file = createFile('a');
    const att = repo.create({
      projectId,
      fileId: file.id,
      targetType: 'chat_message',
      targetId: 1,
    });
    expect(att.id).toBeGreaterThan(0);
    expect(att.targetType).toBe('chat_message');
    const list = repo.findByTarget('chat_message', 1);
    expect(list).toHaveLength(1);
    expect(list[0].fileId).toBe(file.id);
  });

  it('findViewsByTargets joins file_assets and returns view fields', () => {
    const f1 = createFile('one');
    const f2 = createFile('two');
    repo.create({
      projectId,
      fileId: f1.id,
      targetType: 'board_comment',
      targetId: 10,
    });
    repo.create({
      projectId,
      fileId: f2.id,
      targetType: 'board_comment',
      targetId: 11,
    });
    const views = repo.findViewsByTargets('board_comment', [10, 11]);
    expect(views).toHaveLength(2);
    const v1 = views.find((v) => v.targetId === 10);
    expect(v1?.originalName).toBe('one');
    expect(v1?.mimeType).toBe('image/png');
    expect(v1?.fileId).toBe(f1.id);
  });

  it('returns empty array for empty target id list', () => {
    expect(repo.findViewsByTargets('chat_message', [])).toEqual([]);
  });

  it('isolates by target_type (same target_id, different type)', () => {
    const file = createFile('a');
    repo.create({
      projectId,
      fileId: file.id,
      targetType: 'chat_message',
      targetId: 5,
    });
    repo.create({
      projectId,
      fileId: file.id,
      targetType: 'board_thread',
      targetId: 5,
    });
    expect(repo.findByTarget('chat_message', 5)).toHaveLength(1);
    expect(repo.findByTarget('board_thread', 5)).toHaveLength(1);
  });

  it('excludes soft-deleted attachments and files', () => {
    const f1 = createFile('keep');
    const f2 = createFile('drop');
    repo.create({
      projectId,
      fileId: f1.id,
      targetType: 'chat_message',
      targetId: 1,
    });
    repo.create({
      projectId,
      fileId: f2.id,
      targetType: 'chat_message',
      targetId: 1,
    });
    // ファイルを論理削除するとビューから消える
    fileRepo.delete(f2.id);
    const views = repo.findViewsByTargets('chat_message', [1]);
    expect(views).toHaveLength(1);
    expect(views[0].originalName).toBe('keep');
  });

  it('deleteByTarget soft-deletes all attachments for the target', () => {
    createFile('a');
    createFile('b');
    const f1 = createFile('one');
    const f2 = createFile('two');
    repo.create({
      projectId,
      fileId: f1.id,
      targetType: 'board_thread',
      targetId: 7,
    });
    repo.create({
      projectId,
      fileId: f2.id,
      targetType: 'board_thread',
      targetId: 7,
    });
    expect(repo.deleteByTarget('board_thread', 7)).toBe(true);
    expect(repo.findByTarget('board_thread', 7)).toHaveLength(0);
    // 既に削除済みなら false
    expect(repo.deleteByTarget('board_thread', 7)).toBe(false);
  });
});
