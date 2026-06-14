import { OUTLIER_FACTOR_THRESHOLD } from "./types";

// ---------------------------------------------------------------------------
// YouTube Data API v3 client + outlier detection.
//
// Quota strategy (quota cost in parentheses, default daily budget = 10,000):
//   1. search.list      -> up to 50 candidate videos          (100 units)
//   2. videos.list      -> live view counts, batched 50/call  (  1 unit)
//   3. channels.list    -> lifetime stats, batched 50/call    (  1 unit)
//
// Total per fresh search: ~102 units. We deliberately use each channel's
// lifetime average (totalViews / totalVideos) instead of fetching the last 10
// uploads per channel, which would cost an extra search.list (100 units) *per
// channel* — i.e. thousands of units for a single keyword.
// ---------------------------------------------------------------------------

const YT_BASE = "https://www.googleapis.com/youtube/v3";

/** A video that beat its channel's baseline by >= OUTLIER_FACTOR_THRESHOLD. */
export interface ComputedOutlier {
  youtubeId: string;
  title: string;
  thumbnailUrl: string;
  currentViews: number;
  channelAvgViews: number;
  outlierFactor: number;
  publishedAt: Date;
  channelId: string;
  channelName: string;
  channelUrl: string;
  /** null when the channel hides its subscriber count. */
  channelSubscribers: number | null;
}

export interface OutlierScan {
  outliers: ComputedOutlier[];
  /** Number of candidate videos examined (pre-filter). */
  scanned: number;
}

function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error(
      "YOUTUBE_API_KEY is not set. Add it to your .env file to enable live searches.",
    );
  }
  return key;
}

async function ytFetch<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T> {
  const url = new URL(`${YT_BASE}/${endpoint}`);
  url.search = new URLSearchParams({ ...params, key: apiKey() }).toString();

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body.error?.message) detail = body.error.message;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(`YouTube API error (${res.status}): ${detail}`);
  }
  return res.json() as Promise<T>;
}

// --- Raw response shapes (only the fields we use) --------------------------

interface SearchResponse {
  items: { id: { videoId: string } }[];
}

interface VideoItem {
  id: string;
  snippet: {
    title: string;
    publishedAt: string;
    channelId: string;
    channelTitle: string;
    thumbnails: Record<string, { url: string }>;
  };
  statistics: { viewCount?: string };
}

interface ChannelItem {
  id: string;
  statistics: {
    viewCount?: string;
    videoCount?: string;
    subscriberCount?: string;
    hiddenSubscriberCount?: boolean;
  };
}

function bestThumbnail(thumbs: VideoItem["snippet"]["thumbnails"]): string {
  return (
    thumbs.maxres?.url ??
    thumbs.standard?.url ??
    thumbs.high?.url ??
    thumbs.medium?.url ??
    thumbs.default?.url ??
    ""
  );
}

/**
 * Runs the full outlier pipeline for a keyword and returns the qualifying
 * videos. Does not touch the database — persistence is the caller's job.
 */
export async function fetchOutliersFromYouTube(
  keyword: string,
): Promise<OutlierScan> {
  // 1) Find candidate videos.
  const search = await ytFetch<SearchResponse>("search", {
    part: "snippet",
    q: keyword,
    type: "video",
    order: "relevance",
    maxResults: "50",
  });

  // De-duplicate: broad queries can return the same video ID more than once,
  // which would later violate the (searchQueryId, youtubeId) unique constraint.
  const videoIds = [
    ...new Set(
      search.items
        .map((i) => i.id?.videoId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (videoIds.length === 0) {
    return { outliers: [], scanned: 0 };
  }

  // 2) Hydrate candidate videos with live statistics.
  const videosRes = await ytFetch<{ items: VideoItem[] }>("videos", {
    part: "snippet,statistics",
    id: videoIds.join(","),
  });
  const videos = videosRes.items;

  // 3) Pull lifetime stats for every distinct channel in one batched call.
  const channelIds = [...new Set(videos.map((v) => v.snippet.channelId))];
  const channelsRes = await ytFetch<{ items: ChannelItem[] }>("channels", {
    part: "statistics",
    id: channelIds.join(","),
  });

  const channelStats = new Map<string, { avg: number; subs: number | null }>();
  for (const ch of channelsRes.items) {
    const totalViews = Number(ch.statistics.viewCount ?? 0);
    const totalVideos = Number(ch.statistics.videoCount ?? 0);
    if (totalVideos <= 0) continue; // no baseline to compare against
    channelStats.set(ch.id, {
      avg: Math.round(totalViews / totalVideos),
      subs: ch.statistics.hiddenSubscriberCount
        ? null
        : Number(ch.statistics.subscriberCount ?? 0),
    });
  }

  // 4) Apply the outlier formula.
  const outliers: ComputedOutlier[] = [];
  for (const v of videos) {
    const stats = channelStats.get(v.snippet.channelId);
    if (!stats || stats.avg <= 0) continue; // need a positive baseline

    const views = Number(v.statistics.viewCount ?? 0);
    const factor = views / stats.avg;
    if (factor < OUTLIER_FACTOR_THRESHOLD) continue;

    outliers.push({
      youtubeId: v.id,
      title: v.snippet.title,
      thumbnailUrl: bestThumbnail(v.snippet.thumbnails),
      currentViews: views,
      channelAvgViews: stats.avg,
      outlierFactor: Math.round(factor * 10) / 10,
      publishedAt: new Date(v.snippet.publishedAt),
      channelId: v.snippet.channelId,
      channelName: v.snippet.channelTitle,
      channelUrl: `https://www.youtube.com/channel/${v.snippet.channelId}`,
      channelSubscribers: stats.subs,
    });
  }

  outliers.sort((a, b) => b.outlierFactor - a.outlierFactor);
  return { outliers, scanned: videos.length };
}
