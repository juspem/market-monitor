import type { MarketPoint, MarketSeries } from "../domain/marketTypes";

export type RatioPoint = {
  timestamp: string;
  tradingDate: string;
  ratio: number;
};

export function calculateRatio(
  numerator: MarketSeries,
  denominator: MarketSeries,
): RatioPoint[] {
  const denominatorByDate = new Map(
    denominator.points.map((point) => [point.tradingDate, point]),
  );

  return numerator.points.flatMap((point) => {
    const matchingPoint = denominatorByDate.get(point.tradingDate);
    if (!matchingPoint || matchingPoint.close === 0) {
      return [];
    }

    return [{
      timestamp: point.timestamp,
      tradingDate: point.tradingDate,
      ratio: point.close / matchingPoint.close,
    }];
  });
}

export function findPoint(series: MarketSeries, tradingDate: string): MarketPoint | undefined {
  return series.points.find((point) => point.tradingDate === tradingDate);
}
