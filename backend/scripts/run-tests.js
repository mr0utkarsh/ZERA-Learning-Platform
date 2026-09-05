/**
 * run-tests.js — one-shot test runner.
 * 1. Syncs the Prisma schema to the SQLite variant.
 * 2. Points DATABASE_URL at an isolated test database (absolute path).
 * 3. Pushes the schema (fresh tables).
 * 4. Runs vitest.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const TEST_DB = path.join(root, 'prisma', 'test.db');
const DATABASE_URL = `file:${TEST_DB}`;

process.env.DATABASE_URL = DATABASE_URL;

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// 1. Sync schema to sqlite
run(process.execPath, [path.join(__dirname, 'sync-prisma-db.js'), 'test'], { DATABASE_URL });

// 2. Fresh tables for the isolated test database
run('npx', ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'], { DATABASE_URL });
run('npx', ['prisma', 'generate'], { DATABASE_URL });

// 3. Tests
run('npx', ['vitest', 'run'], { DATABASE_URL });
