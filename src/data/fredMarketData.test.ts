import { describe, expect, it, vi } from "vitest";
import { createFredMarketData, parseFredCsv } from "./fredMarketData";

const fetchedAt = "2026-09-16T10:00:00.000Z";

describe("FRED Treasury data", () => {
  it("preserves percentage yields and zero while omitting missing observations and filtering the range", () => {
    const series = parseFredCsv("DGS2", "observation_date,DGS2\r\n2026-09-10,4.20\r\n2026-09-11,0\r\n2026-09-14,.\r\n2026-09-15,\r\n2026-09-16,4.30", fetchedAt,
      { symbols: ["DGS2"], startDate: "2026-09-11", endDate: "2026-09-15", missingData: "report" });
    expect(series.points).toEqual([{ tradingDate: "2026-09-11", timestamp: "2026-09-11T00:00:00.000Z", close: 0 }]);
    expect(series.missingDates).toEqual(["2026-09-14", "2026-09-15"]);
    expect(series.source).toContain("FRED");
  });

  it("rejects HTML and all-missing data instead of treating them as zero yields", () => {
    for (const csv of ["<html>Service unavailable</html>", "DATE,DGS2\n2026-09-14,.\n2026-09-15,"]) {
      expect(() => parseFredCsv("DGS2", csv, fetchedAt, { symbols: ["DGS2"] })).toThrow("FRED");
    }
  });

  it("sorts and deduplicates observations for chart compatibility", () => {
    const series = parseFredCsv("DGS10", "DATE,DGS10\n2026-09-15,4.3\n2026-09-14,4.2\n2026-09-15,4.4", fetchedAt, { symbols: ["DGS10"] });
    expect(series.points.map((point) => [point.tradingDate, point.close])).toEqual([["2026-09-14", 4.2], ["2026-09-15", 4.4]]);
  });

  it("shares duplicate loads and requests the supplied date range without credentials", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response("observation_date,DGS2\n2026-09-15,4.21"));
    const provider = createFredMarketData(fetcher);
    const request = { symbols: ["DGS2"] as const, startDate: "2026-09-01", endDate: "2026-09-15" };
    const [first, second] = await Promise.all([provider.getDailyHistory(request), provider.getDailyHistory(request)]);
    expect(first).toBe(second);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.pathname).toBe("/api/fred/graph/fredgraph.csv");
    expect(Object.fromEntries(url.searchParams)).toEqual({ id: "DGS2", cosd: "2026-09-01", coed: "2026-09-15" });
  });

  it("keeps a successful maturity if the other fails and permits a later retry", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const symbol = new URL(String(input)).searchParams.get("id");
      return symbol === "DGS2" ? new Response(null, { status: 503 }) : new Response("DATE,DGS10\n2026-09-15,4.30");
    });
    const provider = createFredMarketData(fetcher);
    const result = await provider.getDailyHistory({ symbols: ["DGS2", "DGS10"] });
    expect(result.series.map((series) => series.symbol)).toEqual(["DGS10"]);
    expect(result.warnings).toEqual(["FRED DGS2 request failed with HTTP 503."]);
    fetcher.mockImplementation(async () => new Response("DATE,DGS2\n2026-09-15,4.10"));
    expect((await provider.getDailyHistory({ symbols: ["DGS2"] })).series[0].points[0].close).toBe(4.1);
  });
});
