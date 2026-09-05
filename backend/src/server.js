const app = require('./app');
const config = require('./config');
const prisma = require('./config/prisma');

const server = app.listen(config.port, () => {
  console.log(`\n  ZERA API running at ${config.backendUrl} (env: ${config.env})`);
  console.log(`  AI provider: ${config.ai.provider}${config.ai.provider === 'none' ? ' (AI features report "not configured")' : ''}`);
  console.log(`  Email: ${config.emailConfigured() ? `SMTP (${config.smtp.host})` : 'not configured — dev OTP exposure ' + (config.devShowOtp ? 'ON' : 'OFF')}\n`);
});

async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
