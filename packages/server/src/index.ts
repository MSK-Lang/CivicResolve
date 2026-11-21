import { buildApp } from './app.js';
import { env } from './config/env.js';

const app = buildApp();

async function start() {
  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST
    });
    console.log(`CivicResolve server listening on http://${env.HOST}:${env.PORT}`);
    console.log(`Environment: ${env.NODE_ENV}`);
    console.log(`Health check: http://${env.HOST}:${env.PORT}/healthz`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.log(`Received ${signal}, gracefully shutting down...`);
    await app.close();
    process.exit(0);
  });
}

start();
