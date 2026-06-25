import { AttachmentRepository } from '@/repositories/AttachmentRepository';
import { FileRepository } from '@/repositories/FileRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import type { AttachmentTargetType, AttachmentView } from '@/lib/types';

/**
 * 添付ファイルの関連付けを担うService。
 * チャット/掲示板から呼ばれ、file_assets と対象(メッセージ/スレッド/コメント)を紐付ける。
 * 権限チェック(プロジェクト参加 + 自身のアップロードのみ)とクリーンアップを行う。
 */
export class AttachmentService {
  constructor(
    private readonly attachmentRepository: AttachmentRepository,
    private readonly fileRepository: FileRepository,
    private readonly projectMemberRepository: ProjectMemberRepository
  ) {}

  /**
   * 指定ターゲットへファイルを添付する。
   * 自身が当該プロジェクトにアップロードしたファイルのみ添付可能。
   */
  attach(
    actorId: number,
    projectId: number,
    targetType: AttachmentTargetType,
    targetId: number,
    fileIds: number[]
  ): AttachmentView[] {
    this.requireMember(projectId, actorId);
    const ids = Array.from(new Set(fileIds ?? []));
    if (ids.length === 0) return [];

    for (const fileId of ids) {
      const file = this.fileRepository.findFileById(fileId);
      if (!file) throw new NotFoundError('FileAsset', fileId);
      if (file.projectId !== projectId) {
        throw new ForbiddenError('プロジェクト外のファイルは添付できません');
      }
      if (file.uploaderId !== actorId) {
        throw new ForbiddenError('自身のアップロードファイルのみ添付できます');
      }
      this.attachmentRepository.create({
        projectId,
        fileId,
        targetType,
        targetId,
      });
    }
    return this.attachmentRepository.findViewsByTargets(targetType, [targetId]);
  }

  listViews(
    targetType: AttachmentTargetType,
    targetId: number
  ): AttachmentView[] {
    return this.attachmentRepository.findViewsByTargets(targetType, [targetId]);
  }

  listViewsBatch(
    targetType: AttachmentTargetType,
    targetIds: number[]
  ): AttachmentView[] {
    return this.attachmentRepository.findViewsByTargets(targetType, targetIds);
  }

  /** 対象の添付を論理削除(メッセージ/スレッド/コメント削除時)。 */
  detach(targetType: AttachmentTargetType, targetId: number): void {
    this.attachmentRepository.deleteByTarget(targetType, targetId);
  }

  private requireMember(projectId: number, actorId: number): void {
    if (!this.projectMemberRepository.isMember(projectId, actorId)) {
      throw new ForbiddenError('プロジェクトに参加していません');
    }
  }
}
