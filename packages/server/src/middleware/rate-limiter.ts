import type { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (request: FastifyRequest) => string;
}

interface ClientBucket {
  count: number;
  resetAt: number;
}

// In-memory sliding rate limit store
const rateLimitBuckets = new Map<string, ClientBucket>();

/**
 * Creates a Fastify preHandler hook for rate limiting.
 * Returns consistent HTTP 429 JSON response when limits are breached.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Rate limit exceeded. Please wait before submitting additional requests.',
    keyGenerator
  } = options;

  return async function rateLimitHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const now = Date.now();
    const key = keyGenerator ? keyGenerator(request) : getClientIp(request);

    let bucket = rateLimitBuckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = {
        count: 1,
        resetAt: now + windowMs
      };
      rateLimitBuckets.set(key, bucket);
    } else {
      bucket.count += 1;
    }

    const remaining = Math.max(0, maxRequests - bucket.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    reply.header('X-RateLimit-Limit', maxRequests);
    reply.header('X-RateLimit-Remaining', remaining);
    reply.header('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));

    if (bucket.count > maxRequests) {
      reply.header('Retry-After', retryAfterSeconds);
      return reply.status(429).send({
        success: false,
        error: 'TooManyRequests',
        message,
        retryAfterSeconds
      });
    }
  };
}

/**
 * Resets all active rate-limit buckets (used between tests)
 */
export function resetRateLimits(): void {
  rateLimitBuckets.clear();
}

/**
 * Helper to safely extract client IP considering proxies and headers
 */
export function getClientIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return request.ip || '127.0.0.1';
}

/**
 * Composite key generator for report submission:
 * Combines Client IP + Reporter Email (if provided) + User Agent hash.
 * Prevents attackers from rotating IP addresses while targeting the same email,
 * and prevents multiple legitimate users behind a shared NAT from unfairly exhausting limits.
 */
export function submissionCompositeKey(request: FastifyRequest): string {
  const ip = getClientIp(request);
  const body = request.body as any;
  const email = (body && typeof body.reporterEmail === 'string')
    ? body.reporterEmail.trim().toLowerCase()
    : '';
  const userAgent = request.headers['user-agent'] || 'unknown-client';
  const uaHash = crypto.createHash('sha256').update(userAgent).digest('hex').substring(0, 8);

  return `sub:${ip}:${email || 'anon'}:${uaHash}`;
}

// Preset Rate Limiters:
// 1. Report Submission: limits Gemini triggering submissions to prevent quota exhaustion and abuse
export const submissionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Report submission rate limit exceeded. Please wait before submitting another report.',
  keyGenerator: submissionCompositeKey
});

// 2. Report Reading: prevents scraper scraping and DoS
export const readRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: 'Too many queries. Please wait before requesting reports again.'
});
