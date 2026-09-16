import { isYieldSymbol, type YieldSymbol } from "../domain/instruments";
import type { DailyHistoryRequest, DailyHistoryResponse, MarketPoint, MarketSeries } from "../domain/marketTypes";
import type { MarketDataProvider } from "./marketDataSource";

const FRED_URL = import.meta.env.VITE_FRED_DATA_URL ?? "/api/fred/graph/fredgraph.csv";

export function parseFredCsv(symbol: YieldSymbol, csv: string, fetchedAt: string, request: DailyHistoryRequest): MarketSeries {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.replace(/^\uFEFF/, "").split(",");
  const valueIndex = columns.indexOf(symbol);
  if (!["observation_date", "DATE"].includes(columns[0]) || valueIndex < 1) {
    throw new Error(`FRED returned an invalid CSV for ${symbol}.`);
  }
  const byDate = new Map<string, MarketPoint>();
  const missingDates: string[] = [];
  for (const row of rows) {
    const values = row.split(",");
    const date = values[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) continue;
    if ((request.startDate && date < request.startDate) || (request.endDate && date > request.endDate)) continue;
    const raw = values[valueIndex]?.trim();
    const close = raw && raw !== "." ? Number(raw) : NaN;
    if (!Number.isFinite(close)) {
      if (request.missingData === "report") missingDates.push(date);
      continue;
    }
    byDate.set(date, { tradingDate: date, timestamp: `${date}T00:00:00.000Z`, close });
  }
  const points = [...byDate.values()].sort((a, b) => a.tradingDate.localeCompare(b.tradingDate));
  if (!points.length) throw new Error(`FRED returned no observations for ${symbol} in this range.`);
  return { symbol, points, missingDates, status: "delayed", source: "FRED / Federal Reserve H.15",
    exchangeTimeZone: "America/New_York", fetchedAt };
}

export function createFredMarketData(fetcher: typeof fetch = fetch): MarketDataProvider {
  const inFlight = new Map<string, Promise<DailyHistoryResponse>>();
  async function load(request: DailyHistoryRequest): Promise<DailyHistoryResponse> {
    const fetchedAt = new Date().toISOString();
    const symbols = [...new Set(request.symbols.filter(isYieldSymbol))];
    const results = await Promise.allSettled(symbols.map(async (symbol) => {
      const url = new URL(FRED_URL, typeof window === "undefined" ? "http://localhost" : window.location.origin);
      url.searchParams.set("id", symbol);
      url.searchParams.set("cosd", request.startDate ?? "1962-01-01");
      url.searchParams.set("coed", request.endDate ?? fetchedAt.slice(0, 10));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      try {
        const response = await fetcher(url.toString(), { signal: controller.signal });
        if (!response.ok) throw new Error(`FRED ${symbol} request failed with HTTP ${response.status}.`);
        return parseFredCsv(symbol, await response.text(), fetchedAt, request);
      } catch (error) {
        if (controller.signal.aborted) throw new Error(`FRED ${symbol} request timed out.`);
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }));
    const series: MarketSeries[] = [];
    const warnings: string[] = [];
    results.forEach((result) => {
      if (result.status === "fulfilled") series.push(result.value);
      else warnings.push(result.reason instanceof Error ? result.reason.message : "FRED data unavailable.");
    });
    if (symbols.length && !series.length) throw new Error(warnings.join(" "));
    return { series, warnings, provider: "FRED", fetchedAt };
  }
  return {
    getDailyHistory(request) {
      const key = JSON.stringify(request);
      const existing = inFlight.get(key);
      if (existing) return existing;
      const pending = load(request).finally(() => inFlight.delete(key));
      inFlight.set(key, pending);
      return pending;
    },
  };
}

export const fredMarketData = createFredMarketData();
