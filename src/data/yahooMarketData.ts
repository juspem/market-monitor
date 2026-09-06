import type { InstrumentSymbol } from "../domain/instruments";
import type {
  DailyHistoryRequest,
  MarketPoint,
  MarketSeries,
} from "../domain/marketTypes";
import type { MarketDataProvider } from "./marketDataSource";

type YahooChartResponse = {
  chart?: {
    error?: { description?: string | null } | null;
    result?: Array<{
      meta?: { exchangeTimezoneName?: string };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{ close?: Array<number | null> }>;
        adjclose?: Array<{ adjclose?: Array<number | null> }>;
      };
    } | null>;
  };
};

type FetchLike = typeof fetch;

const YAHOO_CHART_URL = import.meta.env.VITE_MARKET_DATA_URL
  ?? (import.meta.env.DEV ? "/api/yahoo/chart" : "https://query1.finance.yahoo.com/v8/finance/chart");
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RATE_LIMIT_RETRIES = 3;
const DEFAULT_TIME_ZONE = "America/New_York";

class YahooRateLimitError extends Error {
  constructor(status: number) {
    super(`Yahoo Finance rate limit hit (HTTP ${status})`);
    this.name = "YahooRateLimitError";
  }
}

function toTradingDate(timestamp: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "iso8601",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp * 1000));
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return `${String(values.year).padStart(4, "0")}-${String(values.month).padStart(2, "0")}-${String(values.day).padStart(2, "0")}`;
}

function toPeriod(date: string): number {
  return Math.floor(new Date(`${date}T00:00:00.000Z`).getTime() / 1000);
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDefaultStartDate(): string {
  return "1970-01-01";
}

function getDefaultEndDate(): string {
  return toDateString(new Date());
}

function matchesRequest(point: MarketPoint, request: DailyHistoryRequest): boolean {
  return (!request.startDate || point.tradingDate >= request.startDate)
    && (!request.endDate || point.tradingDate <= request.endDate);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseYahooChartResponse(
  symbol: InstrumentSymbol,
  payload: YahooChartResponse,
  fetchedAt: string,
): MarketSeries {
  const chart = payload.chart;
  const errorMessage = chart?.error?.description;
  const result = chart?.result?.[0];

  if (errorMessage) {
    throw new Error(`Yahoo Finance: ${errorMessage}`);
  }
  if (!result) {
    throw new Error(`Yahoo Finance returned no data for ${symbol}`);
  }

  const exchangeTimeZone = result.meta?.exchangeTimezoneName ?? DEFAULT_TIME_ZONE;
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const adjustedCloses = result.indicators?.adjclose?.[0]?.adjclose;
  const points = timestamps.flatMap((timestamp, index) => {
    const close = adjustedCloses?.[index] ?? closes[index];
    if (!Number.isFinite(timestamp) || !Number.isFinite(close)) {
      return [];
    }

    return [{
      timestamp: new Date(timestamp * 1000).toISOString(),
      tradingDate: toTradingDate(timestamp, exchangeTimeZone),
      close: Number(close),
    }];
  });

  if (points.length === 0) {
    throw new Error(`Yahoo Finance returned no valid observations for ${symbol}`);
  }

  return {
    symbol,
    points,
    missingDates: [],
    status: "delayed",
    source: "Yahoo Finance",
    exchangeTimeZone,
    fetchedAt,
  };
}

async function fetchJson(fetcher: FetchLike, url: string): Promise<YahooChartResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetcher(url, { signal: controller.signal });
    if (!response.ok) {
      if (response.status === 429) {
        throw new YahooRateLimitError(response.status);
      }
      throw new Error(`Yahoo Finance request failed with HTTP ${response.status}`);
    }
    return await response.json() as YahooChartResponse;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Yahoo Finance request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSymbolHistory(
  fetcher: FetchLike,
  symbol: InstrumentSymbol,
  startDate: string,
  endDate: string,
  request: DailyHistoryRequest,
  fetchedAt: string,
): Promise<MarketSeries> {
  const baseUrl = typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const url = new URL(`${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}`, baseUrl);
  url.searchParams.set("period1", String(toPeriod(startDate)));
  url.searchParams.set("period2", String(toPeriod(endDate) + 24 * 60 * 60));
  url.searchParams.set("interval", "1d");
  url.searchParams.set("events", "div,splits");
  url.searchParams.set("includeAdjustedClose", "true");
  for (let attempt = 1; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
    try {
      const payload = await fetchJson(fetcher, url.toString());
      const parsed = parseYahooChartResponse(symbol, payload, fetchedAt);
      return {
        ...parsed,
        points: parsed.points.filter((point) => matchesRequest(point, request)),
      };
    } catch (error) {
      if (error instanceof YahooRateLimitError && attempt < MAX_RATE_LIMIT_RETRIES) {
        await delay(750 * attempt);
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Yahoo Finance request failed for ${symbol}`);
}

export function createYahooMarketData(fetcher: FetchLike = fetch): MarketDataProvider {
  return {
    async getDailyHistory(request) {
      const startDate = request.startDate ?? getDefaultStartDate();
      const endDate = request.endDate ?? getDefaultEndDate();
      const fetchedAt = new Date().toISOString();
      const series: MarketSeries[] = [];

      for (const symbol of request.symbols) {
        try {
          const nextSeries = await fetchSymbolHistory(fetcher, symbol, startDate, endDate, request, fetchedAt);
          series.push(nextSeries);
        } catch (error) {
          console.warn(`Skipping ${symbol} due to Yahoo Finance data failure:`, error);
        }
      }

      if (series.length === 0) {
        throw new Error("Yahoo Finance failed to return any valid series for the requested symbols.");
      }

      return { series, provider: "Yahoo Finance", fetchedAt };
    },
  };
}

export const yahooMarketData = createYahooMarketData();
