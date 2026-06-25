import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { BackupService } from '@/services/BackupService';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

describe('BackupService', () => {
  let root: string;
  let dbPath: string;
  let uploadsDir: string;
  let backupsDir: string;
  let service: BackupService;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-'));
    dbPath = path.join(root, 'app.db');
    uploadsDir = path.join(root, 'uploads');
    backupsDir = path.join(root, 'backups');
    fs.writeFileSync(dbPath, Buffer.from('fake-db-content'));
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, 'a.txt'), Buffer.from('hello'));
    fs.mkdirSync(path.join(uploadsDir, 'sub'), { recursive: true });
    fs.writeFileSync(
      path.join(uploadsDir, 'sub', 'b.txt'),
      Buffer.from('world')
    );
    service = new BackupService(dbPath, uploadsDir, backupsDir);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const admin = { id: 1, role: 'system_admin' as const };
  const member = { id: 2, role: 'member' as const };

  it('createBackup zips DB + uploads into backups dir', () => {
    const backup = service.createBackup(admin);
    expect(backup.filename).toMatch(/^backup-.+\.zip$/);
    const fullPath = path.join(backupsDir, backup.filename);
    expect(fs.existsSync(fullPath)).toBe(true);
    expect(backup.size).toBeGreaterThan(0);

    // ZIP内容を検証
    const zip = new Uint8Array(fs.readFileSync(fullPath));
    const unzipped = unzipSync(zip);
    expect(Object.keys(unzipped)).toContain('app.db');
    expect(Object.keys(unzipped)).toContain('uploads/a.txt');
    expect(Object.keys(unzipped)).toContain('uploads/sub/b.txt');
  });

  it('listBackups returns created backups newest first', () => {
    service.createBackup(admin);
    const list = service.listBackups(admin);
    expect(list).toHaveLength(1);
    expect(list[0].filename).toMatch(/^backup-.+\.zip$/);
  });

  it('forbids a non-admin from creating/listing', () => {
    expect(() => service.createBackup(member)).toThrow(ForbiddenError);
    expect(() => service.listBackups(member)).toThrow(ForbiddenError);
  });

  it('getBackupPath rejects path traversal and missing files', () => {
    service.createBackup(admin);
    expect(() => service.getBackupPath(admin, '../evil.zip')).toThrow(
      NotFoundError
    );
    expect(() =>
      service.getBackupPath(admin, 'backup-doesnotexist.zip')
    ).toThrow(NotFoundError);
  });

  it('getBackupPath returns the path for a valid backup', () => {
    const backup = service.createBackup(admin);
    const p = service.getBackupPath(admin, backup.filename);
    expect(fs.existsSync(p)).toBe(true);
  });
});
