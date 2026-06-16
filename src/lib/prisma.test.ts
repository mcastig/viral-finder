// Each test re-imports the module in isolation so we can exercise the
// dev/prod and cached/fresh branches of the singleton.

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({ __client: true })),
}));

type GlobalWithPrisma = { prisma?: unknown };

const g = globalThis as unknown as GlobalWithPrisma;
const originalEnv = process.env.NODE_ENV;

function setNodeEnv(value: string) {
  (process.env as { NODE_ENV?: string }).NODE_ENV = value;
}

afterEach(() => {
  setNodeEnv(originalEnv as string);
  delete g.prisma;
  jest.resetModules();
});

describe("prisma singleton", () => {
  it("creates a verbose client and memoizes it in development", async () => {
    setNodeEnv("development");
    delete g.prisma;
    jest.resetModules();

    const { PrismaClient } = await import("@prisma/client");
    const { prisma } = await import("./prisma");

    expect(prisma).toBeDefined();
    expect(g.prisma).toBe(prisma);
    expect(PrismaClient).toHaveBeenCalledWith(
      expect.objectContaining({ log: ["error", "warn"] }),
    );
  });

  it("uses minimal logging outside development", async () => {
    setNodeEnv("test");
    delete g.prisma;
    jest.resetModules();

    const { PrismaClient } = await import("@prisma/client");
    await import("./prisma");

    expect(PrismaClient).toHaveBeenCalledWith(
      expect.objectContaining({ log: ["error"] }),
    );
  });

  it("reuses an existing global client instead of creating a new one", async () => {
    const existing = { cached: true };
    g.prisma = existing;
    jest.resetModules();

    const { PrismaClient } = await import("@prisma/client");
    const { prisma } = await import("./prisma");

    expect(prisma).toBe(existing);
    expect(PrismaClient).not.toHaveBeenCalled();
  });

  it("does not attach the client to globalThis in production", async () => {
    setNodeEnv("production");
    delete g.prisma;
    jest.resetModules();

    const { prisma } = await import("./prisma");

    expect(prisma).toBeDefined();
    expect(g.prisma).toBeUndefined();
  });
});
