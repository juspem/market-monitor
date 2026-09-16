import type { InstrumentSymbol } from "../domain/instruments";
import type { DailyHistoryRequest, DailyHistoryResponse, MarketPoint, MarketSeries } from "../domain/marketTypes";
import type { MarketDataProvider } from "./marketDataSource";

export const isCboeSymbol = (symbol: InstrumentSymbol): symbol is "^VIX" | "^VIX3M" =>
  symbol === "^VIX" || symbol === "^VIX3M";

const CBOE_URL = import.meta.env.VITE_CBOE_DATA_URL ?? "/api/cboe/daily_prices";

export function parseCboeCsv(symbol: "^VIX" | "^VIX3M", csv: string, fetchedAt: string, request: DailyHistoryRequest): MarketSeries {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.replace(/^\uFEFF/, "").split(",").map((column) => column.trim());
  const dateIndex = columns.indexOf("DATE");
  const closeIndex = columns.indexOf("CLOSE");
  if (dateIndex < 0 || closeIndex < 0) throw new Error(`Cboe returned invalid history for ${symbol}.`);
  const byDate = new Map<string, MarketPoint>();
  const missingDates: string[] = [];
  for (const row of rows) {
    const fields = row.split(",").map((field) => field.trim());
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fields[dateIndex] ?? "");
    if (!match) continue;
    const date = `${match[3]}-${match[1]}-${match[2]}`;
    const timestamp = `${date}T00:00:00.000Z`;
    const milliseconds = Date.parse(timestamp);
    if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString().slice(0, 10) !== date) continue;
    if ((request.startDate && date < request.startDate) || (request.endDate && date > request.endDate)) continue;
    const rawClose = fields[closeIndex];
    const close = rawClose ? Number(rawClose) : NaN;
    if (!Number.isFinite(close) || close <= 0) {
      if (request.missingData === "report") missingDates.push(date);
      continue;
    }
    byDate.set(date, { tradingDate: date, timestamp, close });
  }
  const points = [...byDate.values()].sort((a, b) => a.tradingDate.localeCompare(b.tradingDate));
  if (!points.length) throw new Error(`Cboe returned no observations for ${symbol} in this range.`);
  return { symbol, points, missingDates, status: "delayed", source: "Cboe daily close",
    exchangeTimeZone: "America/Chicago", fetchedAt };
}

export function createCboeMarketData(fetcher: typeof fetch = fetch): MarketDataProvider {
  const inFlight = new Map<string, Promise<DailyHistoryResponse>>();
  async function load(request: DailyHistoryRequest): Promise<DailyHistoryResponse> {
    const fetchedAt = new Date().toISOString();
    const symbols = [...new Set(request.symbols.filter(isCboeSymbol))];
    const results = await Promise.allSettled(symbols.map(async (symbol) => {
      const url = new URL(`${CBOE_URL}/${symbol.slice(1)}_History.csv`, typeof window === "undefined" ? "http://localhost" : window.location.origin);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      try {
        const response = await fetcher(url.toString(), { signal: controller.signal });
        if (!response.ok) throw new Error(`Cboe ${symbol} request failed with HTTP ${response.status}.`);
        return parseCboeCsv(symbol, await response.text(), fetchedAt, request);
      } catch (error) {
        if (controller.signal.aborted) throw new Error(`Cboe ${symbol} request timed out.`);
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }));
    const series: MarketSeries[] = [];
    const warnings: string[] = [];
    results.forEach((result) => {
      if (result.status === "fulfilled") series.push(result.value);
      else warnings.push(result.reason instanceof Error ? result.reason.message : "Cboe history unavailable.");
    });
    if (symbols.length && !series.length) throw new Error(warnings.join(" "));
    return { series, warnings, provider: "Cboe", fetchedAt };
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

export const cboeMarketData = createCboeMarketData();
