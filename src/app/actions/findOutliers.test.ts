import type { YoutubeVideo } from "@prisma/client";

// Mocks are defined inside the factories (ES imports are hoisted, so a
// top-level const would be in the TDZ when the factory runs); we then grab
// the jest.fn instances back from the mocked modules.
jest.mock("@/lib/prisma", () => ({
  prisma: {
    searchQuery: { findUnique: jest.fn(), upsert: jest.fn() },
    youtubeVideo: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/youtube", () => ({ fetchOutliersFromYouTube: jest.fn() }));

import { findOutliers } from "./findOutliers";
import { prisma } from "@/lib/prisma";
import { fetchOutliersFromYouTube } from "@/lib/youtube";

const mockPrisma = prisma as unknown as {
  searchQuery: { findUnique: jest.Mock; upsert: jest.Mock };
  youtubeVideo: {
    deleteMany: jest.Mock;
    createMany: jest.Mock;
    findMany: jest.Mock;
  };
  $transaction: jest.Mock;
};
const mockFetchOutliers = fetchOutliersFromYouTube as jest.Mock;

function row(overrides: Partial<YoutubeVideo> = {}): YoutubeVideo {
  return {
    id: "r1",
    youtubeId: "v1",
    title: "Title",
    thumbnailUrl: "thumb",
    currentViews: 1_000n,
    channelAvgViews: 100n,
    outlierFactor: 10,
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    channelId: "c1",
    channelName: "Chan",
    channelUrl: "https://youtube.com/channel/c1",
    channelSubscribers: 500n,
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    searchQueryId: "q1",
    ...overrides,
  };
}

function computed(overrides: Record<string, unknown> = {}) {
  return {
    youtubeId: "v1",
    title: "Title",
    thumbnailUrl: "thumb",
    currentViews: 1_000,
    channelAvgViews: 100,
    outlierFactor: 10,
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    channelId: "c1",
    channelName: "Chan",
    channelUrl: "https://youtube.com/channel/c1",
    channelSubscribers: 500,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // The transaction callback runs against the same mocked client.
  mockPrisma.$transaction.mockImplementation(
    async (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma),
  );
});

describe("findOutliers", () => {
  it("rejects an empty keyword without touching the database", async () => {
    const res = await findOutliers("   ");
    expect(res).toEqual({ ok: false, error: "Please enter a search term." });
    expect(mockPrisma.searchQuery.findUnique).not.toHaveBeenCalled();
  });

  it("serves fresh cached results (and maps null subscribers)", async () => {
    mockPrisma.searchQuery.findUnique.mockResolvedValue({
      id: "q1",
      keyword: "cats",
      updatedAt: new Date(), // fresh
      videos: [row(), row({ id: "r2", youtubeId: "v2", channelSubscribers: null })],
    });

    const res = await findOutliers("  Cats  ");

    expect(mockFetchOutliers).not.toHaveBeenCalled();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.cached).toBe(true);
      expect(res.data.keyword).toBe("cats"); // trimmed + lowercased
      expect(res.data.scanned).toBe(2);
      expect(res.data.videos[0].currentViews).toBe(1_000);
      expect(res.data.videos[0].channelSubscribers).toBe(500);
      expect(res.data.videos[0].publishedAt).toBe(
        "2026-01-01T00:00:00.000Z",
      );
      expect(res.data.videos[1].channelSubscribers).toBeNull();
    }
  });

  it("fetches, persists, and returns outliers on a cache miss", async () => {
    mockPrisma.searchQuery.findUnique.mockResolvedValue(null);
    mockFetchOutliers.mockResolvedValue({
      scanned: 5,
      outliers: [computed(), computed({ youtubeId: "v2", channelSubscribers: null })],
    });
    mockPrisma.searchQuery.upsert.mockResolvedValue({ id: "q1" });
    mockPrisma.youtubeVideo.findMany.mockResolvedValue([
      row(),
      row({ id: "r2", youtubeId: "v2", channelSubscribers: null }),
    ]);

    const res = await findOutliers("Dogs");

    expect(mockFetchOutliers).toHaveBeenCalledWith("dogs");
    expect(mockPrisma.youtubeVideo.deleteMany).toHaveBeenCalled();

    const createArg = mockPrisma.youtubeVideo.createMany.mock.calls[0][0];
    expect(createArg.skipDuplicates).toBe(true);
    expect(createArg.data[0].currentViews).toBe(1_000n); // number -> BigInt
    expect(createArg.data[0].channelSubscribers).toBe(500n);
    expect(createArg.data[1].channelSubscribers).toBeNull();

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.cached).toBe(false);
      expect(res.data.scanned).toBe(5);
      expect(res.data.videos).toHaveLength(2);
    }
  });

  it("re-fetches when the cache entry is stale", async () => {
    mockPrisma.searchQuery.findUnique.mockResolvedValue({
      id: "q1",
      updatedAt: new Date(0), // ancient -> stale
      videos: [],
    });
    mockFetchOutliers.mockResolvedValue({ scanned: 0, outliers: [] });
    mockPrisma.searchQuery.upsert.mockResolvedValue({ id: "q1" });
    mockPrisma.youtubeVideo.findMany.mockResolvedValue([]);

    const res = await findOutliers("stale");

    expect(mockFetchOutliers).toHaveBeenCalled();
    // No outliers -> createMany is skipped entirely.
    expect(mockPrisma.youtubeVideo.createMany).not.toHaveBeenCalled();
    expect(res.ok && res.data.videos).toEqual([]);
  });

  it("returns the error message when an Error is thrown", async () => {
    mockPrisma.searchQuery.findUnique.mockRejectedValue(new Error("db down"));
    const res = await findOutliers("boom");
    expect(res).toEqual({ ok: false, error: "db down" });
  });

  it("returns a generic message when a non-Error is thrown", async () => {
    mockPrisma.searchQuery.findUnique.mockRejectedValue("weird");
    const res = await findOutliers("boom");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Something went wrong/);
  });
});
