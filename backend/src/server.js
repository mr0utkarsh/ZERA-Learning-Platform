import app from './app.js';
import { env, validateEnv } from './config/env.js';
import { prisma } from './config/prisma.js';
import { seedCourseCatalog } from './services/courseService.js';
import { seedAdminFromEnv } from './services/seedAdminService.js';

validateEnv();

/** True when a failure must stop the process rather than be logged and ignored. */
const isProduction = env.NODE_ENV === 'production';

const start = async () => {
  // Failing fast matters: previously a database outage was logged as
  // "Catalog bootstrap failed" and the API still started listening, so every
  // request then failed with an opaque 500 and the deployment looked healthy.
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection verified.');
  } catch (error) {
    console.error('FATAL: cannot reach the database. Refusing to start.');
    console.error(`  ${error.message}`);
    if (isProduction) {
      await prisma.$disconnect().catch(() => {});
      process.exit(1);
    }
  }

  try {
    await seedCourseCatalog();
    console.log('Course catalog ensured.');
  } catch (error) {
    console.error('Catalog bootstrap failed:', error.message);
    if (isProduction) {
      await prisma.$disconnect().catch(() => {});
      process.exit(1);
    }
  }

  // Optional convenience for the very first SUPER_ADMIN. Without it a fresh
  // database has no way to reach the admin surface.
  if (env.SEED_ADMIN_EMAIL && env.SEED_ADMIN_PASSWORD) {
    try {
      // The service takes explicit arguments, so the env values must be passed
      // in; calling it bare threw "SEED_ADMIN_EMAIL is required" on every boot.
      const result = await seedAdminFromEnv({
        email: env.SEED_ADMIN_EMAIL,
        password: env.SEED_ADMIN_PASSWORD,
        name: env.SEED_ADMIN_NAME
      });
      console.log(
        result.created
          ? `Seeded SUPER_ADMIN account ${env.SEED_ADMIN_EMAIL}.`
          : `SUPER_ADMIN ${env.SEED_ADMIN_EMAIL} already exists.`
      );
    } catch (error) {
      console.error('Admin seed failed:', error.message);
      if (isProduction) {
        await prisma.$disconnect().catch(() => {});
        process.exit(1);
      }
    }
  }

  const server = app.listen(env.PORT, () => {
    console.log(`ZERA backend listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal) => {
    console.log(`Received ${signal}, shutting down.`);
    server.close(async () => {
      await prisma.$disconnect().catch(() => {});
      process.exit(0);
    });
    // Do not hang forever on lingering keep-alive sockets.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start();
