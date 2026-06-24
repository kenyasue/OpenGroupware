import type { SqliteDatabase } from '@/lib/db/sqlite';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import {
  ProjectMemberRepository,
  type ProjectMemberWithUser,
} from '@/repositories/ProjectMemberRepository';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import {
  validateProjectCreate,
  validateProjectUpdate,
  type ProjectUpdateInput,
} from '@/lib/validators/projectValidator';
import { NotFoundError, ForbiddenError, ConflictError } from '@/lib/errors';
import type { Project, ProjectMember, ProjectMemberRole } from '@/lib/types';

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface ProjectDashboard {
  project: Project;
  members: ProjectMemberWithUser[];
}

/**
 * プロジェクト・メンバー管理の業務ロジックを担うService。
 * 権限チェック(isMember/ロール)・トランザクション境界・メンバー追加通知を扱う。
 */
export class ProjectService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly projectMemberRepository: ProjectMemberRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly db: SqliteDatabase
  ) {}

  createProject(actorId: number, input: CreateProjectInput): Project {
    validateProjectCreate(input);
    return this.db.transaction(() => {
      const project = this.projectRepository.create({
        name: input.name,
        description: input.description,
        ownerId: actorId,
      });
      // プロジェクト作成者を管理者(admin)メンバーとして登録
      this.projectMemberRepository.add(project.id, actorId, 'admin');
      return project;
    });
  }

  getProject(actorId: number, projectId: number): Project {
    return this.requireProjectMember(projectId, actorId);
  }

  getMyProjects(userId: number): Project[] {
    return this.projectRepository.findProjectsByUserId(userId);
  }

  updateProject(
    actorId: number,
    projectId: number,
    input: ProjectUpdateInput
  ): Project {
    validateProjectUpdate(input);
    this.requireProjectAdmin(projectId, actorId);
    const updated = this.projectRepository.update(projectId, input);
    if (!updated) {
      throw new NotFoundError('Project', projectId);
    }
    return updated;
  }

  archiveProject(actorId: number, projectId: number): Project {
    this.requireProjectAdmin(projectId, actorId);
    const updated = this.projectRepository.update(projectId, {
      status: 'archived',
    });
    if (!updated) {
      throw new NotFoundError('Project', projectId);
    }
    return updated;
  }

  deleteProject(actorId: number, projectId: number): void {
    this.requireProjectAdmin(projectId, actorId);
    this.projectRepository.delete(projectId);
  }

  getMembers(actorId: number, projectId: number): ProjectMemberWithUser[] {
    this.requireProjectMember(projectId, actorId);
    return this.projectMemberRepository.findByProject(projectId);
  }

  /** 操作者のプロジェクト内ロールを取得する（非参加者・非存在プロジェクトは null） */
  getMemberRole(actorId: number, projectId: number): ProjectMemberRole | null {
    return this.projectMemberRepository.getRole(projectId, actorId);
  }

  addMember(
    actorId: number,
    projectId: number,
    userId: number,
    role: ProjectMemberRole
  ): ProjectMember {
    this.requireProjectAdmin(projectId, actorId);
    if (this.projectMemberRepository.isMember(projectId, userId)) {
      throw new ConflictError('このユーザーは既にメンバーです');
    }
    return this.db.transaction(() => {
      const member = this.projectMemberRepository.add(projectId, userId, role);
      // 追加されたユーザーへ通知(M5のNotificationService連携相当を直接記録)
      this.notificationRepository.create({
        userId,
        projectId,
        type: 'project_added',
        title: 'プロジェクトに追加されました',
        body: `プロジェクトID ${projectId} のメンバーに追加されました`,
      });
      return member;
    });
  }

  removeMember(actorId: number, projectId: number, userId: number): void {
    this.requireProjectMember(projectId, actorId);
    const actorRole = this.projectMemberRepository.getRole(projectId, actorId);
    // 管理者は誰でも削除可能。一般メンバーは自分自身のみ削除可能。
    if (actorId !== userId && actorRole !== 'admin') {
      throw new ForbiddenError('他のメンバーの削除には管理者権限が必要です');
    }
    const removed = this.projectMemberRepository.remove(projectId, userId);
    if (!removed) {
      throw new NotFoundError('Member', userId);
    }
  }

  getDashboard(actorId: number, projectId: number): ProjectDashboard {
    const project = this.requireProjectMember(projectId, actorId);
    const members = this.projectMemberRepository.findByProject(projectId);
    return { project, members };
  }

  private requireProjectMember(projectId: number, actorId: number): Project {
    const project = this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError('Project', projectId);
    }
    if (!this.projectMemberRepository.isMember(projectId, actorId)) {
      throw new ForbiddenError('プロジェクトに参加していません');
    }
    return project;
  }

  private requireProjectAdmin(projectId: number, actorId: number): Project {
    const project = this.requireProjectMember(projectId, actorId);
    const role = this.projectMemberRepository.getRole(projectId, actorId);
    if (role !== 'admin') {
      throw new ForbiddenError('プロジェクト管理者権限が必要です');
    }
    return project;
  }
}
