import { startPostgres } from './postgres.js';
import { checkDrift, createPrisma } from './drift-check.mjs';

const pg = await startPostgres();
const prisma = createPrisma(pg.url);
try {
  const problems = await checkDrift(prisma);
  if (problems.length === 0) {
    console.log('NO DRIFT: ' + pg.applied.length + ' migrations match prisma/schema.prisma exactly');
  } else {
    console.log(`DRIFT: ${problems.length} difference(s) between migrations and prisma/schema.prisma`);
    for (const p of problems) console.log('  - ' + p);
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
  await pg.stop();
}
