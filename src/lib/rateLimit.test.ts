// The limiter is wired up at module-load time from env vars, so each test
// imports the module in an isolated registry with the env it wants. Upstash is
// mocked; the `limit` fn lives inside the factory to dodge SWC import hoisting
// (a top-level const would be in the TDZ when the factory runs).
jest.mock("@upstash/ratelimit", () => {
  const limit = jest.fn();
  const Ratelimit = jest.fn(() => ({ limit }));
  (Ratelimit as unknown as { slidingWindow: jest.Mock }).slidingWindow =
    jest.fn(() => "sliding-window");
  return { Ratelimit };
});
jest.mock("@upstash/redis", () => ({ Redis: jest.fn() }));

const OLD_ENV = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...OLD_ENV };
});

afterAll(() => {
  process.env = OLD_ENV;
});

describe("checkRateLimit", () => {
  it("allows every request when Upstash is not configured", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    await jest.isolateModulesAsync(async () => {
      const { Ratelimit } = await import("@upstash/ratelimit");
      const { checkRateLimit } = await import("./rateLimit");

      expect(await checkRateLimit("1.2.3.4")).toBe(true);
      // No limiter constructed -> no Redis round-trips.
      expect(Ratelimit as unknown as jest.Mock).not.toHaveBeenCalled();
    });
  });

  it("allows the request when Upstash reports success", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://db.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    await jest.isolateModulesAsync(async () => {
      const { Ratelimit } = await import("@upstash/ratelimit");
      const { checkRateLimit } = await import("./rateLimit");

      const instance = (Ratelimit as unknown as jest.Mock).mock.results[0].value;
      instance.limit.mockResolvedValue({ success: true });

      expect(await checkRateLimit("1.2.3.4")).toBe(true);
      expect(instance.limit).toHaveBeenCalledWith("1.2.3.4");
    });
  });

  it("blocks the request when Upstash reports the limit exceeded", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://db.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    await jest.isolateModulesAsync(async () => {
      const { Ratelimit } = await import("@upstash/ratelimit");
      const { checkRateLimit } = await import("./rateLimit");

      const instance = (Ratelimit as unknown as jest.Mock).mock.results[0].value;
      instance.limit.mockResolvedValue({ success: false });

      expect(await checkRateLimit("1.2.3.4")).toBe(false);
    });
  });
});
