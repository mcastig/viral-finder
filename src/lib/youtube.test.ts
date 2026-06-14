import { fetchOutliersFromYouTube } from "./youtube";

const ISO = new Date("2026-01-01T00:00:00.000Z").toISOString();

// --- fetch Response helpers ------------------------------------------------

function ok(body: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body),
  } as Response);
}

function fail(
  status: number,
  body: unknown,
  { nonJson = false }: { nonJson?: boolean } = {},
) {
  return Promise.resolve({
    ok: false,
    status,
    statusText: "Server Error",
    json: nonJson
      ? () => Promise.reject(new Error("not json"))
      : () => Promise.resolve(body),
  } as Response);
}

type Handler = (url: URL) => Promise<Response>;

function route(handlers: {
  search?: Handler;
  videos?: Handler;
  channels?: Handler;
}) {
  global.fetch = jest.fn((input: string | URL) => {
    const url = new URL(input.toString());
    if (url.pathname.endsWith("/search")) return handlers.search!(url);
    if (url.pathname.endsWith("/videos")) return handlers.videos!(url);
    if (url.pathname.endsWith("/channels")) return handlers.channels!(url);
    throw new Error(`unexpected route: ${url.pathname}`);
  }) as unknown as typeof fetch;
}

// --- payload builders ------------------------------------------------------

type Thumbs = Record<string, { url: string }>;

function videoItem(
  id: string,
  {
    views = "1000000",
    channelId = "c1",
    thumbnails = { high: { url: "high" } } as Thumbs,
  }: { views?: string | null; channelId?: string; thumbnails?: Thumbs } = {},
) {
  return {
    id,
    snippet: {
      title: `Title ${id}`,
      publishedAt: ISO,
      channelId,
      channelTitle: `Chan ${channelId}`,
      thumbnails,
    },
    statistics: views === null ? {} : { viewCount: views },
  };
}

function channelItem(
  id: string,
  {
    viewCount = "1000000",
    videoCount = "100",
    subscriberCount = "50000",
    hidden = false,
  }: {
    viewCount?: string | null;
    videoCount?: string | null;
    subscriberCount?: string | null;
    hidden?: boolean;
  } = {},
) {
  const statistics: Record<string, unknown> = {};
  if (viewCount !== null) statistics.viewCount = viewCount;
  if (videoCount !== null) statistics.videoCount = videoCount;
  if (hidden) statistics.hiddenSubscriberCount = true;
  else if (subscriberCount !== null) statistics.subscriberCount = subscriberCount;
  return { id, statistics };
}

const searchOf = (...ids: string[]) =>
  ok({ items: ids.map((id) => ({ id: { videoId: id } })) });

const videosFromIds = (
  url: URL,
  opts: Parameters<typeof videoItem>[1] = {},
) => {
  const ids = (url.searchParams.get("id") ?? "").split(",");
  return ok({ items: ids.map((id) => videoItem(id, opts)) });
};

// ---------------------------------------------------------------------------

