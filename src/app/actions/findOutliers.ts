"use server";

import { prisma } from "@/lib/prisma";
import { fetchOutliersFromYouTube } from "@/lib/youtube";
import type { FindOutliersResponse, OutlierVideo } from "@/lib/types";
import type { YoutubeVideo } from "@prisma/client";

// How long a cached search stays "fresh" before we re-query YouTube.
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

/** Maps a stored Prisma row to the serializable DTO sent to the client. */
function toDTO(row: YoutubeVideo): OutlierVideo {
  return {
    id: row.id,
    youtubeId: row.youtubeId,
    title: row.title,
    thumbnailUrl: row.thumbnailUrl,
    currentViews: Number(row.currentViews),
    channelAvgViews: Number(row.channelAvgViews),
    outlierFactor: row.outlierFactor,
    publishedAt: row.publishedAt.toISOString(),
    channelId: row.channelId,
    channelName: row.channelName,
    channelUrl: row.channelUrl,
    channelSubscribers:
      row.channelSubscribers === null ? null : Number(row.channelSubscribers),
  };
}

/**
 * Server Action: given a keyword, return the outlier videos for that topic.
 *
 * Flow:
 *   1. If a fresh cached search exists, serve it (zero YouTube quota spent).
 *   2. Otherwise run the YouTube pipeline, persist the outliers, and return them.
 */
export async function findOutliers(
  rawKeyword: string,
): Promise<FindOutliersResponse> {
  const keyword = rawKeyword.trim().toLowerCase();
  if (!keyword) {
    return { ok: false, error: "Please enter a search term." };
  }

  try {
    // 1) Cache hit?
    const existing = await prisma.searchQuery.findUnique({
      where: { keyword },
      include: { videos: { orderBy: { outlierFactor: "desc" } } },
    });

    if (existing && Date.now() - existing.updatedAt.getTime() < CACHE_TTL_MS) {
      return {
        ok: true,
        data: {
          keyword,
          cached: true,
          scanned: existing.videos.length,
          videos: existing.videos.map(toDTO),
        },
      };
    }

    // 2) Fresh fetch + outlier detection.
    const { outliers, scanned } = await fetchOutliersFromYouTube(keyword);

    // 3) Persist atomically: upsert the query, replace its video set.
    const saved = await prisma.$transaction(async (tx) => {
      const query = await tx.searchQuery.upsert({
        where: { keyword },
        create: { keyword },
        update: { updatedAt: new Date() },
      });

      await tx.youtubeVideo.deleteMany({
        where: { searchQueryId: query.id },
      });

      if (outliers.length > 0) {
        await tx.youtubeVideo.createMany({
          data: outliers.map((o) => ({
            youtubeId: o.youtubeId,
            title: o.title,
            thumbnailUrl: o.thumbnailUrl,
            currentViews: BigInt(o.currentViews),
            channelAvgViews: BigInt(o.channelAvgViews),
            outlierFactor: o.outlierFactor,
            publishedAt: o.publishedAt,
            channelId: o.channelId,
            channelName: o.channelName,
            channelUrl: o.channelUrl,
            channelSubscribers:
              o.channelSubscribers === null
                ? null
                : BigInt(o.channelSubscribers),
            searchQueryId: query.id,
          })),
          skipDuplicates: true,
        });
      }

      return tx.youtubeVideo.findMany({
        where: { searchQueryId: query.id },
        orderBy: { outlierFactor: "desc" },
      });
    });

    return {
      ok: true,
      data: {
        keyword,
        cached: false,
        scanned,
        videos: saved.map(toDTO),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Something went wrong while searching. Please try again.",
    };
  }
}
