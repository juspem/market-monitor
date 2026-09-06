import { describe, expect, it } from "vitest";
import { mockMarketData } from "./mockMarketData";

describe("MarketDataProvider", () => {
  it("returns normalized daily history with source metadata", async () => {
    const response = await mockMarketData.getDailyHistory({
      symbols: ["^GSPC"],
      startDate: "2026-01-02",
      endDate: "2026-01-09",
      missingData: "report",
    });

    const spy = response.series[0];
    expect(response.provider).toBe("mock");
    expect(spy?.source).toBe("mock");
    expect(spy?.exchangeTimeZone).toBe("America/New_York");
    expect(spy?.missingDates).toEqual([]);
    expect(spy?.points[0]).toMatchObject({
      tradingDate: "2026-01-02",
      timestamp: "2026-01-02T14:30:00.000Z",
    });
  });

  it("skips US market holidays and applies New York daylight saving time", async () => {
    const response = await mockMarketData.getDailyHistory({ symbols: ["^GSPC"] });
    const points = response.series[0]?.points ?? [];

    expect(points.some((point) => point.tradingDate === "2026-01-19")).toBe(false);
    expect(points.some((point) => point.tradingDate === "2026-02-16")).toBe(false);
    expect(points.find((point) => point.tradingDate === "2026-03-06")?.timestamp).toBe(
      "2026-03-06T14:30:00.000Z",
    );
    expect(points.find((point) => point.tradingDate === "2026-03-09")?.timestamp).toBe(
      "2026-03-09T13:30:00.000Z",
    );
  });

  it("does not create points for weekends", async () => {
    const response = await mockMarketData.getDailyHistory({
      symbols: ["^GSPC"],
      startDate: "2026-01-03",
      endDate: "2026-01-04",
    });

    expect(response.series[0]?.points).toEqual([]);
  });

  it("keeps the local trading date when daylight saving time changes", async () => {
    const response = await mockMarketData.getDailyHistory({
      symbols: ["^GSPC"],
      startDate: "2026-03-09",
      endDate: "2026-03-09",
    });

    expect(response.series[0]?.points).toEqual([
      expect.objectContaining({
        tradingDate: "2026-03-09",
        timestamp: "2026-03-09T13:30:00.000Z",
      }),
    ]);
  });

  it("accepts official index symbols for the core market basket", async () => {
    const response = await mockMarketData.getDailyHistory({
      symbols: ["^GSPC", "^NDX", "^RUT", "^DJI", "^SP500EW"],
      startDate: "2026-01-02",
      endDate: "2026-01-02",
    });

    expect(response.series.map((item) => item.symbol)).toEqual(["^GSPC", "^NDX", "^RUT", "^DJI", "^SP500EW"]);
    expect(response.series.every((item) => item.points.length === 1)).toBe(true);
  });

  it("keeps timestamps compatible with their local trading dates", async () => {
    const response = await mockMarketData.getDailyHistory({
      symbols: ["^GSPC"],
      startDate: "2026-03-09",
      endDate: "2026-03-09",
    });
    const point = response.series[0]?.points[0];

    expect(point?.tradingDate).toBe("2026-03-09");
    expect(new Date(point?.timestamp ?? "").toISOString()).toBe("2026-03-09T13:30:00.000Z");
  });
});