import { render, screen } from "@testing-library/react";
import { VideoGrid } from "./VideoGrid";
import type { OutlierVideo } from "@/lib/types";

function makeVideo(id: string, factor: number): OutlierVideo {
  return {
    id,
    youtubeId: `yt-${id}`,
    title: `Video ${id}`,
    thumbnailUrl: "https://example.com/t.jpg",
    currentViews: 1000,
    channelAvgViews: 100,
    outlierFactor: factor,
    publishedAt: new Date().toISOString(),
    channelId: "c",
    channelName: "Channel",
    channelUrl: "https://youtube.com/channel/c",
    channelSubscribers: 50_000,
  };
}

describe("VideoGrid", () => {
  it("renders one card per video", () => {
    render(
      <VideoGrid videos={[makeVideo("1", 3.1), makeVideo("2", 5.2)]} />,
    );
    expect(screen.getByText("Video 1")).toBeInTheDocument();
    expect(screen.getByText("Video 2")).toBeInTheDocument();
  });
});
