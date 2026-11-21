import type { FastifyPluginAsync } from 'fastify';
import { env } from '../config/env.js';
import { isFirebaseReady } from '../services/firebase.js';
import { isGeminiReady } from '../services/gemini.js';
import type { HealthCheckResponse } from '@civicresolve/shared';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  const handler = async (): Promise<HealthCheckResponse> => {
    const firestoreStatus = isFirebaseReady() ? 'connected' : (env.FIREBASE_PROJECT_ID ? 'error' : 'not_configured');
    const geminiStatus = isGeminiReady() ? 'ready' : (env.GEMINI_API_KEY ? 'error' : 'not_configured');

    const isHealthy = true; // Service is up and accepting requests

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      environment: env.NODE_ENV,
      services: {
        database: firestoreStatus,
        gemini: geminiStatus,
        auth: firestoreStatus === 'connected' ? 'ready' : 'not_configured'
      }
    };
  };

  // Standard health endpoints
  fastify.get('/healthz', handler);
  fastify.get('/api/health', handler);
};
