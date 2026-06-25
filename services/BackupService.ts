import fs from 'node:fs';
import path from 'node:path';
import { zipSync } from 'fflate';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import type { UserRole } from '@/lib/types';

export interface BackupActor {
  id: number;
  role: UserRole;
}

export interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

const FILENAME_RE = /^backup-[\w-]+\.zip$/;

/**
 * バックアップ作成・一覧・ダウンロードを担うService。
 * SQLite DBファイル + uploadsディレクトリをZIP化し、backups/ に保存する。
 * すべての操作は system_admin ロールに限定される。
 */
export class BackupService {
  constructor(
    private readonly dbPath: string,
    private readonly uploadsDir: string,
    private readonly backupsDir: string
  ) {}

  createBackup(actor: BackupActor): BackupFile {
    this.requireAdmin(actor);
    fs.mkdirSync(this.backupsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.zip`;
    const files: Record<string, Uint8Array> = {};

    // DBファイル
    if (fs.existsSync(this.dbPath)) {
      files['app.db'] = new Uint8Array(fs.readFileSync(this.dbPath));
    }
    // uploadsディレクトリ
    this.collectUploads(files, this.uploadsDir, 'uploads');

    const zip = zipSync(files);
    const fullPath = path.join(this.backupsDir, filename);
    fs.writeFileSync(fullPath, zip);

    const stat = fs.statSync(fullPath);
    return {
      filename,
      size: stat.size,
      createdAt: stat.mtime.toISOString(),
    };
  }

  listBackups(actor: BackupActor): BackupFile[] {
    this.requireAdmin(actor);
    if (!fs.existsSync(this.backupsDir)) return [];
    const entries = fs
      .readdirSync(this.backupsDir)
      .filter((f) => f.endsWith('.zip') && FILENAME_RE.test(f))
      .map((filename) => {
        const stat = fs.statSync(path.join(this.backupsDir, filename));
        return {
          filename,
          size: stat.size,
          createdAt: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return entries;
  }

  getBackupPath(actor: BackupActor, filename: string): string {
    this.requireAdmin(actor);
    if (!FILENAME_RE.test(filename)) {
      throw new NotFoundError('Backup', filename);
    }
    const fullPath = path.join(this.backupsDir, filename);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('Backup', filename);
    }
    return fullPath;
  }

  private requireAdmin(actor: BackupActor): void {
    if (actor.role !== 'system_admin') {
      throw new ForbiddenError('管理者のみアクセス可能です');
    }
  }

  private collectUploads(
    files: Record<string, Uint8Array>,
    dir: string,
    prefix: string
  ): void {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const rel = `${prefix}/${entry}`;
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        this.collectUploads(files, fullPath, rel);
      } else {
        files[rel] = new Uint8Array(fs.readFileSync(fullPath));
      }
    }
  }
}
