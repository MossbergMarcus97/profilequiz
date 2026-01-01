import { NextRequest, NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter.
 * For production at scale, consider using Redis or Upstash.
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// Default configs for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  // Admin endpoints - more generous but still protected
  admin: { windowMs: 60 * 1000, maxRequests: 60 },
  
  // Public quiz endpoints - moderate limits
  quiz: { windowMs: 60 * 1000, maxRequests: 100 },
  
  // Start attempt - strict to prevent abuse
  attemptStart: { windowMs: 60 * 1000, maxRequests: 10 },
  
  // Stripe/payment endpoints - very strict
  payment: { windowMs: 60 * 1000, maxRequests: 10 },
  
  // Expensive operations (LLM calls)
  expensive: { windowMs: 60 * 1000, maxRequests: 5 },
} as const;

/**
 * Get a rate limit identifier from the request.
 * Uses IP address + endpoint combo for granular limiting.
 */
export function getRateLimitKey(req: NextRequest, endpoint: string): string {
  // Try to get real IP from headers (for proxied requests)
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
  
  return `${endpoint}:${ip}`;
}

/**
 * Check rate limit for a given key.
 * Returns null if allowed, NextResponse error if rate limited.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.quiz
): NextResponse | null {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    // Create new window
    rateLimitMap.set(key, { count: 1, resetTime: now + config.windowMs });
    return null;
  }
  
  if (record.count >= config.maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    const response = NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
    response.headers.set("Retry-After", String(retryAfter));
    return response;
  }
  
  // Increment count
  record.count++;
  return null;
}

/**
 * Middleware-style rate limiter that extracts IP automatically.
 */
export function rateLimit(
  req: NextRequest,
  endpoint: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.quiz
): NextResponse | null {
  const key = getRateLimitKey(req, endpoint);
  return checkRateLimit(key, config);
}

/**
 * Clean up old rate limit entries periodically.
 */
function cleanupRateLimitMap(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Clean up every 5 minutes (only in non-edge runtime)
if (typeof setInterval !== "undefined" && typeof globalThis !== "undefined") {
  // @ts-ignore - Edge runtime check
  if (!globalThis.EdgeRuntime) {
    setInterval(cleanupRateLimitMap, 5 * 60 * 1000);
  }
}

