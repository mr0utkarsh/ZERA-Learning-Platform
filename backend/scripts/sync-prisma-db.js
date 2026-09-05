/**
 * sync-prisma-db.js
 * -----------------
 * ZERA's canonical database is PostgreSQL (see prisma/schema.postgresql.prisma).
 * For zero-config local development and CI tests we also support SQLite
 * (prisma/schema.sqlite.prisma — identical model, enums represented as String).
 *
 * This script reads DATABASE_URL from backend/.env and copies the matching
 * template to prisma/schema.prisma so every `prisma` command targets the
 * right database.
 *
 * Usage:  node scripts/sync-prisma-db.js [test]
 *   - no arg  -> picks provider from DATABASE_URL in backend/.env
 *   - "test"  -> forces sqlite, writes backend/.env.test with prisma/test.db
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

const prismaDir = path.join(__dirname, '..', 'prisma');

let provider;
if (process.argv[2] === 'test') {
  provider = 'sqlite';
  fs.writeFileSync(path.join(__dirname, '..', '.env.test'), 'DATABASE_URL="file:./test.db"\n');
} else {
  const url = process.env.DATABASE_URL || '';
  provider = url.trim().startsWith('file:') ? 'sqlite' : 'postgresql';
}

const template = path.join(prismaDir, `schema.${provider}.prisma`);
if (!fs.existsSync(template)) {
  console.error(`[sync-prisma-db] Missing template: ${template}`);
  process.exit(1);
}
fs.copyFileSync(template, path.join(prismaDir, 'schema.prisma'));
console.log(`[sync-prisma-db] provider -> ${provider} (schema.prisma synced)`);
