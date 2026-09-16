import type { MarketPoint } from "../domain/marketTypes";

// Inputs are percentage yields; output is basis points. Never forward-fill missing observations.
export function calculateYieldSpread(longYield: readonly MarketPoint[], shortYield: readonly MarketPoint[]): MarketPoint[] {
  const shortByDate = new Map(shortYield.map((point) => [point.tradingDate, point.close]));
  return longYield.flatMap((point) => {
    const short = shortByDate.get(point.tradingDate);
    if (short === undefined || !Number.isFinite(short) || !Number.isFinite(point.close)) return [];
    return [{ ...point, close: Number(((point.close - short) * 100).toFixed(4)) }];
  });
}
