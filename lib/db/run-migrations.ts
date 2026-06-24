import path from 'node:path';
import fs from 'node:fs';
import { getDb, resetDbInstance } from './sqlite';
import { Migrator } from './migrator';

const migrationsDir = path.join(process.cwd(), 'lib', 'db', 'migrations');
const dbPath = process.env.SQLITE_PATH ?? './data/app.db';

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = getDb();
const migrator = new Migrator(db, migrationsDir);

migrator.migrate();

const applied = migrator.getAppliedMigrations();
console.log(`Migrations applied: ${applied.length}`);
for (const m of applied) {
  console.log(`  - ${m.filename} (applied at ${m.applied_at})`);
}

db.close();
resetDbInstance();
