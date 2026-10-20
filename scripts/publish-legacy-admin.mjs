/**
 * Publishes the legacy static administrator console next to the React bundle.
 *
 * The deployed site is the Vite build in frontend/dist. The administrator
 * surface is the original static console (admin-login.html, admin.html,
 * admin-students.html) which talks to the same backend through js/api.js.
 *
 * This script copies exactly the files that console needs into the build
 * output. It deliberately does NOT copy the legacy index.html: the SPA owns
 * the site root, and overwriting it would replace the React application with
 * the pre-migration landing page.
 *
 * Runs after the Vite build (see vercel.json).
 */
import { copyFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const distDir = join(repoRoot, 'frontend', 'dist');

/**
 * Every entry is copied with the same path relative to the repo root and to
 * the build output, so /css/style.css in the source tree is /css/style.css in
 * the published site.
 */
const FILES = [
  'admin-login.html',
  'admin.html',
  'admin-students.html',
  'admin-invites.html',
  'css/style.css',
  'css/components.css',
  'css/responsive.css',
  'js/api.js',
  'js/storage.js',
  'js/auth.js',
  'js/app.js',
  'js/admin.js',
  'assets/icons/favicon.svg'
];

const exists = async (path) => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

async function main() {
  if (!(await exists(distDir))) {
    throw new Error(`Build output not found at ${distDir}. Run the frontend build first.`);
  }

  const missing = [];
  for (const file of FILES) {
    if (!(await exists(join(repoRoot, file)))) missing.push(file);
  }

  if (missing.length) {
    throw new Error(`Missing legacy admin source file(s): ${missing.join(', ')}`);
  }

  for (const file of FILES) {
    const from = join(repoRoot, file);
    const to = join(distDir, file);
    await mkdir(dirname(to), { recursive: true });
    await copyFile(from, to);
    console.log(`published ${relative(distDir, to)}`);
  }

  console.log(`Legacy admin console published: ${FILES.length} files -> ${distDir}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