describe("fetchOutliersFromYouTube", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.YOUTUBE_API_KEY = "test-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("throws when the API key is missing", async () => {
    delete process.env.YOUTUBE_API_KEY;
    await expect(fetchOutliersFromYouTube("q")).rejects.toThrow(
      /YOUTUBE_API_KEY is not set/,
    );
  });

  it("de-duplicates repeated video IDs and computes the outlier factor", async () => {
    route({
      search: () => searchOf("v1", "v1", "v2"),
      videos: (url) =>
        ok({
          items: (url.searchParams.get("id") ?? "")
            .split(",")
            .map((id) =>
              videoItem(id, { views: id === "v2" ? "500000" : "1000000" }),
            ),
        }),
      channels: () =>
        ok({ items: [channelItem("c1", { viewCount: "1000000", videoCount: "100" })] }),
    });

    const { outliers, scanned } = await fetchOutliersFromYouTube("broad query");

    expect(scanned).toBe(2);
    expect(outliers.map((o) => o.youtubeId).sort()).toEqual(["v1", "v2"]);
    const v1 = outliers.find((o) => o.youtubeId === "v1");
    expect(v1?.channelAvgViews).toBe(10_000); // 1,000,000 / 100
    expect(v1?.outlierFactor).toBe(100); // 1,000,000 / 10,000
    expect(v1?.channelSubscribers).toBe(50_000);
    expect(v1?.channelUrl).toBe("https://www.youtube.com/channel/c1");
  });

  it("returns nothing when the search yields no usable video IDs", async () => {
    route({
      search: () => ok({ items: [{ id: {} }, {}] }),
      videos: () => ok({ items: [] }),
      channels: () => ok({ items: [] }),
    });

    await expect(fetchOutliersFromYouTube("q")).resolves.toEqual({
      outliers: [],
      scanned: 0,
    });
  });

  it("throws with the API error message on a non-OK response", async () => {
    route({
      search: () => fail(403, { error: { message: "quota exceeded" } }),
    });
    await expect(fetchOutliersFromYouTube("q")).rejects.toThrow(
      "YouTube API error (403): quota exceeded",
    );
  });

  it("falls back to statusText when the error body has no message", async () => {
    route({ search: () => fail(404, {}) });
    await expect(fetchOutliersFromYouTube("q")).rejects.toThrow(
      "YouTube API error (404): Server Error",
    );
  });

  it("falls back to statusText when the error body is not JSON", async () => {
    route({ search: () => fail(500, null, { nonJson: true }) });
    await expect(fetchOutliersFromYouTube("q")).rejects.toThrow(
      "YouTube API error (500): Server Error",
    );
  });

  it("skips videos whose channel has no baseline (zero/absent video count)", async () => {
    route({
      search: () => searchOf("v1"),
      videos: (url) => videosFromIds(url),
      channels: () =>
        ok({ items: [channelItem("c1", { viewCount: null, videoCount: null })] }),
    });

    const result = await fetchOutliersFromYouTube("q");
    expect(result.scanned).toBe(1);
    expect(result.outliers).toEqual([]);
  });

  it("skips videos when the channel average rounds to zero", async () => {
    route({
      search: () => searchOf("v1"),
      videos: (url) => videosFromIds(url),
      channels: () =>
        ok({ items: [channelItem("c1", { viewCount: "0", videoCount: "10" })] }),
    });

    await expect(fetchOutliersFromYouTube("q")).resolves.toMatchObject({
      outliers: [],
    });
  });

  it("skips videos below the outlier threshold (incl. missing view counts)", async () => {
    route({
      search: () => searchOf("v1"),
      videos: (url) => videosFromIds(url, { views: null }), // viewCount absent -> 0
      channels: () =>
        ok({ items: [channelItem("c1", { viewCount: "1000000", videoCount: "100" })] }),
    });

    await expect(fetchOutliersFromYouTube("q")).resolves.toMatchObject({
      outliers: [],
    });
  });

  it("reports null subscribers when the channel hides them", async () => {
    route({
      search: () => searchOf("v1"),
      videos: (url) => videosFromIds(url),
      channels: () =>
        ok({
          items: [
            channelItem("c1", { viewCount: "100000", videoCount: "100", hidden: true }),
          ],
        }),
    });

    const { outliers } = await fetchOutliersFromYouTube("q");
    expect(outliers[0].channelSubscribers).toBeNull();
  });

  it("treats an absent subscriber count as zero", async () => {
    route({
      search: () => searchOf("v1"),
      videos: (url) => videosFromIds(url),
      channels: () =>
        ok({
          items: [
            channelItem("c1", {
              viewCount: "100000",
              videoCount: "100",
              subscriberCount: null,
            }),
          ],
        }),
    });

    const { outliers } = await fetchOutliersFromYouTube("q");
    expect(outliers[0].channelSubscribers).toBe(0);
  });

  it("picks the best available thumbnail resolution", async () => {
    const variants: Record<string, Thumbs> = {
      v1: { maxres: { url: "max" } },
      v2: { standard: { url: "std" } },
      v3: { high: { url: "high" } },
      v4: { medium: { url: "med" } },
      v5: { default: { url: "def" } },
      v6: {},
    };

    route({
      search: () => searchOf(...Object.keys(variants)),
      videos: (url) =>
        ok({
          items: (url.searchParams.get("id") ?? "")
            .split(",")
            .map((id) => videoItem(id, { thumbnails: variants[id] })),
        }),
      channels: () =>
        ok({ items: [channelItem("c1", { viewCount: "1000000", videoCount: "100" })] }),
    });

    const { outliers } = await fetchOutliersFromYouTube("q");
    const byId = Object.fromEntries(
      outliers.map((o) => [o.youtubeId, o.thumbnailUrl]),
    );
    expect(byId).toEqual({
      v1: "max",
      v2: "std",
      v3: "high",
      v4: "med",
      v5: "def",
      v6: "",
    });
  });
});
