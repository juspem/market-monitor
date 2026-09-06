import type { MarketSeries } from "../../domain/marketTypes";

export type DashboardState = "loading" | "empty" | "stale" | "error" | "ready";

function hasValidPoint(series: MarketSeries): boolean {
  return series.points.some((point) => {
    const timestamp = Date.parse(point.timestamp);
    return /^\d{4}-\d{2}-\d{2}$/.test(point.tradingDate)
      && Number.isFinite(timestamp)
      && Number.isFinite(point.close);
  });
}

export function getDashboardState(
  series: readonly MarketSeries[],
  error: unknown = undefined,
  loading = false,
): DashboardState {
  if (loading) {
    return "loading";
  }

  if (error) {
    return "error";
  }

  if (series.length === 0) {
    return "empty";
  }

  if (!series.some(hasValidPoint)) {
    return "empty";
  }

  return series.some((item) => item.status === "stale" || item.status === "delayed" || item.status === "partial")
    ? "stale"
    : "ready";
}
