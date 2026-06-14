"use client";

import { useMemo, useState, useTransition } from "react";
import { findOutliers } from "@/app/actions/findOutliers";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { VideoGrid } from "@/components/VideoGrid/VideoGrid";
import { LoadingState } from "@/components/LoadingState/LoadingState";
import {
  SortControls,
  type SortKey,
} from "@/components/SortControls/SortControls";
import type { SearchResult } from "@/lib/types";
import "./page.css";

type Status = "idle" | "loading" | "done" | "error";

export default function HomePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("factor");
  const [, startTransition] = useTransition();

  const sortedVideos = useMemo(() => {
    if (!result) return [];
    return [...result.videos].sort((a, b) =>
      sort === "date"
        ? new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        : b.outlierFactor - a.outlierFactor,
    );
  }, [result, sort]);

  function handleSearch(keyword: string) {
    setStatus("loading");
    setError(null);

    startTransition(async () => {
      const response = await findOutliers(keyword);
      if (response.ok) {
        setResult(response.data);
        setStatus("done");
      } else {
        setError(response.error);
        setStatus("error");
      }
    });
  }

  const loading = status === "loading";

  return (
    <main className="home">
      <section className="home__hero">
        <h1 className="home__heading">
          Find the YouTube videos that <span>break the algorithm</span>
        </h1>
        <p className="home__subheading">
          Enter a topic. We scan the top videos, compare each one to its
          channel&apos;s usual performance, and surface the true outliers —
          videos pulling <strong>3×+</strong> their normal views.
        </p>
        <SearchBar onSearch={handleSearch} loading={loading} />
      </section>

      <section className="home__results">
        {status === "loading" && <LoadingState />}

        {status === "error" && (
          <div className="home__state home__state--error" role="alert">
            <span className="home__state-icon" aria-hidden="true">
              ⚠️
            </span>
            <p className="home__state-title">Search failed</p>
            <p className="home__state-text">{error}</p>
          </div>
        )}

        {status === "done" && result && (
          <>
            <div className="home__results-bar">
              <p className="home__results-summary">
                <strong>{result.videos.length}</strong> outlier
                {result.videos.length === 1 ? "" : "s"} for{" "}
                <em>“{result.keyword}”</em>
                <span className="home__results-meta">
                  {" "}
                  · {result.scanned} videos scanned
                  {result.cached ? " · cached" : ""}
                </span>
              </p>

              {result.videos.length > 0 && (
                <SortControls value={sort} onChange={setSort} />
              )}
            </div>

            {result.videos.length > 0 ? (
              <VideoGrid videos={sortedVideos} />
            ) : (
              <div className="home__state" role="status">
                <span className="home__state-icon" aria-hidden="true">
                  🔍
                </span>
                <p className="home__state-title">No outliers found</p>
                <p className="home__state-text">
                  None of the top videos for this topic beat their channel
                  average by 3× or more. Try a broader or different term.
                </p>
              </div>
            )}
          </>
        )}

        {status === "idle" && (
          <div className="home__state" role="note">
            <span className="home__state-icon" aria-hidden="true">
              🚀
            </span>
            <p className="home__state-title">Start with any topic</p>
            <p className="home__state-text">
              Try “home espresso”, “indie game devlog”, or “marathon training”.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
