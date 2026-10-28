-- PostgreSQL-compatible migration: Widen token columns to accommodate JWT-sized tokens
-- Intended for production PostgreSQL database. Do NOT run against MySQL.
-- Redundant if 20260823130000_add_oauth_and_token_models (PostgreSQL) is already applied,
-- since that migration creates token columns as VARCHAR(500). Kept for parity with
-- the MySQL migration history.

ALTER TABLE "PasswordResetToken" ALTER COLUMN "token" TYPE VARCHAR(500);

ALTER TABLE "VerificationToken" ALTER COLUMN "token" TYPE VARCHAR(500);
