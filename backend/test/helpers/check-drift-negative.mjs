/**
 * Negative control for the drift checker: deliberately break the database and
 * confirm every class of drift is actually reported. Without this, a drift
 * checker could pass vacuously.
 */
import { startPostgres } from './postgres.js';
import { checkDrift, createPrisma } from './drift-check.mjs';

const pg = await startPostgres();
const prisma = createPrisma(pg.url);

const run = async (label) => {
  const problems = await checkDrift(prisma);
  console.log(`[${label}] ${problems.length} problem(s)`);
  for (const p of problems) console.log('    - ' + p);
  return problems;
};

try {
  const before = await run('baseline (expect 0)');
  if (before.length !== 0) throw new Error('baseline was not clean');

  await prisma.$executeRawUnsafe('DROP INDEX "Note_userId_updatedAt_idx"');
  const afterIndex = await run('after dropping Note_userId_updatedAt_idx');
  const sawMissingIndex = afterIndex.some((p) => p.startsWith('MISSING INDEX: Note('));
  console.log('  detected dropped index: ' + sawMissingIndex);
  if (!sawMissingIndex) throw new Error('checker missed a dropped index');

  await prisma.$executeRawUnsafe('DROP INDEX "User_email_key"');
  const afterUnique = await run('after dropping User_email_key');
  const sawMissingUnique = afterUnique.some((p) => p.startsWith('MISSING UNIQUE CONSTRAINT: User('));
  console.log('  detected dropped unique: ' + sawMissingUnique);
  if (!sawMissingUnique) throw new Error('checker missed a dropped unique');

  await prisma.$executeRawUnsafe('ALTER TABLE "Bookmark" ALTER COLUMN "userId" DROP NOT NULL');
  const afterNull = await run('after relaxing Bookmark.userId to nullable');
  const sawNullability = afterNull.some((p) => p.startsWith('NULLABILITY: Bookmark.userId'));
  console.log('  detected nullability drift: ' + sawNullability);
  if (!sawNullability) throw new Error('checker missed nullability drift');

  // "userId" cannot be retyped while foreign keys reference it, so use a plain
  // scalar column to prove type drift is still detected.
  await prisma.$executeRawUnsafe('ALTER TABLE "Bookmark" ALTER COLUMN "createdAt" TYPE text');
  const afterType = await run('after changing Bookmark.createdAt to text');
  const sawType = afterType.some((p) => p.startsWith('COLUMN TYPE: Bookmark.createdAt'));
  console.log('  detected type drift: ' + sawType);
  if (!sawType) throw new Error('checker missed a type change');

  await prisma.$executeRawUnsafe('ALTER TABLE "Bookmark" ADD COLUMN "surprise" text');
  const afterExtra = await run('after adding an extra Bookmark column');
  const sawExtra = afterExtra.some((p) => p.includes('UNEXPECTED COLUMN: Bookmark.surprise'));
  console.log('  detected unexpected column: ' + sawExtra);
  if (!sawExtra) throw new Error('checker missed an unexpected column');

  await prisma.$executeRawUnsafe('DROP TABLE "PreviousQuestion" CASCADE');
  const afterTable = await run('after dropping the PreviousQuestion table');
  const sawTable = afterTable.some((p) => p.startsWith('MISSING TABLE: PreviousQuestion'));
  console.log('  detected missing table: ' + sawTable);
  if (!sawTable) throw new Error('checker missed a missing table');

  console.log('\nRESULT: DRIFT CHECKER VERIFIED - all drift classes are detected');
} catch (err) {
  console.log('\nRESULT: DRIFT CHECKER IS BROKEN -> ' + err.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await pg.stop();
}
