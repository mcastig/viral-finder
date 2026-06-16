-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "SearchQuery" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YoutubeVideo" (
    "id" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "currentViews" BIGINT NOT NULL,
    "channelAvgViews" BIGINT NOT NULL,
    "outlierFactor" DOUBLE PRECISION NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "channelUrl" TEXT NOT NULL,
    "channelSubscribers" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "searchQueryId" TEXT NOT NULL,

    CONSTRAINT "YoutubeVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SearchQuery_keyword_key" ON "SearchQuery"("keyword");

-- CreateIndex
CREATE INDEX "SearchQuery_keyword_idx" ON "SearchQuery"("keyword");

-- CreateIndex
CREATE INDEX "YoutubeVideo_searchQueryId_idx" ON "YoutubeVideo"("searchQueryId");

-- CreateIndex
CREATE UNIQUE INDEX "YoutubeVideo_searchQueryId_youtubeId_key" ON "YoutubeVideo"("searchQueryId", "youtubeId");

-- AddForeignKey
ALTER TABLE "YoutubeVideo" ADD CONSTRAINT "YoutubeVideo_searchQueryId_fkey" FOREIGN KEY ("searchQueryId") REFERENCES "SearchQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

