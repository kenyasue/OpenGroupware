import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { ProjectService } from '@/services/ProjectService';
import { ForbiddenError } from '@/lib/errors';

describe('project member permission (integration)', () => {
  let db: SqliteDatabase;
  let userRepo: UserRepository;
  let service: ProjectService;
  let ownerA: number;
  let memberB: number;
  let outsiderC: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    userRepo = new UserRepository(db);
    service = new ProjectService(
      new ProjectRepository(db),
      new ProjectMemberRepository(db),
      new NotificationRepository(db),
      db
    );

    ownerA = userRepo.create({
      name: 'A',
      email: 'a@example.com',
      passwordHash: 'h',
    }).id;
    memberB = userRepo.create({
      name: 'B',
      email: 'b@example.com',
      passwordHash: 'h',
    }).id;
    outsiderC = userRepo.create({
      name: 'C',
      email: 'c@example.com',
      passwordHash: 'h',
    }).id;
  });

  afterEach(() => {
    db.close();
  });

  it('non-members cannot access any project data; members can', () => {
    const p1 = service.createProject(ownerA, { name: 'P1' });
    service.addMember(ownerA, p1.id, memberB, 'member');

    // メンバー B はアクセス可能
    expect(() => service.getProject(memberB, p1.id)).not.toThrow();
    expect(() => service.getDashboard(memberB, p1.id)).not.toThrow();
    expect(service.getMembers(memberB, p1.id).length).toBeGreaterThan(0);

    // 非メンバー C はすべて拒否
    expect(() => service.getProject(outsiderC, p1.id)).toThrow(ForbiddenError);
    expect(() => service.getDashboard(outsiderC, p1.id)).toThrow(
      ForbiddenError
    );
    expect(() => service.getMembers(outsiderC, p1.id)).toThrow(ForbiddenError);
  });

  it('a member of one project cannot access another project', () => {
    const p1 = service.createProject(ownerA, { name: 'P1' });
    const p2 = service.createProject(ownerA, { name: 'P2' });
    service.addMember(ownerA, p1.id, memberB, 'member');

    // B は P1 のメンバーだが P2 には非参加
    expect(() => service.getProject(memberB, p2.id)).toThrow(ForbiddenError);
  });

  it('a non-admin member cannot manage members or edit the project', () => {
    const p1 = service.createProject(ownerA, { name: 'P1' });
    service.addMember(ownerA, p1.id, memberB, 'member');

    expect(() =>
      service.updateProject(memberB, p1.id, { name: 'hacked' })
    ).toThrow(ForbiddenError);
    expect(() =>
      service.addMember(memberB, p1.id, outsiderC, 'member')
    ).toThrow(ForbiddenError);
    expect(() => service.archiveProject(memberB, p1.id)).toThrow(
      ForbiddenError
    );
  });

  it('getMyProjects only returns projects the user belongs to', () => {
    const p1 = service.createProject(ownerA, { name: 'P1' });
    service.createProject(ownerA, { name: 'P2' });
    service.addMember(ownerA, p1.id, memberB, 'member');

    const projectsForB = service.getMyProjects(memberB);
    expect(projectsForB.map((p) => p.id)).toEqual([p1.id]);
  });
});
