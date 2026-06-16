/** Formats a count into a compact, human-readable string (e.g. 1.2M). */
export function formatCount(value: number): string {
  if (value < 1_000) return String(value);
  if (value < 1_000_000) return `${trim(value / 1_000)}K`;
  if (value < 1_000_000_000) return `${trim(value / 1_000_000)}M`;
  return `${trim(value / 1_000_000_000)}B`;
}

/** Alias for view counts, kept for readability at call sites. */
export const formatViews = formatCount;

function trim(value: number): string {
  // One decimal place, but drop a trailing ".0".
  return value.toFixed(1).replace(/\.0$/, "");
}

/** Formats the outlier factor for the badge, e.g. 3.4 -> "3.4x". */
export function formatFactor(factor: number): string {
  return `${factor.toFixed(1).replace(/\.0$/, "")}x`;
}

/** Relative published date, e.g. "3 months ago". */
export function formatRelativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const seconds = Math.floor((Date.now() - then) / 1000);

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, secondsInUnit] of units) {
    const value = Math.floor(seconds / secondsInUnit);
    if (value >= 1) return rtf.format(-value, unit);
  }
  return "just now";
}
