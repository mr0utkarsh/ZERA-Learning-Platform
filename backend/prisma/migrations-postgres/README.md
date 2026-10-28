# PostgreSQL Migration Strategy — ZERA Auth Upgrade

## Provider discrepancy

This repository's `schema.prisma` declares `provider = "mysql"`, and all existing
migrations use MySQL syntax (backtick identifiers, `DATETIME(3)`, `ENUM`,
`DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`, `VARCHAR(191)`).
The `.env.example` uses the `mysql://` connection string format.

The production database is asserted to be PostgreSQL, but this cannot be
verified from the repository (no Railway/Vercel config files, no production
access). **Do not change `provider` to `"postgresql"` without confirming the
production database provider.**

## Files in this directory

These PostgreSQL-compatible migration SQL files correspond to the two new
auth-upgrade migrations on `feature/auth-upgrade`:

| MySQL migration | PostgreSQL migration |
|---|---|
| `backend/prisma/migrations/20260823130000_add_oauth_and_token_models/migration.sql` | `migrations-postgres/20260823130000_add_oauth_and_token_models/migration.sql` |
| `backend/prisma/migrations/20260823140000_widen_token_columns/migration.sql` | `migrations-postgres/20260823140000_widen_token_columns/migration.sql` |

## Production deployment path (PostgreSQL)

1. Confirm the production database provider is PostgreSQL (via Railway dashboard).
2. Change `backend/prisma/schema.prisma` line 6 from `provider = "mysql"` to
   `provider = "postgresql"`.
3. Update `backend/.env.example` / production `DATABASE_URL` to use the
   `postgresql://` connection string format.
4. Apply the PostgreSQL migration SQL files in this directory to the production
   PostgreSQL database, in timestamp order:
   - `20260823130000_add_oauth_and_token_models/migration.sql`
   - `20260823140000_widen_token_columns/migration.sql`
5. Run `npx prisma generate` to regenerate the Prisma Client for PostgreSQL.
6. Verify the backend starts and auth endpoints respond.

## Key syntax differences applied (MySQL → PostgreSQL)

- Identifiers: `"User"` (double-quoted) instead of `` `User` `` (backticks)
- Timestamps: `TIMESTAMP(3)` instead of `DATETIME(3)`
- Charset/collation: omitted (`DEFAULT CHARACTER SET utf8mb4 COLLATE ...` removed;
  PostgreSQL is UTF-8 by default)
- Token length: `VARCHAR(500)` used directly (PostgreSQL has no 191-char index
  length limit like MySQL 5.7)
- Nullable column: `ALTER COLUMN ... DROP NOT NULL` instead of `MODIFY ... NULL`

## Limitations

- No local PostgreSQL is available in this environment, so these SQL files have
  **not been execution-tested against PostgreSQL**. They have been reviewed for
  syntax correctness against PostgreSQL conventions.
- The Prisma schema `provider` remains `"mysql"`; local `prisma validate` and
  `prisma generate` continue to work against MySQL.
- These migration files are NOT in `backend/prisma/migrations/`, so `prisma
  migrate deploy` will not attempt to apply them locally against MySQL. They are
  provided separately for production PostgreSQL use.

## Safety

- No historical migrations were rewritten.
- No existing user data is affected (only additive columns and new tables).
- No production database was connected to or modified.
- No environment variables or secrets were exposed.
