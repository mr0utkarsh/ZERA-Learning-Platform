import app from './app.js';
import { env, ensureRequiredEnv } from './config/env.js';
import { seedCourseCatalog } from './services/courseService.js';

ensureRequiredEnv();

async function bootstrap() {
  try {
    await seedCourseCatalog();
    console.log('Course catalog ensured.');
  } catch (error) {
    console.error('Catalog bootstrap failed:', error.message);
  }

  app.listen(env.PORT, () => {
    console.log(`ZERA backend listening on port ${env.PORT}`);
  });
}

bootstrap();
