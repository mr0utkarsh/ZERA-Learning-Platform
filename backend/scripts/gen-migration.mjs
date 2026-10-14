/**
 * Generates the additive migration SQL for the current schema.prisma WITHOUT
 * touching the production database.
 *
 * It boots a throwaway PGlite instance (the real PostgreSQL engine compiled to
 * WASM), replays the existing prisma/migrations on it to reconstruct the
 * current database state, then asks `prisma migrate diff` to compute the delta
 * between that state and schema.prisma. The resulting SQL is written to the
 * given migration folder.
 *
 * Usage: node scripts/gen-migration.mjs <migration_folder_name>
 */
import { mkdtempSync, rmSync, readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const cwd = process.cwd();
const MIGRATIONS_DIR = resolve(cwd, 'prisma', 'migrations');
const folder = process.argv[2];
if (!folder) {
  console.error('Usage: node scripts/gen-migration.mjs <migration_folder_name>');
  process.exit(1);
}

const applyMigrations = async (db) => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT PRIMARY KEY, "checksum" TEXT NOT NULL, "finished_at" TIMESTAMPTZ,
      "migration_name" TEXT NOT NULL, "logs" TEXT, "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );`);
  const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const name of dirs) {
    const file = join(MIGRATIONS_DIR, name, 'migration.sql');
    if (!existsSync(file)) continue;
    await db.exec(readFileSync(file, 'utf-8'));
    await db.query(
      `INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","applied_steps_count")
       VALUES ($1,$2,now(),$3,1)`, [`mig-${name}`, 'harness', name]);
  }
};

const waitForPort = async (port, timeoutMs = 30_000) => {
  const net = await import('node:net');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((res) => {
      const s = net.connect({ host: '127.0.0.1', port }, () => { s.end(); res(true); });
      s.on('error', () => res(false));
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('PGlite socket did not open');
};

const dataDir = mkdtempSync(join(tmpdir(), 'zera-migdiff-'));
const port = 56_000 + (process.pid % 1000);
const db = await PGlite.create({ dataDir });
await applyMigrations(db);
const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', closeOnDetach: false, connectionQueueTimeout: 120_000 });
await server.start();
await waitForPort(port);

const fromUrl = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?pgbouncer=true&sslmode=disable&connection_limit=1`;
// Invoke Prisma's CLI through node directly (avoids npx.cmd shell quirks on
// Windows) and with shell:false so the '&' in the URL is not treated as a
// command separator. The spawn is async on purpose: a synchronous spawn would
// block this process's event loop, and the PGlite socket server runs on that
// same loop, so Prisma could never connect.
const prismaCli = resolve(cwd, 'node_modules', 'prisma', 'build', 'index.js');
const runDiff = () => new Promise((resolveRun) => {
  const child = spawn(process.execPath, [
    prismaCli, 'migrate', 'diff',
    '--from-url', fromUrl,
    '--to-schema-datamodel', 'prisma/schema.prisma',
    '--script'
  ], { cwd, shell: false });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => { stdout += d; });
  child.stderr.on('data', (d) => { stderr += d; });
  child.on('error', (err) => resolveRun({ status: 1, stdout, stderr: String(err) }));
  child.on('close', (status) => resolveRun({ status: status ?? 1, stdout, stderr }));
});
const result = await runDiff();

try { await server.stop(); } catch {}
try { await db.close(); } catch {}
try { rmSync(dataDir, { recursive: true, force: true }); } catch {}

if (result.status !== 0) {
  console.error(result.stdout || '');
  console.error(result.stderr || '');
  process.exit(result.status ?? 1);
}

const sql = (result.stdout || '').trim();
if (!sql) {
  console.error('No diff produced — schema already matches migrations.');
  process.exit(1);
}

const target = join(MIGRATIONS_DIR, folder);
mkdirSync(target, { recursive: true });
writeFileSync(join(target, 'migration.sql'), sql + '\n');
console.log(`Wrote ${sql.split('\n').length} lines to prisma/migrations/${folder}/migration.sql`);
