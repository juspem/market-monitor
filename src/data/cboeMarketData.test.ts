import { describe, expect, it, vi } from "vitest";
import { calculateRatio } from "../calculations/relativeRatio";
import { createCboeMarketData, parseCboeCsv } from "./cboeMarketData";

const csv = "DATE,OPEN,HIGH,LOW,CLOSE\r\n09/11/2026,18.880000,18.920000,18.540000,18.600000\r\n09/14/2026,19.720000,19.720000,19.030000,19.280000\r\n09/15/2026,19.270000,19.740000,19.230000,19.360000";
const fetchedAt = "2026-09-16T10:00:00.000Z";

describe("Cboe volatility history", () => {
  it("uses the daily close and source date, preserving history within the requested range", () => {
    const result = parseCboeCsv("^VIX3M", csv, fetchedAt, { symbols: ["^VIX3M"], startDate: "2026-09-14", endDate: "2026-09-15" });
    expect(result.points.map((point) => [point.tradingDate, point.close])).toEqual([["2026-09-14", 19.28], ["2026-09-15", 19.36]]);
    expect(result.source).toBe("Cboe daily close");
  });

  it("calculates varying same-day ratios rather than extending a single quote into a trend", () => {
    const request = { symbols: ["^VIX", "^VIX3M"] as const };
    const vix = parseCboeCsv("^VIX", "DATE,CLOSE\n09/11/2026,15.84\n09/14/2026,17.10\n09/15/2026,17.20\n09/16/2026,16.99", fetchedAt, request);
    const vix3m = parseCboeCsv("^VIX3M", csv, fetchedAt, request);
    expect(calculateRatio(vix, vix3m).map((point) => [point.tradingDate, point.ratio])).toEqual([
      ["2026-09-11", 0.8516], ["2026-09-14", 0.8869], ["2026-09-15", 0.8884],
    ]);
  });

  it("ignores missing values and invalid dates and sorts unique observations", () => {
    const result = parseCboeCsv("^VIX3M", "DATE,CLOSE\n09/15/2026,19.36\n09/14/2026,\n02/30/2026,20\n09/11/2026,18.60\n09/15/2026,19.36", fetchedAt,
      { symbols: ["^VIX3M"], missingData: "report" });
    expect(result.points.map((point) => point.tradingDate)).toEqual(["2026-09-11", "2026-09-15"]);
    expect(result.missingDates).toEqual(["2026-09-14"]);
  });

  it("rejects unavailable or invalid historical data", () => {
    for (const content of ["<html>Unavailable</html>", "DATE,CLOSE\n09/15/2026,.", "DATE,CLOSE\n09/15/2026,0"]) {
      expect(() => parseCboeCsv("^VIX3M", content, fetchedAt, { symbols: ["^VIX3M"] })).toThrow("Cboe");
    }
  });

  it("shares concurrent loads and fetches both official histories", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(csv));
    const provider = createCboeMarketData(fetcher);
    const request = { symbols: ["^VIX", "^VIX3M"] as const };
    const [first, second] = await Promise.all([provider.getDailyHistory(request), provider.getDailyHistory(request)]);
    expect(first).toBe(second);
    expect(fetcher.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
      "/api/cboe/daily_prices/VIX_History.csv", "/api/cboe/daily_prices/VIX3M_History.csv",
    ]);
    expect(first.series).toHaveLength(2);
  });

  it("keeps successful histories and reports failures", async () => {
    const fetcher = vi.fn<typeof fetch>(async (url) => String(url).includes("VIX3M") ? new Response(null, { status: 503 }) : new Response(csv));
    const result = await createCboeMarketData(fetcher).getDailyHistory({ symbols: ["^VIX", "^VIX3M"] });
    expect(result.series.map((series) => series.symbol)).toEqual(["^VIX"]);
    expect(result.warnings).toContain("Cboe ^VIX3M request failed with HTTP 503.");
  });
});
