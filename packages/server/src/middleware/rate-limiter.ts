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

/**
 * CIVICRESOLVE RATE LIMITING MIDDLEWARE
 *
 * SCOPE & PROCESS-LOCAL ENFORCEMENT LIMITATION:
 * This rate limiter uses a process-local in-memory Map store. In multi-instance
 * auto-scaling environments such as Google Cloud Run, rate-limit buckets are
 * partitioned per container instance and are NOT globally synchronized across instances.
 * This provides effective per-instance resource protection and DoS shielding against
 * abusive bursts. Strict distributed rate limiting across all scaled Cloud Run instances
 * requires an external distributed shared store such as Google Cloud Memorystore (Redis).
 * We do not claim distributed enforcement.
 */

// In-memory sliding rate limit store (process-local)
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
 * Safely extracts client IP address behind reverse proxies (e.g. Google Cloud Run).
 *
 * Security considerations:
 * 1. Never blindly trust the first element of X-Forwarded-For because a client can forge
 *    arbitrary spoofed IP addresses in that position (e.g. "X-Forwarded-For: 1.1.1.1").
 * 2. Behind Google Cloud Run / Google Front End (GFE), the actual connecting IP is either
 *    resolved via Fastify's vetted `trustProxy` implementation (`request.ip`), or appended
 *    by the proxy as the rightmost/last entry.
 */
export function getClientIp(request: FastifyRequest): string {
  // If Fastify trustProxy is enabled, request.ip safely holds the verified remote address
  if (request.ip && request.ip !== '127.0.0.1' && request.ip !== '::1') {
    return request.ip;
  }

  // Safe parsing of X-Forwarded-For: take the rightmost (trusted reverse-proxy appended) address
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const ips = forwarded.split(',').map(s => s.trim()).filter(Boolean);
    if (ips.length > 0) {
      // The rightmost entry was appended by the closest reverse proxy (e.g. Google Cloud Run / GFE)
      return ips[ips.length - 1];
    }
  }

  return request.ip || request.socket.remoteAddress || '127.0.0.1';
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
