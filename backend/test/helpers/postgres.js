/**
 * Real PostgreSQL harness for the ZERA test suite.
 *
 * PGlite is the actual PostgreSQL engine (compiled to WASM) and is exposed on a
 * TCP socket speaking the PostgreSQL wire protocol, so Prisma's real
 * `postgresql` connector talks to genuine PostgreSQL semantics — enums, jsonb,
 * transactions, cascades, indexes and constraints all behave as they do in
 * production. No database behaviour is faked.
 */
import { mkdtempSync, rmSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const MIGRATIONS_DIR = resolve(process.cwd(), 'prisma', 'migrations');

let nextPort = 55_000 + (process.pid % 1000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Applies every SQL migration in prisma/migrations, in order, on a real database. */
const applyMigrations = async (db) => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );
  `);

  if (!existsSync(MIGRATIONS_DIR)) return [];

  const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const applied = [];
  for (const name of dirs) {
    const file = join(MIGRATIONS_DIR, name, 'migration.sql');
    if (!existsSync(file)) continue;
    const sql = readFileSync(file, 'utf-8');
    await db.exec(sql);
    await db.query(
      `INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","applied_steps_count")
       VALUES ($1,$2,now(),$3,1)`,
      [`mig-${name}`, 'harness', name]
    );
    applied.push(name);
  }
  return applied;
};

const waitForPort = async (port, timeoutMs = 30_000) => {
  const net = await import('node:net');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolveWait) => {
      const socket = net.connect({ host: '127.0.0.1', port }, () => {
        socket.end();
        resolveWait(true);
      });
      socket.on('error', () => resolveWait(false));
    });
    if (ok) return true;
    await sleep(100);
  }
  throw new Error(`PostgreSQL harness did not accept connections on port ${port}`);
};

/**
 * Boots an isolated real PostgreSQL instance with the ZERA schema applied.
 * @returns {Promise<{ url: string, stop: () => Promise<void>, applied: string[] }>}
 */
export const startPostgres = async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'zera-pg-'));
  const port = nextPort++;
  const db = await PGlite.create({ dataDir });
  const applied = await applyMigrations(db);

  // `closeOnDetach: false` keeps the server alive when a pool disconnects, and a
  // generous queue timeout is required because PGLiteSocketServer serves
  // connections one at a time while tools such as the Prisma schema engine
  // open several pooled connections.
  const server = new PGLiteSocketServer({
    db,
    port,
    host: '127.0.0.1',
    closeOnDetach: false,
    connectionQueueTimeout: 120_000,
  });
  await server.start();
  await waitForPort(port);

  return {
    // connection_limit=1 keeps Prisma's pool to a single connection, which
    // matches the socket server's one-connection-at-a-time service model and
    // avoids queue stalls in tests.
    url: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?pgbouncer=true&sslmode=disable&connection_limit=1`,
    applied,
    async stop() {
      try { await server.stop(); } catch { /* already closed */ }
      try { await db.close(); } catch { /* already closed */ }
      try { rmSync(dataDir, { recursive: true, force: true }); } catch { /* best effort */ }
    }
  };
};

/** Truncates all application tables so each test starts from a known state. */
export const resetDatabase = async (client) => {
  await client.$executeRawUnsafe(`
    DO $$
    DECLARE t text;
    BEGIN
      FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public'
                AND tablename <> '_prisma_migrations')
      LOOP
        EXECUTE 'TRUNCATE TABLE public.' || quote_ident(t) || ' CASCADE';
      END LOOP;
    END $$;
  `);
};
