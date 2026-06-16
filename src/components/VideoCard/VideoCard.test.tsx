import { render, screen } from "@testing-library/react";
import { VideoCard } from "./VideoCard";
import type { OutlierVideo } from "@/lib/types";

const video: OutlierVideo = {
  id: "1",
  youtubeId: "abc123",
  title: "How I built a viral channel",
  thumbnailUrl: "https://example.com/thumb.jpg",
  currentViews: 3_400_000,
  channelAvgViews: 1_000_000,
  outlierFactor: 3.4,
  publishedAt: new Date().toISOString(),
  channelId: "chan1",
  channelName: "Creator Lab",
  channelUrl: "https://youtube.com/channel/chan1",
  channelSubscribers: 1_200_000,
};

describe("VideoCard", () => {
  it("renders the title, channel and outlier badge", () => {
    render(<VideoCard video={video} />);

    expect(screen.getByText(video.title)).toBeInTheDocument();
    expect(screen.getByText("Creator Lab")).toBeInTheDocument();
    expect(screen.getByText("3.4x more views!")).toBeInTheDocument();
    expect(screen.getByText("1.2M subscribers")).toBeInTheDocument();
  });

  it("shows a fallback when the channel hides its subscriber count", () => {
    render(<VideoCard video={{ ...video, channelSubscribers: null }} />);
    expect(screen.getByText("Subscribers hidden")).toBeInTheDocument();
  });

  it("links to the YouTube watch page", () => {
    render(<VideoCard video={video} />);
    const links = screen.getAllByRole("link");
    expect(
      links.some(
        (l) =>
          l.getAttribute("href") ===
          "https://www.youtube.com/watch?v=abc123",
      ),
    ).toBe(true);
  });
});
