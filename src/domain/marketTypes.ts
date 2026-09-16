import type { InstrumentSymbol } from "./instruments";

export type DataStatus = "mock" | "complete" | "partial" | "delayed" | "stale" | "unavailable" | "error";

export type MissingDataPolicy = "omit" | "report";

export type MarketPoint = {
  timestamp: string;
  tradingDate: string;
  close: number;
};

export type MarketSeries = {
  symbol: InstrumentSymbol;
  points: MarketPoint[];
  missingDates: string[];
  status: DataStatus;
  source: string;
  exchangeTimeZone: string;
  fetchedAt: string;
};

export type DailyHistoryRequest = {
  symbols: readonly InstrumentSymbol[];
  startDate?: string;
  endDate?: string;
  missingData?: MissingDataPolicy;
};

export type DailyHistoryResponse = {
  series: MarketSeries[];
  provider: string;
  fetchedAt: string;
  warnings?: string[];
};
