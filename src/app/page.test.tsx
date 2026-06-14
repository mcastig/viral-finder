import { render, screen, fireEvent, act } from "@testing-library/react";
import type { OutlierVideo } from "@/lib/types";

jest.mock("@/app/actions/findOutliers", () => ({ findOutliers: jest.fn() }));

import { findOutliers } from "@/app/actions/findOutliers";
import HomePage from "./page";

const mockAction = findOutliers as jest.Mock;

function vid(overrides: Partial<OutlierVideo> = {}): OutlierVideo {
  return {
    id: "1",
    youtubeId: "y1",
    title: "Alpha",
    thumbnailUrl: "t",
    currentViews: 1000,
    channelAvgViews: 100,
    outlierFactor: 5,
    publishedAt: new Date("2026-01-01").toISOString(),
    channelId: "c",
    channelName: "Chan",
    channelUrl: "u",
    channelSubscribers: 1000,
    ...overrides,
  };
}

function search(term = "cats") {
  fireEvent.change(screen.getByLabelText("Search term"), {
    target: { value: term },
  });
  fireEvent.click(screen.getByRole("button", { name: /find outliers/i }));
}

beforeEach(() => jest.clearAllMocks());

describe("HomePage", () => {
  it("shows the idle hint before any search", () => {
    render(<HomePage />);
    expect(screen.getByText(/Start with any topic/)).toBeInTheDocument();
  });

  it("shows a loading state, then results, and re-sorts by date", async () => {
    let resolve!: (value: unknown) => void;
    mockAction.mockReturnValue(new Promise((r) => (resolve = r)));

    const { container } = render(<HomePage />);
    search();

    // Loading state appears while the action is pending.
    expect(await screen.findByRole("status")).toBeInTheDocument();

    // Beta has the higher factor but the older date.
    await act(async () => {
      resolve({
        ok: true,
        data: {
          keyword: "cats",
          cached: false,
          scanned: 7,
          videos: [
            vid({ id: "1", title: "Alpha", outlierFactor: 5, publishedAt: new Date("2026-06-01").toISOString() }),
            vid({ id: "2", title: "Beta", outlierFactor: 9, publishedAt: new Date("2026-01-01").toISOString() }),
          ],
        },
      });
    });

    expect(await screen.findByText("Beta")).toBeInTheDocument();
    expect(screen.getByText(/videos scanned/)).toBeInTheDocument();

    const summary = container.querySelector(".home__results-summary");
    expect(summary?.textContent).toContain("2 outliers for");
    expect(summary?.textContent).not.toContain("cached");

    const order = () =>
      screen
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent);

    // Default sort: by outlier factor (Beta 9 > Alpha 5).
    expect(order()).toEqual(["Beta", "Alpha"]);

    // Switch to date: Alpha (June) is newer than Beta (January).
    fireEvent.click(screen.getByRole("button", { name: "Newest" }));
    expect(order()).toEqual(["Alpha", "Beta"]);
  });

  it("renders an error state when the action fails", async () => {
    mockAction.mockResolvedValue({ ok: false, error: "boom" });
    render(<HomePage />);
    search();

    expect(await screen.findByRole("alert")).toHaveTextContent("boom");
    expect(screen.getByText(/Search failed/)).toBeInTheDocument();
  });

  it("shows an empty state (and the cached flag) when there are no outliers", async () => {
    mockAction.mockResolvedValue({
      ok: true,
      data: { keyword: "x", cached: true, scanned: 3, videos: [] },
    });
    const { container } = render(<HomePage />);
    search();

    expect(await screen.findByText(/No outliers found/)).toBeInTheDocument();
    // No sort control without videos.
    expect(
      screen.queryByRole("button", { name: "Newest" }),
    ).not.toBeInTheDocument();

    const summary = container.querySelector(".home__results-summary");
    expect(summary?.textContent).toContain("0 outliers for");
    expect(summary?.textContent).toContain("cached");
  });

  it("uses the singular noun for a single outlier", async () => {
    mockAction.mockResolvedValue({
      ok: true,
      data: { keyword: "y", cached: false, scanned: 1, videos: [vid({ title: "Solo" })] },
    });
    const { container } = render(<HomePage />);
    search();

    expect(await screen.findByText("Solo")).toBeInTheDocument();
    const summary = container.querySelector(".home__results-summary");
    expect(summary?.textContent).toContain("1 outlier for");
    expect(summary?.textContent).not.toContain("outliers");
  });
});
