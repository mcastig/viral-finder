import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Rate limiting for the public, unauthenticated search action.
//
// A cache-miss search spends ~102 YouTube quota units and writes to Postgres,
// so an unthrottled caller could exhaust the daily quota in ~98 requests. We
// throttle per-IP with a sliding window backed by Upstash Redis, which is the
// only store that stays consistent across Vercel's many serverless instances.
//
// When the Upstash credentials are absent (e.g. local dev or tests) limiting
// is a no-op so the app still runs — production must set both env vars.
// ---------------------------------------------------------------------------

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const ratelimit =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(10, "60 s"),
        prefix: "viral-finder/search",
        analytics: false,
      })
    : null;

/** True when this identifier is allowed; false when it has exceeded the limit. */
export async function checkRateLimit(identifier: string): Promise<boolean> {
  if (!ratelimit) return true;
  const { success } = await ratelimit.limit(identifier);
  return success;
}
