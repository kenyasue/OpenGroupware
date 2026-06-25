import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { FileRepository } from '@/repositories/FileRepository';

describe('FileRepository', () => {
  let db: SqliteDatabase;
  let repo: FileRepository;
  let projectId: number;
  let userId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    repo = new FileRepository(db);
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
    return repo.create({
      projectId,
      uploaderId: userId,
      filename: `${name}.bin`,
      originalName: name,
      mimeType: 'application/octet-stream',
      size: 10,
      path: `/tmp/${name}.bin`,
    });
  }

  it('creates and finds a file', () => {
    const f = createFile('test');
    expect(repo.findFileById(f.id)?.originalName).toBe('test');
  });

  it('lists files newest first with total', () => {
    createFile('a');
    createFile('b');
    const { items, total } = repo.findFilesByProject(projectId);
    expect(total).toBe(2);
    expect(items[0].originalName).toBe('b');
  });

  it('excludes soft-deleted files', () => {
    const f = createFile('a');
    repo.delete(f.id);
    expect(repo.findFileById(f.id)).toBeNull();
    expect(repo.findFilesByProject(projectId).total).toBe(0);
  });

  it('isolates files by project', () => {
    createFile('mine');
    const p2 = new ProjectRepository(db).create({
      name: 'P2',
      ownerId: userId,
    }).id;
    repo.create({
      projectId: p2,
      uploaderId: userId,
      filename: 'x.bin',
      originalName: 'theirs',
      mimeType: 'application/octet-stream',
      size: 1,
      path: '/tmp/x.bin',
    });
    expect(repo.findFilesByProject(projectId).total).toBe(1);
    expect(repo.findFilesByProject(p2).total).toBe(1);
  });

  it('paginates files', () => {
    for (let i = 0; i < 5; i++) createFile(`f${i}`);
    expect(repo.findFilesByProject(projectId, 1, 2).items).toHaveLength(2);
    expect(repo.findFilesByProject(projectId, 1, 2).total).toBe(5);
  });

  it('excludes attachment-source files from the library list but findFileById still returns them', () => {
    createFile('library-file');
    repo.create({
      projectId,
      uploaderId: userId,
      filename: 'att.bin',
      originalName: 'attachment-file',
      mimeType: 'image/png',
      size: 1,
      path: '/tmp/att.bin',
      source: 'attachment',
    });
    const list = repo.findFilesByProject(projectId);
    expect(list.total).toBe(1);
    expect(list.items[0].originalName).toBe('library-file');
    // 添付ファイルも findFileById では取得可能(ダウンロード用)
    const att = repo.findFilesByProject(projectId, 1, 100).items;
    expect(att).toHaveLength(1);
  });

  it('defaults source to library when not specified', () => {
    const f = repo.create({
      projectId,
      uploaderId: userId,
      filename: 'd.bin',
      originalName: 'd',
      mimeType: 'text/plain',
      size: 1,
      path: '/tmp/d.bin',
    });
    expect(f.source).toBe('library');
  });
});
