import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

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

  it("stops the entire batch on the first 429 and blocks new loads during cooldown", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => new Response(null, { status: 429 }));
    const provider = createYahooMarketData(fetcher);

    await expect(provider.getDailyHistory({ symbols: ["^GSPC", "^NDX", "HYG"] }))
      .rejects.toThrow("HTTP 429");
    await expect(provider.getDailyHistory({ symbols: ["TLT"] }))
      .rejects.toThrow("60 seconds");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["120", "Wed, 16 Sep 2026 12:02:00 GMT"])(
    "honors Retry-After %s and allows a later manual retry",
    async (retryAfter) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-16T12:00:00Z"));
      const fetcher = vi.fn<typeof fetch>()
        .mockResolvedValueOnce(new Response(null, { status: 429, headers: { "Retry-After": retryAfter } }))
        .mockResolvedValueOnce(new Response(JSON.stringify(yahooPayload)));
      const provider = createYahooMarketData(fetcher);
      const request = { symbols: ["^GSPC"] as const };

      await expect(provider.getDailyHistory(request)).rejects.toThrow("120 seconds");
      await vi.advanceTimersByTimeAsync(60_000);
      await expect(provider.getDailyHistory(request)).rejects.toThrow("60 seconds");
      expect(fetcher).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(60_000);
      await expect(provider.getDailyHistory(request)).resolves.toMatchObject({ provider: "Yahoo Finance" });
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );

  it.each([null, "invalid", "-1", "0", "Tue, 15 Sep 2026 12:00:00 GMT"])(
    "uses a minimum cooldown for Retry-After %s",
    async (retryAfter) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-16T12:00:00Z"));
      const fetcher = vi.fn<typeof fetch>()
        .mockResolvedValueOnce(new Response(null, {
          status: 429,
          headers: retryAfter === null ? undefined : { "Retry-After": retryAfter },
        }))
        .mockResolvedValueOnce(new Response(JSON.stringify(yahooPayload)));
      const provider = createYahooMarketData(fetcher);
      const request = { symbols: ["^GSPC"] as const };

      await expect(provider.getDailyHistory(request)).rejects.toThrow("60 seconds");
      await vi.advanceTimersByTimeAsync(59_999);
      await expect(provider.getDailyHistory(request)).rejects.toThrow("1 seconds");
      expect(fetcher).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      await expect(provider.getDailyHistory(request)).resolves.toMatchObject({ provider: "Yahoo Finance" });
    },
  );

  it("shares concurrent duplicate loads", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(yahooPayload)));
    const provider = createYahooMarketData(fetcher);
    const request = { symbols: ["^GSPC", "^NDX"] as const };

    const [first, second] = await Promise.all([
      provider.getDailyHistory(request),
      provider.getDailyHistory({ ...request }),
    ]);

    expect(first).toBe(second);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("applies a rate limit to queued loads for other ranges", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 429 }));
    const provider = createYahooMarketData(fetcher);

    const results = await Promise.allSettled([
      provider.getDailyHistory({ symbols: ["^GSPC"], startDate: "2026-01-01" }),
      provider.getDailyHistory({ symbols: ["^GSPC"], startDate: "2025-01-01" }),
    ]);

    expect(results.map((result) => result.status)).toEqual(["rejected", "rejected"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not return a rate-limited batch as a successfully completed range", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(yahooPayload)))
      .mockResolvedValueOnce(new Response(null, { status: 429 }));
    const provider = createYahooMarketData(fetcher);

    await expect(provider.getDailyHistory({ symbols: ["^GSPC", "^NDX", "HYG"] }))
      .rejects.toThrow("HTTP 429");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("continues past a symbol-specific error without rate-limit retries", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(yahooPayload)));
    const provider = createYahooMarketData(fetcher);

    const result = await provider.getDailyHistory({ symbols: ["^GSPC", "^NDX"] });

    expect(result.series.map((series) => series.symbol)).toEqual(["^NDX"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
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

  it("preserves native FX precision and routes the three currency pairs and VIX3M", async () => {
    const payload = { chart: { result: [{ meta: { exchangeTimezoneName: "Europe/London" },
      timestamp: [1773063000], indicators: { quote: [{ close: [1.08123] }] } }] } };
    const urls: string[] = [];
    const provider = createYahooMarketData(async (input) => {
      urls.push(String(input));
      return new Response(JSON.stringify(payload));
    });
    const symbols = ["EURUSD=X", "JPY=X", "GBPUSD=X", "^VIX3M"] as const;
    const result = await provider.getDailyHistory({ symbols, startDate: "2026-03-01", endDate: "2026-03-10" });
    expect(urls.map((url) => decodeURIComponent(new URL(url).pathname.split("/").at(-1)!))).toEqual(symbols);
    expect(result.series[0].points[0].close).toBe(1.08123);
    expect(result.series[0].points[0].tradingDate).toBe("2026-03-09");
  });
});
