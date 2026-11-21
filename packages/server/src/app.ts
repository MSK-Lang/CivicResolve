import Fastify, { type FastifyInstance, type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { env } from './config/env.js';
import { healthRoutes } from './routes/health.js';
import { issueRoutes } from './routes/issues.js';
import { initFirebase } from './services/firebase.js';
import { initGemini } from './services/gemini.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: { colorize: true }
      } : undefined
    }
  });

  // Initialize service clients
  initFirebase();
  initGemini();

  // Register CORS
  app.register(cors, {
    origin: env.NODE_ENV === 'production' ? true : [env.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
  });

  // Centralized Error Handling
  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    app.log.error(error);

    const statusCode = ('statusCode' in error && typeof error.statusCode === 'number')
      ? error.statusCode
      : 500;

    const response = {
      success: false,
      error: error.name || 'InternalServerError',
      message: error.message || 'An unexpected error occurred'
    };

    reply.status(statusCode).send(response);
  });

  // Register API Routes
  app.register(healthRoutes);
  app.register(issueRoutes);

  // Serve Single-Container SPA in Production
  const staticRoot = env.CLIENT_DIST_PATH || path.resolve(process.cwd(), '../client/dist');
  const alternateStaticRoot = path.resolve(process.cwd(), 'packages/client/dist');
  const resolvedDist = fs.existsSync(staticRoot) ? staticRoot : (fs.existsSync(alternateStaticRoot) ? alternateStaticRoot : null);

  if (resolvedDist) {
    app.log.info(`Registering static client assets from: ${resolvedDist}`);
    app.register(fastifyStatic, {
      root: resolvedDist,
      prefix: '/'
    });

    // Fallback to index.html for client-side routing on unhandled non-API routes
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api') || request.url.startsWith('/healthz')) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: `Endpoint ${request.method} ${request.url} not found`
        });
      }
      return reply.sendFile('index.html');
    });
  } else {
    app.log.warn('Client dist directory not found. Running in API-only mode.');
  }

  return app;
}
