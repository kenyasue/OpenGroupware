import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { FileRepository } from '@/repositories/FileRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { NotificationService } from '@/services/NotificationService';
import { ActivityLogService } from '@/services/ActivityLogService';
import { SseHub } from '@/lib/sse/hub';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import type { FileAsset, FileAssetSource } from '@/lib/types';

const ALLOWED_MIME_PREFIXES = [
  'image/',
  'text/',
  'application/pdf',
  'application/json',
  'application/zip',
  'application/gzip',
  'application/vnd.openxmlformats-officedocument',
  'application/vnd.ms-excel',
  'application/msword',
  'application/vnd.ms-powerpoint',
  'application/octet-stream',
];

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/json': 'json',
  'application/zip': 'zip',
};

export interface UploadFileInput {
  originalName: string;
  mimeType: string;
  data: Buffer;
}

/**
 * ファイル共有の業務ロジックを担うService。
 * ローカルFS保存・MIMEチェック・ファイル名サニタイズ・保存名一意化・
 * 権限チェック・ファイル共有通知・アクティビティログ・SSE配信を行う。
 */
export class FileStorageService {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly projectMemberRepository: ProjectMemberRepository,
    private readonly notificationService: NotificationService,
    private readonly activityLogService: ActivityLogService,
    private readonly sseHub: SseHub,
    private readonly uploadsDir: string
  ) {}

  upload(
    actorId: number,
    projectId: number,
    input: UploadFileInput
  ): FileAsset {
    const fileAsset = this.persistFile(actorId, projectId, input, 'library');

    const memberIds = this.projectMemberRepository
      .findByProject(projectId)
      .map((m) => m.userId)
      .filter((uid) => uid !== actorId);
    if (memberIds.length > 0) {
      this.notificationService.notifyOnEvent({
        type: 'file_shared',
        projectId,
        title: `ファイル「${fileAsset.originalName}」が共有されました`,
        body: null,
        projectMemberIds: memberIds,
      });
    }
    this.activityLogService.logActivity({
      projectId,
      actorId,
      action: 'file_uploaded',
      targetType: 'file',
      targetId: fileAsset.id,
    });
    this.sseHub.broadcast(projectId, {
      type: 'file.uploaded',
      data: { projectId },
    });
    return fileAsset;
  }

  /**
   * チャット/掲示板の添付ファイル用アップロード。
   * file_shared 通知・file.uploaded SSE・file_uploaded アクティビティを行わず、
   * source='attachment' で保存する(Files一覧には出さない)。
   */
  uploadForAttachment(
    actorId: number,
    projectId: number,
    input: UploadFileInput
  ): FileAsset {
    return this.persistFile(actorId, projectId, input, 'attachment');
  }

  /**
   * 共通のファイル保存処理。権限チェック・MIMEチェック・FS保存・file_assets登録を行う。
   */
  private persistFile(
    actorId: number,
    projectId: number,
    input: UploadFileInput,
    source: FileAssetSource
  ): FileAsset {
    this.requireMember(projectId, actorId);
    if (!input.data || input.data.length === 0) {
      throw new ValidationError('ファイルが空です', 'file');
    }
    if (!this.isAllowedMime(input.mimeType)) {
      throw new ValidationError('許可されていないファイル形式です', 'mimeType');
    }

    const ext =
      this.sanitizeExt(input.originalName) ??
      EXT_BY_MIME[input.mimeType] ??
      'bin';
    const filename = `${crypto.randomUUID()}.${ext}`;
    const dir = path.join(this.uploadsDir, String(projectId));
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, input.data);

    return this.fileRepository.create({
      projectId,
      uploaderId: actorId,
      filename,
      originalName: this.sanitizeName(input.originalName) || 'file',
      mimeType: input.mimeType,
      size: input.data.length,
      path: filePath,
      source,
    });
  }

  listFiles(actorId: number, projectId: number, page: number = 1) {
    this.requireMember(projectId, actorId);
    return this.fileRepository.findFilesByProject(projectId, page);
  }

  getFileInfo(actorId: number, fileId: number): FileAsset {
    const file = this.fileRepository.findFileById(fileId);
    if (!file) throw new NotFoundError('FileAsset', fileId);
    this.requireMember(file.projectId, actorId);
    return file;
  }

  delete(actorId: number, fileId: number): void {
    const file = this.fileRepository.findFileById(fileId);
    if (!file) throw new NotFoundError('FileAsset', fileId);
    this.requireMember(file.projectId, actorId);
    const role = this.projectMemberRepository.getRole(file.projectId, actorId);
    if (file.uploaderId !== actorId && role !== 'admin') {
      throw new ForbiddenError('アップロード者または管理者のみ削除できます');
    }
    this.fileRepository.delete(fileId);
    try {
      fs.unlinkSync(file.path);
    } catch {
      // FSファイルが無くてもDB論理削除は成功させる
    }
  }

  private requireMember(projectId: number, actorId: number): void {
    if (!this.projectMemberRepository.isMember(projectId, actorId)) {
      throw new ForbiddenError('プロジェクトに参加していません');
    }
  }

  private isAllowedMime(mimeType: string): boolean {
    if (!mimeType) return false;
    return ALLOWED_MIME_PREFIXES.some((prefix) =>
      prefix.endsWith('/')
        ? mimeType.startsWith(prefix)
        : mimeType === prefix || mimeType.startsWith(prefix)
    );
  }

  private sanitizeExt(originalName: string): string | null {
    const base = path.basename(originalName);
    const match = base.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : null;
  }

  private sanitizeName(originalName: string): string {
    return path
      .basename(originalName)
      .replace(/[^\w.-]+/g, '_')
      .slice(0, 200);
  }
}
