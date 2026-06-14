import {
  formatCount,
  formatViews,
  formatFactor,
  formatRelativeDate,
} from "./format";

describe("formatCount", () => {
  it("returns the raw number below 1,000", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(999)).toBe("999");
  });

  it("formats thousands with a K suffix and trims trailing .0", () => {
    expect(formatCount(1_000)).toBe("1K");
    expect(formatCount(1_500)).toBe("1.5K");
  });

  it("formats millions with an M suffix", () => {
    expect(formatCount(2_400_000)).toBe("2.4M");
  });

  it("formats billions with a B suffix", () => {
    expect(formatCount(3_000_000_000)).toBe("3B");
  });

  it("exposes formatViews as an alias", () => {
    expect(formatViews).toBe(formatCount);
  });
});

describe("formatFactor", () => {
  it("appends an x and trims a trailing .0", () => {
    expect(formatFactor(3)).toBe("3x");
    expect(formatFactor(3.4)).toBe("3.4x");
  });
});

describe("formatRelativeDate", () => {
  const fromNow = (ms: number) => new Date(Date.now() - ms).toISOString();

  it("handles every time unit", () => {
    expect(formatRelativeDate(fromNow(2 * 31_536_000 * 1000))).toMatch(/year/);
    expect(formatRelativeDate(fromNow(2 * 2_592_000 * 1000))).toMatch(/month/);
    expect(formatRelativeDate(fromNow(2 * 604_800 * 1000))).toMatch(/week/);
    expect(formatRelativeDate(fromNow(2 * 86_400 * 1000))).toMatch(/day/);
    expect(formatRelativeDate(fromNow(2 * 3_600 * 1000))).toMatch(/hour/);
    expect(formatRelativeDate(fromNow(2 * 60 * 1000))).toMatch(/minute/);
  });

  it('falls back to "just now" for sub-minute differences', () => {
    expect(formatRelativeDate(fromNow(5 * 1000))).toBe("just now");
  });
});
