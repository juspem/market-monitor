import type { MarketPoint } from "../domain/marketTypes";

export type NormalizedPoint = MarketPoint & { normalized: number };

export function normalizePerformance(points: readonly MarketPoint[]): NormalizedPoint[] {
  const firstClose = points[0]?.close;
  if (!firstClose) {
    return [];
  }

  return points.map((point) => ({
    ...point,
    normalized: Number(((point.close / firstClose) * 100).toFixed(2)),
  }));
}
