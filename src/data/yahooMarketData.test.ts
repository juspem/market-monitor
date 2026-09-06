import { describe, expect, it } from "vitest";
import { createYahooMarketData, parseYahooChartResponse } from "./yahooMarketData";

const yahooPayload = {
  chart: {
    result: [{
      meta: { exchangeTimezoneName: "America/New_York" },
      timestamp: [1772721000, 1773063000],
      indicators: {
        quote: [{ close: [580, 582] }],
        adjclose: [{ adjclose: [579.5, 581.5] }],
      },
    }],
  },
};

describe("Yahoo market data", () => {
  it("maps Yahoo timestamps and adjusted closes to MarketSeries", () => {
    const series = parseYahooChartResponse("^GSPC", yahooPayload, "2026-03-09T15:00:00.000Z");

    expect(series).toMatchObject({
      symbol: "^GSPC",
      status: "delayed",
      source: "Yahoo Finance",
      exchangeTimeZone: "America/New_York",
    });
    expect(series.points).toEqual([
      {
        timestamp: "2026-03-05T14:30:00.000Z",
        tradingDate: "2026-03-05",
        close: 579.5,
      },
      {
        timestamp: "2026-03-09T13:30:00.000Z",
        tradingDate: "2026-03-09",
        close: 581.5,
      },
    ]);
  });

  it("retries when Yahoo temporarily rate-limits a symbol", async () => {
    let attempts = 0;
    const provider = createYahooMarketData(async (input) => {
      const url = String(input);
      if (url.includes("%5EGSPC") && attempts === 0) {
        attempts += 1;
        return new Response(JSON.stringify({ chart: { error: { description: "Too Many Requests" } } }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(yahooPayload), {
        headers: { "Content-Type": "application/json" },
      });
    });

    const response = await provider.getDailyHistory({
      symbols: ["^GSPC"],
      startDate: "2026-03-01",
      endDate: "2026-03-10",
    });

    expect(response.series).toHaveLength(1);
    expect(response.series[0]?.symbol).toBe("^GSPC");
    expect(response.series[0]?.points).toHaveLength(2);
  });

  it("requests each symbol without requiring an API key", async () => {
    const urls: string[] = [];
    const provider = createYahooMarketData(async (input) => {
      urls.push(String(input));
      return new Response(JSON.stringify(yahooPayload), {
        headers: { "Content-Type": "application/json" },
      });
    });

    const response = await provider.getDailyHistory({
      symbols: ["^GSPC", "^SP500EW"],
      startDate: "2026-03-01",
      endDate: "2026-03-10",
    });

    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("interval=1d");
    expect(urls[0]).not.toContain("api_key");
    expect(urls[1]).toContain("%5ESP500EW");
    expect(response.series[1]?.symbol).toBe("^SP500EW");
    expect(response.provider).toBe("Yahoo Finance");
    expect(response.series).toHaveLength(2);
  });
});
