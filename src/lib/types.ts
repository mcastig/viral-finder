// Serializable data-transfer objects shared between the server action and the
// client components. Note: view counts are exposed as `number` (safe up to
// ~9 quadrillion) rather than BigInt so they cross the network boundary and
// render without extra coercion.

export interface OutlierVideo {
  id: string;
  youtubeId: string;
  title: string;
  thumbnailUrl: string;
  currentViews: number;
  channelAvgViews: number;
  outlierFactor: number;
  /** ISO-8601 string. */
  publishedAt: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  /** null when the channel hides its subscriber count. */
  channelSubscribers: number | null;
}

export interface SearchResult {
  keyword: string;
  /** True when the result was served from the database cache. */
  cached: boolean;
  /** How many candidate videos were scanned before filtering. */
  scanned: number;
  videos: OutlierVideo[];
}

export type FindOutliersResponse =
  | { ok: true; data: SearchResult }
  | { ok: false; error: string };

/** The outlier threshold: a video must beat its channel average by this factor. */
export const OUTLIER_FACTOR_THRESHOLD = 3;
