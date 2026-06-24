import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { ProjectService } from '@/services/ProjectService';
import { ForbiddenError, NotFoundError, ConflictError } from '@/lib/errors';

function createService(db: SqliteDatabase) {
  return new ProjectService(
    new ProjectRepository(db),
    new ProjectMemberRepository(db),
    new NotificationRepository(db),
    db
  );
}

function createUser(repo: UserRepository, email: string, name = 'User') {
  return repo.create({ name, email, passwordHash: 'hash' });
}

describe('ProjectService', () => {
  let db: SqliteDatabase;
  let userRepo: UserRepository;
  let service: ProjectService;
  let ownerId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    userRepo = new UserRepository(db);
    service = createService(db);
    ownerId = createUser(userRepo, 'owner@example.com', 'Owner').id;
  });

  afterEach(() => {
    db.close();
  });

  describe('createProject', () => {
    it('creates the project and registers the owner as an admin member', () => {
      const project = service.createProject(ownerId, { name: 'P1' });

      expect(project.name).toBe('P1');
      expect(project.ownerId).toBe(ownerId);

      const dashboard = service.getDashboard(ownerId, project.id);
      expect(dashboard.members).toHaveLength(1);
      expect(dashboard.members[0].role).toBe('admin');
      expect(service.getMemberRole(ownerId, project.id)).toBe('admin');
    });
  });

  describe('getMyProjects', () => {
    it('lists projects the user participates in', () => {
      service.createProject(ownerId, { name: 'P1' });
      service.createProject(ownerId, { name: 'P2' });

      const projects = service.getMyProjects(ownerId);
      expect(projects).toHaveLength(2);
    });
  });

  describe('updateProject', () => {
    it('allows an admin to update the project', () => {
      const project = service.createProject(ownerId, { name: 'P1' });

      const updated = service.updateProject(ownerId, project.id, {
        name: 'P1-updated',
        status: 'on_hold',
      });

      expect(updated.name).toBe('P1-updated');
      expect(updated.status).toBe('on_hold');
    });

    it('forbids a non-admin member from updating', () => {
      const project = service.createProject(ownerId, { name: 'P1' });
      const member = createUser(userRepo, 'member@example.com').id;
      service.addMember(ownerId, project.id, member, 'member');

      expect(() =>
        service.updateProject(member, project.id, { name: 'X' })
      ).toThrow(ForbiddenError);
    });

    it('forbids a non-member from updating', () => {
      const project = service.createProject(ownerId, { name: 'P1' });
      const outsider = createUser(userRepo, 'out@example.com').id;

      expect(() =>
        service.updateProject(outsider, project.id, { name: 'X' })
      ).toThrow(ForbiddenError);
    });

    it('throws NotFoundError for a non-existent project', () => {
      expect(() =>
        service.updateProject(ownerId, 99999, { name: 'X' })
      ).toThrow(NotFoundError);
    });
  });

  describe('archiveProject', () => {
    it('sets the project status to archived', () => {
      const project = service.createProject(ownerId, { name: 'P1' });

      const archived = service.archiveProject(ownerId, project.id);

      expect(archived.status).toBe('archived');
    });
  });

  describe('deleteProject', () => {
    it('deletes the project when the actor is an admin', () => {
      const project = service.createProject(ownerId, { name: 'P1' });

      service.deleteProject(ownerId, project.id);

      expect(() => service.getProject(ownerId, project.id)).toThrow(
        NotFoundError
      );
    });
  });

  describe('addMember', () => {
    it('adds a member and creates a project_added notification', () => {
      const project = service.createProject(ownerId, { name: 'P1' });
      const newMember = createUser(userRepo, 'new@example.com').id;

      service.addMember(ownerId, project.id, newMember, 'member');

      expect(service.getMemberRole(newMember, project.id)).toBe('member');
      const notifications = db.query<{
        id: number;
        type: string;
        user_id: number;
      }>(
        'SELECT id, type, user_id FROM notifications WHERE user_id = @userId',
        { userId: newMember }
      );
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('project_added');
    });

    it('rejects adding an existing member with ConflictError', () => {
      const project = service.createProject(ownerId, { name: 'P1' });
      const newMember = createUser(userRepo, 'new@example.com').id;
      service.addMember(ownerId, project.id, newMember, 'member');

      expect(() =>
        service.addMember(ownerId, project.id, newMember, 'member')
      ).toThrow(ConflictError);
    });

    it('forbids a non-admin from adding members', () => {
      const project = service.createProject(ownerId, { name: 'P1' });
      const member = createUser(userRepo, 'member@example.com').id;
      service.addMember(ownerId, project.id, member, 'member');
      const target = createUser(userRepo, 'target@example.com').id;

      expect(() =>
        service.addMember(member, project.id, target, 'member')
      ).toThrow(ForbiddenError);
    });
  });

  describe('removeMember', () => {
    it('allows an admin to remove another member', () => {
      const project = service.createProject(ownerId, { name: 'P1' });
      const member = createUser(userRepo, 'member@example.com').id;
      service.addMember(ownerId, project.id, member, 'member');

      service.removeMember(ownerId, project.id, member);

      expect(service.getMemberRole(member, project.id)).toBeNull();
    });

    it('allows a member to remove themselves', () => {
      const project = service.createProject(ownerId, { name: 'P1' });
      const member = createUser(userRepo, 'member@example.com').id;
      service.addMember(ownerId, project.id, member, 'member');

      service.removeMember(member, project.id, member);

      expect(service.getMemberRole(member, project.id)).toBeNull();
    });

    it('forbids a member from removing another member', () => {
      const project = service.createProject(ownerId, { name: 'P1' });
      const member1 = createUser(userRepo, 'm1@example.com').id;
      const member2 = createUser(userRepo, 'm2@example.com').id;
      service.addMember(ownerId, project.id, member1, 'member');
      service.addMember(ownerId, project.id, member2, 'member');

      expect(() => service.removeMember(member1, project.id, member2)).toThrow(
        ForbiddenError
      );
    });
  });

  describe('getDashboard / getProject', () => {
    it('returns the project and members for a member', () => {
      const project = service.createProject(ownerId, { name: 'P1' });

      const dashboard = service.getDashboard(ownerId, project.id);
      expect(dashboard.project.id).toBe(project.id);
      expect(dashboard.members).toHaveLength(1);
    });

    it('forbids a non-member from accessing the project (isolation)', () => {
      const project = service.createProject(ownerId, { name: 'P1' });
      const outsider = createUser(userRepo, 'out@example.com').id;

      expect(() => service.getProject(outsider, project.id)).toThrow(
        ForbiddenError
      );
      expect(() => service.getDashboard(outsider, project.id)).toThrow(
        ForbiddenError
      );
      expect(() => service.getMembers(outsider, project.id)).toThrow(
        ForbiddenError
      );
    });

    it('throws NotFoundError for a non-existent project', () => {
      expect(() => service.getProject(ownerId, 99999)).toThrow(NotFoundError);
    });
  });
});
