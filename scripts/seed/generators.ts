/**
 * シードデータ生成のオーケストレータ。
 * ユーザーとプロジェクトを生成し、各プロジェクト単位の生成器(content.ts)をFK順に呼び出す。
 * 生成内容は固定シード(mulberry32)で決定論的。
 */
import bcrypt from 'bcrypt';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { createRng, pick, pickN, randInt, chance, type Rng } from './rng';
import {
  FAMILY_NAMES,
  GIVEN_NAMES,
  PROJECT_DESCRIPTIONS,
  PROJECT_NAMES,
} from './pools';
import {
  CANONICAL_PROJECTS,
  CANONICAL_USERS,
  SEED,
  TARGET_PROJECTS,
  TARGET_USERS,
  type UserSeed,
  addMember,
  bcryptSalt,
  insert,
  now,
  type ProjectSpec,
} from './helpers';
import {
  seedBoard,
  seedChat,
  seedFiles,
  seedNotes,
  seedTodos,
} from './content';
import { seedCalendar, seedMeetings, seedMilestones } from './schedule';
import { seedActivityLogs, seedNotifications } from './logs';

function buildUserSeeds(rng: Rng): UserSeed[] {
  const seeds = [...CANONICAL_USERS];
  const usedEmails = new Set(seeds.map((u) => u.email));
  const usedNames = new Set(seeds.map((u) => u.name));
  while (seeds.length < TARGET_USERS) {
    const given = pick(rng, GIVEN_NAMES);
    const family = pick(rng, FAMILY_NAMES);
    const name = `${given} ${family}`;
    if (usedNames.has(name)) continue;
    let email = `${given.toLowerCase()}.${family.toLowerCase()}@example.com`;
    let suffix = 1;
    while (usedEmails.has(email)) {
      email = `${given.toLowerCase()}.${family.toLowerCase()}${suffix}@example.com`;
      suffix++;
    }
    usedEmails.add(email);
    usedNames.add(name);
    const status = chance(rng, 0.1) ? 'inactive' : 'active';
    seeds.push({ name, email, password: 'password', role: 'member', status });
  }
  return seeds;
}

function seedUsers(
  db: SqliteDatabase,
  rng: Rng
): { emailToId: Map<string, number>; activeMemberIds: number[] } {
  const seeds = buildUserSeeds(rng);
  const emailToId = new Map<string, number>();
  const activeMemberIds: number[] = [];
  for (const u of seeds) {
    const id = insert(
      db,
      `INSERT INTO users (name, email, password_hash, avatar_url, role, status, created_at, updated_at)
       VALUES (@name, @email, @passwordHash, NULL, @role, @status, @createdAt, @updatedAt)`,
      {
        name: u.name,
        email: u.email,
        passwordHash: bcrypt.hashSync(u.password, bcryptSalt(rng)),
        role: u.role,
        status: u.status,
        createdAt: now(),
        updatedAt: now(),
      }
    );
    emailToId.set(u.email, id);
    if (u.role === 'member' && u.status === 'active') activeMemberIds.push(id);
  }
  return { emailToId, activeMemberIds };
}

function buildProjectSpecs(rng: Rng): ProjectSpec[] {
  const specs: ProjectSpec[] = CANONICAL_PROJECTS.map((p) => ({
    name: p.name,
    description: p.description,
    status: p.status,
    ownerEmail: p.ownerEmail,
    memberEmails: p.memberEmails,
  }));
  const usedNames = new Set(specs.map((s) => s.name));
  const names = pickN(rng, PROJECT_NAMES, PROJECT_NAMES.length).filter(
    (n) => !usedNames.has(n)
  );
  const descs = pickN(rng, PROJECT_DESCRIPTIONS, PROJECT_DESCRIPTIONS.length);
  let ni = 0;
  let di = 0;
  while (specs.length < TARGET_PROJECTS) {
    const name = names[ni] ?? `Internal Project ${specs.length + 1}`;
    ni++;
    const description = descs[di % descs.length] ?? 'デモ用プロジェクトです。';
    di++;
    const r = rng();
    const status: ProjectSpec['status'] =
      r < 0.55
        ? 'active'
        : r < 0.75
          ? 'on_hold'
          : r < 0.9
            ? 'completed'
            : 'archived';
    specs.push({
      name,
      description,
      status,
      ownerEmail: null,
      memberEmails: [],
    });
  }
  return specs;
}

export function seedAll(
  db: SqliteDatabase,
  uploadsDir: string
): { userCount: number; projectCount: number } {
  const rng = createRng(SEED);
  const { emailToId, activeMemberIds } = seedUsers(db, rng);

  const specs = buildProjectSpecs(rng);
  for (const spec of specs) {
    const ownerId = spec.ownerEmail
      ? (emailToId.get(spec.ownerEmail) ?? activeMemberIds[0]!)
      : pick(rng, activeMemberIds);
    const projectId = insert(
      db,
      `INSERT INTO projects (name, description, status, owner_id, created_at, updated_at)
       VALUES (@name, @description, @status, @ownerId, @createdAt, @updatedAt)`,
      {
        name: spec.name,
        description: spec.description,
        status: spec.status,
        ownerId,
        createdAt: now(),
        updatedAt: now(),
      }
    );
    addMember(db, projectId, ownerId, 'admin');
    const memberIds = [ownerId];
    const extras =
      spec.memberEmails.length > 0
        ? spec.memberEmails.map((m) => ({
            id: emailToId.get(m.email)!,
            role: m.role,
          }))
        : pickN(
            rng,
            activeMemberIds.filter((id) => id !== ownerId),
            randInt(rng, 2, 4)
          ).map((id) => ({ id, role: 'member' as const }));
    for (const m of extras) {
      if (!memberIds.includes(m.id)) {
        addMember(db, projectId, m.id, m.role);
        memberIds.push(m.id);
      }
    }

    const milestoneIds = seedMilestones(db, rng, projectId);
    const { threadIds, commentIds } = seedBoard(db, rng, projectId, memberIds);
    seedChat(db, rng, projectId, memberIds);
    const todoIds = seedTodos(db, rng, projectId, memberIds, milestoneIds);
    const noteIds = seedNotes(db, rng, projectId, memberIds);
    const fileIds = seedFiles(db, rng, projectId, ownerId, uploadsDir);
    const meetingIds = seedMeetings(db, rng, projectId, ownerId, memberIds);
    seedCalendar(
      db,
      rng,
      projectId,
      ownerId,
      todoIds,
      milestoneIds,
      meetingIds
    );
    seedNotifications(db, rng, projectId, memberIds);
    seedActivityLogs(db, rng, projectId, memberIds, {
      threadIds,
      commentIds,
      todoIds,
      fileIds,
      meetingIds,
      noteIds,
      milestoneIds,
    });
  }

  return { userCount: emailToId.size, projectCount: specs.length };
}
